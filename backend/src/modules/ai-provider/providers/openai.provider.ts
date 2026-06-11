/**
 * OpenAI provider.
 *
 *   AI_PROVIDER=openai
 *   OPENAI_API_KEY=sk-...
 *   AI_MODEL=gpt-4o-mini                # optional text default
 *   AI_VISION_MODEL=gpt-4o              # optional vision default
 *   AI_EMBEDDING_MODEL=text-embedding-3-small   # optional
 *
 * Pure REST via fetch — no SDK dep. The provider exposes chat
 * completions, vision, embeddings, and function/tool calling through
 * the standard /v1 endpoints.
 *
 * Also handles "OpenAI-compatible" services by honoring OPENAI_BASE_URL,
 * so you can point this at Azure OpenAI (different base URL), LiteLLM,
 * LocalAI, OpenRouter, or any other compatible gateway.
 */
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AiProvider,
  AiProviderNotConfiguredError,
  AnalyzeImageInput,
  ChatMessage,
  GenerateEmbeddingInput,
  GenerateEmbeddingResult,
  GenerateTextInput,
  GenerateTextResult,
  NormalizedToolCall,
  StopReason,
  ToolChoice,
  ToolDefinition,
} from './ai-provider.interface';

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';

/** Wire-level message shape for OpenAI's /chat/completions. */
type OpenAiWireMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
  name?: string;
};

type OpenAiWireToolCall = {
  id?: string;
  type?: 'function';
  function?: { name?: string; arguments?: string };
};

export class OpenAiProvider implements AiProvider {
  readonly name = 'openai' as const;
  private readonly logger = new Logger('OpenAiProvider');

  protected readonly apiKey: string;
  protected readonly baseUrl: string;
  protected readonly defaultModel: string;
  protected readonly defaultVisionModel: string;
  protected readonly defaultEmbeddingModel: string;
  protected readonly openRouterReferer: string;
  protected readonly openRouterTitle: string;

  constructor(config: ConfigService) {
    this.apiKey =
      config.get<string>('OPENAI_API_KEY', '') || config.get<string>('OPENROUTER_API_KEY', '');
    this.baseUrl = (
      config.get<string>('OPENAI_BASE_URL', DEFAULT_BASE_URL) || DEFAULT_BASE_URL
    ).replace(/\/+$/, '');
    this.defaultModel = config.get<string>('AI_MODEL', 'gpt-4o-mini');
    this.defaultVisionModel = config.get<string>('AI_VISION_MODEL', 'gpt-4o');
    this.defaultEmbeddingModel = config.get<string>('AI_EMBEDDING_MODEL', 'text-embedding-3-small');
    this.openRouterReferer = config.get<string>('OPENROUTER_HTTP_REFERER', '');
    this.openRouterTitle = config.get<string>('OPENROUTER_APP_TITLE', 'Nexus');

    if (this.isAvailable()) {
      this.logger.log(`OpenAI provider configured (${this.baseUrl}, model=${this.defaultModel})`);
    } else {
      this.logger.warn('OpenAI provider selected but OPENAI_API_KEY / OPENROUTER_API_KEY missing');
    }
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  protected async api(path: string, body: any): Promise<any> {
    if (!this.isAvailable()) {
      throw new AiProviderNotConfiguredError(this.name, ['OPENAI_API_KEY or OPENROUTER_API_KEY']);
    }
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };

    if (this.baseUrl.includes('openrouter.ai')) {
      if (this.openRouterReferer) {
        headers['HTTP-Referer'] = this.openRouterReferer;
      }
      if (this.openRouterTitle) {
        headers['X-OpenRouter-Title'] = this.openRouterTitle;
      }
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`${this.name} API ${path} failed: ${res.status} ${text}`);
    }
    return res.json();
  }

  async generateText(input: GenerateTextInput): Promise<GenerateTextResult> {
    const payload: any = {
      model: input.model ?? this.defaultModel,
      messages: input.messages.map(translateMessageToOpenAi),
      max_tokens: input.maxTokens ?? 2000,
      temperature: input.temperature ?? 0.7,
    };
    if (input.jsonMode) {
      payload.response_format = { type: 'json_object' };
    }
    if (input.tools && input.tools.length > 0) {
      payload.tools = input.tools.map(translateToolToOpenAi);
      const tc = translateToolChoiceToOpenAi(input.toolChoice);
      if (tc !== undefined) payload.tool_choice = tc;
    }

    const res = (await this.api('/chat/completions', payload)) as {
      choices: Array<{
        message: {
          content: string | null;
          tool_calls?: OpenAiWireToolCall[];
        };
        finish_reason?: string;
      }>;
      model: string;
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
      };
    };

    const choice = res.choices?.[0];
    const toolCalls = normalizeOpenAiToolCalls(choice?.message?.tool_calls);
    const stopReason = mapOpenAiFinishReason(choice?.finish_reason, toolCalls.length > 0);

    return {
      text: choice?.message?.content ?? '',
      model: res.model,
      provider: this.name,
      ...(toolCalls.length > 0 ? { toolCalls } : {}),
      ...(stopReason ? { stopReason } : {}),
      usage: res.usage
        ? {
            promptTokens: res.usage.prompt_tokens,
            completionTokens: res.usage.completion_tokens,
            totalTokens: res.usage.total_tokens,
          }
        : undefined,
    };
  }

  async analyzeImage(input: AnalyzeImageInput): Promise<GenerateTextResult> {
    // OpenAI's vision input goes through /chat/completions with a
    // user message containing multiple content parts.
    const payload: any = {
      model: input.model ?? this.defaultVisionModel,
      max_tokens: input.maxTokens ?? 2000,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: input.prompt },
            {
              type: 'image_url',
              image_url: { url: input.image },
            },
          ],
        },
      ],
    };

    const res = (await this.api('/chat/completions', payload)) as {
      choices: Array<{ message: { content: string } }>;
      model: string;
      usage?: any;
    };
    return {
      text: res.choices?.[0]?.message?.content ?? '',
      model: res.model,
      provider: this.name,
      usage: res.usage
        ? {
            promptTokens: res.usage.prompt_tokens,
            completionTokens: res.usage.completion_tokens,
            totalTokens: res.usage.total_tokens,
          }
        : undefined,
    };
  }

  async generateEmbedding(input: GenerateEmbeddingInput): Promise<GenerateEmbeddingResult> {
    const texts = Array.isArray(input.text) ? input.text : [input.text];
    const model = input.model ?? this.defaultEmbeddingModel;
    const res = (await this.api('/embeddings', {
      model,
      input: texts,
    })) as {
      data: Array<{ embedding: number[] }>;
      model: string;
    };
    const embeddings = res.data.map((d) => d.embedding);
    return {
      embeddings,
      model: res.model,
      provider: this.name,
      dimensions: embeddings[0]?.length ?? 0,
    };
  }

  async streamText(
    input: GenerateTextInput,
    onToken: (token: string) => void,
  ): Promise<GenerateTextResult> {
    if (!this.isAvailable()) {
      throw new AiProviderNotConfiguredError(this.name, ['OPENAI_API_KEY or OPENROUTER_API_KEY']);
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };

    if (this.baseUrl.includes('openrouter.ai')) {
      if (this.openRouterReferer) {
        headers['HTTP-Referer'] = this.openRouterReferer;
      }
      if (this.openRouterTitle) {
        headers['X-OpenRouter-Title'] = this.openRouterTitle;
      }
    }

    const payload: any = {
      model: input.model ?? this.defaultModel,
      messages: input.messages.map(translateMessageToOpenAi),
      max_tokens: input.maxTokens ?? 2000,
      temperature: input.temperature ?? 0.7,
      stream: true,
    };

    if (input.jsonMode) {
      payload.response_format = { type: 'json_object' };
    }
    if (input.tools && input.tools.length > 0) {
      payload.tools = input.tools.map(translateToolToOpenAi);
      const tc = translateToolChoiceToOpenAi(input.toolChoice);
      if (tc !== undefined) payload.tool_choice = tc;
    }

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`${this.name} API /chat/completions failed: ${res.status} ${text}`);
    }

    const reader = res.body?.getReader();
    if (!reader) {
      throw new Error('Streaming response body is missing');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let text = '';
    let model = input.model ?? this.defaultModel;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;

          const payloadText = line.slice(6).trim();
          if (!payloadText || payloadText === '[DONE]') continue;

          const chunk = JSON.parse(payloadText) as {
            model?: string;
            choices?: Array<{
              delta?: { content?: string | null };
            }>;
          };

          if (chunk.model) model = chunk.model;
          const token = chunk.choices?.[0]?.delta?.content ?? '';
          if (!token) continue;

          text += token;
          onToken(token);
        }
      }
    } finally {
      reader.releaseLock();
    }

    return {
      text,
      model,
      provider: this.name,
      stopReason: 'stop',
    };
  }
}

// ---------------------------------------------------------------------------
// Translation helpers (exported so groq / ollama can reuse the same wire
// format, and so the smoke test can assert on them).
// ---------------------------------------------------------------------------

export function translateToolToOpenAi(t: ToolDefinition) {
  return {
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  };
}

export function translateToolChoiceToOpenAi(
  choice: ToolChoice | undefined,
): 'auto' | 'none' | 'required' | { type: 'function'; function: { name: string } } | undefined {
  if (choice === undefined) return undefined;
  if (choice === 'auto' || choice === 'none' || choice === 'required') return choice;
  return { type: 'function', function: { name: choice.name } };
}

export function translateMessageToOpenAi(msg: ChatMessage): OpenAiWireMessage {
  if (msg.role === 'tool') {
    return {
      role: 'tool',
      content: msg.content,
      tool_call_id: msg.toolCallId ?? '',
      ...(msg.name ? { name: msg.name } : {}),
    };
  }
  if (msg.role === 'assistant' && msg.toolCalls && msg.toolCalls.length > 0) {
    return {
      role: 'assistant',
      // OpenAI requires null (not empty string) when only tool_calls are present.
      content: msg.content || null,
      tool_calls: msg.toolCalls.map((tc) => ({
        id: tc.id,
        type: 'function' as const,
        function: {
          name: tc.name,
          arguments: tc.argumentsRaw ?? (tc.arguments !== null ? JSON.stringify(tc.arguments) : ''),
        },
      })),
    };
  }
  return { role: msg.role, content: msg.content };
}

export function normalizeOpenAiToolCalls(
  calls: OpenAiWireToolCall[] | undefined,
): NormalizedToolCall[] {
  if (!calls || calls.length === 0) return [];
  return calls.map((c, i) => {
    const raw = c.function?.arguments ?? '';
    let parsed: Record<string, unknown> | null = null;
    if (raw) {
      try {
        parsed = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        parsed = null;
      }
    } else {
      parsed = {};
    }
    return {
      id: c.id ?? `call_${i}`,
      name: c.function?.name ?? '',
      arguments: parsed,
      argumentsRaw: raw || undefined,
    };
  });
}

export function mapOpenAiFinishReason(
  reason: string | undefined,
  hasToolCalls: boolean,
): StopReason | undefined {
  if (hasToolCalls || reason === 'tool_calls' || reason === 'function_call') {
    return 'tool_use';
  }
  switch (reason) {
    case 'stop':
      return 'stop';
    case 'length':
      return 'length';
    case undefined:
      return undefined;
    default:
      return 'other';
  }
}
