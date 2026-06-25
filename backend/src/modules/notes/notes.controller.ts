import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { NotesService } from './notes.service';
import { PdfProcessingService } from './services/pdf-processing.service';
import { UrlProcessingService } from './services/url-processing.service';
import {
  CreateNoteDto,
  UpdateNoteDto,
  ShareNoteDto,
  BulkDeleteDto,
  DuplicateNoteDto,
  BulkArchiveDto,
  ImportPdfDto,
  ImportPdfResponseDto,
  ImportUrlDto,
  ImportUrlResponseDto,
  RequestNoteAccessDto,
  RespondNoteAccessDto,
  UpdateSharePermissionDto,
  NotePermissionRequestDto,
} from './dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { WorkspaceGuard } from '../../common/guards/workspace.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('notes')
@ApiBearerAuth()
@Controller('workspaces/:workspaceId/notes')
@UseGuards(AuthGuard, WorkspaceGuard)
export class NotesController {
  constructor(
    private readonly notesService: NotesService,
    private readonly pdfProcessingService: PdfProcessingService,
    private readonly urlProcessingService: UrlProcessingService,
  ) {}

  // ==================== PDF IMPORT ENDPOINT ====================

  @Post('import/pdf')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Import a PDF file as a note',
    description:
      'Uploads a PDF file and converts it to a note with proper formatting. ' +
      'Supports table detection, image extraction, and markdown conversion.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'PDF file to import',
        },
        title: {
          type: 'string',
          description: 'Title for the imported note',
        },
        parentId: {
          type: 'string',
          description: 'Parent folder/note ID (optional)',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tags for the note (optional)',
        },
        extractImages: {
          type: 'boolean',
          description: 'Whether to extract images from PDF (default: true)',
        },
      },
      required: ['file', 'title'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'PDF imported successfully',
    type: ImportPdfResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid file or request' })
  async importPdf(
    @Param('workspaceId') workspaceId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() importPdfDto: ImportPdfDto,
    @CurrentUser('sub') userId: string,
  ): Promise<ImportPdfResponseDto> {
    if (!file) {
      throw new BadRequestException('No PDF file provided');
    }

    if (!file.mimetype.includes('pdf')) {
      throw new BadRequestException('File must be a PDF');
    }

    // Process PDF to markdown
    const result = await this.pdfProcessingService.processPdfToMarkdown(
      file.buffer,
      workspaceId,
      userId,
    );

    // Convert markdown to HTML for the editor
    const html = this.pdfProcessingService.markdownToHtml(result.markdown);

    // Create the note
    const note = await this.notesService.createNote(
      workspaceId,
      {
        title: importPdfDto.title,
        content: html,
        parent_id: importPdfDto.parentId,
        tags: importPdfDto.tags || ['pdf', 'imported'],
      },
      userId,
    );

    return {
      success: true,
      noteId: note.id,
      markdown: result.markdown,
      html: html,
      pageCount: result.pageCount,
      hasTable: result.hasTable,
      imageCount: result.images.length,
      message: `Successfully imported PDF with ${result.pageCount} pages${result.hasTable ? ' (tables detected)' : ''}${result.images.length > 0 ? ` and ${result.images.length} images` : ''}`,
    };
  }

  // ==================== URL IMPORT ENDPOINT ====================

  @Post('import/url')
  @ApiOperation({
    summary: 'Import content from a URL as a note',
    description:
      'Fetches content from a URL, extracts the main article content using Readability, ' +
      'and creates a new note with the extracted content formatted as HTML.',
  })
  @ApiResponse({
    status: 201,
    description: 'URL content imported successfully',
    type: ImportUrlResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid URL or failed to fetch content' })
  async importUrl(
    @Param('workspaceId') workspaceId: string,
    @Body() importUrlDto: ImportUrlDto,
    @CurrentUser('sub') userId: string,
  ): Promise<ImportUrlResponseDto> {
    console.log(`[ImportUrl] Starting import for URL: ${importUrlDto.url}`);

    // Process URL to extract content
    const result = await this.urlProcessingService.processUrlToMarkdown(importUrlDto.url);
    console.log(
      `[ImportUrl] URL processed - title: "${result.title}", htmlLength: ${result.html?.length || 0}`,
    );

    // Use provided title or extracted title
    const noteTitle = importUrlDto.title || result.title;

    // Create the note
    console.log(
      `[ImportUrl] Creating note with title: "${noteTitle}", content length: ${result.html?.length || 0}`,
    );
    const note = await this.notesService.createNote(
      workspaceId,
      {
        title: noteTitle,
        content: result.html,
        parent_id: importUrlDto.parentId,
        tags: importUrlDto.tags || ['web', 'imported'],
      },
      userId,
    );
    console.log(`[ImportUrl] Note created with ID: ${note.id}`);

    return {
      success: true,
      noteId: note.id,
      title: noteTitle,
      excerpt: result.excerpt,
      siteName: result.siteName,
      message: `Successfully imported content from ${result.siteName || new URL(importUrlDto.url).hostname}`,
    };
  }

  // ==================== STANDARD NOTES CRUD ENDPOINTS ====================

  @Post()
  @ApiOperation({ summary: 'Create a new note' })
  async createNote(
    @Param('workspaceId') workspaceId: string,
    @Body() createNoteDto: CreateNoteDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.notesService.createNote(workspaceId, createNoteDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get notes in workspace' })
  @ApiQuery({ name: 'parent_id', required: false })
  @ApiQuery({
    name: 'is_deleted',
    required: false,
    type: Boolean,
    description:
      'Filter by deletion status. true = only deleted notes, false = only active notes, not provided = active notes (default)',
  })
  @ApiQuery({
    name: 'is_archived',
    required: false,
    type: Boolean,
    description:
      'Filter by archive status. true = only archived notes, false = only non-archived notes, not provided = non-archived notes (default)',
  })
  async getNotes(
    @Param('workspaceId') workspaceId: string,
    @Query('parent_id') parentId?: string,
    @Query('is_deleted') isDeleted?: string,
    @Query('is_archived') isArchived?: string,
    @CurrentUser('sub') userId?: string,
  ) {
    // Convert string query params to boolean
    const isDeletedBoolean =
      isDeleted === 'true' ? true : isDeleted === 'false' ? false : undefined;
    const isArchivedBoolean =
      isArchived === 'true' ? true : isArchived === 'false' ? false : undefined;
    return this.notesService.getNotes(
      workspaceId,
      parentId,
      userId,
      isDeletedBoolean,
      isArchivedBoolean,
    );
  }

  @Get('search')
  @ApiOperation({ summary: 'Search notes using unified search (keyword, semantic, or hybrid)' })
  @ApiQuery({ name: 'q', required: true, description: 'Search query text' })
  @ApiQuery({
    name: 'mode',
    required: false,
    enum: ['keyword', 'semantic', 'hybrid'],
    description: 'Search mode (default: hybrid)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum results to return (default: 50)',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Offset for pagination (default: 0)',
  })
  async searchNotes(
    @Param('workspaceId') workspaceId: string,
    @Query('q') query: string,
    @Query('mode') mode: 'keyword' | 'semantic' | 'hybrid',
    @Query('limit') limit: string,
    @Query('offset') offset: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.notesService.searchNotes(workspaceId, query, userId, {
      mode: mode || 'hybrid',
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }

  @Get(':noteId')
  @ApiOperation({ summary: 'Get note details' })
  async getNote(
    @Param('workspaceId') workspaceId: string,
    @Param('noteId') noteId: string,
    @CurrentUser('sub') userId: string,
    @Query('include_deleted') includeDeleted?: string,
  ) {
    return this.notesService.getNote(noteId, workspaceId, userId, includeDeleted === 'true');
  }

  @Patch(':noteId')
  @ApiOperation({ summary: 'Update a note' })
  async updateNote(
    @Param('workspaceId') workspaceId: string,
    @Param('noteId') noteId: string,
    @Body() updateNoteDto: UpdateNoteDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.notesService.updateNote(noteId, workspaceId, updateNoteDto, userId);
  }

  @Delete('bulk')
  @ApiOperation({
    summary: 'Bulk soft delete multiple notes',
    description:
      'Soft delete multiple notes and all their sub-notes. Each note and its descendants will be marked as deleted.',
  })
  @ApiResponse({
    status: 200,
    description: 'Bulk delete completed',
    schema: {
      example: {
        success: true,
        message: 'Bulk delete completed. 3 notes processed successfully, 0 errors',
        totalDeletedCount: 5,
        processedCount: 3,
        errorCount: 0,
        results: [
          { noteId: 'uuid-1', title: 'Note 1', success: true, deletedCount: 2 },
          { noteId: 'uuid-2', title: 'Note 2', success: true, deletedCount: 1 },
          { noteId: 'uuid-3', title: 'Note 3', success: true, deletedCount: 2 },
        ],
        errors: [],
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  async bulkDeleteNotes(
    @Param('workspaceId') workspaceId: string,
    @Body() bulkDeleteDto: BulkDeleteDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.notesService.bulkDeleteNotes(workspaceId, bulkDeleteDto, userId);
  }

  @Delete(':noteId')
  @ApiOperation({ summary: 'Soft delete a note' })
  @ApiResponse({ status: 200, description: 'Note soft deleted successfully' })
  @ApiResponse({ status: 404, description: 'Note not found' })
  @ApiResponse({ status: 400, description: 'Permission denied' })
  async deleteNote(
    @Param('workspaceId') workspaceId: string,
    @Param('noteId') noteId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.notesService.deleteNote(noteId, workspaceId, userId);
  }

  @Post('bulk/restore')
  @ApiOperation({
    summary: 'Bulk restore multiple soft deleted notes',
    description:
      'Restore multiple soft deleted notes and all their sub-notes by setting deleted_at to null',
  })
  @ApiResponse({
    status: 200,
    description: 'Bulk restore completed',
    schema: {
      example: {
        success: true,
        message: 'Bulk restore completed. 3 notes processed successfully, 0 errors',
        totalRestoredCount: 5,
        processedCount: 3,
        errorCount: 0,
        results: [
          { noteId: 'uuid-1', title: 'Note 1', success: true, restoredCount: 2 },
          { noteId: 'uuid-2', title: 'Note 2', success: true, restoredCount: 1 },
          { noteId: 'uuid-3', title: 'Note 3', success: true, restoredCount: 2 },
        ],
        errors: [],
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  async bulkRestoreNotes(
    @Param('workspaceId') workspaceId: string,
    @Body() bulkDeleteDto: BulkDeleteDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.notesService.bulkRestoreNotes(workspaceId, bulkDeleteDto, userId);
  }

  @Post(':noteId/restore')
  @ApiOperation({
    summary: 'Restore a soft deleted note',
    description: 'Restores a soft deleted note and all its sub-notes by setting deleted_at to null',
  })
  @ApiResponse({
    status: 200,
    description: 'Note restored successfully',
    schema: {
      example: {
        success: true,
        message: 'Note and all sub-notes restored successfully',
        restoredCount: 3,
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Note not found' })
  @ApiResponse({ status: 400, description: 'Note is not deleted or permission denied' })
  async restoreNote(
    @Param('workspaceId') workspaceId: string,
    @Param('noteId') noteId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.notesService.restoreNote(noteId, workspaceId, userId);
  }

  @Post(':noteId/duplicate')
  @ApiOperation({
    summary: 'Duplicate a note',
    description: 'Creates a copy of the note with optional custom title and sub-notes',
  })
  @ApiResponse({
    status: 201,
    description: 'Note duplicated successfully',
    schema: {
      example: {
        success: true,
        message: 'Note duplicated successfully',
        note: {
          id: 'uuid',
          title: 'Note Title (Copy)',
          workspace_id: 'workspace-uuid',
          parent_id: 'parent-uuid',
          created_at: '2024-01-01T00:00:00.000Z',
        },
        duplicatedCount: 3,
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Note not found' })
  async duplicateNote(
    @Param('workspaceId') workspaceId: string,
    @Param('noteId') noteId: string,
    @Body() duplicateNoteDto: DuplicateNoteDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.notesService.duplicateNote(noteId, workspaceId, duplicateNoteDto, userId);
  }

  @Post('bulk/archive')
  @ApiOperation({
    summary: 'Bulk archive multiple notes',
    description: 'Archives multiple notes and all their sub-notes',
  })
  @ApiResponse({
    status: 200,
    description: 'Bulk archive completed',
    schema: {
      example: {
        success: true,
        message: 'Bulk archive completed. 3 notes processed successfully, 0 errors',
        totalArchivedCount: 7,
        processedCount: 3,
        errorCount: 0,
        results: [
          { noteId: 'uuid-1', title: 'Note 1', success: true, archivedCount: 3 },
          { noteId: 'uuid-2', title: 'Note 2', success: true, archivedCount: 1 },
          { noteId: 'uuid-3', title: 'Note 3', success: true, archivedCount: 3 },
        ],
        errors: [],
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  async bulkArchiveNotes(
    @Param('workspaceId') workspaceId: string,
    @Body() bulkArchiveDto: BulkArchiveDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.notesService.bulkArchiveNotes(workspaceId, bulkArchiveDto, userId);
  }

  @Post(':noteId/archive')
  @ApiOperation({
    summary: 'Archive a note',
    description: 'Archives a note and all its sub-notes by setting archived_at timestamp',
  })
  @ApiResponse({
    status: 200,
    description: 'Note archived successfully',
    schema: {
      example: {
        success: true,
        message: 'Note and all sub-notes archived successfully',
        archivedCount: 3,
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Note not found' })
  @ApiResponse({ status: 400, description: 'Note already archived or permission denied' })
  async archiveNote(
    @Param('workspaceId') workspaceId: string,
    @Param('noteId') noteId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.notesService.archiveNote(noteId, workspaceId, userId);
  }

  @Post('bulk/unarchive')
  @ApiOperation({
    summary: 'Bulk unarchive multiple notes',
    description: 'Unarchives multiple notes and all their sub-notes by setting archived_at to null',
  })
  @ApiResponse({
    status: 200,
    description: 'Bulk unarchive completed',
    schema: {
      example: {
        success: true,
        message: 'Bulk unarchive completed. 3 notes processed successfully, 0 errors',
        totalUnarchivedCount: 7,
        processedCount: 3,
        errorCount: 0,
        results: [
          { noteId: 'uuid-1', title: 'Note 1', success: true, unarchivedCount: 3 },
          { noteId: 'uuid-2', title: 'Note 2', success: true, unarchivedCount: 1 },
          { noteId: 'uuid-3', title: 'Note 3', success: true, unarchivedCount: 3 },
        ],
        errors: [],
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  async bulkUnarchiveNotes(
    @Param('workspaceId') workspaceId: string,
    @Body() bulkArchiveDto: BulkArchiveDto, // Reusing the same DTO since it has the same structure
    @CurrentUser('sub') userId: string,
  ) {
    return this.notesService.bulkUnarchiveNotes(workspaceId, bulkArchiveDto, userId);
  }

  @Post(':noteId/unarchive')
  @ApiOperation({
    summary: 'Unarchive a note',
    description: 'Unarchives a note and all its sub-notes by setting archived_at to null',
  })
  @ApiResponse({
    status: 200,
    description: 'Note unarchived successfully',
    schema: {
      example: {
        success: true,
        message: 'Note and all sub-notes unarchived successfully',
        unarchivedCount: 3,
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Note not found' })
  @ApiResponse({ status: 400, description: 'Note is not archived or permission denied' })
  async unarchiveNote(
    @Param('workspaceId') workspaceId: string,
    @Param('noteId') noteId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.notesService.unarchiveNote(noteId, workspaceId, userId);
  }

  @Delete('bulk/permanent')
  @ApiOperation({
    summary: 'Bulk permanently delete multiple notes',
    description:
      'Permanently delete multiple notes and all their sub-notes from the database. This action cannot be undone.',
  })
  @ApiResponse({
    status: 200,
    description: 'Bulk permanent delete completed',
    schema: {
      example: {
        success: true,
        message: 'Bulk permanent delete completed. 3 notes processed successfully, 0 errors',
        totalDeletedCount: 5,
        processedCount: 3,
        errorCount: 0,
        results: [
          { noteId: 'uuid-1', title: 'Note 1', success: true, deletedCount: 2 },
          { noteId: 'uuid-2', title: 'Note 2', success: true, deletedCount: 1 },
          { noteId: 'uuid-3', title: 'Note 3', success: true, deletedCount: 2 },
        ],
        errors: [],
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  async bulkPermanentlyDeleteNotes(
    @Param('workspaceId') workspaceId: string,
    @Body() bulkDeleteDto: BulkDeleteDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.notesService.bulkPermanentlyDeleteNotes(workspaceId, bulkDeleteDto, userId);
  }

  @Delete(':noteId/permanent')
  @ApiOperation({
    summary: 'Permanently delete a note',
    description:
      'Permanently deletes a note and all its sub-notes from the database. This action cannot be undone.',
  })
  @ApiResponse({
    status: 200,
    description: 'Note permanently deleted',
    schema: {
      example: {
        success: true,
        message: 'Note and all sub-notes permanently deleted',
        deletedCount: 3,
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Note not found' })
  @ApiResponse({ status: 400, description: 'Permission denied' })
  async permanentlyDeleteNote(
    @Param('workspaceId') workspaceId: string,
    @Param('noteId') noteId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.notesService.permanentlyDeleteNote(noteId, workspaceId, userId);
  }

  @Post(':noteId/share')
  @ApiOperation({ summary: 'Share a note' })
  async shareNote(
    @Param('workspaceId') workspaceId: string,
    @Param('noteId') noteId: string,
    @Body() shareNoteDto: ShareNoteDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.notesService.shareNote(noteId, workspaceId, shareNoteDto, userId);
  }

  // ==================== NOTE ACCESS REQUEST ENDPOINTS ====================

  @Post(':noteId/access-request')
  @ApiOperation({ summary: 'Request access to a note' })
  @ApiResponse({ status: 201, description: 'Access request sent to note owner' })
  @ApiResponse({ status: 400, description: 'Already has access or pending request exists' })
  @ApiResponse({ status: 404, description: 'Note not found' })
  async requestNoteAccess(
    @Param('workspaceId') workspaceId: string,
    @Param('noteId') noteId: string,
    @Body() requestNoteAccessDto: RequestNoteAccessDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.notesService.requestNoteAccess(noteId, workspaceId, userId, requestNoteAccessDto);
  }

  @Patch('access-requests/:requestId')
  @ApiOperation({ summary: 'Owner responds to a note access request (approve or deny)' })
  @ApiParam({ name: 'requestId', description: 'Access request ID' })
  @ApiResponse({ status: 200, description: 'Access request responded to' })
  @ApiResponse({ status: 400, description: 'Not the owner or already responded' })
  @ApiResponse({ status: 404, description: 'Request not found' })
  async respondToNoteAccess(
    @Param('workspaceId') workspaceId: string,
    @Param('requestId') requestId: string,
    @Body() respondNoteAccessDto: RespondNoteAccessDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.notesService.respondToNoteAccess(
      requestId,
      workspaceId,
      userId,
      respondNoteAccessDto,
    );
  }

  @Get(':noteId/access-request/status')
  @ApiOperation({ summary: 'Get current access request status for a note' })
  @ApiResponse({ status: 200, description: 'Access request status or null' })
  async getNoteAccessStatus(
    @Param('workspaceId') workspaceId: string,
    @Param('noteId') noteId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.notesService.getNoteAccessStatus(noteId, workspaceId, userId);
  }

  @Get('access-requests/:requestId')
  @ApiOperation({ summary: 'Get access request by ID' })
  @ApiResponse({ status: 200, description: 'Access request' })
  @ApiResponse({ status: 404, description: 'Request not found' })
  async getAccessRequestById(
    @Param('workspaceId') workspaceId: string,
    @Param('requestId') requestId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.notesService.getAccessRequestById(requestId, workspaceId, userId);
  }

  // ==================== SHARE PERMISSION MANAGEMENT ====================

  @Patch(':noteId/share/:userId')
  @ApiOperation({ summary: 'Update permission for a shared user' })
  @ApiParam({ name: 'userId', description: 'Target user ID to update permission for' })
  @ApiResponse({ status: 200, description: 'Permission updated' })
  @ApiResponse({ status: 403, description: 'Not the note owner' })
  @ApiResponse({ status: 404, description: 'Note or user not found in shared list' })
  async updateSharePermission(
    @Param('workspaceId') workspaceId: string,
    @Param('noteId') noteId: string,
    @Param('userId') targetUserId: string,
    @Body() dto: UpdateSharePermissionDto,
    @CurrentUser('sub') requesterId: string,
  ) {
    return this.notesService.updateSharePermission(noteId, workspaceId, targetUserId, dto, requesterId);
  }

  // ==================== PERMISSION CHANGE REQUEST ENDPOINTS ====================

  @Post(':noteId/permission-request')
  @ApiOperation({ summary: 'Request a permission change (Viewer → Editor)' })
  @ApiResponse({ status: 201, description: 'Permission change request sent to owner' })
  async requestPermissionChange(
    @Param('workspaceId') workspaceId: string,
    @Param('noteId') noteId: string,
    @Body() dto: NotePermissionRequestDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.notesService.requestPermissionChange(noteId, workspaceId, dto, userId);
  }

  @Post(':noteId/respond-permission-request')
  @ApiOperation({ summary: 'Owner approves or denies a viewer permission change request' })
  @ApiBody({ schema: { properties: { requesterId: { type: 'string' }, action: { type: 'string', enum: ['approve', 'deny'] } }, required: ['requesterId', 'action'] } })
  @ApiResponse({ status: 200, description: 'Response recorded' })
  async respondPermissionChangeRequest(
    @Param('workspaceId') workspaceId: string,
    @Param('noteId') noteId: string,
    @Body() body: { requesterId: string; action: 'approve' | 'deny' },
    @CurrentUser('sub') ownerId: string,
  ) {
    return this.notesService.respondPermissionChangeRequest(noteId, workspaceId, body.requesterId, body.action, ownerId);
  }

}

