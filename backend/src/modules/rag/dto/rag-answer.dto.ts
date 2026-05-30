import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class RagAnswerDto {
  @ApiProperty({ description: 'Question to answer with Agentic RAG' })
  @IsString()
  query: string;

  @ApiPropertyOptional({ description: 'Conversation session ID for AI Chat history' })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({ description: 'Maximum retrieval result count', default: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'Restrict answer to a specific indexed document' })
  @IsOptional()
  @IsString()
  docId?: string;

  @ApiPropertyOptional({ description: 'Filter documents/chunks with tables' })
  @IsOptional()
  @IsBoolean()
  hasTables?: boolean;

  @ApiPropertyOptional({ description: 'Filter documents/chunks with images' })
  @IsOptional()
  @IsBoolean()
  hasImages?: boolean;

  @ApiPropertyOptional({ description: 'Include Agentic RAG reasoning trace', default: false })
  @IsOptional()
  @IsBoolean()
  includeTrace?: boolean;
}

export interface RagAnswerResponse {
  success: boolean;
  sessionId?: string;
  message: string;
  answer?: string;
  citations?: any[];
  needsClarification?: boolean;
  clarificationQuestions?: string[];
  trace?: any;
  error?: string;
}
