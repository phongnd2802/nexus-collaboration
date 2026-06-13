import { Module, forwardRef } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import {
  WorkflowsController,
  AutomationTemplatesController,
  WorkflowWebhooksController,
} from './workflows.controller';
import { WorkflowsService } from './services/workflows.service';
import { WorkflowExecutorService } from './services/workflow-executor.service';
import { ConditionEvaluatorService } from './services/condition-evaluator.service';
import { EntityEventService } from './services/entity-event.service';
import { EntityEventIntegrationService } from './entity-event-integration.service';
import { AuthModule } from '../auth/auth.module';
import { AutomationCoreModule } from '../automation-core';
import { EmailModule } from '../integration-framework/email/email.module';
import { VideoCallsModule } from '../video-calls/video-calls.module';

@Module({
  imports: [
    AuthModule,
    AutomationCoreModule,
    EventEmitterModule.forRoot(),
    forwardRef(() => EmailModule),
    forwardRef(() => VideoCallsModule),
  ],
  controllers: [WorkflowsController, AutomationTemplatesController, WorkflowWebhooksController],
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
