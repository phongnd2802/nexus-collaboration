import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsIn, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class AiChatMessageDto {
  @ApiProperty({ enum: ['user', 'assistant', 'system'] })
  @IsIn(['user', 'assistant', 'system'])
  role: 'user' | 'assistant' | 'system';

  @ApiProperty()
  @IsString()
  content: string;
}

export class AiChatStreamDto {
  @ApiProperty({ description: 'Current user message' })
  @IsString()
  @MaxLength(20000)
  message: string;

  @ApiPropertyOptional({ type: [AiChatMessageDto] })
  @IsOptional()
  @IsArray()
  messages?: AiChatMessageDto[];

  @ApiPropertyOptional({ description: 'Model override' })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({ description: 'Additional UI/client context' })
  @IsOptional()
  @IsObject()
  context?: Record<string, any>;
}

