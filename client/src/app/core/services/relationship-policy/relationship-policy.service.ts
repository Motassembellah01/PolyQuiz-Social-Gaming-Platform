import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root',
})
export class RelationshipPolicyService {
    isBlockedByCurrentUser(userId: string, blockedUsers: string[]): boolean {
        return blockedUsers.includes(userId);
    }

    isBlockingCurrentUser(userId: string, usersBlockingMe: string[]): boolean {
        return usersBlockingMe.includes(userId);
    }

    canAccessFriendOnlyMatch(managerId: string, isFriendMatch: boolean, friendIds: string[]): boolean {
        if (!isFriendMatch) {
            return true;
        }
        return friendIds.includes(managerId);
    }
}
