import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';

/**
 * DTO for requesting access to a note the user doesn't have permission to view.
 */
export class RequestNoteAccessDto {
  @ApiPropertyOptional({
    description: 'Optional message from the requester to the note owner',
    example: 'Hi, I would like to view this note for the project meeting.',
  })
  @IsOptional()
  @IsString()
  message?: string;
}

/**
 * DTO for the owner to respond (approve or deny) a note access request.
 */
export class RespondNoteAccessDto {
  @ApiProperty({
    description: 'Action taken by the owner',
    enum: ['approve', 'deny'],
    example: 'approve',
  })
  @IsEnum(['approve', 'deny'])
  action: 'approve' | 'deny';
}
