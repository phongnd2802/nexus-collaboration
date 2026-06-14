import { Module, forwardRef } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsGateway } from './notifications.gateway';
import { FirebaseService } from './firebase.service';
import { WebSocketModule } from '../../common/gateways/websocket.module';
import { AuthModule } from '../auth/auth.module';
import { EmailProviderModule } from '../email/email.module';

@Module({
  imports: [forwardRef(() => WebSocketModule), AuthModule, EmailProviderModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsGateway, FirebaseService],
  exports: [NotificationsService, NotificationsGateway],
})
export class NotificationsModule {}
