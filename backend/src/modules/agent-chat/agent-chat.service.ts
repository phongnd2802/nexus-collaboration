import { Injectable, BadGatewayException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { Readable } from 'stream';
import { randomUUID } from 'crypto';

import {
  createNormalizationState,
  createRunCompletedEvent,
  normalizeAgentChatChunk,
  type NormalizedAgentChatEvent,
} from './agent-chat-events';

@Injectable()
export class AgentChatService {
  constructor(private readonly configService: ConfigService) {}

  async proxy(request: {
    method: string;
    path: string;
    body?: unknown;
    authorization?: string;
    workspaceId: string;
    requestId?: string;
    userId?: string;
    accept?: string;
    lastEventId?: string;
  }, res: Response): Promise<void> {
    const response = await fetch(this.buildUrl(request.path), {
      method: request.method,
      headers: this.buildHeaders(request),
      body: request.body === undefined ? undefined : JSON.stringify(request.body),
    }).catch(error => {
      throw new BadGatewayException(`Failed to reach Nexus AI Service: ${error.message}`);
    });

    res.status(response.status);
    if (this.shouldNormalizeSse(request.accept, response.headers.get('content-type'))) {
      this.prepareSseHeaders(res);
      await this.streamNormalizedEvents(response, res, request.workspaceId);
      return;
    }

    this.copyHeaders(response, res);

    if (!response.body) {
      res.end();
      return;
    }

    if (typeof res.flushHeaders === 'function') {
      res.flushHeaders();
    }

    Readable.fromWeb(response.body as any).pipe(res);
  }

  private shouldNormalizeSse(accept: string | undefined, contentType: string | null): boolean {
    return accept?.includes('text/event-stream') || contentType?.includes('text/event-stream') || false;
  }

  private buildUrl(path: string): string {
    const baseUrl = (this.configService.get<string>('NEXUS_AI_BASE_URL') || 'http://127.0.0.1:8000').replace(
      /\/+$/,
      '',
    );
    return `${baseUrl}/${path.replace(/^\/+/, '')}`;
  }

  private buildHeaders(request: {
    body?: unknown;
    authorization?: string;
    workspaceId: string;
    requestId?: string;
    userId?: string;
    accept?: string;
    lastEventId?: string;
  }): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: request.accept || 'application/json',
      'X-Nexus-Workspace-ID': request.workspaceId,
      'X-Nexus-Request-ID': request.requestId || randomUUID(),
    };

    if (request.authorization) {
      headers.Authorization = request.authorization;
    }

    if (request.userId) {
      headers['X-Nexus-User-ID'] = request.userId;
    }

    if (request.lastEventId) {
      headers['Last-Event-ID'] = request.lastEventId;
    }

    if (request.body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    return headers;
  }

  private copyHeaders(upstream: globalThis.Response, res: Response): void {
    for (const [name, value] of upstream.headers.entries()) {
      const lower = name.toLowerCase();
      if (['connection', 'content-encoding', 'content-length', 'transfer-encoding'].includes(lower)) {
        continue;
      }
      res.setHeader(name, value);
    }
  }

  private prepareSseHeaders(res: Response): void {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    if (typeof res.flushHeaders === 'function') {
      res.flushHeaders();
    }
  }

  private async streamNormalizedEvents(
    upstream: globalThis.Response,
    res: Response,
    workspaceId: string,
  ): Promise<void> {
    const reader = upstream.body?.getReader();
    if (!reader) {
      res.end();
      return;
    }

    const decoder = new TextDecoder();
    const state = createNormalizationState();
    let buffer = '';
    let eventSequence = 0;
    let completed = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const frames = buffer.split('\n\n');
      buffer = frames.pop() || '';

      for (const frame of frames) {
        const parsed = this.parseSseFrame(frame);
        if (!parsed.data) continue;

        if (parsed.data === '[DONE]') {
          this.writeNormalizedSse(res, `evt-${eventSequence++}`, createRunCompletedEvent(state));
          completed = true;
          continue;
        }

        let payload: Record<string, any>;
        try {
          payload = JSON.parse(parsed.data);
        } catch {
          continue;
        }

        const events = normalizeAgentChatChunk(payload, workspaceId, state);
        for (const event of events) {
          this.writeNormalizedSse(res, `evt-${eventSequence++}`, event);
        }
      }
    }

    if (!completed) {
      this.writeNormalizedSse(res, `evt-${eventSequence++}`, createRunCompletedEvent(state));
    }
    res.end();
  }

  private parseSseFrame(frame: string): { event?: string; data?: string } {
    const lines = frame.split('\n');
    let event: string | undefined;
    const data: string[] = [];

    for (const line of lines) {
      if (line.startsWith('event:')) {
        event = line.slice(6).trim();
        continue;
      }
      if (line.startsWith('data:')) {
        data.push(line.slice(5).trimStart());
      }
    }

    return {
      event,
      data: data.length > 0 ? data.join('\n') : undefined,
    };
  }

  private writeNormalizedSse(res: Response, id: string, event: NormalizedAgentChatEvent): void {
    res.write(`id: ${id}\n`);
    res.write(`event: ${event.type}\n`);
    res.write(`data: ${JSON.stringify(event.data)}\n\n`);
  }
}
