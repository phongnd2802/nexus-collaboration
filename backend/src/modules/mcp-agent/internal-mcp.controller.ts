import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CalendarService } from '../calendar/calendar.service';
import { FilesService } from '../files/files.service';
import { NotesService } from '../notes/notes.service';
import { ProjectsService } from '../projects/projects.service';
import { SearchService } from '../search/search.service';
import { IndexableContentType, SemanticSearchService } from '../search/semantic-search.service';
import { WorkspaceService } from '../workspace/workspace.service';

@Controller('internal/mcp')
export class InternalMcpController {
  constructor(
    private readonly configService: ConfigService,
    private readonly calendarService: CalendarService,
    private readonly filesService: FilesService,
    private readonly notesService: NotesService,
    private readonly projectsService: ProjectsService,
    private readonly searchService: SearchService,
    private readonly semanticSearchService: SemanticSearchService,
    private readonly workspaceService: WorkspaceService,
  ) {}

  @Get('workspaces/:workspaceId/members')
  async listWorkspaceMembers(
    @Param('workspaceId') workspaceId: string,
    @Headers('x-nexus-user-id') userId: string,
    @Headers('x-nexus-internal-token') token: string,
  ) {
    this.assertInternalToken(token);
    this.assertContext(userId, workspaceId);
    return this.workspaceService.getMembers(workspaceId, userId);
  }

  @Get('workspaces/:workspaceId/tasks')
  async listWorkspaceTasks(
    @Param('workspaceId') workspaceId: string,
    @Headers('x-nexus-user-id') userId: string,
    @Headers('x-nexus-internal-token') token: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ) {
    this.assertInternalToken(token);
    this.assertContext(userId, workspaceId);

    return this.projectsService.getAllWorkspaceTasks(workspaceId, userId, {
      search,
      status,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('workspaces/:workspaceId/projects')
  async listProjects(
    @Param('workspaceId') workspaceId: string,
    @Headers('x-nexus-user-id') userId: string,
    @Headers('x-nexus-internal-token') token: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
  ) {
    this.assertInternalToken(token);
    this.assertContext(userId, workspaceId);
    return this.projectsService.findAll(workspaceId, userId, { status, type });
  }

  @Post('workspaces/:workspaceId/projects')
  async createProject(
    @Param('workspaceId') workspaceId: string,
    @Headers('x-nexus-user-id') userId: string,
    @Headers('x-nexus-internal-token') token: string,
    @Body() body: any,
  ) {
    this.assertInternalToken(token);
    this.assertContext(userId, workspaceId);
    return this.projectsService.create(workspaceId, body, userId);
  }

  @Get('workspaces/:workspaceId/projects/:projectId')
  async getProjectDetails(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Headers('x-nexus-user-id') userId: string,
    @Headers('x-nexus-internal-token') token: string,
  ) {
    this.assertInternalToken(token);
    this.assertContext(userId, workspaceId);
    return this.projectsService.findOne(projectId, userId);
  }

  @Patch('workspaces/:workspaceId/projects/:projectId')
  async updateProject(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Headers('x-nexus-user-id') userId: string,
    @Headers('x-nexus-internal-token') token: string,
    @Body() body: any,
  ) {
    this.assertInternalToken(token);
    this.assertContext(userId, workspaceId);
    return this.projectsService.update(projectId, body, userId);
  }

  @Delete('workspaces/:workspaceId/projects/:projectId')
  async deleteProject(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Headers('x-nexus-user-id') userId: string,
    @Headers('x-nexus-internal-token') token: string,
  ) {
    this.assertInternalToken(token);
    this.assertContext(userId, workspaceId);
    return this.projectsService.remove(projectId, userId);
  }

  @Post('workspaces/:workspaceId/projects/:projectId/tasks')
  async createTask(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Headers('x-nexus-user-id') userId: string,
    @Headers('x-nexus-internal-token') token: string,
    @Body() body: any,
  ) {
    this.assertInternalToken(token);
    this.assertContext(userId, workspaceId);
    return this.projectsService.createTask(projectId, body, userId);
  }

  @Patch('workspaces/:workspaceId/tasks/:taskId')
  async updateTask(
    @Param('workspaceId') workspaceId: string,
    @Param('taskId') taskId: string,
    @Headers('x-nexus-user-id') userId: string,
    @Headers('x-nexus-internal-token') token: string,
    @Body() body: any,
  ) {
    this.assertInternalToken(token);
    this.assertContext(userId, workspaceId);
    return this.projectsService.updateTask(taskId, body, userId);
  }

  @Delete('workspaces/:workspaceId/tasks/:taskId')
  async deleteTask(
    @Param('workspaceId') workspaceId: string,
    @Param('taskId') taskId: string,
    @Headers('x-nexus-user-id') userId: string,
    @Headers('x-nexus-internal-token') token: string,
  ) {
    this.assertInternalToken(token);
    this.assertContext(userId, workspaceId);
    return this.projectsService.deleteTask(taskId, userId);
  }

  @Get('workspaces/:workspaceId/calendar/events')
  async listCalendarEvents(
    @Param('workspaceId') workspaceId: string,
    @Headers('x-nexus-user-id') userId: string,
    @Headers('x-nexus-internal-token') token: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @Query('search') search?: string,
    @Query('categories') categories?: string,
    @Query('priorities') priorities?: string,
    @Query('statuses') statuses?: string,
    @Query('tags') tags?: string,
    @Query('attendees') attendees?: string,
  ) {
    this.assertInternalToken(token);
    this.assertContext(userId, workspaceId);
    return this.calendarService.getEvents(workspaceId, startDate, endDate, userId, {
      search,
      categories: this.splitList(categories),
      priorities: this.splitList(priorities),
      statuses: this.splitList(statuses),
      tags: this.splitList(tags),
      attendees: this.splitList(attendees),
    });
  }

  @Get('workspaces/:workspaceId/calendar/upcoming')
  async listUpcomingEvents(
    @Param('workspaceId') workspaceId: string,
    @Headers('x-nexus-user-id') userId: string,
    @Headers('x-nexus-internal-token') token: string,
    @Query('days') days?: string,
  ) {
    this.assertInternalToken(token);
    this.assertContext(userId, workspaceId);
    const daysAhead = this.toNumber(days) || 7;
    const startDate = new Date().toISOString();
    const endDate = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000).toISOString();
    return this.calendarService.getEvents(workspaceId, startDate, endDate, userId);
  }

  @Get('workspaces/:workspaceId/calendar/events/search')
  async searchCalendarEvents(
    @Param('workspaceId') workspaceId: string,
    @Headers('x-nexus-user-id') userId: string,
    @Headers('x-nexus-internal-token') token: string,
    @Query('q') query: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @Query('categories') categories?: string,
    @Query('priorities') priorities?: string,
    @Query('statuses') statuses?: string,
    @Query('tags') tags?: string,
  ) {
    this.assertInternalToken(token);
    this.assertContext(userId, workspaceId);
    return this.calendarService.searchEvents(
      workspaceId,
      query,
      startDate,
      endDate,
      {
        categories: this.splitList(categories),
        priorities: this.splitList(priorities),
        statuses: this.splitList(statuses),
        tags: this.splitList(tags),
      },
      userId,
    );
  }

  @Post('workspaces/:workspaceId/calendar/events')
  async createCalendarEvent(
    @Param('workspaceId') workspaceId: string,
    @Headers('x-nexus-user-id') userId: string,
    @Headers('x-nexus-internal-token') token: string,
    @Body() body: any,
  ) {
    this.assertInternalToken(token);
    this.assertContext(userId, workspaceId);
    return this.calendarService.createEvent(workspaceId, body, userId);
  }

  @Get('workspaces/:workspaceId/calendar/events/:eventId')
  async getCalendarEvent(
    @Param('workspaceId') workspaceId: string,
    @Param('eventId') eventId: string,
    @Headers('x-nexus-user-id') userId: string,
    @Headers('x-nexus-internal-token') token: string,
  ) {
    this.assertInternalToken(token);
    this.assertContext(userId, workspaceId);
    return this.calendarService.getEvent(eventId, workspaceId, userId);
  }

  @Patch('workspaces/:workspaceId/calendar/events/:eventId')
  async updateCalendarEvent(
    @Param('workspaceId') workspaceId: string,
    @Param('eventId') eventId: string,
    @Headers('x-nexus-user-id') userId: string,
    @Headers('x-nexus-internal-token') token: string,
    @Body() body: any,
  ) {
    this.assertInternalToken(token);
    this.assertContext(userId, workspaceId);
    return this.calendarService.updateEvent(eventId, workspaceId, body, userId);
  }

  @Delete('workspaces/:workspaceId/calendar/events/:eventId')
  async deleteCalendarEvent(
    @Param('workspaceId') workspaceId: string,
    @Param('eventId') eventId: string,
    @Headers('x-nexus-user-id') userId: string,
    @Headers('x-nexus-internal-token') token: string,
  ) {
    this.assertInternalToken(token);
    this.assertContext(userId, workspaceId);
    return this.calendarService.deleteEvent(eventId, workspaceId, userId);
  }

  @Put('workspaces/:workspaceId/calendar/events/:eventId/respond')
  async respondToCalendarEvent(
    @Param('workspaceId') workspaceId: string,
    @Param('eventId') eventId: string,
    @Headers('x-nexus-user-id') userId: string,
    @Headers('x-nexus-internal-token') token: string,
    @Body() body: { response?: 'accepted' | 'declined' | 'tentative' },
  ) {
    this.assertInternalToken(token);
    this.assertContext(userId, workspaceId);
    return this.calendarService.respondToEvent(eventId, userId, body.response || 'tentative');
  }

  @Get('workspaces/:workspaceId/notes')
  async listNotes(
    @Param('workspaceId') workspaceId: string,
    @Headers('x-nexus-user-id') userId: string,
    @Headers('x-nexus-internal-token') token: string,
    @Query('parent_id') parentId?: string,
    @Query('is_deleted') isDeleted?: string,
    @Query('is_archived') isArchived?: string,
  ) {
    this.assertInternalToken(token);
    this.assertContext(userId, workspaceId);
    return this.notesService.getNotes(
      workspaceId,
      parentId,
      userId,
      this.toBool(isDeleted),
      this.toBool(isArchived),
    );
  }

  @Get('workspaces/:workspaceId/notes/search')
  async searchNotes(
    @Param('workspaceId') workspaceId: string,
    @Headers('x-nexus-user-id') userId: string,
    @Headers('x-nexus-internal-token') token: string,
    @Query('q') query: string,
    @Query('mode') mode?: 'keyword' | 'semantic' | 'hybrid',
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    this.assertInternalToken(token);
    this.assertContext(userId, workspaceId);
    return this.notesService.searchNotes(workspaceId, query, userId, {
      mode: mode || 'hybrid',
      limit: this.toNumber(limit) || 50,
      offset: this.toNumber(offset) || 0,
    });
  }

  @Post('workspaces/:workspaceId/notes')
  async createNote(
    @Param('workspaceId') workspaceId: string,
    @Headers('x-nexus-user-id') userId: string,
    @Headers('x-nexus-internal-token') token: string,
    @Body() body: any,
  ) {
    this.assertInternalToken(token);
    this.assertContext(userId, workspaceId);
    return this.notesService.createNote(workspaceId, body, userId);
  }

  @Get('workspaces/:workspaceId/notes/:noteId')
  async getNote(
    @Param('workspaceId') workspaceId: string,
    @Param('noteId') noteId: string,
    @Headers('x-nexus-user-id') userId: string,
    @Headers('x-nexus-internal-token') token: string,
  ) {
    this.assertInternalToken(token);
    this.assertContext(userId, workspaceId);
    return this.notesService.getNote(noteId, workspaceId, userId);
  }

  @Patch('workspaces/:workspaceId/notes/:noteId')
  async updateNote(
    @Param('workspaceId') workspaceId: string,
    @Param('noteId') noteId: string,
    @Headers('x-nexus-user-id') userId: string,
    @Headers('x-nexus-internal-token') token: string,
    @Body() body: any,
  ) {
    this.assertInternalToken(token);
    this.assertContext(userId, workspaceId);
    return this.notesService.updateNote(noteId, workspaceId, body, userId);
  }

  @Delete('workspaces/:workspaceId/notes/:noteId')
  async deleteNote(
    @Param('workspaceId') workspaceId: string,
    @Param('noteId') noteId: string,
    @Headers('x-nexus-user-id') userId: string,
    @Headers('x-nexus-internal-token') token: string,
  ) {
    this.assertInternalToken(token);
    this.assertContext(userId, workspaceId);
    return this.notesService.deleteNote(noteId, workspaceId, userId);
  }

  @Post('workspaces/:workspaceId/notes/:noteId/archive')
  async archiveNote(
    @Param('workspaceId') workspaceId: string,
    @Param('noteId') noteId: string,
    @Headers('x-nexus-user-id') userId: string,
    @Headers('x-nexus-internal-token') token: string,
  ) {
    this.assertInternalToken(token);
    this.assertContext(userId, workspaceId);
    return this.notesService.archiveNote(noteId, workspaceId, userId);
  }

  @Post('workspaces/:workspaceId/notes/:noteId/unarchive')
  async unarchiveNote(
    @Param('workspaceId') workspaceId: string,
    @Param('noteId') noteId: string,
    @Headers('x-nexus-user-id') userId: string,
    @Headers('x-nexus-internal-token') token: string,
  ) {
    this.assertInternalToken(token);
    this.assertContext(userId, workspaceId);
    return this.notesService.unarchiveNote(noteId, workspaceId, userId);
  }

  @Post('workspaces/:workspaceId/notes/:noteId/restore')
  async restoreNote(
    @Param('workspaceId') workspaceId: string,
    @Param('noteId') noteId: string,
    @Headers('x-nexus-user-id') userId: string,
    @Headers('x-nexus-internal-token') token: string,
  ) {
    this.assertInternalToken(token);
    this.assertContext(userId, workspaceId);
    return this.notesService.restoreNote(noteId, workspaceId, userId);
  }

  @Post('workspaces/:workspaceId/notes/:noteId/duplicate')
  async duplicateNote(
    @Param('workspaceId') workspaceId: string,
    @Param('noteId') noteId: string,
    @Headers('x-nexus-user-id') userId: string,
    @Headers('x-nexus-internal-token') token: string,
    @Body() body: any,
  ) {
    this.assertInternalToken(token);
    this.assertContext(userId, workspaceId);
    return this.notesService.duplicateNote(noteId, workspaceId, body, userId);
  }

  @Post('workspaces/:workspaceId/notes/:noteId/share')
  async shareNote(
    @Param('workspaceId') workspaceId: string,
    @Param('noteId') noteId: string,
    @Headers('x-nexus-user-id') userId: string,
    @Headers('x-nexus-internal-token') token: string,
    @Body() body: any,
  ) {
    this.assertInternalToken(token);
    this.assertContext(userId, workspaceId);
    return this.notesService.shareNote(noteId, workspaceId, body, userId);
  }

  @Post('workspaces/:workspaceId/notes/merge')
  async mergeNotes(
    @Param('workspaceId') workspaceId: string,
    @Headers('x-nexus-user-id') userId: string,
    @Headers('x-nexus-internal-token') token: string,
    @Body() body: any,
  ) {
    this.assertInternalToken(token);
    this.assertContext(userId, workspaceId);
    return this.notesService.mergeNotes(workspaceId, body, userId);
  }

  @Get('workspaces/:workspaceId/files/folders')
  async listFolders(
    @Param('workspaceId') workspaceId: string,
    @Headers('x-nexus-user-id') userId: string,
    @Headers('x-nexus-internal-token') token: string,
    @Query('parent_id') parentId?: string,
    @Query('is_deleted') isDeleted?: string,
  ) {
    this.assertInternalToken(token);
    this.assertContext(userId, workspaceId);
    return this.filesService.getFolders(workspaceId, parentId, this.toBool(isDeleted), userId);
  }

  @Post('workspaces/:workspaceId/files/folders')
  async createFolder(
    @Param('workspaceId') workspaceId: string,
    @Headers('x-nexus-user-id') userId: string,
    @Headers('x-nexus-internal-token') token: string,
    @Body() body: any,
  ) {
    this.assertInternalToken(token);
    this.assertContext(userId, workspaceId);
    return this.filesService.createFolder(workspaceId, body, userId);
  }

  @Put('workspaces/:workspaceId/files/folders/:folderId')
  async updateFolder(
    @Param('workspaceId') workspaceId: string,
    @Param('folderId') folderId: string,
    @Headers('x-nexus-user-id') userId: string,
    @Headers('x-nexus-internal-token') token: string,
    @Body() body: any,
  ) {
    this.assertInternalToken(token);
    this.assertContext(userId, workspaceId);
    return this.filesService.updateFolder(folderId, workspaceId, body, userId);
  }

  @Put('workspaces/:workspaceId/files/folders/:folderId/move')
  async moveFolder(
    @Param('workspaceId') workspaceId: string,
    @Param('folderId') folderId: string,
    @Headers('x-nexus-user-id') userId: string,
    @Headers('x-nexus-internal-token') token: string,
    @Body() body: any,
  ) {
    this.assertInternalToken(token);
    this.assertContext(userId, workspaceId);
    return this.filesService.moveFolder(folderId, workspaceId, body, userId);
  }

  @Delete('workspaces/:workspaceId/files/folders/:folderId')
  async deleteFolder(
    @Param('workspaceId') workspaceId: string,
    @Param('folderId') folderId: string,
    @Headers('x-nexus-user-id') userId: string,
    @Headers('x-nexus-internal-token') token: string,
  ) {
    this.assertInternalToken(token);
    this.assertContext(userId, workspaceId);
    return this.filesService.deleteFolder(folderId, workspaceId, userId);
  }

  @Post('workspaces/:workspaceId/files/folders/:folderId/restore')
  async restoreFolder(
    @Param('workspaceId') workspaceId: string,
    @Param('folderId') folderId: string,
    @Headers('x-nexus-user-id') userId: string,
    @Headers('x-nexus-internal-token') token: string,
  ) {
    this.assertInternalToken(token);
    this.assertContext(userId, workspaceId);
    return this.filesService.restoreFolderRecursive(folderId, workspaceId, userId);
  }

  @Get('workspaces/:workspaceId/files')
  async listFiles(
    @Param('workspaceId') workspaceId: string,
    @Headers('x-nexus-user-id') userId: string,
    @Headers('x-nexus-internal-token') token: string,
    @Query('folder_id') folderId?: string,
    @Query('is_deleted') isDeleted?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    this.assertInternalToken(token);
    this.assertContext(userId, workspaceId);
    return this.filesService.getFiles(
      workspaceId,
      folderId,
      this.toNumber(page) || 1,
      this.toNumber(limit) || 50,
      this.toBool(isDeleted),
      userId,
    );
  }

  @Get('workspaces/:workspaceId/files/search')
  async searchFiles(
    @Param('workspaceId') workspaceId: string,
    @Headers('x-nexus-user-id') userId: string,
    @Headers('x-nexus-internal-token') token: string,
    @Query('q') query: string,
    @Query('mime_type') mimeType?: string,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    this.assertInternalToken(token);
    this.assertContext(userId, workspaceId);
    return this.filesService.searchFiles(
      workspaceId,
      query,
      { mime_type: mimeType, date_from: dateFrom, date_to: dateTo },
      this.toNumber(page) || 1,
      this.toNumber(limit) || 50,
      userId,
    );
  }

  @Get('workspaces/:workspaceId/files/recent')
  async listRecentFiles(
    @Param('workspaceId') workspaceId: string,
    @Headers('x-nexus-user-id') userId: string,
    @Headers('x-nexus-internal-token') token: string,
    @Query('limit') limit?: string,
  ) {
    this.assertInternalToken(token);
    this.assertContext(userId, workspaceId);
    return this.filesService.getRecentFiles(workspaceId, userId, this.toNumber(limit) || 100);
  }

  @Get('workspaces/:workspaceId/files/starred')
  async listStarredFiles(
    @Param('workspaceId') workspaceId: string,
    @Headers('x-nexus-user-id') userId: string,
    @Headers('x-nexus-internal-token') token: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    this.assertInternalToken(token);
    this.assertContext(userId, workspaceId);
    return this.filesService.getStarredFiles(
      workspaceId,
      this.toNumber(page) || 1,
      this.toNumber(limit) || 50,
    );
  }

  @Get('workspaces/:workspaceId/files/:fileId')
  async getFile(
    @Param('workspaceId') workspaceId: string,
    @Param('fileId') fileId: string,
    @Headers('x-nexus-user-id') userId: string,
    @Headers('x-nexus-internal-token') token: string,
  ) {
    this.assertInternalToken(token);
    this.assertContext(userId, workspaceId);
    return this.filesService.getFile(fileId, workspaceId, userId);
  }

  @Put('workspaces/:workspaceId/files/:fileId')
  async updateFile(
    @Param('workspaceId') workspaceId: string,
    @Param('fileId') fileId: string,
    @Headers('x-nexus-user-id') userId: string,
    @Headers('x-nexus-internal-token') token: string,
    @Body() body: any,
  ) {
    this.assertInternalToken(token);
    this.assertContext(userId, workspaceId);
    return this.filesService.updateFile(fileId, workspaceId, body, userId);
  }

  @Put('workspaces/:workspaceId/files/:fileId/move')
  async moveFile(
    @Param('workspaceId') workspaceId: string,
    @Param('fileId') fileId: string,
    @Headers('x-nexus-user-id') userId: string,
    @Headers('x-nexus-internal-token') token: string,
    @Body() body: any,
  ) {
    this.assertInternalToken(token);
    this.assertContext(userId, workspaceId);
    return this.filesService.moveFile(fileId, workspaceId, body, userId);
  }

  @Post('workspaces/:workspaceId/files/:fileId/copy')
  async copyFile(
    @Param('workspaceId') workspaceId: string,
    @Param('fileId') fileId: string,
    @Headers('x-nexus-user-id') userId: string,
    @Headers('x-nexus-internal-token') token: string,
    @Body() body: any,
  ) {
    this.assertInternalToken(token);
    this.assertContext(userId, workspaceId);
    return this.filesService.copyFile(fileId, workspaceId, body, userId);
  }

  @Delete('workspaces/:workspaceId/files/:fileId')
  async deleteFile(
    @Param('workspaceId') workspaceId: string,
    @Param('fileId') fileId: string,
    @Headers('x-nexus-user-id') userId: string,
    @Headers('x-nexus-internal-token') token: string,
  ) {
    this.assertInternalToken(token);
    this.assertContext(userId, workspaceId);
    return this.filesService.deleteFile(fileId, workspaceId, userId);
  }

  @Post('workspaces/:workspaceId/files/:fileId/restore')
  async restoreFile(
    @Param('workspaceId') workspaceId: string,
    @Param('fileId') fileId: string,
    @Headers('x-nexus-user-id') userId: string,
    @Headers('x-nexus-internal-token') token: string,
  ) {
    this.assertInternalToken(token);
    this.assertContext(userId, workspaceId);
    return this.filesService.restoreFile(fileId, workspaceId, userId);
  }

  @Post('workspaces/:workspaceId/files/:fileId/share')
  async shareFile(
    @Param('workspaceId') workspaceId: string,
    @Param('fileId') fileId: string,
    @Headers('x-nexus-user-id') userId: string,
    @Headers('x-nexus-internal-token') token: string,
    @Body() body: any,
  ) {
    this.assertInternalToken(token);
    this.assertContext(userId, workspaceId);
    return this.filesService.shareFile(fileId, workspaceId, body, userId);
  }

  @Get('workspaces/:workspaceId/search')
  async universalSearch(
    @Param('workspaceId') workspaceId: string,
    @Headers('x-nexus-user-id') userId: string,
    @Headers('x-nexus-internal-token') token: string,
    @Query('query') query: string,
    @Query('types') types?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('semantic') semantic?: string,
  ) {
    this.assertInternalToken(token);
    this.assertContext(userId, workspaceId);
    return this.searchService.universalSearch(
      workspaceId,
      {
        query,
        types: this.splitList(types),
        page: this.toNumber(page) || 1,
        limit: this.toNumber(limit) || 20,
        semantic: this.toBool(semantic),
      },
      userId,
    );
  }

  @Get('workspaces/:workspaceId/search/suggestions')
  async searchSuggestions(
    @Param('workspaceId') workspaceId: string,
    @Headers('x-nexus-user-id') userId: string,
    @Headers('x-nexus-internal-token') token: string,
    @Query('q') query: string,
  ) {
    this.assertInternalToken(token);
    this.assertContext(userId, workspaceId);
    return this.searchService.getSearchSuggestions(workspaceId, query, userId);
  }

  @Get('workspaces/:workspaceId/search/semantic')
  async semanticSearch(
    @Param('workspaceId') workspaceId: string,
    @Headers('x-nexus-user-id') userId: string,
    @Headers('x-nexus-internal-token') token: string,
    @Query('q') query: string,
    @Query('types') types?: string,
    @Query('limit') limit?: string,
    @Query('min_score') minScore?: string,
  ) {
    this.assertInternalToken(token);
    this.assertContext(userId, workspaceId);
    return this.semanticSearchService.search(query, workspaceId, {
      contentTypes: this.splitList(types) as IndexableContentType[] | undefined,
      limit: this.toNumber(limit) || 20,
      minScore: this.toNumber(minScore) || 0.5,
      userId,
    });
  }

  @Get('workspaces/:workspaceId/search/semantic/similar/:contentType/:contentId')
  async findSimilarContent(
    @Param('workspaceId') workspaceId: string,
    @Param('contentType') contentType: IndexableContentType,
    @Param('contentId') contentId: string,
    @Headers('x-nexus-user-id') userId: string,
    @Headers('x-nexus-internal-token') token: string,
    @Query('limit') limit?: string,
  ) {
    this.assertInternalToken(token);
    this.assertContext(userId, workspaceId);
    return this.semanticSearchService.findSimilar(
      contentType,
      contentId,
      workspaceId,
      this.toNumber(limit) || 5,
    );
  }

  private assertInternalToken(token?: string): void {
    const expected = this.configService.get<string>('NEXUS_INTERNAL_API_TOKEN');
    if (!expected || token !== expected) {
      throw new UnauthorizedException('Invalid internal API token');
    }
  }

  private assertContext(userId?: string, workspaceId?: string): void {
    if (!userId || !workspaceId) {
      throw new UnauthorizedException('Missing internal MCP context');
    }
  }

  private toBool(value?: string): boolean | undefined {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
  }

  private toNumber(value?: string): number | undefined {
    if (!value) return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private splitList(value?: string): string[] | undefined {
    if (!value) return undefined;
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
}
