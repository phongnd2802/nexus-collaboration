import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { RagController } from './rag.controller';
import { RagIndexingService } from './rag-indexing.service';

@Module({
  imports: [ConfigModule, AuthModule],
  controllers: [RagController],
  providers: [RagIndexingService],
  exports: [RagIndexingService],
})
export class RagModule {}
