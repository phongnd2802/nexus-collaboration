import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsArray } from 'class-validator';

export enum SharePermission {
  READ = 'read',
  WRITE = 'write',
  ADMIN = 'admin',
}

export class ShareNoteDto {
  @ApiProperty({
    description: 'Array of user IDs to share with',
    example: ['user-uuid-1', 'user-uuid-2'],
    required: true,
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  user_ids: string[];

  @ApiProperty({
    description: 'Permission level for shared users',
    enum: SharePermission,
    example: SharePermission.WRITE,
    required: false,
    default: SharePermission.WRITE,
  })
  @IsOptional()
  @IsEnum(SharePermission)
  permission?: SharePermission = SharePermission.WRITE;
}

export class UpdateSharePermissionDto {
  @ApiProperty({
    description: 'New permission level for the shared user',
    enum: SharePermission,
    example: SharePermission.READ,
  })
  @IsEnum(SharePermission)
  permission: SharePermission;
}

export class NotePermissionRequestDto {
  @ApiProperty({
    description: 'Desired permission level',
    enum: SharePermission,
    example: SharePermission.WRITE,
  })
  @IsEnum(SharePermission)
  permission: SharePermission;

  @ApiProperty({
    description: 'Optional message to the note owner',
    required: false,
  })
  @IsOptional()
  @IsString()
  message?: string;
}

export class RespondPermissionChangeDto {
  @ApiProperty({
    description: 'Action to take on the permission change request',
    enum: ['approve', 'deny'],
  })
  @IsString()
  action: 'approve' | 'deny';
}
