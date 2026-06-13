import { Controller, Post, Get, Body, Param, UseGuards, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { IntegrationService } from './integration.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { WorkspaceGuard } from '../../common/guards/workspace.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('integrations')
@ApiBearerAuth()
@Controller('workspaces/:workspaceId/integrations')
@UseGuards(AuthGuard, WorkspaceGuard)
export class IntegrationController {
  constructor(private readonly integrationService: IntegrationService) {}

  // ============================================
  // VIDEO CALLS
  // ============================================

  @Post('video-calls')
  @ApiOperation({ summary: 'Create a video call session' })
  @ApiResponse({ status: 201, description: 'Video call created' })
  async createVideoCall(
    @Param('workspaceId') workspaceId: string,
    @Body() body: { channel_id?: string; conversation_id?: string },
    @CurrentUser('sub') userId: string,
  ) {
    return this.integrationService.createVideoCall(
      workspaceId,
      body.channel_id,
      body.conversation_id,
      userId,
    );
  }

  @Post('video-calls/:sessionId/join')
  @ApiOperation({ summary: 'Join a video call session' })
  @ApiParam({ name: 'sessionId', description: 'Video call session ID' })
  @ApiResponse({ status: 200, description: 'Joined video call' })
  async joinVideoCall(@Param('sessionId') sessionId: string, @CurrentUser('sub') userId: string) {
    return this.integrationService.joinVideoCall(sessionId, userId);
  }

  @Delete('video-calls/:sessionId')
  @ApiOperation({ summary: 'End a video call session' })
  @ApiParam({ name: 'sessionId', description: 'Video call session ID' })
  @ApiResponse({ status: 200, description: 'Video call ended' })
  async endVideoCall(@Param('sessionId') sessionId: string, @CurrentUser('sub') userId: string) {
    return this.integrationService.endVideoCall(sessionId, userId);
  }

  // ============================================
  // EMAIL NOTIFICATIONS
  // ============================================

  @Post('email/send')
  @ApiOperation({ summary: 'Send notification email' })
  @ApiResponse({ status: 200, description: 'Email sent' })
  async sendEmail(@Body() body: { to: string | string[]; subject: string; content: string }) {
    return this.integrationService.sendNotificationEmail(body.to, body.subject, body.content);
  }

  // ============================================
  // PUSH NOTIFICATIONS
  // ============================================

  @Post('push/send')
  @ApiOperation({ summary: 'Send push notification' })
  @ApiResponse({ status: 200, description: 'Push notification sent' })
  async sendPushNotification(
    @Param('workspaceId') workspaceId: string,
    @Body() body: { title: string; body: string; user_ids?: string[] },
    @CurrentUser('sub') userId: string,
  ) {
    if (body.user_ids) {
      return this.integrationService.sendPushNotification(body.user_ids, body.title, body.body);
    } else {
      return this.integrationService.sendWorkspaceNotification(
        workspaceId,
        body.title,
        body.body,
        userId,
      );
    }
  }

  // ============================================
  // HEALTH CHECK
  // ============================================

  @Get('health')
  @ApiOperation({ summary: 'Check integration services health' })
  @ApiResponse({ status: 200, description: 'Health status' })
  async healthCheck() {
    return this.integrationService.healthCheck();
  }
}
