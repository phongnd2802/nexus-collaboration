import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { ProjectsService } from '../projects/projects.service';
import { CreateProjectDto, CreateTaskDto, UpdateProjectDto, UpdateTaskDto } from '../projects/dto';
import { WorkspaceService } from '../workspace/workspace.service';
import { InternalAgentGuard } from './internal-agent.guard';

@Controller('internal/agent/workspaces/:workspaceId')
@UseGuards(InternalAgentGuard)
export class InternalAgentController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly workspaceService: WorkspaceService,
  ) {}

  private userId(request: Request): string {
    return (request as any).user.sub || (request as any).user.userId;
  }

  @Get('projects')
  listProjects(@Param('workspaceId') workspaceId: string, @Req() request: Request, @Query() query: any) {
    return this.projectsService.findAll(workspaceId, this.userId(request), {
      status: query.status,
      type: query.type,
    });
  }

  @Get('members')
  listWorkspaceMembers(@Param('workspaceId') workspaceId: string, @Req() request: Request) {
    return this.workspaceService.getMembers(workspaceId, this.userId(request));
  }

  @Get('projects/:projectId')
  getProject(@Param('projectId') projectId: string, @Req() request: Request) {
    return this.projectsService.findOne(projectId, this.userId(request));
  }

  @Post('projects')
  createProject(
    @Param('workspaceId') workspaceId: string,
    @Body() body: CreateProjectDto,
    @Req() request: Request,
  ) {
    return this.projectsService.create(workspaceId, body, this.userId(request));
  }

  @Patch('projects/:projectId')
  updateProject(
    @Param('projectId') projectId: string,
    @Body() body: UpdateProjectDto,
    @Req() request: Request,
  ) {
    return this.projectsService.update(projectId, body, this.userId(request));
  }

  @Get('tasks')
  listWorkspaceTasks(@Param('workspaceId') workspaceId: string, @Req() request: Request, @Query() query: any) {
    return this.projectsService.getAllWorkspaceTasks(workspaceId, this.userId(request), {
      search: query.search,
      status: query.status,
      limit: query.limit ? parseInt(query.limit, 10) : undefined,
    });
  }

  @Get('projects/:projectId/tasks')
  listProjectTasks(@Param('projectId') projectId: string, @Req() request: Request, @Query() query: any) {
    return this.projectsService.getTasks(projectId, this.userId(request), query.sprintId, query.status);
  }

  @Get('tasks/:taskId')
  getTask(@Param('taskId') taskId: string, @Req() request: Request) {
    return this.projectsService.getTask(taskId, this.userId(request));
  }

  @Post('projects/:projectId/tasks')
  createTask(
    @Param('projectId') projectId: string,
    @Body() body: CreateTaskDto,
    @Req() request: Request,
  ) {
    return this.projectsService.createTask(projectId, body, this.userId(request));
  }

  @Patch('tasks/:taskId')
  updateTask(@Param('taskId') taskId: string, @Body() body: UpdateTaskDto, @Req() request: Request) {
    return this.projectsService.updateTask(taskId, body, this.userId(request));
  }
}
