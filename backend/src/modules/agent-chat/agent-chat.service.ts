import { BadGatewayException, HttpException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';

@Injectable()
export class AgentChatService {
  private readonly logger = new Logger(AgentChatService.name);

  constructor(private readonly config: ConfigService) {}

  async proxyUiChatCompletions(
    body: any,
    user: any,
    workspaceId: string,
    response: Response,
    sessionId?: string,
  ): Promise<void> {
    await this.proxyUiToNexusAi('/v1/ui/chat/completions', body, user, workspaceId, response, sessionId);
  }

  async proxyUiSessionChatCompletions(
    body: any,
    user: any,
    workspaceId: string,
    sessionId: string,
    response: Response,
  ): Promise<void> {
    await this.proxyUiToNexusAi(`/v1/ui/sessions/${sessionId}/chat/completions`, body, user, workspaceId, response, sessionId);
  }

  async proxyUiResume(
    body: any,
    user: any,
    workspaceId: string,
    sessionId: string,
    runId: string,
    response: Response,
  ): Promise<void> {
    await this.proxyUiToNexusAi(`/v1/ui/sessions/${sessionId}/runs/${runId}/resume`, body, user, workspaceId, response, sessionId);
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

  async deleteSession(user: any, workspaceId: string, sessionId: string): Promise<any> {
    const baseUrl = this.config.get<string>('NEXUS_AI_BASE_URL', 'http://localhost:8000')!;
    const apiKey = this.config.get<string>('NEXUS_AI_API_KEY', '');
    const timeoutMs = Number(this.config.get<string>('NEXUS_AI_TIMEOUT_MS', '60000'));
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const upstream = await fetch(`${baseUrl.replace(/\/$/, '')}/v1/sessions/${sessionId}`, {
        method: 'DELETE',
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
        const message = payload?.error?.message || payload?.message || 'Failed to delete Nexus AI session';
        throw new HttpException(message, upstream.status);
      }

      return payload;
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        this.logger.error(`Nexus AI delete session request timed out after ${timeoutMs}ms`);
        throw new BadGatewayException('Nexus AI request timed out');
      }

      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(`Failed to delete Nexus AI session: ${error?.message || error}`);
      throw new BadGatewayException('Failed to reach Nexus AI service');
    } finally {
      clearTimeout(timeout);
    }
  }

  private async proxyUiToNexusAi(
    path: string,
    body: any,
    user: any,
    workspaceId: string,
    response: Response,
    _sessionId?: string,
  ): Promise<void> {
    const baseUrl = this.config.get<string>('NEXUS_AI_BASE_URL', 'http://localhost:8000')!;
    const apiKey = this.config.get<string>('NEXUS_AI_API_KEY', '');
    const timeoutMs = Number(this.config.get<string>('NEXUS_AI_TIMEOUT_MS', '60000'));
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const upstream = await fetch(`${baseUrl.replace(/\/$/, '')}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          ...(apiKey ? { 'x-api-key': apiKey } : {}),
          'x-user-id': user?.sub || user?.userId,
          'x-workspace-id': workspaceId,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      response.status(upstream.status);
      upstream.headers.forEach((value, key) => {
        if (!['content-encoding', 'content-length', 'transfer-encoding'].includes(key.toLowerCase())) {
          response.setHeader(key, value);
        }
      });
      response.setHeader('Cache-Control', 'no-cache');
      response.setHeader('Connection', 'keep-alive');
      response.setHeader('Content-Type', upstream.headers.get('content-type') || 'text/event-stream');

      if (!upstream.body) {
        response.end();
        return;
      }

      await pipeline(Readable.fromWeb(upstream.body as any), response);
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        this.logger.error(`Nexus AI UI request timed out after ${timeoutMs}ms`);
        throw new BadGatewayException('Nexus AI request timed out');
      }

      this.logger.error(`Failed to proxy Nexus AI UI request: ${error?.message || error}`);
      throw new BadGatewayException('Failed to reach Nexus AI service');
    } finally {
      clearTimeout(timeout);
    }
  }
}
