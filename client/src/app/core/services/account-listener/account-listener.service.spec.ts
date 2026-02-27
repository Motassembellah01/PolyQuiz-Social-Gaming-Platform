import { TestBed } from '@angular/core/testing';
import { FriendRequestData } from '@app/core/interfaces/friend-request-data';
import { SocketService } from '@app/core/websocket/services/socket-service/socket.service';
import { AccountListenerService } from './account-listener.service';

describe('AccountListenerService', () => {
    let service: AccountListenerService;
    let listeners: Record<string, (payload: unknown) => void>;

    beforeEach(() => {
        listeners = {};

        TestBed.configureTestingModule({
            providers: [
                AccountListenerService,
                {
                    provide: SocketService,
                    useValue: {
                        on: (event: string, callback: (payload: unknown) => void) => {
                            listeners[event] = callback;
                        },
                    },
                },
            ],
        });

        service = TestBed.inject(AccountListenerService);
    });

    it('should map account relation flags correctly', () => {
        service.friends = ['friend-1'];
        service.friendsThatUserRequested = ['requested-1'];
        service.blocked = ['blocked-1'];
        service.usersBlockingMe = ['blocked-by-1'];
        service.friendRequestsReceived = [{ requestId: 'req-1', senderBasicInfo: { userId: 'received-1' } } as FriendRequestData];

        const mapped = service.mapAccounts([
            { userId: 'friend-1', pseudonym: 'friend', avatarUrl: 'friend.png' },
            { userId: 'requested-1', pseudonym: 'requested', avatarUrl: 'requested.png' },
            { userId: 'blocked-1', pseudonym: 'blocked', avatarUrl: 'blocked.png' },
            { userId: 'blocked-by-1', pseudonym: 'blockedBy', avatarUrl: 'blockedBy.png' },
            { userId: 'received-1', pseudonym: 'received', avatarUrl: 'received.png' },
        ]);

        expect(mapped[0].isFriend).toBeTrue();
        expect(mapped[1].isRequestSent).toBeTrue();
        expect(mapped[2].isBlocked).toBeTrue();
        expect(mapped[3].isBlockingMe).toBeTrue();
        expect(mapped[4].isRequestReceived).toBeTrue();
    });

    it('setUpListeners should update state and emit accountsChanged$', () => {
        const nextSpy = spyOn(service.accountsChanged$, 'next');
        service.accounts = [
            {
                userId: 'u1',
                pseudonym: 'User 1',
                avatarUrl: '',
                isFriend: false,
                isRequestReceived: false,
                isRequestSent: false,
                isBlocked: false,
                isBlockingMe: false,
            },
        ];

        service.setUpListeners();
        listeners.friendRequestsThatUserReceived?.([{ requestId: 'req-2', senderBasicInfo: { userId: 'u2' } }] as FriendRequestData[]);

        expect(service.friendRequestsReceived.length).toBe(1);
        expect(nextSpy).toHaveBeenCalled();
    });
});
