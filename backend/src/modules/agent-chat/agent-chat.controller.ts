import { Body, Controller, Delete, Get, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
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

  @Post('ui/workspaces/:workspaceId/chat/completions')
  @ApiOperation({ summary: 'Workspace-scoped Vercel AI UI chat proxy for Nexus AI' })
  async uiWorkspaceChatCompletions(
    @Param('workspaceId') workspaceId: string,
    @Body() body: any,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    await this.agentChat.proxyUiChatCompletions(body, (request as any).user, workspaceId, response);
  }

  @Post('ui/workspaces/:workspaceId/sessions/:sessionId/chat/completions')
  @ApiOperation({ summary: 'Session-scoped Vercel AI UI chat proxy for Nexus AI' })
  async uiSessionChatCompletions(
    @Param('workspaceId') workspaceId: string,
    @Param('sessionId') sessionId: string,
    @Body() body: any,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    await this.agentChat.proxyUiSessionChatCompletions(body, (request as any).user, workspaceId, sessionId, response);
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

  @Delete('workspaces/:workspaceId/sessions/:sessionId')
  @ApiOperation({ summary: 'Delete a Nexus AI session and its in-memory runs' })
  async deleteSession(
    @Param('workspaceId') workspaceId: string,
    @Param('sessionId') sessionId: string,
    @Req() request: Request,
  ): Promise<any> {
    return this.agentChat.deleteSession((request as any).user, workspaceId, sessionId);
  }

}
