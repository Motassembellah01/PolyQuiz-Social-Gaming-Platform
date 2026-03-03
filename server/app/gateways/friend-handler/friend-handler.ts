import { FriendRequestDto } from '@app/model/dto/friend-request/friend-request-dto';
import { Account, AccountDocument } from '@app/model/database/account';
import { Session, SessionDocument } from '@app/model/database/session';
import { SessionService } from '@app/services/session/session.service';
import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConnectedSocket, MessageBody, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Model } from 'mongoose';
import { Server, Socket } from 'socket.io';

/**
 * Push gateway for friend-domain projection updates.
 * It keeps a lightweight in-memory map from userId to socketId so
 * account/friend projection changes can be streamed to connected users.
 */
@WebSocketGateway()
export class FriendHandlerGateway implements OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;
    private readonly logger = new Logger(FriendHandlerGateway.name);

    // userId -> connected socket ids (handles multi-tab/session connections).
    private onlineUsers = new Map<string, Set<string>>();
    // reverse index to cleanly unregister on socket disconnect.
    private userBySocket = new Map<string, string>();

    constructor(
        @InjectModel(Account.name) private readonly accountModel: Model<AccountDocument>,
        @InjectModel(Session.name) private readonly sessionModel: Model<SessionDocument>,
        private readonly sessionService: SessionService,
    ) {}

    // Called when a client starts listening for friend updates.
    @SubscribeMessage('register')
    async handleRegister(@MessageBody() userId: string, @ConnectedSocket() client: Socket): Promise<void> {
        const wasOnline = this.isUserOnline(userId);
        const userSockets = this.onlineUsers.get(userId) ?? new Set<string>();
        userSockets.add(client.id);
        this.onlineUsers.set(userId, userSockets);
        this.userBySocket.set(client.id, userId);
        this.logger.log(`User ${userId} registered with socket ${client.id}`);

        await this.emitPresenceSnapshotToUser(userId);
        if (!wasOnline) {
            await this.broadcastPresenceToFriends(userId, true, null);
        }
    }

    // Called on client disconnect flow to avoid stale socket mappings.
    @SubscribeMessage('unregister')
    async handleUnregister(@MessageBody() userId: string, @ConnectedSocket() client: Socket): Promise<void> {
        await this.unregisterSocket(userId, client.id);
    }

    async handleDisconnect(client: Socket): Promise<void> {
        const userId = this.userBySocket.get(client.id);
        if (!userId) {
            return;
        }
        await this.unregisterSocket(userId, client.id);
    }

    // Pushes the current user's outgoing friend-request list.
    emitFriendRequestsSentUpdated(userId: string, sentFriendRequestIds: string[]): void {
        const socketIds = this.onlineUsers.get(userId);
        if (socketIds) {
            socketIds.forEach((socketId) => this.server.to(socketId).emit('friendRequestsSentUpdated', sentFriendRequestIds));
        }
    }

    // Pushes the current user's incoming friend-request list.
    emitFriendRequestsReceivedUpdated(userId: string, receivedFriendRequests: FriendRequestDto[]): void {
        const socketIds = this.onlineUsers.get(userId);
        if (socketIds) {
            socketIds.forEach((socketId) => this.server.to(socketId).emit('friendRequestsReceivedUpdated', receivedFriendRequests));
        }
    }

    // Pushes updated friend list for a given user.
    emitFriendsUpdated(userId: string, friendIds: string[]): void {
        const socketIds = this.onlineUsers.get(userId);
        if (socketIds) {
            socketIds.forEach((socketId) => this.server.to(socketId).emit('friendsUpdated', friendIds));
        }
        void this.emitPresenceSnapshotToUser(userId);
    }

    // Pushes updated list of users blocked by current user.
    emitBlockedUsersUpdated(userId: string, blockedUsers: string[]): void {
        const socketIds = this.onlineUsers.get(userId);
        if (socketIds) {
            socketIds.forEach((socketId) => this.server.to(socketId).emit('blockedUsersUpdated', blockedUsers));
        }
    }

    // Pushes updated list of users blocking current user.
    emitBlockedByUsersUpdated(userId: string, blockedByUserIds: string[]): void {
        const socketIds = this.onlineUsers.get(userId);
        if (socketIds) {
            socketIds.forEach((socketId) => this.server.to(socketId).emit('blockedByUsersUpdated', blockedByUserIds));
        }
    }

    private async unregisterSocket(userId: string, socketId: string): Promise<void> {
        const userSockets = this.onlineUsers.get(userId);
        if (!userSockets) {
            return;
        }
        userSockets.delete(socketId);
        this.userBySocket.delete(socketId);

        if (userSockets.size > 0) {
            this.onlineUsers.set(userId, userSockets);
            this.logger.log(`Socket ${socketId} removed for user ${userId}; still connected on other sockets`);
            return;
        }

        this.onlineUsers.delete(userId);
        this.logger.log(`User ${userId} unregistered`);
        const closedSession = await this.sessionService.logoutSession(userId);
        const persistedLastSeen = closedSession?.logoutAt ?? new Date().toISOString();
        await this.broadcastPresenceToFriends(userId, false, persistedLastSeen);
    }

    private isUserOnline(userId: string): boolean {
        return (this.onlineUsers.get(userId)?.size ?? 0) > 0;
    }

    private async getFriendIds(userId: string): Promise<string[]> {
        const account = await this.accountModel.findOne({ userId }).select('friends').lean().exec();
        return account?.friends ?? [];
    }

    private async getLastSeenFromSessions(userId: string): Promise<string | null> {
        const sessions = await this.sessionModel.find({ userId }).select('logoutAt').lean().exec();
        const logoutCandidates = sessions
            .map((session) => session.logoutAt)
            .filter((logoutAt): logoutAt is string => typeof logoutAt === 'string' && logoutAt.length > 0);

        if (logoutCandidates.length === 0) {
            return null;
        }

        const latest = logoutCandidates.reduce((currentLatest, candidate) => {
            const currentTs = Date.parse(currentLatest);
            const candidateTs = Date.parse(candidate);
            if (Number.isNaN(candidateTs)) {
                return currentLatest;
            }
            if (Number.isNaN(currentTs) || candidateTs > currentTs) {
                return candidate;
            }
            return currentLatest;
        });

        return latest;
    }

    private async emitPresenceSnapshotToUser(userId: string): Promise<void> {
        const socketIds = this.onlineUsers.get(userId);
        if (!socketIds || socketIds.size === 0) {
            return;
        }

        const friendIds = await this.getFriendIds(userId);
        const friendStates = await Promise.all(
            friendIds.map(async (friendId) => ({
                userId: friendId,
                isOnline: this.isUserOnline(friendId),
                lastSeenAt: this.isUserOnline(friendId) ? null : await this.getLastSeenFromSessions(friendId),
            })),
        );

        socketIds.forEach((socketId) => {
            this.server.to(socketId).emit('friendsPresenceSnapshot', friendStates);
        });
    }

    private async broadcastPresenceToFriends(userId: string, isOnline: boolean, fallbackLastSeenAt: string | null): Promise<void> {
        const friendIds = await this.getFriendIds(userId);
        const lastSeenAt = isOnline ? null : fallbackLastSeenAt || (await this.getLastSeenFromSessions(userId));

        friendIds.forEach((friendId) => {
            const friendSockets = this.onlineUsers.get(friendId);
            if (!friendSockets || friendSockets.size === 0) {
                return;
            }
            friendSockets.forEach((socketId) => {
                this.server.to(socketId).emit('friendPresenceUpdated', {
                    userId,
                    isOnline,
                    lastSeenAt,
                });
            });
        });
    }
}