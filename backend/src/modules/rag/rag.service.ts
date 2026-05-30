import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { AgentMemoryService } from '../autopilot/langchain/memory.service';
import { RagAnswerDto, RagAnswerResponse } from './dto/rag-answer.dto';

interface StreamEvent {
  type: string;
  data?: any;
}

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);
  private readonly baseUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly memoryService: AgentMemoryService,
  ) {
    this.baseUrl = (
      this.configService.get<string>('AGENTIC_RAG_BASE_URL') || 'http://localhost:8000'
    ).replace(/\/$/, '');
  }

  async answer(dto: RagAnswerDto, workspaceId: string, userId: string): Promise<RagAnswerResponse> {
    const sessionId = dto.sessionId || uuidv4();
    await this.saveUserMessage(sessionId, dto.query, workspaceId, userId);

    try {
      const response = await axios.post(
        `${this.baseUrl}/api/v1/supervisor/answer`,
        this.toAgenticRagPayload(dto),
        { timeout: this.configService.get<number>('AGENTIC_RAG_TIMEOUT_MS') || 120000 },
      );

      const mapped = this.mapAnswerResponse(response.data, sessionId);
      if (mapped.message) {
        await this.saveAssistantMessage(sessionId, mapped.message);
      }
      return mapped;
    } catch (error) {
      const message = this.extractErrorMessage(error);
      this.logger.error(`[RAG] Answer request failed: ${message}`);
      throw new InternalServerErrorException(message);
    }
  }

  async streamAnswer(
    dto: RagAnswerDto,
    workspaceId: string,
    userId: string,
    onStream: (event: StreamEvent) => void,
  ): Promise<RagAnswerResponse> {
    const sessionId = dto.sessionId || uuidv4();
    await this.saveUserMessage(sessionId, dto.query, workspaceId, userId);

    let finalMessage = '';
    let finalCitations: any[] = [];
    let finalNeedsClarification = false;
    let finalClarificationQuestions: string[] = [];

    try {
      const response = await axios.post(
        `${this.baseUrl}/api/v1/supervisor/answer/stream`,
        this.toAgenticRagPayload(dto),
        {
          responseType: 'stream',
          timeout: this.configService.get<number>('AGENTIC_RAG_STREAM_TIMEOUT_MS') || 300000,
          headers: { Accept: 'text/event-stream' },
        },
      );

      onStream({ type: 'status', data: { status: 'thinking', message: 'Searching knowledge base' } });

      for await (const event of this.parseSseStream(response.data)) {
        const eventType = event.type || event.data?.type;
        const payload = event.data || event;

        if (eventType === 'answer') {
          finalMessage = payload.answer || '';
          finalCitations = payload.citations || [];
          if (finalMessage) {
            onStream({ type: 'text_delta', data: { content: finalMessage } });
          }
          continue;
        }

        if (eventType === 'complete') {
          const data = payload.data || payload;
          finalMessage = data.answer || data.final_answer || finalMessage;
          finalCitations = data.citations || finalCitations;
          finalNeedsClarification = !!data.needs_clarification;
          finalClarificationQuestions = data.clarification_questions || [];

          if (!finalMessage && finalNeedsClarification && finalClarificationQuestions.length > 0) {
            finalMessage = finalClarificationQuestions.join('\n');
            onStream({ type: 'text_delta', data: { content: finalMessage } });
          }
          continue;
        }

        if (eventType === 'error') {
          const message = payload.message || payload.error || 'Agentic RAG stream failed';
          onStream({ type: 'error', data: { message } });
        }
      }

      const result: RagAnswerResponse = {
        success: true,
        sessionId,
        message: finalMessage,
        answer: finalMessage,
        citations: finalCitations,
        needsClarification: finalNeedsClarification,
        clarificationQuestions: finalClarificationQuestions,
      };

      if (finalMessage) {
        await this.saveAssistantMessage(sessionId, finalMessage);
      }

      return result;
    } catch (error) {
      const message = this.extractErrorMessage(error);
      this.logger.error(`[RAG] Stream request failed: ${message}`);
      return {
        success: false,
        sessionId,
        message: 'I encountered an error while answering your question. Please try again.',
        error: message,
      };
    }
  }

  private toAgenticRagPayload(dto: RagAnswerDto) {
    return {
      query: dto.query,
      limit: dto.limit || 10,
      doc_id: dto.docId,
      has_tables: dto.hasTables,
      has_images: dto.hasImages,
      include_trace: dto.includeTrace === true,
    };
  }

  private mapAnswerResponse(response: any, sessionId: string): RagAnswerResponse {
    const data = response?.data || {};
    const answer = data.answer || '';
    return {
      success: response?.success !== false,
      sessionId,
      message: answer,
      answer,
      citations: data.citations || [],
      needsClarification: !!data.needs_clarification,
      clarificationQuestions: data.clarification_questions || [],
      trace: data.trace,
      error: response?.error?.message,
    };
  }

  private async *parseSseStream(stream: NodeJS.ReadableStream): AsyncGenerator<any> {
    let buffer = '';

    for await (const chunk of stream) {
      buffer += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk);
      const parts = buffer.split('\n\n');
      buffer = parts.pop() || '';

      for (const part of parts) {
        const dataLines = part
          .split('\n')
          .filter((line) => line.startsWith('data:'))
          .map((line) => line.replace(/^data:\s?/, ''));

        if (dataLines.length === 0) continue;

        const data = dataLines.join('\n').trim();
        if (!data || data === '[DONE]') continue;

        try {
          yield JSON.parse(data);
        } catch (error) {
          this.logger.warn(`[RAG] Could not parse SSE data: ${data.substring(0, 120)}`);
        }
      }
    }
  }

  private async saveUserMessage(
    sessionId: string,
    content: string,
    workspaceId: string,
    userId: string,
  ): Promise<void> {
    await this.memoryService.addMessage(
      sessionId,
      { role: 'user', content, timestamp: new Date().toISOString() },
      { workspaceId, userId },
    );
  }

  private async saveAssistantMessage(sessionId: string, content: string): Promise<void> {
    await this.memoryService.addMessage(sessionId, {
      role: 'assistant',
      content,
      timestamp: new Date().toISOString(),
      actions: [],
    });
  }

  private extractErrorMessage(error: any): string {
    return (
      error?.response?.data?.detail ||
      error?.response?.data?.message ||
      error?.response?.data?.error?.message ||
      error?.message ||
      'Agentic RAG service unavailable'
    );
  }
}
