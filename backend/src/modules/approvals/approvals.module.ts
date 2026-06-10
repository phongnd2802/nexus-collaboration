import { Module, forwardRef } from '@nestjs/common';
import { ApprovalsController } from './approvals.controller';
import { ApprovalsService } from './approvals.service';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { WebSocketModule } from '../../common/gateways/websocket.module';

@Module({
  imports: [
    AuthModule,
    NotificationsModule,
    forwardRef(() => WebSocketModule),
  ],
  controllers: [ApprovalsController],
  providers: [ApprovalsService],
  exports: [ApprovalsService],
})
export class ApprovalsModule {}
