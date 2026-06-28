import { Injectable, Logger, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';

type RagJobStatus = 'queued' | 'processing' | 'indexed' | 'failed' | 'skipped' | 'cancelled';

interface FileRecord {
  id: string;
  workspace_id: string;
  name: string;
  storage_path: string | null;
  url: string | null;
  mime_type: string | null;
  size: string | number | null;
  file_hash: string | null;
  uploaded_by: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class RagIndexingService {
  private readonly logger = new Logger(RagIndexingService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly configService: ConfigService,
  ) {}

  async enqueueFileIndexing(
    file: FileRecord,
    reason: 'file_uploaded' | 'file_updated' | 'manual_retry' = 'file_uploaded',
  ): Promise<any> {
    await this.upsertDocument(file, 'queued');

    const job = await this.db.insert('rag_indexing_jobs', {
      workspace_id: file.workspace_id,
      file_id: file.id,
      reason,
      status: 'queued',
      file_hash: file.file_hash,
      metadata: {
        file_name: file.name,
        mime_type: file.mime_type,
        size: file.size,
      },
    });

    void this.triggerNexusAiIndex(file, job.id, reason).catch((error) => {
      this.logger.warn(`RAG trigger failed for file ${file.id}: ${error.message}`);
    });

    return job;
  }

  async markFileDeleted(workspaceId: string, fileId: string): Promise<void> {
    await this.db.updateMany(
      'rag_documents',
      { workspace_id: workspaceId, file_id: fileId },
      {
        status: 'deleted',
        updated_at: new Date().toISOString(),
      },
    );
  }

  async getFileSource(workspaceId: string, fileId: string): Promise<Record<string, unknown>> {
    const file = await this.db.findOne('files', {
      id: fileId,
      workspace_id: workspaceId,
      is_deleted: false,
    });
    if (!file) {
      throw new NotFoundException('File not found');
    }
    if (!file.storage_path) {
      throw new NotFoundException('File storage path not found');
    }

    const content = await this.db.downloadFile('files', file.storage_path);

    return {
      id: file.id,
      workspace_id: file.workspace_id,
      name: file.name,
      mime_type: file.mime_type,
      size: file.size,
      file_hash: file.file_hash,
      storage_path: file.storage_path,
      metadata: file.metadata || {},
      content_base64: content.toString('base64'),
    };
  }

  async claimJob(workspaceId: string, jobId: string): Promise<any> {
    const job = await this.db.findOne('rag_indexing_jobs', { id: jobId, workspace_id: workspaceId });
    if (!job) {
      throw new NotFoundException('RAG indexing job not found');
    }
    if (!['queued', 'failed'].includes(job.status)) {
      return job;
    }

    await this.upsertDocumentForJob(job, 'processing');
    return this.db.update('rag_indexing_jobs', jobId, {
      status: 'processing',
      attempts: Number(job.attempts || 0) + 1,
      claimed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  async updateJob(
    workspaceId: string,
    jobId: string,
    status: RagJobStatus,
    errorMessage?: string,
    metadata?: Record<string, unknown>,
  ): Promise<any> {
    const job = await this.db.findOne('rag_indexing_jobs', { id: jobId, workspace_id: workspaceId });
    if (!job) {
      throw new NotFoundException('RAG indexing job not found');
    }

    const now = new Date().toISOString();
    const documentStatus = status === 'indexed' || status === 'failed' || status === 'skipped' ? status : 'processing';
    await this.upsertDocumentForJob(job, documentStatus, errorMessage);

    return this.db.update('rag_indexing_jobs', jobId, {
      status,
      error_message: errorMessage || null,
      metadata: {
        ...(job.metadata || {}),
        ...(metadata || {}),
      },
      finished_at: ['indexed', 'failed', 'skipped', 'cancelled'].includes(status) ? now : job.finished_at,
      updated_at: now,
    });
  }

  async getDocumentStatus(workspaceId: string, fileId: string): Promise<any> {
    return this.db.findOne('rag_documents', { workspace_id: workspaceId, file_id: fileId });
  }

  async retryJob(workspaceId: string, jobId: string): Promise<any> {
    const job = await this.db.update(
      'rag_indexing_jobs',
      { id: jobId, workspace_id: workspaceId },
      {
        status: 'queued',
        error_message: null,
        claimed_at: null,
        finished_at: null,
        updated_at: new Date().toISOString(),
      },
    );
    if (!job) {
      throw new NotFoundException('RAG indexing job not found');
    }
    return job;
  }

  async searchFiles(
    workspaceId: string,
    query: string,
    limit: number,
    minScore: number,
    userId?: string,
    authorization?: string,
    requestId?: string,
  ): Promise<any[]> {
    const baseUrl = this.nexusAiBaseUrl();
    if (!baseUrl) {
      return [];
    }
    const fileIds = await this.getSearchableFileIds(workspaceId, userId);
    if (fileIds.length === 0) {
      return [];
    }

    const response = await fetch(`${baseUrl}/rag/internal/search`, {
      method: 'POST',
      headers: this.nexusAiHeaders(workspaceId, authorization, requestId),
      body: JSON.stringify({ workspace_id: workspaceId, query, limit, min_score: minScore, file_ids: fileIds }),
    });

    if (!response.ok) {
      const text = await response.text();
      this.logger.warn(`RAG search failed: ${response.status} ${text}`);
      return [];
    }

    const payload = await response.json();
    return Array.isArray(payload?.results) ? payload.results : [];
  }

  async getSearchableFileIds(workspaceId: string, userId?: string): Promise<string[]> {
    if (!userId) {
      return [];
    }

    const membership = await this.db.findOne('workspace_members', {
      workspace_id: workspaceId,
      user_id: userId,
      is_active: true,
    });
    const isAdmin = membership && ['admin', 'owner'].includes(membership.role);

    if (isAdmin) {
      const result = await this.db.findMany(
        'files',
        { workspace_id: workspaceId, is_deleted: false },
        { limit: 5000 },
      );
      return (Array.isArray(result.data) ? result.data : result).map((file: any) => file.id);
    }

    const ownedResult = await this.db.findMany(
      'files',
      { workspace_id: workspaceId, uploaded_by: userId, is_deleted: false },
      { limit: 5000 },
    );
    const ownedFileIds = (Array.isArray(ownedResult.data) ? ownedResult.data : ownedResult).map((file: any) => file.id);

    const sharedResult = await this.db.query(
      `
      SELECT DISTINCT f.id
      FROM "files" f
      INNER JOIN "file_shares" fs ON fs.file_id = f.id
      WHERE f.workspace_id = $1
        AND f.is_deleted = false
        AND fs.shared_with = $2
        AND fs.is_active = true
        AND COALESCE(fs.expires_at > now(), true)
        AND (fs.permissions IS NULL OR fs.permissions->>'read' IS DISTINCT FROM 'false')
      LIMIT 5000
      `,
      [workspaceId, userId],
    );
    const sharedFileIds = sharedResult.rows.map((row: any) => row.id);

    return [...new Set([...ownedFileIds, ...sharedFileIds])];
  }

  assertInternalRequest(headers: Record<string, string | string[] | undefined>): void {
    const expectedKey =
      this.configService.get<string>('NEXUS_INTERNAL_API_KEY') ||
      this.configService.get<string>('NEXUS_API_KEY');
    const providedKey = this.header(headers, 'x-api-key');
    const source = this.header(headers, 'x-nexus-source');

    if (!expectedKey || source !== 'nexus-ai' || providedKey !== expectedKey) {
      throw new UnauthorizedException('Invalid Nexus AI internal request');
    }
  }

  private async upsertDocument(file: FileRecord, status: string): Promise<void> {
    await this.db.query(
      `
      INSERT INTO "rag_documents" ("workspace_id", "file_id", "file_hash", "status", "updated_at")
      VALUES ($1, $2, $3, $4, now())
      ON CONFLICT ("workspace_id", "file_id")
      DO UPDATE SET
        "file_hash" = EXCLUDED."file_hash",
        "status" = EXCLUDED."status",
        "updated_at" = now()
      `,
      [file.workspace_id, file.id, file.file_hash, status],
    );
  }

  private async upsertDocumentForJob(job: any, status: string, errorMessage?: string): Promise<void> {
    await this.db.query(
      `
      INSERT INTO "rag_documents" ("workspace_id", "file_id", "file_hash", "status", "updated_at")
      VALUES ($1, $2, $3, $4, now())
      ON CONFLICT ("workspace_id", "file_id")
      DO UPDATE SET
        "file_hash" = EXCLUDED."file_hash",
        "status" = EXCLUDED."status",
        "updated_at" = now()
      `,
      [job.workspace_id, job.file_id, job.file_hash, status],
    );

    if (errorMessage) {
      try {
        await this.db.updateMany(
          'rag_documents',
          { workspace_id: job.workspace_id, file_id: job.file_id },
          { error_message: errorMessage, updated_at: new Date().toISOString() },
        );
      } catch (error) {
        this.logger.warn(`Failed to persist rag_documents.error_message for ${job.file_id}: ${(error as Error).message}`);
      }
    }

    if (status === 'indexed') {
      try {
        await this.db.updateMany(
          'rag_documents',
          { workspace_id: job.workspace_id, file_id: job.file_id },
          { indexed_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        );
      } catch (error) {
        this.logger.warn(`Failed to persist rag_documents.indexed_at for ${job.file_id}: ${(error as Error).message}`);
      }
    }
  }

  private async triggerNexusAiIndex(file: FileRecord, jobId: string, reason: string): Promise<void> {
    const baseUrl = this.nexusAiBaseUrl();
    if (!baseUrl || this.configService.get<string>('NEXUS_RAG_ENABLED', 'true') === 'false') {
      return;
    }

    const response = await fetch(
      `${baseUrl}/rag/internal/workspaces/${encodeURIComponent(file.workspace_id)}/files/${encodeURIComponent(file.id)}/index`,
      {
        method: 'POST',
        headers: this.nexusAiHeaders(file.workspace_id),
        body: JSON.stringify({
          job_id: jobId,
          reason,
          file_hash: file.file_hash,
          mime_type: file.mime_type,
          filename: file.name,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Nexus AI RAG trigger returned ${response.status}`);
    }
  }

  private nexusAiBaseUrl(): string {
    return (this.configService.get<string>('NEXUS_AI_BASE_URL') || 'http://127.0.0.1:8000').replace(/\/+$/, '');
  }

  private nexusAiHeaders(workspaceId: string, authorization?: string, requestId?: string): Record<string, string> {
    const key =
      this.configService.get<string>('NEXUS_INTERNAL_API_KEY') ||
      this.configService.get<string>('NEXUS_API_KEY') ||
      '';
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-API-Key': key,
      'X-Nexus-Source': 'backend',
      'X-Nexus-Workspace-ID': workspaceId,
    };
    if (authorization) {
      headers.Authorization = authorization;
    }
    if (requestId) {
      headers['X-Nexus-Request-ID'] = requestId;
    }
    return headers;
  }

  private header(headers: Record<string, string | string[] | undefined>, name: string): string | undefined {
    const value = headers[name] || headers[name.toLowerCase()];
    return Array.isArray(value) ? value[0] : value;
  }
}
