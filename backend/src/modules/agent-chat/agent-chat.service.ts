import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { Readable } from 'stream';

@Injectable()
export class AgentChatService {
  private readonly logger = new Logger(AgentChatService.name);

  constructor(private readonly config: ConfigService) {}

  async proxyChatCompletions(body: any, user: any, workspaceId: string, response: Response): Promise<void> {
    const baseUrl = this.config.get<string>('NEXUS_AI_BASE_URL', 'http://localhost:8000')!;
    const apiKey = this.config.get<string>('NEXUS_AI_API_KEY', '');
    const timeoutMs = Number(this.config.get<string>('NEXUS_AI_TIMEOUT_MS', '60000'));
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const upstreamBody = {
      ...body,
      metadata: {
        ...(body?.metadata || {}),
        user_id: user?.sub || user?.userId,
        workspace_id: workspaceId,
      },
    };

    try {
      const upstream = await fetch(`${baseUrl.replace(/\/$/, '')}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: body?.stream ? 'text/event-stream' : 'application/json',
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

      if (body?.stream) {
        response.setHeader('Cache-Control', 'no-cache');
        response.setHeader('Connection', 'keep-alive');
        response.setHeader('Content-Type', upstream.headers.get('content-type') || 'text/event-stream');
      }

      if (!upstream.body) {
        response.end();
        return;
      }

      Readable.fromWeb(upstream.body as any).pipe(response);
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
