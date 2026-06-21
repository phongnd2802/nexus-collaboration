import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

/**
 * DTO for voting on a poll (single or multiple choice)
 */
export class VotePollDto {
  @ApiProperty({ description: 'IDs of the option(s) to vote for', type: [String] })
  @IsArray()
  @IsString({ each: true })
  optionIds: string[];
}
