import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ServerConfigService } from '@app/core/services/server-config/server-config.service';
import { FriendService } from './friend.service';

describe('FriendService', () => {
    let service: FriendService;
    let httpTestingController: HttpTestingController;
    const serverUrl = 'http://localhost:3000/api';

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                FriendService,
                {
                    provide: ServerConfigService,
                    useValue: {
                        serverUrl,
                    },
                },
                provideHttpClient(withInterceptorsFromDi()),
                provideHttpClientTesting(),
            ],
        });

        service = TestBed.inject(FriendService);
        service.auth0Id = 'sender-1';
        httpTestingController = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpTestingController.verify();
    });

    it('should send friend request to expected route', () => {
        service.sendFriendRequest('receiver-1').subscribe();

        const request = httpTestingController.expectOne(`${serverUrl}/friends/send/sender-1/receiver-1`);
        expect(request.request.method).toBe('POST');
        request.flush({});
    });

    it('should call remove friend route with auth0Id and friendId', () => {
        service.removeFriend('friend-1').subscribe();

        const request = httpTestingController.expectOne(`${serverUrl}/friends/remove/sender-1/friend-1`);
        expect(request.request.method).toBe('DELETE');
        request.flush({});
    });
});
