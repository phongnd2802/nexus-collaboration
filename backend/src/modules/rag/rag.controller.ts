import { Body, Controller, Get, Headers, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { WorkspaceGuard } from '../../common/guards/workspace.guard';
import { RagIndexingService } from './rag-indexing.service';

@Controller()
export class RagController {
  constructor(private readonly ragIndexingService: RagIndexingService) {}

  @Get('workspaces/:workspaceId/rag/files/:fileId/status')
  @UseGuards(AuthGuard, WorkspaceGuard)
  async getFileStatus(@Param('workspaceId') workspaceId: string, @Param('fileId') fileId: string) {
    return this.ragIndexingService.getDocumentStatus(workspaceId, fileId);
  }

  @Post('workspaces/:workspaceId/rag/search')
  @UseGuards(AuthGuard, WorkspaceGuard)
  async searchFiles(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-nexus-request-id') requestId: string | undefined,
    @Body() body: { query: string; limit?: number; min_score?: number },
  ) {
    return this.ragIndexingService.searchFiles(
      workspaceId,
      body.query,
      body.limit ?? 10,
      body.min_score ?? 0.5,
      userId,
      authorization,
      requestId,
    );
  }

  @Get('workspaces/:workspaceId/rag/internal/files/:fileId/source')
  async getFileSource(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param('workspaceId') workspaceId: string,
    @Param('fileId') fileId: string,
  ) {
    this.ragIndexingService.assertInternalRequest(headers);
    return this.ragIndexingService.getFileSource(workspaceId, fileId);
  }

  @Post('workspaces/:workspaceId/rag/internal/indexing-jobs/:jobId/claim')
  async claimJob(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param('workspaceId') workspaceId: string,
    @Param('jobId') jobId: string,
  ) {
    this.ragIndexingService.assertInternalRequest(headers);
    return this.ragIndexingService.claimJob(workspaceId, jobId);
  }

  @Patch('workspaces/:workspaceId/rag/internal/indexing-jobs/:jobId')
  async updateJob(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param('workspaceId') workspaceId: string,
    @Param('jobId') jobId: string,
    @Body() body: { status: any; error_message?: string; metadata?: Record<string, unknown> },
  ) {
    this.ragIndexingService.assertInternalRequest(headers);
    return this.ragIndexingService.updateJob(workspaceId, jobId, body.status, body.error_message, body.metadata);
  }

  @Post('workspaces/:workspaceId/rag/internal/indexing-jobs/:jobId/retry')
  async retryJob(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param('workspaceId') workspaceId: string,
    @Param('jobId') jobId: string,
  ) {
    this.ragIndexingService.assertInternalRequest(headers);
    return this.ragIndexingService.retryJob(workspaceId, jobId);
  }

  @Post('workspaces/:workspaceId/rag/internal/authorized-file-ids')
  async getAuthorizedFileIds(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param('workspaceId') workspaceId: string,
    @Body() body: { user_id?: string },
  ) {
    this.ragIndexingService.assertInternalRequest(headers);
    const fileIds = await this.ragIndexingService.getSearchableFileIds(workspaceId, body.user_id);
    return { file_ids: fileIds };
  }
}
