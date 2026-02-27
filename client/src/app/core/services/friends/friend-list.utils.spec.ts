import { AccountFriend } from '@app/core/interfaces/account/account_friends';
import { buildFriendViewLists } from './friend-list.utils';

describe('buildFriendViewLists', () => {
    const accounts: AccountFriend[] = [
        {
            userId: 'self',
            pseudonym: 'Self',
            avatarUrl: '',
            isFriend: false,
            isRequestReceived: false,
            isRequestSent: false,
            isBlocked: false,
            isBlockingMe: false,
        },
        {
            userId: 'friend-1',
            pseudonym: 'Alice',
            avatarUrl: '',
            isFriend: true,
            isRequestReceived: false,
            isRequestSent: false,
            isBlocked: false,
            isBlockingMe: false,
        },
        {
            userId: 'discover-1',
            pseudonym: 'Bob',
            avatarUrl: '',
            isFriend: false,
            isRequestReceived: false,
            isRequestSent: false,
            isBlocked: false,
            isBlockingMe: false,
        },
        {
            userId: 'blocked-1',
            pseudonym: 'Eve',
            avatarUrl: '',
            isFriend: false,
            isRequestReceived: false,
            isRequestSent: false,
            isBlocked: true,
            isBlockingMe: false,
        },
    ];

    it('should split account lists by relationship state', () => {
        const lists = buildFriendViewLists(accounts, 'self', '');

        expect(lists.friends.map((account) => account.userId)).toEqual(['friend-1']);
        expect(lists.discover.map((account) => account.userId)).toEqual(['discover-1']);
        expect(lists.blocked.map((account) => account.userId)).toEqual(['blocked-1']);
    });
});
