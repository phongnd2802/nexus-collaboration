import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class InternalAgentGuard implements CanActivate {
  constructor(
    private readonly config: ConfigService,
    private readonly db: DatabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const expectedToken = this.config.get<string>('NEXUS_INTERNAL_API_TOKEN', '');
    const receivedToken = request.headers['x-nexus-internal-token'];
    const userId = request.headers['x-user-id'];
    const workspaceId = request.params?.workspaceId || request.headers['x-workspace-id'];

    if (!expectedToken || receivedToken !== expectedToken) {
      throw new UnauthorizedException('Invalid internal token');
    }
    if (!userId || !workspaceId) {
      throw new ForbiddenException('User and workspace context are required');
    }

    const result = await this.db.findMany('workspace_members', {
      workspace_id: workspaceId,
      user_id: userId,
      is_active: true,
    });
    const membership = Array.isArray(result.data) ? result.data[0] : null;
    if (!membership) {
      throw new ForbiddenException('Access denied: Not a member of this workspace');
    }

    request.user = { sub: userId, userId };
    request.workspace = {
      id: workspaceId,
      membershipRole: membership.role,
      permissions: membership.permissions,
    };
    return true;
  }
}
