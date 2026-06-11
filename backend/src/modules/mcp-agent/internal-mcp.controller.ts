import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProjectsService } from '../projects/projects.service';
import { WorkspaceService } from '../workspace/workspace.service';

@Controller('internal/mcp')
export class InternalMcpController {
  constructor(
    private readonly configService: ConfigService,
    private readonly projectsService: ProjectsService,
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
}
