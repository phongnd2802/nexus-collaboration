import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ContactFormDto } from './dto/contact.dto';
import { buildBrandedEmail } from '../email/branded-email';

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);
  // Nexus team receivers - will get contact form submissions
  private readonly contactEmails = ['support@nexusapp.io'];

  constructor(private readonly db: DatabaseService) {}

  async sendContactEmail(dto: ContactFormDto): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.log(`Processing contact form submission from ${dto.email}`);

      // Map subject to human-readable label
      const subjectLabels: Record<string, string> = {
        general: 'General Inquiry',
        sales: 'Sales Inquiry',
        support: 'Technical Support',
        partnership: 'Partnership Opportunity',
        other: 'Other',
      };

      const subjectLabel = subjectLabels[dto.subject] || dto.subject;

      // Build email content
      const emailSubject = `[Nexus Contact] ${subjectLabel} from ${dto.name}`;

      const htmlContent = buildBrandedEmail({
        eyebrow: 'Contact Form',
        title: 'Liên hệ mới từ website',
        intro: 'Bạn vừa nhận được một yêu cầu liên hệ mới từ biểu mẫu trên Nexus.',
        details: [
          { label: 'Họ tên', value: dto.name },
          { label: 'Email', value: dto.email },
          ...(dto.company ? [{ label: 'Công ty', value: dto.company }] : []),
          { label: 'Chủ đề', value: subjectLabel },
        ],
        callout: {
          title: 'Nội dung',
          body: dto.message,
          tone: 'info',
        },
        footer: `Email này được gửi từ form liên hệ Nexus lúc ${new Date().toISOString()}.`,
      }).html;

      // Send email using database to both receivers
      const emailResult = await /* TODO: use EmailService */ this.db.client.email.send(
        this.contactEmails,
        emailSubject,
        htmlContent,
        {
          replyTo: dto.email,
        },
      );

      this.logger.log(`Contact email sent successfully to ${this.contactEmails.join(', ')}`);
      this.logger.debug(`Email send result: ${JSON.stringify(emailResult)}`);

      // Optionally send a confirmation email to the user
      await this.sendConfirmationEmail(dto);

      return {
        success: true,
        message: 'Your message has been sent successfully. We will get back to you soon!',
      };
    } catch (error) {
      this.logger.error('Failed to send contact email:', error);
      throw error;
    }
  }

  private async sendConfirmationEmail(dto: ContactFormDto): Promise<void> {
    try {
      const htmlContent = buildBrandedEmail({
        eyebrow: 'Nexus Support',
        title: 'Cảm ơn bạn đã liên hệ',
        greeting: `Xin chào ${dto.name},`,
        paragraphs: [
          'Chúng tôi đã nhận được tin nhắn của bạn và sẽ phản hồi trong vòng 24 giờ.',
          'Dưới đây là bản sao nội dung bạn đã gửi:',
        ],
        callout: {
          title: 'Tin nhắn của bạn',
          body: dto.message,
          tone: 'default',
        },
        footer: 'Trân trọng, đội ngũ Nexus.',
      }).html;

      await /* TODO: use EmailService */ this.db.client.email.send(
        dto.email,
        'Thank you for contacting Nexus',
        htmlContent,
        {
          replyTo: this.contactEmails[0], // support@nexusapp.io
        },
      );

      this.logger.log(`Confirmation email sent to ${dto.email}`);
    } catch (error) {
      // Don't throw - confirmation email is not critical
      this.logger.warn(`Failed to send confirmation email to ${dto.email}:`, error);
    }
  }
}
