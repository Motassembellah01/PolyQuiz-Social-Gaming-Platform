import { FriendApplicationService } from '@app/services/friend/friend-application.service';
import { Controller, Delete, Param, Post } from '@nestjs/common';

@Controller('friends')
export class FriendController {
    constructor(private readonly friendApplicationService: FriendApplicationService) {}

    @Post('send/:senderId/:receiverId')
    async sendFriendRequest(@Param('senderId') senderId: string, @Param('receiverId') receiverId: string): Promise<void> {
        await this.friendApplicationService.sendFriendRequest(senderId, receiverId);
    }

    @Post('accept/:requestId')
    async acceptFriendRequest(@Param('requestId') requestId: string): Promise<void> {
        await this.friendApplicationService.acceptFriendRequest(requestId);
    }

    @Post('reject/:requestId')
    async rejectFriendRequest(@Param('requestId') requestId: string): Promise<void> {
        await this.friendApplicationService.rejectFriendRequest(requestId);
    }

    @Delete('remove/:userId/:friendId')
    async removeFriend(@Param('userId') userId: string, @Param('friendId') friendId: string): Promise<void> {
        await this.friendApplicationService.removeFriend(userId, friendId);
    }

    @Post('block/:userId/:blockedUserId')
    async blockNormalUser(@Param('userId') userId: string, @Param('blockedUserId') blockedUserId: string): Promise<void> {
        await this.friendApplicationService.blockNormalUser(userId, blockedUserId);
    }

    @Post('blockFriend/:userId/:blockedFriendId')
    async blockFriend(@Param('userId') userId: string, @Param('blockedFriendId') blockedFriendId: string): Promise<void> {
        await this.friendApplicationService.blockFriend(userId, blockedFriendId);
    }

    @Post('blockUserWithPendingRequest/:userId/:otherUserId')
    async blockUserWithPendingRequest(@Param('userId') userId: string, @Param('otherUserId') otherUserId: string): Promise<void> {
        await this.friendApplicationService.blockUserWithPendingRequest(userId, otherUserId);
    }

    @Post('cancelRequest/:senderId/:receiverId')
    async cancelFriendRequest(@Param('senderId') senderId: string, @Param('receiverId') receiverId: string): Promise<void> {
        await this.friendApplicationService.cancelFriendRequest(senderId, receiverId);
    }

    @Post('unblock/:userId/:blockedUserId')
    async unblockUser(@Param('userId') userId: string, @Param('blockedUserId') blockedUserId: string): Promise<void> {
        await this.friendApplicationService.unblockUser(userId, blockedUserId);
    }
}
