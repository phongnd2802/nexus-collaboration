import { Module } from '@nestjs/common';
import { IntegrationService } from './integration.service';
import { IntegrationController } from './integration.controller';
import { AuthModule } from '../auth/auth.module';
import { EmailProviderModule } from '../email/email.module';

@Module({
  imports: [AuthModule, EmailProviderModule],
  controllers: [IntegrationController],
  providers: [IntegrationService],
  exports: [IntegrationService],
})
export class IntegrationModule {}
