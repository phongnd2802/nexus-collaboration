import { Module, forwardRef } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { WorkflowsModule } from '../workflows/workflows.module';
import { EmailProviderModule } from '../email/email.module';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [
    AuthModule,
    NotificationsModule,
    forwardRef(() => WorkflowsModule),
    EmailProviderModule,
    forwardRef(() => FilesModule),
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
