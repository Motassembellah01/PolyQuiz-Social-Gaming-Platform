import { Injectable } from '@angular/core';
import { AccountService } from '@app/core/http/services/account-service/account.service';
import { FriendService } from '@app/core/http/services/friend-service/friend.service';
import { AccountFriend } from '@app/core/interfaces/account/account_friends';
import { AccountListenerService } from '@app/core/services/account-listener/account-listener.service';
import { Observable, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { FriendViewLists, buildFriendViewLists } from './friend-list.utils';

@Injectable({
    providedIn: 'root',
})
export class FriendsFacadeService {
    constructor(
        private readonly accountService: AccountService,
        private readonly friendService: FriendService,
        private readonly accountListenerService: AccountListenerService,
    ) {}

    initializeData(): Observable<void> {
        return forkJoin({
            accounts: this.accountService.getAccounts(),
            friends: this.accountService.getFriends(),
            friendRequests: this.accountService.getFriendRequests(),
            friendsRequested: this.accountService.getFriendsThatUserRequested(),
            blockedUsers: this.accountService.getBlockedUsers(),
            blockedBy: this.accountService.getBlockedBy(),
        }).pipe(
            map(({ accounts, friends, friendRequests, friendsRequested, blockedUsers, blockedBy }) => {
                this.accountListenerService.friends = friends;
                this.accountListenerService.friendRequestsReceived = friendRequests;
                this.accountListenerService.friendsThatUserRequested = friendsRequested;
                this.accountListenerService.blocked = blockedUsers;
                this.accountListenerService.usersBlockingMe = blockedBy;
                this.accountListenerService.accounts = this.accountListenerService.mapAccounts(accounts);
            }),
        );
    }

    buildViewLists(searchTerm: string): FriendViewLists {
        return buildFriendViewLists(this.accountListenerService.accounts, this.accountService.auth0Id, searchTerm);
    }

    getRequestForUser(userId: string): { requestId: string } | undefined {
        return this.accountListenerService.friendRequestsReceived.find((request) => request.senderBasicInfo.userId === userId);
    }

    sendFriendRequest(userId: string): Observable<void> {
        return this.friendService.sendFriendRequest(userId);
    }

    cancelFriendRequest(receiverId: string): Observable<void> {
        return this.friendService.cancelFriendRequest(receiverId);
    }

    acceptFriendRequest(requestId: string): Observable<void> {
        return this.friendService.acceptFriendRequest(requestId);
    }

    rejectFriendRequest(requestId: string): Observable<void> {
        return this.friendService.rejectFriendRequest(requestId);
    }

    removeFriend(friendId: string): Observable<void> {
        return this.friendService.removeFriend(friendId);
    }

    blockNormalUser(blockedUserId: string): Observable<void> {
        return this.friendService.blockNormalUser(blockedUserId);
    }

    blockFriend(blockedFriendId: string): Observable<void> {
        return this.friendService.blockFriend(blockedFriendId);
    }

    blockUserWithPendingRequest(otherUserId: string): Observable<void> {
        return this.friendService.blockUserWithPendingRequest(otherUserId);
    }

    unblockUser(blockedUserId: string): Observable<void> {
        return this.friendService.unblockUser(blockedUserId);
    }

    getAccountsSnapshot(): AccountFriend[] {
        return this.accountListenerService.accounts;
    }

    getFriendCount(): number {
        return this.accountListenerService.accounts.filter((account) => account.isFriend).length;
    }

    getRequestCount(): number {
        return this.accountListenerService.friendRequestsReceived.length;
    }

    getBlockedCount(): number {
        return this.accountListenerService.blocked.length;
    }
}
