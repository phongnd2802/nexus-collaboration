import { Body, Controller, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { WorkspaceGuard } from '../../common/guards/workspace.guard';
import { RagAnswerDto, RagAnswerResponse } from './dto/rag-answer.dto';
import { RagService } from './rag.service';

@ApiTags('rag')
@ApiBearerAuth()
@Controller('workspaces/:workspaceId/rag')
@UseGuards(AuthGuard, WorkspaceGuard)
export class RagController {
  constructor(private readonly ragService: RagService) {}

  @Post('answer')
  @ApiOperation({ summary: 'Answer a question using Agentic RAG' })
  @ApiResponse({ status: 200, description: 'RAG answer response' })
  async answer(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: RagAnswerDto,
    @CurrentUser('sub') userId: string,
  ): Promise<RagAnswerResponse> {
    return this.ragService.answer(dto, workspaceId, userId);
  }

  @Post('answer/stream')
  @ApiOperation({ summary: 'Stream an Agentic RAG answer for AI Chat' })
  async answerStream(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: RagAnswerDto,
    @CurrentUser('sub') userId: string,
    @Res() res: Response,
    @Req() req: Request,
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    let closed = false;
    req.on('close', () => {
      closed = true;
    });

    const writeEvent = (event: { type: string; data: any }) => {
      if (!closed) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
    };

    try {
      const result = await this.ragService.streamAnswer(dto, workspaceId, userId, writeEvent);
      writeEvent({ type: 'complete', data: { ...result, actions: [] } });
      if (!closed) {
        res.write('data: [DONE]\n\n');
        res.end();
      }
    } catch (error) {
      writeEvent({ type: 'error', data: { message: error.message } });
      if (!closed) {
        res.end();
      }
    }
  }
}
