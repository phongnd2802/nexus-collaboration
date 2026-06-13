import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { AuthModule } from '../auth/auth.module';
import { AuthGuard } from '../../common/guards/auth.guard';

@Module({
  imports: [AuthModule],
  controllers: [DashboardController],
  providers: [DashboardService, AuthGuard],
  exports: [DashboardService],
})
export class DashboardModule {}
