import { Injectable, BadGatewayException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { Readable } from 'stream';
import { randomUUID } from 'crypto';

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
}
