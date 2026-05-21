import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { buildBrandedEmail } from '../email/branded-email';
import { AiProviderService } from '../ai-provider/ai-provider.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class IntegrationService {
  constructor(private readonly db: DatabaseService) {}
  // Legacy alias for the AI provider - delegates to db.getAI() until a real
  // AIProviderService is wired in.
  private get aiProvider(): any {
    return this.db.getAI();
  }

  // ============================================
  // VIDEO CALLS (Using database LiveKit)
  // ============================================

  async createVideoCall(
    workspaceId: string,
    channelId?: string,
    conversationId?: string,
    userId?: string,
  ) {
    try {
      // Generate unique room name
      const roomName = `deskive-${workspaceId}-${uuidv4()}`;

      // Create video call session record
      const sessionData = {
        workspace_id: workspaceId,
        channel_id: channelId,
        conversation_id: conversationId,
        room_name: roomName,
        started_by: userId,
        started_at: new Date().toISOString(),
      };

      const session = await this.db.insert('video_call_sessions', sessionData);

      // Use database for video call functionality
      // The SDK abstracts the underlying LiveKit implementation
      const videoCallData = {
        room: roomName,
        identity: userId || 'anonymous',
        metadata: {
          workspace_id: workspaceId,
          session_id: session.id,
        },
      };

      // Generate meeting URL or token (implementation depends on database)
      const meetingUrl = `${process.env.FRONTEND_URL}/video-call/${roomName}`;

      return {
        session_id: session.id,
        room_name: roomName,
        meeting_url: meetingUrl,
        ...videoCallData,
      };
    } catch (error) {
      console.error('Video call creation error:', error);
      throw error;
    }
  }

  async joinVideoCall(sessionId: string, userId: string) {
    const sessionQuery = await this.db.find('video_call_sessions', {
      id: sessionId,
    });

    const sessionData = Array.isArray(sessionQuery.data) ? sessionQuery.data : [];
    if (sessionData.length === 0) {
      throw new Error('Video call session not found');
    }

    const session = sessionQuery[0];

    // Add participant record
    await this.db.insert('call_participants', {
      session_id: sessionId,
      user_id: userId,
      joined_at: new Date().toISOString(),
    });

    return {
      room_name: session.room_name,
      meeting_url: `${process.env.FRONTEND_URL}/video-call/${session.room_name}`,
    };
  }

  async endVideoCall(sessionId: string, userId: string) {
    const session = await this.db.find('video_call_sessions', {
      id: sessionId,
      started_by: userId,
    });

    const sessionData = Array.isArray(session.data) ? session.data : [];
    if (sessionData.length === 0) {
      throw new Error('Video call session not found or permission denied');
    }

    // Update session end time
    await this.db.update('video_call_sessions', sessionId, {
      ended_at: new Date().toISOString(),
    });

    // Update all participants left time
    const participants = await this.db.find('call_participants', {
      session_id: sessionId,
    });

    const participantsData = Array.isArray(participants.data) ? participants.data : [];
    const updatePromises = participantsData
      .filter((p) => !p.left_at)
      .map((p) =>
        this.db.update('call_participants', p.id, {
          left_at: new Date().toISOString(),
        }),
      );

    await Promise.all(updatePromises);

    return { success: true, message: 'Video call ended' };
  }

  // ============================================
  // AI SERVICES (Using database AI)
  // ============================================

  async generateText(prompt: string, options?: any) {
    try {
      // Use database AI service - abstracts OpenAI/other providers
      return await this.aiProvider.generateText(prompt, options);
    } catch (error) {
      console.error('AI text generation error:', error);
      throw new Error('AI service temporarily unavailable');
    }
  }

  async generateSummary(
    content: string,
    type: 'meeting' | 'document' | 'conversation' = 'document',
  ) {
    const prompts = {
      meeting: `Summarize the following meeting content in bullet points, highlighting key decisions, action items, and next steps:\n\n${content}`,
      document: `Provide a concise summary of the following document:\n\n${content}`,
      conversation: `Summarize the key points from this conversation:\n\n${content}`,
    };

    return await this.generateText(prompts[type], {
      max_tokens: 200,
      temperature: 0.3,
    });
  }

  async generateMeetingNotes(transcript: string) {
    const prompt = `
    Create structured meeting notes from this transcript. Format as:
    
    ## Meeting Summary
    [Brief overview]
    
    ## Key Points
    [Bullet points of main topics]
    
    ## Action Items
    [List of action items with responsible parties if mentioned]
    
    ## Decisions Made
    [Key decisions from the meeting]
    
    Transcript:
    ${transcript}
    `;

    return await this.generateText(prompt, {
      max_tokens: 500,
      temperature: 0.3,
    });
  }

  // Content analysis temporarily unavailable - not in AI module yet
  async analyzeContent(
    content: string,
    analysisType: 'sentiment' | 'readability' | 'seo' | 'engagement' | 'all' = 'all',
  ) {
    // TODO: Implement when AI module supports content analysis
    return {
      error: 'Content analysis feature coming soon',
      analysisType,
    };
  }

  async generateTranscription(audioBuffer: Buffer) {
    try {
      // Use database AI for speech-to-text
      return await this.aiProvider.generateAudio(audioBuffer.toString('base64'), {
        task: 'transcribe',
        response_format: 'text',
      });
    } catch (error) {
      console.error('Transcription error:', error);
      throw new Error('Transcription service temporarily unavailable');
    }
  }

  // ============================================
  // EMAIL NOTIFICATIONS
  // ============================================

  async sendNotificationEmail(
    to: string | string[],
    subject: string,
    content: string,
    templateData?: any,
  ) {
    try {
      // Use database email service
      const emailData = {
        to: Array.isArray(to) ? to : [to],
        subject,
        html: this.generateEmailHtml(content, templateData),
        text: content,
      };

      return await /* TODO: use EmailService */ this.db.sendEmail(
        emailData.to,
        emailData.subject,
        emailData.html,
        emailData.text,
      );
    } catch (error) {
      console.error('Email sending error:', error);
      throw new Error('Email service temporarily unavailable');
    }
  }

  async sendWorkspaceInviteEmail(
    email: string,
    workspaceName: string,
    inviterName: string,
    inviteToken: string,
  ) {
    const subject = `You've been invited to join ${workspaceName}`;
    const inviteUrl = `${process.env.FRONTEND_URL}/invite/accept/${inviteToken}`;
    const content = `${inviterName} đã mời bạn cộng tác trong workspace ${workspaceName} trên Nexus.`;

    return await this.sendNotificationEmail(email, subject, content, {
      title: `Mời tham gia ${workspaceName}`,
      intro: content,
      actionLabel: 'Chấp nhận lời mời',
      actionUrl: inviteUrl,
    });
  }

  async sendTaskAssignmentEmail(
    email: string,
    taskTitle: string,
    projectName: string,
    assignerName: string,
    taskUrl: string,
  ) {
    const subject = `New task assigned: ${taskTitle}`;
    const content = `${assignerName} đã giao cho bạn task "${taskTitle}" trong dự án ${projectName}.`;

    return await this.sendNotificationEmail(email, subject, content, {
      title: 'Bạn vừa được giao task mới',
      intro: content,
      actionLabel: 'Xem task',
      actionUrl: taskUrl,
    });
  }

  async sendEventReminderEmail(
    email: string,
    eventTitle: string,
    startTime: string,
    meetingUrl?: string,
  ) {
    const eventDate = new Date(startTime);
    const subject = `Reminder: ${eventTitle} starts soon`;
    const content = `${eventTitle} sẽ bắt đầu vào ${eventDate.toLocaleString()}.`;

    return await this.sendNotificationEmail(email, subject, content, {
      title: 'Nhắc lịch sự kiện',
      intro: content,
      actionLabel: meetingUrl ? 'Tham gia cuộc họp' : undefined,
      actionUrl: meetingUrl,
    });
  }

  // ============================================
  // PUSH NOTIFICATIONS
  // ============================================

  async sendPushNotification(userIds: string | string[], title: string, body: string, data?: any) {
    try {
      return await /* TODO: use Firebase directly */ this.db.sendPushNotification(
        userIds,
        title,
        body,
        data,
      );
    } catch (error) {
      console.error('Push notification error:', error);
      throw new Error('Push notification service temporarily unavailable');
    }
  }

  async sendWorkspaceNotification(
    workspaceId: string,
    title: string,
    body: string,
    excludeUserId?: string,
  ) {
    // Get all workspace members
    const members = await this.db.find('workspace_members', {
      workspace_id: workspaceId,
      is_active: true,
    });

    const membersData = Array.isArray(members.data) ? members.data : [];
    const userIds = membersData.map((m) => m.user_id).filter((id) => id !== excludeUserId);

    if (userIds.length > 0) {
      return await this.sendPushNotification(userIds, title, body, { workspace_id: workspaceId });
    }

    return { success: true, sent_to: 0 };
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private generateEmailHtml(content: string, templateData?: any): string {
    return buildBrandedEmail({
      eyebrow: 'Nexus Notification',
      title: templateData?.title || 'Cập nhật từ Nexus',
      intro: templateData?.intro || content,
      action:
        templateData?.actionLabel && templateData?.actionUrl
          ? {
              label: templateData.actionLabel,
              url: templateData.actionUrl,
            }
          : undefined,
      footer:
        'Nếu bạn không muốn nhận các email tương tự, bạn có thể cập nhật tuỳ chọn thông báo trong phần cài đặt tài khoản.',
    }).html;
  }

  // Integration health check
  async healthCheck() {
    const checks = {
      video_calls: true,
      ai_services: true,
      email: true,
      push_notifications: true,
    };

    try {
      // Test database connection
      await this.db.raw('SELECT 1');
    } catch (error) {
      console.error('Integration health check failed:', error);
      Object.keys(checks).forEach((key) => {
        checks[key] = false;
      });
    }

    return checks;
  }
}
