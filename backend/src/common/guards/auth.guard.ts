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
      // Decode database JWT without verification
      // We trust database's signature - just extract the payload
      // The token is already signed by database backend
      const payload = this.jwtService.decode(token) as any;

      if (!payload) {
        throw new UnauthorizedException('Invalid token format');
      }

      // Check if token is expired
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        throw new UnauthorizedException('Token expired');
      }

      // database JWT payload contains: userId, email, role, projectId, appId
      // Map to standard format expected by Nexus
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
