import { Module, forwardRef } from '@nestjs/common';
import { NotesService } from './notes.service';
import { NotesController } from './notes.controller';
import { NotesPublicController } from './notes-public.controller';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmailProviderModule } from '../email/email.module';
import { WorkflowsModule } from '../workflows/workflows.module';
import { NoteCollaborationService } from './services/note-collaboration.service';
import { NoteCollaborationGateway } from './gateways/note-collaboration.gateway';
import { PdfProcessingService } from './services/pdf-processing.service';
import { UrlProcessingService } from './services/url-processing.service';

@Module({
  imports: [
    AuthModule,
    NotificationsModule,
    EmailProviderModule,
    forwardRef(() => WorkflowsModule),
  ],
  controllers: [NotesController, NotesPublicController],
  providers: [
    NotesService,
    NoteCollaborationService,
    NoteCollaborationGateway,
    PdfProcessingService,
    UrlProcessingService,
  ],
  exports: [
    NotesService,
    NoteCollaborationService,
    PdfProcessingService,
    UrlProcessingService,
  ],
})
export class NotesModule {}
