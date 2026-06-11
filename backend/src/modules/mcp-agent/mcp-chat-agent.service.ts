import { Injectable, Logger } from '@nestjs/common';
import { AiProviderService } from '../ai-provider/ai-provider.service';
import { ChatMessage } from '../ai-provider/providers';
import { OpenAiProvider } from '../ai-provider/providers/openai.provider';
import { AiChatStreamDto } from './dto/ai-chat.dto';
import { AiChatStreamEvent, McpTrustedContext } from './interfaces/mcp-agent.interface';
import { McpToolAdapterService } from './mcp-tool-adapter.service';

@Injectable()
export class McpChatAgentService {
  private readonly logger = new Logger(McpChatAgentService.name);
  private readonly maxToolIterations = 5;
  private readonly maxHistoryMessages = 30;

  constructor(
    private readonly aiProvider: AiProviderService,
    private readonly mcpTools: McpToolAdapterService,
  ) {}

  async streamChat(
    dto: AiChatStreamDto,
    userId: string,
    workspaceId: string,
    onStream: (event: AiChatStreamEvent) => void,
  ): Promise<{ success: boolean; message: string; actions: any[] }> {
    if (!this.aiProvider.isAvailable()) {
      throw new Error('AI provider is not configured');
    }

    onStream({ type: 'status', data: { status: 'thinking', message: 'Thinking' } });
    onStream({
      type: 'step',
      data: {
        id: 'thinking',
        title: 'Thinking',
        description: 'Understanding the request and deciding whether tools are needed.',
        status: 'running',
      },
    });

    const tools = await this.mcpTools.getToolDefinitions();
    onStream({
      type: 'step',
      data: {
        id: 'tools-ready',
        title: 'Tools ready',
        description: `${tools.length} MCP tools available.`,
        status: 'completed',
      },
    });
    const trustedContext = this.buildTrustedContext(dto, userId, workspaceId);
    const messages = this.buildMessages(dto, userId, workspaceId);
    const actions: any[] = [];
    let finalText = '';

    for (let i = 0; i < this.maxToolIterations; i++) {
      const response = await this.aiProvider.getProvider().generateText({
        messages,
        model: dto.model && dto.model !== 'auto' ? dto.model : undefined,
        temperature: 0.7,
        maxTokens: 2000,
        tools: tools.length > 0 ? tools : undefined,
        toolChoice: tools.length > 0 ? 'auto' : undefined,
      });

      if (!response.toolCalls || response.toolCalls.length === 0) {
        onStream({
          type: 'step',
          data: {
            id: 'final-answer',
            title: 'Writing answer',
            description: 'Streaming the final response.',
            status: 'running',
          },
        });
        finalText = await this.streamFinalText(
          messages,
          dto.model && dto.model !== 'auto' ? dto.model : undefined,
          response.text || '',
          onStream,
        );
        onStream({
          type: 'step',
          data: {
            id: 'final-answer',
            title: 'Writing answer',
            description: 'Final response completed.',
            status: 'completed',
          },
        });
        return { success: true, message: finalText, actions };
      }

      messages.push({
        role: 'assistant',
        content: response.text || '',
        toolCalls: response.toolCalls,
      });

      for (const toolCall of response.toolCalls) {
        const tool = this.mcpTools.findTool(toolCall.name, tools);
        if (!tool) {
          const content = `Tool not found: ${toolCall.name}`;
          messages.push({
            role: 'tool',
            toolCallId: toolCall.id,
            name: toolCall.name,
            content,
          });
          actions.push({ tool: toolCall.name, input: toolCall.arguments || {}, success: false, error: content });
          continue;
        }

        try {
          onStream({
            type: 'status',
            data: { status: 'tool', message: `Using ${tool.originalName}` },
          });
          onStream({
            type: 'step',
            data: {
              id: toolCall.id,
              title: `Using ${tool.originalName}`,
              description: this.describeToolInput(toolCall.arguments || {}),
              status: 'running',
              tool: tool.originalName,
              input: toolCall.arguments || {},
            },
          });
          const input = toolCall.arguments || {};
          const content = await this.mcpTools.callTool(tool, input, trustedContext);
          messages.push({
            role: 'tool',
            toolCallId: toolCall.id,
            name: toolCall.name,
            content,
          });
          actions.push({ tool: toolCall.name, input, output: content, success: true });
          onStream({
            type: 'step',
            data: {
              id: toolCall.id,
              title: `Used ${tool.originalName}`,
              description: this.describeToolOutput(content),
              status: 'completed',
              tool: tool.originalName,
              input,
            },
          });
        } catch (error) {
          const message = (error as Error).message;
          this.logger.warn(`MCP tool failed: ${toolCall.name}: ${message}`);
          messages.push({
            role: 'tool',
            toolCallId: toolCall.id,
            name: toolCall.name,
            content: `Tool execution failed: ${message}`,
          });
          actions.push({
            tool: toolCall.name,
            input: toolCall.arguments || {},
            success: false,
            error: message,
          });
          onStream({
            type: 'step',
            data: {
              id: toolCall.id,
              title: `Failed ${tool.originalName}`,
              description: message,
              status: 'error',
              tool: tool.originalName,
              input: toolCall.arguments || {},
            },
          });
        }
      }
    }

    finalText =
      'I reached the tool execution limit before completing the request. Please narrow the request and try again.';
    this.streamText(finalText, onStream);
    return { success: false, message: finalText, actions };
  }

  private buildMessages(dto: AiChatStreamDto, userId: string, workspaceId: string): ChatMessage[] {
    const history = (dto.messages || [])
      .filter((message) => message.content?.trim())
      .slice(-this.maxHistoryMessages)
      .map((message) => ({ role: message.role, content: message.content }) as ChatMessage);

    const last = history[history.length - 1];
    if (!last || last.role !== 'user' || last.content !== dto.message) {
      history.push({ role: 'user', content: dto.message });
    }

    return [
      {
        role: 'system',
        content:
          'You are Nexus AI Chat, a helpful workspace assistant. Answer naturally and concisely. Use MCP tools when they are relevant to the user request. Do not claim a tool was used unless it was actually called.',
      },
      {
        role: 'system',
        content: `Context: userId=${userId}, workspaceId=${workspaceId}, currentView=${dto.context?.currentView || 'ai-chat'}.`,
      },
      ...history,
    ];
  }

  private buildTrustedContext(
    dto: AiChatStreamDto,
    userId: string,
    workspaceId: string,
  ): McpTrustedContext {
    return {
      userId,
      workspaceId,
      executeActions: dto.context?.executeActions === true,
      sessionId: typeof dto.context?.sessionId === 'string' ? dto.context.sessionId : undefined,
      currentView:
        typeof dto.context?.currentView === 'string' ? dto.context.currentView : 'ai-chat',
      referencedItems: Array.isArray(dto.context?.referencedItems)
        ? dto.context.referencedItems
        : [],
    };
  }

  private streamText(text: string, onStream: (event: AiChatStreamEvent) => void): void {
    if (!text) return;
    const chunkSize = 48;
    for (let i = 0; i < text.length; i += chunkSize) {
      onStream({ type: 'text_delta', data: { content: text.slice(i, i + chunkSize) } });
    }
  }

  private describeToolInput(input: Record<string, unknown>): string {
    const keys = Object.keys(input || {});
    if (keys.length === 0) return 'Calling tool with no arguments.';
    return `Calling tool with ${keys.join(', ')}.`;
  }

  private describeToolOutput(output: string): string {
    if (!output) return 'Tool completed.';

    try {
      const parsed = JSON.parse(output);
      if (parsed?.preview === true) return 'Preview generated. Toggle Execute on to apply changes.';
      if (Array.isArray(parsed)) return `Tool returned ${parsed.length} item(s).`;
      if (Array.isArray(parsed?.data)) return `Tool returned ${parsed.data.length} item(s).`;
      if (parsed?.success === false) return parsed.message || 'Tool returned an error.';
    } catch {
      // Plain text tool output is acceptable.
    }

    return 'Tool completed successfully.';
  }

  private async streamFinalText(
    messages: ChatMessage[],
    model: string | undefined,
    fallbackText: string,
    onStream: (event: AiChatStreamEvent) => void,
  ): Promise<string> {
    const provider = this.aiProvider.getProvider();
    if (!(provider instanceof OpenAiProvider)) {
      this.streamText(fallbackText, onStream);
      return fallbackText;
    }

    try {
      const result = await provider.streamText(
        {
          messages,
          model,
          temperature: 0.7,
          maxTokens: 2000,
        },
        (token) => {
          onStream({ type: 'text_delta', data: { content: token } });
        },
      );
      return result.text || fallbackText;
    } catch (error) {
      this.logger.warn(`Falling back to buffered streaming: ${(error as Error).message}`);
      this.streamText(fallbackText, onStream);
      return fallbackText;
    }
  }
}
