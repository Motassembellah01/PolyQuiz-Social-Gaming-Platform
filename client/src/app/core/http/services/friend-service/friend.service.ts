import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ServerConfigService } from '@app/core/services/server-config/server-config.service';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class FriendService {
    auth0Id: string;

    constructor(
        private readonly http: HttpClient,
        private readonly serverConfig: ServerConfigService,
    ) {}

    private get actorUserId(): string {
        return this.auth0Id;
    }

    sendFriendRequest(receiverId: string): Observable<void> {
        return this.http.post<void>(`${this.serverConfig.serverUrl}/friends/send/${this.actorUserId}/${receiverId}`, {});
    }

    acceptFriendRequest(requestId: string): Observable<void> {
        return this.http.post<void>(`${this.serverConfig.serverUrl}/friends/accept/${requestId}`, {});
    }

    rejectFriendRequest(requestId: string): Observable<void> {
        return this.http.post<void>(`${this.serverConfig.serverUrl}/friends/reject/${requestId}`, {});
    }

    removeFriend(friendId: string): Observable<void> {
        return this.http.delete<void>(`${this.serverConfig.serverUrl}/friends/remove/${this.actorUserId}/${friendId}`);
    }

    blockNormalUser(blockedUserId: string): Observable<void> {
        return this.http.post<void>(`${this.serverConfig.serverUrl}/friends/block/${this.actorUserId}/${blockedUserId}`, {});
    }

    blockFriend(blockedFriendId: string): Observable<void> {
        return this.http.post<void>(`${this.serverConfig.serverUrl}/friends/blockFriend/${this.actorUserId}/${blockedFriendId}`, {});
    }

    blockUserWithPendingRequest(otherUserId: string): Observable<void> {
        return this.http.post<void>(`${this.serverConfig.serverUrl}/friends/blockUserWithPendingRequest/${this.actorUserId}/${otherUserId}`, {});
    }

    cancelFriendRequest(receiverId: string): Observable<void> {
        return this.http.post<void>(`${this.serverConfig.serverUrl}/friends/cancelRequest/${this.actorUserId}/${receiverId}`, {});
    }

    unblockUser(blockedUserId: string): Observable<void> {
        return this.http.post<void>(`${this.serverConfig.serverUrl}/friends/unblock/${this.actorUserId}/${blockedUserId}`, {});
    }
}
