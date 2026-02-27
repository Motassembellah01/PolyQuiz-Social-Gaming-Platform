import { AccountService } from '@app/services/account/account.service';
import { BadRequestException } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Connection } from 'mongoose';
import { FriendApplicationService } from './friend-application.service';
import { FriendRepository } from './friend.repository';

describe('FriendApplicationService', () => {
    let service: FriendApplicationService;
    let repository: jest.Mocked<FriendRepository>;
    let accountService: jest.Mocked<AccountService>;
    let connection: { startSession: jest.Mock };
    let session: { withTransaction: jest.Mock; endSession: jest.Mock };

    beforeEach(async () => {
        repository = {
            findPendingRequestBetweenUsers: jest.fn(),
            findAcceptedFriendshipBetweenUsers: jest.fn(),
            findByRequestId: jest.fn(),
            createPendingRequest: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
            buildPairKey: jest.fn(),
        } as unknown as jest.Mocked<FriendRepository>;

        accountService = {
            findBasicInfoByUserId: jest.fn(),
            addFriendRequest: jest.fn(),
            removeFriendRequestFromAccount: jest.fn(),
            addFriend: jest.fn(),
            removeFriend: jest.fn(),
            addToBlockList: jest.fn(),
            removeFromBlockList: jest.fn(),
        } as unknown as jest.Mocked<AccountService>;

        session = {
            withTransaction: jest.fn(async (callback: () => Promise<void>) => callback()),
            endSession: jest.fn(),
        };

        connection = {
            startSession: jest.fn().mockResolvedValue(session),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                FriendApplicationService,
                { provide: FriendRepository, useValue: repository },
                { provide: AccountService, useValue: accountService },
                { provide: getConnectionToken(), useValue: connection as unknown as Connection },
            ],
        }).compile();

        service = module.get<FriendApplicationService>(FriendApplicationService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('sendFriendRequest should reject self request', async () => {
        await expect(service.sendFriendRequest('user-1', 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('sendFriendRequest should persist request and update account projections', async () => {
        repository.findPendingRequestBetweenUsers.mockResolvedValue(null);
        repository.createPendingRequest.mockResolvedValue({ requestId: 'req-1' } as never);
        accountService.findBasicInfoByUserId.mockResolvedValue({ userId: 'sender-1' });

        await service.sendFriendRequest('sender-1', 'receiver-1');

        expect(repository.findPendingRequestBetweenUsers).toHaveBeenCalledWith('sender-1', 'receiver-1', session);
        expect(accountService.addFriendRequest).toHaveBeenCalledWith('receiver-1', { userId: 'sender-1' }, 'req-1', session);
    });

    it('acceptFriendRequest should set request to accepted and update friend lists', async () => {
        const request = { status: 'pending' } as { status: string };
        repository.findByRequestId.mockResolvedValue(request as never);

        await service.acceptFriendRequest('req-2');

        expect(request.status).toBe('accepted');
        expect(repository.save).toHaveBeenCalledWith(request as never, session);
        expect(accountService.addFriend).toHaveBeenCalledWith(request as never, session);
    });

    it('blockUserWithPendingRequest should reject when no pending request exists', async () => {
        repository.findPendingRequestBetweenUsers.mockResolvedValue(null);

        await expect(service.blockUserWithPendingRequest('user-1', 'user-2')).rejects.toThrow(BadRequestException);
    });
});
