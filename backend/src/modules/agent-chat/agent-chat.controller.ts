import { Body, Controller, Get, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
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

  @Post('workspaces/:workspaceId/sessions/:sessionId/chat/completions')
  @ApiOperation({ summary: 'Session-scoped OpenAI-compatible chat completions proxy for Nexus AI' })
  async sessionChatCompletions(
    @Param('workspaceId') workspaceId: string,
    @Param('sessionId') sessionId: string,
    @Body() body: any,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    await this.agentChat.proxySessionChatCompletions(body, (request as any).user, workspaceId, sessionId, response);
  }

  @Get('workspaces/:workspaceId/sessions/:sessionId')
  @ApiOperation({ summary: 'Get a Nexus AI session snapshot for AI Chat hydration' })
  async getSession(
    @Param('workspaceId') workspaceId: string,
    @Param('sessionId') sessionId: string,
    @Req() request: Request,
  ): Promise<any> {
    return this.agentChat.getSessionSnapshot((request as any).user, workspaceId, sessionId);
  }

  @Get('workspaces/:workspaceId/sessions')
  @ApiOperation({ summary: 'List existing Nexus AI sessions for the workspace user' })
  async listSessions(
    @Param('workspaceId') workspaceId: string,
    @Req() request: Request,
  ): Promise<any> {
    return this.agentChat.listSessions((request as any).user, workspaceId);
  }

  @Post('workspaces/:workspaceId/sessions/:sessionId/runs/:runId/resume')
  @ApiOperation({ summary: 'Resume a paused Nexus AI run after tool approval' })
  async resumeRun(
    @Param('workspaceId') workspaceId: string,
    @Param('sessionId') sessionId: string,
    @Param('runId') runId: string,
    @Body() body: any,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    await this.agentChat.proxyResume(body, (request as any).user, workspaceId, sessionId, runId, response);
  }
}
