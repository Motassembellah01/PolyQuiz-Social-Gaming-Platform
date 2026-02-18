import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

/**
 * Payload for Auth0 Action → backend sync.
 * When a user signs up or logs in, Auth0 calls POST /accounts/sync with this body.
 */
export class SyncAccountDto {
    @ApiProperty({ description: 'Auth0 user id (sub)', example: 'auth0|abc123' })
    @IsString()
    userId: string;

    @ApiProperty({ description: 'User email from Auth0', example: 'user@example.com' })
    @IsString()
    email: string;

    @ApiProperty({
        description: 'Display name / pseudonym (optional; defaults to email prefix or nickname)',
        example: 'Gamer123',
        required: false,
    })
    @IsOptional()
    @IsString()
    pseudonym?: string;
}
