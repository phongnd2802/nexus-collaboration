import { Injectable, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const path = request.path || request.url;
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      this.logger.error(`[JWT Guard] No token found - path: ${path}`);
      throw new UnauthorizedException('Token not found');
    }

    this.logger.debug(`[JWT Guard] Processing token for path: ${path}`);

    try {
      const secret = this.configService.get<string>('JWT_SECRET');
      if (!secret) {
        throw new UnauthorizedException('JWT secret is not configured');
      }
      const payload = this.jwtService.verify(token, { secret }) as any;

      if (!payload) {
        this.logger.error(`[JWT Guard] Invalid token format - path: ${path}`);
        throw new UnauthorizedException('Invalid token format');
      }

      request.user = {
        sub: payload.userId || payload.sub,
        userId: payload.userId || payload.sub,
        email: payload.email,
        role: payload.role,
        projectId: payload.projectId,
        appId: payload.appId,
        name: payload.name,
        username: payload.username,
      };

      this.logger.log(`[JWT Guard] Token valid - path: ${path}`);
      return true;
    } catch (error) {
      this.logger.error(`[JWT Guard] Token decode failed - path: ${path}, error: ${error.message}`);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
