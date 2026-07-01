import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    this.validateInternalMcpRequest(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      const secret = this.configService.get<string>('JWT_SECRET');
      if (!secret) {
        throw new UnauthorizedException('JWT secret is not configured');
      }
      const payload = this.jwtService.verify(token, { secret }) as any;

      if (!payload) {
        throw new UnauthorizedException('Invalid token format');
      }

      request['user'] = {
        sub: payload.userId || payload.sub,
        userId: payload.userId || payload.sub,
        email: payload.email,
        role: payload.role,
        projectId: payload.projectId,
        appId: payload.appId,
        name: payload.name,
        username: payload.username,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid token');
    }

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  private validateInternalMcpRequest(request: Request): void {
    const source = this.getHeader(request, 'x-nexus-source');

    if (source !== 'mcp') {
      return;
    }

    const expectedKey =
      this.configService.get<string>('NEXUS_INTERNAL_API_KEY') ||
      this.configService.get<string>('NEXUS_API_KEY');

    if (!expectedKey) {
      throw new UnauthorizedException('Nexus internal API key is not configured');
    }

    const providedKey = this.getHeader(request, 'x-api-key');
    if (!providedKey || providedKey !== expectedKey) {
      throw new UnauthorizedException('Invalid Nexus internal API key');
    }
  }

  private getHeader(request: Request, name: string): string | undefined {
    const value = request.headers[name.toLowerCase()];

    if (Array.isArray(value)) {
      return value[0];
    }

    return value;
  }
}
