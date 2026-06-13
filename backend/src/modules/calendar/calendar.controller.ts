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
  Put,
  UseInterceptors,
  UploadedFiles,
  UploadedFile,
  BadRequestException,
  NotFoundException,
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
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import { CalendarService } from './calendar.service';
import {
  CreateEventDto,
  UpdateEventDto,
  CreateMeetingRoomDto,
  CreateEventCategoryDto,
  UpdateEventCategoryDto,
  CalendarDashboardStatsDto,
} from './dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { WorkspaceGuard } from '../../common/guards/workspace.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('calendar')
@ApiBearerAuth()
@Controller('workspaces/:workspaceId/calendar')
@UseGuards(AuthGuard, WorkspaceGuard)
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  // ============================================
  // EVENT OPERATIONS
  // ============================================

  @Post('events')
  @UseInterceptors(
    FilesInterceptor('attachments', 10, {
      storage: multer.memoryStorage(),
      fileFilter: (req, file, cb) => {
        // Accept common document and image files
        const allowedMimeTypes = [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'text/plain',
          'text/csv',
        ];

        if (allowedMimeTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException(`File type ${file.mimetype} is not allowed`), false);
        }
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit per file
        files: 10, // Maximum 10 files
      },
    }),
  )
  @ApiOperation({ summary: 'Create a new event with optional file attachments' })
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiBody({
    description: 'Event data with optional file attachments',
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', example: 'Team Meeting' },
        description: { type: 'string', example: 'Weekly team sync' },
        start_time: { type: 'string', example: '2024-01-15T10:00:00.000Z' },
        end_time: { type: 'string', example: '2024-01-15T11:00:00.000Z' },
        location: { type: 'string', example: 'Conference Room A' },
        attendees: {
          type: 'array',
          items: { type: 'string' },
          example: ['john@example.com', 'jane@example.com'],
        },
        description_file_ids: {
          type: 'array',
          items: { type: 'string' },
          example: ['file-uuid-1', 'file-uuid-2'],
          description: 'Array of file IDs embedded in the description content',
        },
        attachments: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Files to attach to the event',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Event created successfully' })
  @ApiResponse({ status: 409, description: 'Room not available' })
  @ApiResponse({ status: 400, description: 'Invalid file type or size' })
  async createEvent(
    @Param('workspaceId') workspaceId: string,
    @Body() createEventDto: CreateEventDto,
    @CurrentUser('sub') userId: string,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.calendarService.createEvent(workspaceId, createEventDto, userId, files);
  }

  @Get('events')
  @ApiOperation({ summary: 'Get events in workspace' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiQuery({ name: 'start_date', required: false, description: 'Start date filter' })
  @ApiQuery({ name: 'end_date', required: false, description: 'End date filter' })
  @ApiQuery({ name: 'search', required: false, description: 'Search query for title, description' })
  @ApiQuery({ name: 'categories', required: false, description: 'Comma-separated category IDs' })
  @ApiQuery({
    name: 'priorities',
    required: false,
    description: 'Comma-separated priorities (low,medium,high,urgent)',
  })
  @ApiQuery({
    name: 'statuses',
    required: false,
    description: 'Comma-separated statuses (confirmed,tentative,cancelled,pending)',
  })
  @ApiQuery({ name: 'tags', required: false, description: 'Comma-separated tags' })
  @ApiQuery({ name: 'attendees', required: false, description: 'Comma-separated attendee emails' })
  @ApiQuery({
    name: 'show_declined',
    required: false,
    description: 'Show declined events',
    type: Boolean,
  })
  @ApiQuery({
    name: 'show_cancelled',
    required: false,
    description: 'Show cancelled events',
    type: Boolean,
  })
  @ApiQuery({
    name: 'show_private',
    required: false,
    description: 'Show private events',
    type: Boolean,
  })
  @ApiResponse({ status: 200, description: 'List of events' })
  async getEvents(
    @Param('workspaceId') workspaceId: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @Query('search') search?: string,
    @Query('categories') categories?: string,
    @Query('priorities') priorities?: string,
    @Query('statuses') statuses?: string,
    @Query('tags') tags?: string,
    @Query('attendees') attendees?: string,
    @Query('show_declined') showDeclined?: boolean,
    @Query('show_cancelled') showCancelled?: boolean,
    @Query('show_private') showPrivate?: boolean,
    @CurrentUser('sub') userId?: string,
  ) {
    const filters = {
      search,
      categories: categories ? categories.split(',') : undefined,
      priorities: priorities ? priorities.split(',') : undefined,
      statuses: statuses ? statuses.split(',') : undefined,
      tags: tags ? tags.split(',') : undefined,
      attendees: attendees ? attendees.split(',') : undefined,
      showDeclined,
      showCancelled,
      showPrivate,
    };

    // Get local events from database
    const localEvents = await this.calendarService.getEvents(
      workspaceId,
      startDate,
      endDate,
      userId,
      filters,
    );

    return localEvents;
  }

  @Get('upcoming')
  @ApiOperation({ summary: 'Get upcoming events' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiQuery({
    name: 'days',
    required: false,
    description: 'Number of days to look ahead (default: 7)',
  })
  @ApiResponse({ status: 200, description: 'List of upcoming events' })
  async getUpcomingEvents(
    @Param('workspaceId') workspaceId: string,
    @Query('days') days?: string,
    @CurrentUser('sub') userId?: string,
  ) {
    const daysAhead = days ? parseInt(days, 10) : 7;
    const startDate = new Date().toISOString();
    const endDate = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000).toISOString();

    // Get local events from database
    const localEvents = await this.calendarService.getEvents(
      workspaceId,
      startDate,
      endDate,
      userId,
    );

    return localEvents;
  }

  @Get('events/:eventId')
  @ApiOperation({ summary: 'Get event details' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiResponse({ status: 200, description: 'Event details' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async getEvent(
    @Param('workspaceId') workspaceId: string,
    @Param('eventId') eventId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.calendarService.getEvent(eventId, workspaceId, userId);
  }

  @Patch('events/:eventId')
  @UseInterceptors(
    FilesInterceptor('attachments', 10, {
      storage: multer.memoryStorage(),
      fileFilter: (req, file, cb) => {
        // Accept common document and image files
        const allowedMimeTypes = [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'text/plain',
          'text/csv',
        ];

        if (allowedMimeTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException(`File type ${file.mimetype} is not allowed`), false);
        }
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit per file
        files: 10, // Maximum 10 files
      },
    }),
  )
  @ApiOperation({ summary: 'Update an event with optional file attachments' })
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiBody({
    description: 'Event update data with optional file attachments',
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', example: 'Updated Team Meeting' },
        description: { type: 'string', example: 'Updated weekly team sync' },
        start_time: { type: 'string', example: '2024-01-15T10:00:00.000Z' },
        end_time: { type: 'string', example: '2024-01-15T11:00:00.000Z' },
        location: { type: 'string', example: 'Conference Room B' },
        attendees: {
          type: 'array',
          items: { type: 'string' },
          example: ['john@example.com', 'jane@example.com', 'bob@example.com'],
        },
        description_file_ids: {
          type: 'array',
          items: { type: 'string' },
          example: ['file-uuid-1', 'file-uuid-2'],
          description: 'Array of file IDs embedded in the description content',
        },
        attachments: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'New files to attach to the event (will be added to existing attachments)',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Event updated successfully' })
  @ApiResponse({ status: 403, description: 'Permission denied' })
  @ApiResponse({ status: 400, description: 'Invalid file type or size' })
  async updateEvent(
    @Param('workspaceId') workspaceId: string,
    @Param('eventId') eventId: string,
    @Body() updateEventDto: UpdateEventDto,
    @CurrentUser('sub') userId: string,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.calendarService.updateEvent(eventId, workspaceId, updateEventDto, userId, files);
  }

  @Delete('events/:eventId')
  @ApiOperation({ summary: 'Delete an event' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiResponse({ status: 200, description: 'Event deleted successfully' })
  @ApiResponse({ status: 403, description: 'Only organizer can delete' })
  async deleteEvent(
    @Param('workspaceId') workspaceId: string,
    @Param('eventId') eventId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.calendarService.deleteEvent(eventId, workspaceId, userId);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search events in workspace (organizer or attendee)' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiQuery({ name: 'q', required: true, description: 'Search query' })
  @ApiQuery({ name: 'categories', required: false, description: 'Comma-separated category IDs' })
  @ApiQuery({ name: 'priorities', required: false, description: 'Comma-separated priorities' })
  @ApiQuery({ name: 'statuses', required: false, description: 'Comma-separated statuses' })
  @ApiQuery({ name: 'tags', required: false, description: 'Comma-separated tags' })
  @ApiQuery({ name: 'start_date', required: false, description: 'Start date filter' })
  @ApiQuery({ name: 'end_date', required: false, description: 'End date filter' })
  @ApiResponse({
    status: 200,
    description: 'Search results for events where user is organizer or attendee',
  })
  async searchEvents(
    @Param('workspaceId') workspaceId: string,
    @Query('q') query: string,
    @Query('categories') categories?: string,
    @Query('priorities') priorities?: string,
    @Query('statuses') statuses?: string,
    @Query('tags') tags?: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @CurrentUser('sub') userId?: string,
  ) {
    const filters = {
      categories: categories ? categories.split(',') : undefined,
      priorities: priorities ? priorities.split(',') : undefined,
      statuses: statuses ? statuses.split(',') : undefined,
      tags: tags ? tags.split(',') : undefined,
    };

    return this.calendarService.searchEvents(
      workspaceId,
      query,
      startDate,
      endDate,
      filters,
      userId,
    );
  }

  @Put('events/:eventId/respond')
  @ApiOperation({ summary: 'Respond to event invitation' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiResponse({ status: 200, description: 'Response recorded successfully' })
  async respondToEvent(
    @Param('eventId') eventId: string,
    @Body() body: { response: 'accepted' | 'declined' | 'tentative' },
    @CurrentUser('sub') userId: string,
  ) {
    return this.calendarService.respondToEvent(eventId, userId, body.response);
  }

  // ============================================
  // MEETING ROOM OPERATIONS
  // ============================================

  @Post('rooms')
  @ApiOperation({ summary: 'Create a new meeting room' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 201, description: 'Meeting room created successfully' })
  @ApiResponse({ status: 409, description: 'Room code already exists' })
  async createMeetingRoom(
    @Param('workspaceId') workspaceId: string,
    @Body() createMeetingRoomDto: CreateMeetingRoomDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.calendarService.createMeetingRoom(workspaceId, createMeetingRoomDto, userId);
  }

  @Get('rooms')
  @ApiOperation({ summary: 'Get meeting rooms' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiQuery({ name: 'available_only', required: false, description: 'Show only available rooms' })
  @ApiQuery({ name: 'capacity', required: false, description: 'Minimum capacity' })
  @ApiResponse({ status: 200, description: 'List of meeting rooms' })
  async getMeetingRooms(
    @Param('workspaceId') workspaceId: string,
    @Query('available_only') availableOnly?: boolean,
    @Query('capacity') capacity?: number,
  ) {
    return this.calendarService.getMeetingRooms(workspaceId, availableOnly, capacity);
  }

  @Get('rooms/:roomId')
  @ApiOperation({ summary: 'Get meeting room details' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'roomId', description: 'Room ID' })
  @ApiResponse({ status: 200, description: 'Meeting room details' })
  async getMeetingRoom(@Param('workspaceId') workspaceId: string, @Param('roomId') roomId: string) {
    return this.calendarService.getMeetingRoom(roomId, workspaceId);
  }

  @Patch('rooms/:roomId')
  @ApiOperation({ summary: 'Update meeting room' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'roomId', description: 'Room ID' })
  @ApiResponse({ status: 200, description: 'Meeting room updated successfully' })
  async updateMeetingRoom(
    @Param('workspaceId') workspaceId: string,
    @Param('roomId') roomId: string,
    @Body() updateData: Partial<CreateMeetingRoomDto>,
    @CurrentUser('sub') userId: string,
  ) {
    return this.calendarService.updateMeetingRoom(roomId, workspaceId, updateData, userId);
  }

  @Delete('rooms/:roomId')
  @ApiOperation({ summary: 'Delete meeting room' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'roomId', description: 'Room ID' })
  @ApiResponse({ status: 200, description: 'Meeting room deleted successfully' })
  @ApiResponse({ status: 400, description: 'Room has active bookings' })
  async deleteMeetingRoom(
    @Param('workspaceId') workspaceId: string,
    @Param('roomId') roomId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.calendarService.deleteMeetingRoom(roomId, workspaceId, userId);
  }

  @Get('rooms/:roomId/bookings')
  @ApiOperation({ summary: 'Get room bookings' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'roomId', description: 'Room ID' })
  @ApiQuery({ name: 'start_date', required: false, description: 'Start date filter' })
  @ApiQuery({ name: 'end_date', required: false, description: 'End date filter' })
  @ApiResponse({ status: 200, description: 'Room bookings' })
  async getRoomBookings(
    @Param('roomId') roomId: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
  ) {
    return this.calendarService.getRoomBookings(roomId, startDate, endDate);
  }

  // ============================================
  // EVENT CATEGORY OPERATIONS
  // ============================================

  @Post('categories')
  @ApiOperation({ summary: 'Create a new event category' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 201, description: 'Event category created successfully' })
  @ApiResponse({ status: 409, description: 'Category name already exists' })
  async createEventCategory(
    @Param('workspaceId') workspaceId: string,
    @Body() createEventCategoryDto: CreateEventCategoryDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.calendarService.createEventCategory(workspaceId, createEventCategoryDto, userId);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get all event categories in workspace' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'List of event categories' })
  async getEventCategories(@Param('workspaceId') workspaceId: string) {
    return this.calendarService.getEventCategories(workspaceId);
  }

  @Get('categories/:categoryId')
  @ApiOperation({ summary: 'Get event category details' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'categoryId', description: 'Category ID' })
  @ApiResponse({ status: 200, description: 'Event category details' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async getEventCategory(
    @Param('workspaceId') workspaceId: string,
    @Param('categoryId') categoryId: string,
  ) {
    return this.calendarService.getEventCategory(categoryId, workspaceId);
  }

  @Patch('categories/:categoryId')
  @ApiOperation({ summary: 'Update an event category' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'categoryId', description: 'Category ID' })
  @ApiResponse({ status: 200, description: 'Event category updated successfully' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async updateEventCategory(
    @Param('workspaceId') workspaceId: string,
    @Param('categoryId') categoryId: string,
    @Body() updateEventCategoryDto: UpdateEventCategoryDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.calendarService.updateEventCategory(
      categoryId,
      workspaceId,
      updateEventCategoryDto,
      userId,
    );
  }

  @Delete('categories/:categoryId')
  @ApiOperation({ summary: 'Delete an event category' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'categoryId', description: 'Category ID' })
  @ApiResponse({ status: 200, description: 'Event category deleted successfully' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @ApiResponse({ status: 400, description: 'Category is in use by events' })
  async deleteEventCategory(
    @Param('workspaceId') workspaceId: string,
    @Param('categoryId') categoryId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.calendarService.deleteEventCategory(categoryId, workspaceId, userId);
  }

  // ============================================
  // CALENDAR DASHBOARD STATISTICS
  // ============================================

  @Get('dashboard-stats')
  @ApiOperation({
    summary: 'Get comprehensive calendar dashboard statistics',
    description:
      'Returns detailed analytics including overview stats, weekly activity, hourly distribution, category breakdown, priority analysis, and AI-generated insights',
  })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['today', 'week', 'month', 'last3months', 'year'],
    description: 'Time period for statistics (default: week)',
  })
  @ApiQuery({
    name: 'start_date',
    required: false,
    description: 'Custom start date (ISO format)',
  })
  @ApiQuery({
    name: 'end_date',
    required: false,
    description: 'Custom end date (ISO format)',
  })
  @ApiResponse({
    status: 200,
    description: 'Calendar dashboard statistics retrieved successfully',
    type: CalendarDashboardStatsDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid date parameters' })
  @ApiResponse({ status: 500, description: 'Failed to generate statistics' })
  async getCalendarDashboardStats(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
    @Query('period') period: string = 'week',
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
  ): Promise<CalendarDashboardStatsDto> {
    return this.calendarService.getCalendarDashboardStats(
      workspaceId,
      userId,
      startDate,
      endDate,
      period,
    );
  }

}
