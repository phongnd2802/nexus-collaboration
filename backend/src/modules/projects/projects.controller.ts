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
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { WorkspaceGuard } from '../../common/guards/workspace.guard';
import {
  CreateProjectDto,
  UpdateProjectDto,
  CreateTaskDto,
  CreateCustomFieldDto,
  UpdateCustomFieldDto,
  ReorderCustomFieldsDto,
  AddSelectOptionDto,
  CreateTaskCommentDto,
  UpdateTaskCommentDto,
} from './dto';

@ApiTags('projects')
@Controller('workspaces/:workspaceId/projects')
@UseGuards(AuthGuard, WorkspaceGuard)
@ApiBearerAuth()
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new project' })
  @ApiResponse({
    status: 201,
    description: 'The project has been successfully created.',
  })
  async create(
    @Param('workspaceId') workspaceId: string,
    @Body() createProjectDto: CreateProjectDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.projectsService.create(workspaceId, createProjectDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all projects in workspace' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiResponse({ status: 200, description: 'Return all projects.' })
  async findAll(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
    @Query() query: any,
  ) {
    const filters = {
      status: query.status,
      type: query.type,
    };
    return this.projectsService.findAll(workspaceId, userId, filters);
  }

  @Get('all-tasks')
  @ApiOperation({ summary: 'Get all tasks across all projects in workspace' })
  @ApiQuery({ name: 'search', required: false, description: 'Search tasks by title' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limit number of results' })
  @ApiResponse({ status: 200, description: 'Return all tasks in the workspace.' })
  async getAllWorkspaceTasks(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ) {
    return this.projectsService.getAllWorkspaceTasks(workspaceId, userId, {
      search,
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a project by id' })
  @ApiResponse({ status: 200, description: 'Return the project.' })
  @ApiResponse({ status: 404, description: 'Project not found.' })
  async findOne(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.projectsService.findOne(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a project' })
  @ApiResponse({
    status: 200,
    description: 'The project has been successfully updated.',
  })
  @ApiResponse({ status: 404, description: 'Project not found.' })
  async update(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body() updateProjectDto: UpdateProjectDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.projectsService.update(id, updateProjectDto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a project' })
  @ApiResponse({
    status: 200,
    description: 'The project has been successfully deleted.',
  })
  @ApiResponse({ status: 404, description: 'Project not found.' })
  async remove(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.projectsService.remove(id, userId);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'Get all members of a project' })
  @ApiResponse({
    status: 200,
    description: 'Return all members of the project with their details.',
  })
  @ApiResponse({ status: 404, description: 'Project not found.' })
  @ApiResponse({ status: 403, description: 'Access denied.' })
  async getProjectMembers(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.projectsService.getProjectMembers(id, userId);
  }

  // ==================== TASK ENDPOINTS ====================

  @Get(':projectId/tasks')
  @ApiOperation({ summary: 'Get all tasks in project' })
  @ApiQuery({ name: 'sprintId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiResponse({ status: 200, description: 'Return all tasks in project.' })
  async getProjectTasks(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @CurrentUser('sub') userId: string,
    @Query() query: any,
  ) {
    return this.projectsService.getTasks(projectId, userId, query.sprintId, query.status);
  }

  @Post(':projectId/tasks')
  @ApiOperation({ summary: 'Create a new task' })
  @ApiResponse({
    status: 201,
    description: 'The task has been successfully created.',
  })
  async createTask(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Body() createTaskDto: CreateTaskDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.projectsService.createTask(projectId, createTaskDto, userId);
  }

  @Get('tasks/:taskId')
  @ApiOperation({ summary: 'Get a task by id' })
  @ApiResponse({ status: 200, description: 'Return the task.' })
  @ApiResponse({ status: 404, description: 'Task not found.' })
  async getTask(
    @Param('workspaceId') workspaceId: string,
    @Param('taskId') taskId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.projectsService.getTask(taskId, userId);
  }

  @Patch('tasks/:taskId')
  @ApiOperation({ summary: 'Update a task' })
  @ApiResponse({
    status: 200,
    description: 'The task has been successfully updated.',
  })
  @ApiResponse({ status: 404, description: 'Task not found.' })
  async updateTask(
    @Param('workspaceId') workspaceId: string,
    @Param('taskId') taskId: string,
    @Body() updateTaskDto: any,
    @CurrentUser('sub') userId: string,
  ) {
    return this.projectsService.updateTask(taskId, updateTaskDto, userId);
  }

  @Delete('tasks/:taskId')
  @ApiOperation({ summary: 'Delete a task' })
  @ApiResponse({
    status: 200,
    description: 'The task has been successfully deleted.',
  })
  @ApiResponse({ status: 404, description: 'Task not found.' })
  async deleteTask(
    @Param('workspaceId') workspaceId: string,
    @Param('taskId') taskId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.projectsService.deleteTask(taskId, userId);
  }

  // ==================== TASK COMMENT ENDPOINTS ====================

  @Get('tasks/:taskId/comments')
  @ApiOperation({ summary: 'Get all comments for a task' })
  @ApiResponse({ status: 200, description: 'Return all comments for the task.' })
  @ApiResponse({ status: 404, description: 'Task not found.' })
  async getTaskComments(
    @Param('workspaceId') workspaceId: string,
    @Param('taskId') taskId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.projectsService.getTaskComments(taskId, userId);
  }

  @Post('tasks/:taskId/comments')
  @ApiOperation({ summary: 'Add a comment to a task' })
  @ApiResponse({ status: 201, description: 'The comment has been successfully created.' })
  @ApiResponse({ status: 404, description: 'Task not found.' })
  async createTaskComment(
    @Param('workspaceId') workspaceId: string,
    @Param('taskId') taskId: string,
    @Body() createTaskCommentDto: CreateTaskCommentDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.projectsService.createTaskComment(taskId, createTaskCommentDto, userId);
  }

  @Patch('comments/:commentId')
  @ApiOperation({ summary: 'Update a task comment' })
  @ApiResponse({ status: 200, description: 'The comment has been successfully updated.' })
  @ApiResponse({ status: 404, description: 'Comment not found.' })
  @ApiResponse({ status: 403, description: 'You can only edit your own comments.' })
  async updateTaskComment(
    @Param('workspaceId') workspaceId: string,
    @Param('commentId') commentId: string,
    @Body() updateTaskCommentDto: UpdateTaskCommentDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.projectsService.updateTaskComment(commentId, updateTaskCommentDto, userId);
  }

  @Delete('comments/:commentId')
  @ApiOperation({ summary: 'Delete a task comment' })
  @ApiResponse({ status: 200, description: 'The comment has been successfully deleted.' })
  @ApiResponse({ status: 404, description: 'Comment not found.' })
  @ApiResponse({ status: 403, description: 'You can only delete your own comments.' })
  async deleteTaskComment(
    @Param('workspaceId') workspaceId: string,
    @Param('commentId') commentId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.projectsService.deleteTaskComment(commentId, userId);
  }

  // ==================== CUSTOM FIELD ENDPOINTS ====================

  @Get(':projectId/custom-fields')
  @ApiOperation({ summary: 'Get all custom field definitions for a project' })
  @ApiResponse({ status: 200, description: 'Return all custom fields.' })
  async getCustomFields(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.projectsService.getCustomFields(projectId, userId);
  }

  @Post(':projectId/custom-fields')
  @ApiOperation({ summary: 'Create a new custom field definition' })
  @ApiResponse({
    status: 201,
    description: 'The custom field has been successfully created.',
  })
  async createCustomField(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Body() createCustomFieldDto: CreateCustomFieldDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.projectsService.createCustomField(projectId, createCustomFieldDto, userId);
  }

  @Patch('custom-fields/:fieldId')
  @ApiOperation({ summary: 'Update a custom field definition' })
  @ApiResponse({
    status: 200,
    description: 'The custom field has been successfully updated.',
  })
  @ApiResponse({ status: 404, description: 'Custom field not found.' })
  async updateCustomField(
    @Param('workspaceId') workspaceId: string,
    @Param('fieldId') fieldId: string,
    @Body() updateCustomFieldDto: UpdateCustomFieldDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.projectsService.updateCustomField(fieldId, updateCustomFieldDto, userId);
  }

  @Delete('custom-fields/:fieldId')
  @ApiOperation({ summary: 'Delete a custom field definition' })
  @ApiResponse({
    status: 200,
    description: 'The custom field has been successfully deleted.',
  })
  @ApiResponse({ status: 404, description: 'Custom field not found.' })
  async deleteCustomField(
    @Param('workspaceId') workspaceId: string,
    @Param('fieldId') fieldId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.projectsService.deleteCustomField(fieldId, userId);
  }

  @Patch(':projectId/custom-fields/reorder')
  @ApiOperation({ summary: 'Reorder custom fields for a project' })
  @ApiResponse({
    status: 200,
    description: 'Custom fields have been reordered.',
  })
  async reorderCustomFields(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Body() reorderDto: ReorderCustomFieldsDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.projectsService.reorderCustomFields(projectId, reorderDto.fieldIds, userId);
  }

  @Post('custom-fields/:fieldId/options')
  @ApiOperation({ summary: 'Add an option to a select/multi-select field' })
  @ApiResponse({
    status: 201,
    description: 'The option has been added.',
  })
  async addSelectOption(
    @Param('workspaceId') workspaceId: string,
    @Param('fieldId') fieldId: string,
    @Body() addOptionDto: AddSelectOptionDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.projectsService.addSelectOption(fieldId, addOptionDto, userId);
  }
}
