import { Body, Controller, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthGuard } from '../../common/guards/auth.guard';
import { WorkspaceGuard } from '../../common/guards/workspace.guard';
import { AgentChatService } from './agent-chat.service';

@ApiTags('ai')
@ApiBearerAuth()
@Controller('agent-chat')
@UseGuards(AuthGuard, WorkspaceGuard)
export class AgentChatController {
  constructor(private readonly agentChat: AgentChatService) {}

  @Post('chat/completions')
  @ApiOperation({ summary: 'OpenAI-compatible chat completions proxy for Nexus AI' })
  async chatCompletions(
    @Body() body: any,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    const workspaceId = String(
      request.headers['x-workspace-id'] || request.body?.workspaceId || request.query?.workspaceId || '',
    );
    await this.agentChat.proxyChatCompletions(body, (request as any).user, workspaceId, response);
  }

  @Post('workspaces/:workspaceId/chat/completions')
  @ApiOperation({ summary: 'Workspace-scoped OpenAI-compatible chat completions proxy for Nexus AI' })
  async workspaceChatCompletions(
    @Param('workspaceId') workspaceId: string,
    @Body() body: any,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    await this.agentChat.proxyChatCompletions(body, (request as any).user, workspaceId, response);
  }
}
