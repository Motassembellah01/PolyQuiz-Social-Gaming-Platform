import { Friend, FriendDocument } from '@app/model/database/friend';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model } from 'mongoose';

@Injectable()
export class FriendRepository {
    constructor(@InjectModel(Friend.name) private readonly friendModel: Model<FriendDocument>) {}

    async findPendingRequestBetweenUsers(firstUserId: string, secondUserId: string, session?: ClientSession): Promise<FriendDocument | null> {
        return this.friendModel
            .findOne({
                $or: [
                    { senderId: firstUserId, receiverId: secondUserId, status: 'pending' },
                    { senderId: secondUserId, receiverId: firstUserId, status: 'pending' },
                ],
            })
            .session(session ?? null)
            .exec();
    }

    async findAcceptedFriendshipBetweenUsers(firstUserId: string, secondUserId: string, session?: ClientSession): Promise<FriendDocument | null> {
        return this.friendModel
            .findOne({
                $or: [
                    { senderId: firstUserId, receiverId: secondUserId, status: 'accepted' },
                    { senderId: secondUserId, receiverId: firstUserId, status: 'accepted' },
                ],
            })
            .session(session ?? null)
            .exec();
    }

    async findByRequestId(requestId: string, session?: ClientSession): Promise<FriendDocument | null> {
        return this.friendModel
            .findOne({ requestId })
            .session(session ?? null)
            .exec();
    }

    async createPendingRequest(senderId: string, receiverId: string, session?: ClientSession): Promise<FriendDocument> {
        const [createdRequest] = await this.friendModel.create(
            [
                {
                    senderId,
                    receiverId,
                    status: 'pending',
                    pairKey: this.buildPairKey(senderId, receiverId),
                },
            ],
            session ? { session } : undefined,
        );
        return createdRequest;
    }

    async save(request: FriendDocument, session?: ClientSession): Promise<FriendDocument> {
        return request.save(session ? { session } : undefined);
    }

    async delete(request: FriendDocument, session?: ClientSession): Promise<void> {
        await request.deleteOne(session ? { session } : undefined);
    }

    buildPairKey(userIdA: string, userIdB: string): string {
        return [userIdA, userIdB].sort().join('#');
    }
}
