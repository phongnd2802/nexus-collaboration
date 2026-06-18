import { BadGatewayException, HttpException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';

@Injectable()
export class AgentChatService {
  private readonly logger = new Logger(AgentChatService.name);

  constructor(private readonly config: ConfigService) {}

  async proxyChatCompletions(
    body: any,
    user: any,
    workspaceId: string,
    response: Response,
    sessionId?: string,
  ): Promise<void> {
    await this.proxyToNexusAi('/v1/chat/completions', body, user, workspaceId, response, sessionId);
  }

  async proxySessionChatCompletions(
    body: any,
    user: any,
    workspaceId: string,
    sessionId: string,
    response: Response,
  ): Promise<void> {
    await this.proxyToNexusAi(`/v1/sessions/${sessionId}/chat/completions`, body, user, workspaceId, response, sessionId);
  }

  async proxyResume(
    body: any,
    user: any,
    workspaceId: string,
    sessionId: string,
    runId: string,
    response: Response,
  ): Promise<void> {
    await this.proxyToNexusAi(`/v1/sessions/${sessionId}/runs/${runId}/resume`, body, user, workspaceId, response, sessionId);
  }

  async getSessionSnapshot(user: any, workspaceId: string, sessionId: string): Promise<any> {
    const baseUrl = this.config.get<string>('NEXUS_AI_BASE_URL', 'http://localhost:8000')!;
    const apiKey = this.config.get<string>('NEXUS_AI_API_KEY', '');
    const timeoutMs = Number(this.config.get<string>('NEXUS_AI_TIMEOUT_MS', '60000'));
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const upstream = await fetch(`${baseUrl.replace(/\/$/, '')}/v1/sessions/${sessionId}`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          ...(apiKey ? { 'x-api-key': apiKey } : {}),
          'x-user-id': user?.sub || user?.userId,
          'x-workspace-id': workspaceId,
        },
        signal: controller.signal,
      });

      const payload = await upstream.json().catch(() => ({}));
      if (!upstream.ok) {
        const message = payload?.error?.message || payload?.message || 'Failed to fetch Nexus AI session';
        throw new HttpException(message, upstream.status);
      }

      return payload;
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        this.logger.error(`Nexus AI session request timed out after ${timeoutMs}ms`);
        throw new BadGatewayException('Nexus AI request timed out');
      }

      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(`Failed to fetch Nexus AI session: ${error?.message || error}`);
      throw new BadGatewayException('Failed to reach Nexus AI service');
    } finally {
      clearTimeout(timeout);
    }
  }

  async listSessions(user: any, workspaceId: string): Promise<any> {
    const baseUrl = this.config.get<string>('NEXUS_AI_BASE_URL', 'http://localhost:8000')!;
    const apiKey = this.config.get<string>('NEXUS_AI_API_KEY', '');
    const timeoutMs = Number(this.config.get<string>('NEXUS_AI_TIMEOUT_MS', '60000'));
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const upstream = await fetch(`${baseUrl.replace(/\/$/, '')}/v1/sessions`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          ...(apiKey ? { 'x-api-key': apiKey } : {}),
          'x-user-id': user?.sub || user?.userId,
          'x-workspace-id': workspaceId,
        },
        signal: controller.signal,
      });

      const payload = await upstream.json().catch(() => ({}));
      if (!upstream.ok) {
        const message = payload?.error?.message || payload?.message || 'Failed to list Nexus AI sessions';
        throw new HttpException(message, upstream.status);
      }

      return payload;
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        this.logger.error(`Nexus AI sessions request timed out after ${timeoutMs}ms`);
        throw new BadGatewayException('Nexus AI request timed out');
      }

      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(`Failed to list Nexus AI sessions: ${error?.message || error}`);
      throw new BadGatewayException('Failed to reach Nexus AI service');
    } finally {
      clearTimeout(timeout);
    }
  }

  private async proxyToNexusAi(
    path: string,
    body: any,
    user: any,
    workspaceId: string,
    response: Response,
    sessionId?: string,
  ): Promise<void> {
    const baseUrl = this.config.get<string>('NEXUS_AI_BASE_URL', 'http://localhost:8000')!;
    const apiKey = this.config.get<string>('NEXUS_AI_API_KEY', '');
    const timeoutMs = Number(this.config.get<string>('NEXUS_AI_TIMEOUT_MS', '60000'));
    const expectsStream = Boolean(body?.stream) || path.includes('/resume');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const upstreamBody = {
      ...body,
      metadata: {
        ...(body?.metadata || {}),
        ...(sessionId ? { session_id: sessionId } : {}),
        user_id: user?.sub || user?.userId,
        workspace_id: workspaceId,
      },
    };

    try {
      const upstream = await fetch(`${baseUrl.replace(/\/$/, '')}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: expectsStream ? 'text/event-stream' : 'application/json',
          ...(apiKey ? { 'x-api-key': apiKey } : {}),
        },
        body: JSON.stringify(upstreamBody),
        signal: controller.signal,
      });

      response.status(upstream.status);
      upstream.headers.forEach((value, key) => {
        if (!['content-encoding', 'content-length', 'transfer-encoding'].includes(key.toLowerCase())) {
          response.setHeader(key, value);
        }
      });

      if (expectsStream) {
        response.setHeader('Cache-Control', 'no-cache');
        response.setHeader('Connection', 'keep-alive');
        response.setHeader('Content-Type', upstream.headers.get('content-type') || 'text/event-stream');
      }

      if (!upstream.body) {
        response.end();
        return;
      }

      await pipeline(Readable.fromWeb(upstream.body as any), response);
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        this.logger.error(`Nexus AI request timed out after ${timeoutMs}ms`);
        throw new BadGatewayException('Nexus AI request timed out');
      }

      this.logger.error(`Failed to proxy Nexus AI request: ${error?.message || error}`);
      throw new BadGatewayException('Failed to reach Nexus AI service');
    } finally {
      clearTimeout(timeout);
    }
  }
}
