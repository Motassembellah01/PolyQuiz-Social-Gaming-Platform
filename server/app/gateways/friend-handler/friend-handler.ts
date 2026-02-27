import { FriendRequestDto } from '@app/model/dto/friend-request/friend-request-dto';
import { Logger } from '@nestjs/common';
import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway()
export class FriendHandlerGateway {
    @WebSocketServer()
    server: Server;
    private readonly logger = new Logger(FriendHandlerGateway.name);
    private onlineUsers = new Map<string, string>();

    @SubscribeMessage('register')
    async handleRegister(@MessageBody() userId: string, @ConnectedSocket() client: Socket): Promise<void> {
        this.onlineUsers.set(userId, client.id);
        this.logger.log(`User ${userId} registered with socket ${client.id}`);
    }

    @SubscribeMessage('unregister')
    handleUnregister(@MessageBody() userId: string): void {
        if (this.onlineUsers.has(userId)) {
            this.onlineUsers.delete(userId);
        }
        this.logger.log(`User ${userId} unregistered`);
    }

    updateFriendRequestSentList(senderId: string, friendsThatUserRequested: string[]): void {
        const socketIdSender = this.onlineUsers.get(senderId);
        if (socketIdSender) {
            this.server.to(socketIdSender).emit('friendsThatUserRequested', friendsThatUserRequested);
        }
    }

    updateFriendRequestsThatUserReceived(receiverId: string, friendRequestsBasicInfo: FriendRequestDto[]): void {
        const socketIdReceiver = this.onlineUsers.get(receiverId);
        if (socketIdReceiver) {
            this.server.to(socketIdReceiver).emit('friendRequestsThatUserReceived', friendRequestsBasicInfo);
        }
    }

    updateFriendListReceiver(receiverId: string, friendsReceiver: string[]): void {
        const socketIdReceiver = this.onlineUsers.get(receiverId);
        if (socketIdReceiver) {
            this.server.to(socketIdReceiver).emit('updateFriendListReceiver', friendsReceiver);
        }
    }

    updateFriendListSender(senderId: string, friendsSender: string[]): void {
        const socketIdSender = this.onlineUsers.get(senderId);
        if (socketIdSender) {
            this.server.to(socketIdSender).emit('updateFriendListSender', friendsSender);
        }
    }

    updateBlockedUsersList(userId: string, blockedUsers: string[]): void {
        const socketId = this.onlineUsers.get(userId);
        if (socketId) {
            this.server.to(socketId).emit('updateBlockedUsers', blockedUsers);
        }
    }

    updateBlockedByList(userId: string, blockedBy: string[]): void {
        const socketId = this.onlineUsers.get(userId);
        if (socketId) {
            this.server.to(socketId).emit('updateBlockedBy', blockedBy);
        }
    }
}