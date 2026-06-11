import { Body, Controller, Get, Param, Post, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiChatStreamDto } from './dto/ai-chat.dto';
import { McpChatAgentService } from './mcp-chat-agent.service';
import { McpToolAdapterService } from './mcp-tool-adapter.service';

@ApiTags('AI Chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workspaces/:workspaceId/ai-chat')
export class McpAgentController {
  constructor(
    private readonly agentService: McpChatAgentService,
    private readonly mcpTools: McpToolAdapterService,
  ) {}

  @Get('tools')
  @ApiOperation({ summary: 'List MCP tools visible to the AI chat agent' })
  async listTools() {
    const tools = await this.mcpTools.getToolDefinitions();
    return {
      success: true,
      count: tools.length,
      tools: tools.map((tool) => ({
        name: tool.name,
        originalName: tool.originalName,
        serverName: tool.serverName,
        description: tool.description,
        parameters: tool.parameters,
      })),
    };
  }

  @Post('stream')
  @ApiOperation({ summary: 'Stream an AI chat response with optional MCP tools' })
  async streamChat(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: AiChatStreamDto,
    @CurrentUser('sub') userId: string,
    @Res() res: Response,
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    try {
      const result = await this.agentService.streamChat(dto, userId, workspaceId, (event) => {
        if (!res.writableEnded) {
          res.write(`data: ${JSON.stringify(event)}\n\n`);
        }
      });

      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ type: 'complete', data: result })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
      }
    } catch (error) {
      if (!res.writableEnded) {
        res.write(
          `data: ${JSON.stringify({ type: 'error', data: { message: (error as Error).message } })}\n\n`,
        );
        res.end();
      }
    }
  }
}
