import { Module, forwardRef } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { WorkflowsController, WorkflowWebhooksController } from './workflows.controller';
import { WorkflowsService } from './services/workflows.service';
import { WorkflowExecutorService } from './services/workflow-executor.service';
import { ConditionEvaluatorService } from './services/condition-evaluator.service';
import { EntityEventService } from './services/entity-event.service';
import { EntityEventIntegrationService } from './entity-event-integration.service';
import { AuthModule } from '../auth/auth.module';
import { AutomationCoreModule } from '../automation-core';
import { VideoCallsModule } from '../video-calls/video-calls.module';

@Module({
  imports: [
    AuthModule,
    AutomationCoreModule,
    EventEmitterModule.forRoot(),
    forwardRef(() => VideoCallsModule),
  ],
  controllers: [WorkflowsController, WorkflowWebhooksController],
  providers: [
    WorkflowsService,
    WorkflowExecutorService,
    ConditionEvaluatorService,
    EntityEventService,
    EntityEventIntegrationService,
  ],
  exports: [
    WorkflowsService,
    WorkflowExecutorService,
    EntityEventService,
    ConditionEvaluatorService,
    EntityEventIntegrationService,
  ],
})
export class WorkflowsModule {}
