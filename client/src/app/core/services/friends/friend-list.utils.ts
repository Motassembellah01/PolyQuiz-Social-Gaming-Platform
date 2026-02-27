import { AccountFriend } from '@app/core/interfaces/account/account_friends';

export interface FriendViewLists {
    discover: AccountFriend[];
    friends: AccountFriend[];
    blocked: AccountFriend[];
}

export const buildFriendViewLists = (accounts: AccountFriend[], currentUserId: string, searchTerm: string): FriendViewLists => {
    const normalizedTerm = searchTerm.toLowerCase();

    return {
        discover: accounts.filter(
            (account) =>
                !account.isFriend &&
                !account.isBlocked &&
                !account.isBlockingMe &&
                account.userId !== currentUserId &&
                account.pseudonym.toLowerCase().includes(normalizedTerm),
        ),
        friends: accounts.filter((account) => account.isFriend && account.pseudonym.toLowerCase().includes(normalizedTerm)),
        blocked: accounts.filter((account) => account.isBlocked && account.pseudonym.toLowerCase().includes(normalizedTerm)),
    };
};
