import { Body, Controller, Delete, Get, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';

import { AuthGuard } from '../../common/guards/auth.guard';
import { WorkspaceGuard } from '../../common/guards/workspace.guard';
import { AgentChatService } from './agent-chat.service';

@Controller('agent-chat')
@UseGuards(AuthGuard, WorkspaceGuard)
export class AgentChatController {
  constructor(private readonly agentChatService: AgentChatService) {}

  @Post('ui/workspaces/:workspaceId/chat/completions')
  async createChat(
    @Param('workspaceId') workspaceId: string,
    @Body() body: unknown,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    await this.proxy(req, res, 'POST', `/agent-chat/ui/workspaces/${workspaceId}/chat/completions`, workspaceId, body);
  }

  @Post('ui/workspaces/:workspaceId/sessions/:sessionId/chat/completions')
  async continueChat(
    @Param('workspaceId') workspaceId: string,
    @Param('sessionId') sessionId: string,
    @Body() body: unknown,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    await this.proxy(
      req,
      res,
      'POST',
      `/agent-chat/ui/workspaces/${workspaceId}/sessions/${sessionId}/chat/completions`,
      workspaceId,
      body,
    );
  }

  @Get('workspaces/:workspaceId/sessions')
  async listSessions(
    @Param('workspaceId') workspaceId: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    await this.proxy(req, res, 'GET', `/agent-chat/workspaces/${workspaceId}/sessions`, workspaceId);
  }

  @Get('workspaces/:workspaceId/sessions/:sessionId')
  async getSession(
    @Param('workspaceId') workspaceId: string,
    @Param('sessionId') sessionId: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    await this.proxy(req, res, 'GET', `/agent-chat/workspaces/${workspaceId}/sessions/${sessionId}`, workspaceId);
  }

  @Delete('workspaces/:workspaceId/sessions/:sessionId')
  async deleteSession(
    @Param('workspaceId') workspaceId: string,
    @Param('sessionId') sessionId: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    await this.proxy(req, res, 'DELETE', `/agent-chat/workspaces/${workspaceId}/sessions/${sessionId}`, workspaceId);
  }

  private async proxy(
    req: Request,
    res: Response,
    method: string,
    path: string,
    workspaceId: string,
    body?: unknown,
  ): Promise<void> {
    const user = (req as any).user || {};
    await this.agentChatService.proxy(
      {
        method,
        path,
        body,
        authorization: req.headers.authorization,
        workspaceId,
        requestId: this.getHeader(req, 'x-nexus-request-id'),
        userId: user.sub || user.userId,
        accept: this.getHeader(req, 'accept'),
      },
      res,
    );
  }

  private getHeader(req: Request, name: string): string | undefined {
    const value = req.headers[name.toLowerCase()];
    return Array.isArray(value) ? value[0] : value;
  }
}
