import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { OAuthService } from './oauth.service';

@ApiTags('auth')
@Controller('auth/oauth')
export class OAuthController {
  constructor(private readonly oauthService: OAuthService) {}

  // ────────────────────────────────────
  //  Google
  // ────────────────────────────────────

  @Get('google')
  @ApiOperation({ summary: 'Initiate Google OAuth login' })
  async googleAuth(
    @Query('frontendUrl') frontendUrl: string,
    @Res() res: Response,
  ) {
    if (!frontendUrl) {
      throw new BadRequestException('frontendUrl query parameter is required');
    }
    const url = this.oauthService.getAuthorizationUrl('google', frontendUrl);
    return res.redirect(url);
  }

  @Get('google/callback')
  @ApiOperation({ summary: 'Google OAuth callback' })
  async googleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    const frontendUrl = this.parseFrontendUrl(state);

    if (error) {
      return res.redirect(
        `${frontendUrl}/auth/login?error=${encodeURIComponent(`Google auth denied: ${error}`)}`,
      );
    }
    if (!code) {
      return res.redirect(
        `${frontendUrl}/auth/login?error=${encodeURIComponent('Missing authorization code')}`,
      );
    }

    try {
      const result = await this.oauthService.handleCallback('google', code, state);
      const params = new URLSearchParams({
        access_token: result.exchangeToken,
        user_id: result.user.id,
        email: result.user.email,
      });
      return res.redirect(`${frontendUrl}/auth/callback?${params.toString()}`);
    } catch (err) {
      return res.redirect(
        `${frontendUrl}/auth/login?error=${encodeURIComponent(err.message)}`,
      );
    }
  }

  // ────────────────────────────────────
  //  GitHub
  // ────────────────────────────────────

  @Get('github')
  @ApiOperation({ summary: 'Initiate GitHub OAuth login' })
  async githubAuth(
    @Query('frontendUrl') frontendUrl: string,
    @Res() res: Response,
  ) {
    if (!frontendUrl) {
      throw new BadRequestException('frontendUrl query parameter is required');
    }
    const url = this.oauthService.getAuthorizationUrl('github', frontendUrl);
    return res.redirect(url);
  }

  @Get('github/callback')
  @ApiOperation({ summary: 'GitHub OAuth callback' })
  async githubCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    const frontendUrl = this.parseFrontendUrl(state);

    if (error) {
      return res.redirect(
        `${frontendUrl}/auth/login?error=${encodeURIComponent(`GitHub auth denied: ${error}`)}`,
      );
    }
    if (!code) {
      return res.redirect(
        `${frontendUrl}/auth/login?error=${encodeURIComponent('Missing authorization code')}`,
      );
    }

    try {
      const result = await this.oauthService.handleCallback('github', code, state);
      const params = new URLSearchParams({
        access_token: result.exchangeToken,
        user_id: result.user.id,
        email: result.user.email,
      });
      return res.redirect(`${frontendUrl}/auth/callback?${params.toString()}`);
    } catch (err) {
      return res.redirect(
        `${frontendUrl}/auth/login?error=${encodeURIComponent(err.message)}`,
      );
    }
  }

  // ────────────────────────────────────
  //  Token exchange
  // ────────────────────────────────────

  @Post('exchange')
  @ApiOperation({ summary: 'Exchange OAuth exchange token for a full JWT' })
  async exchangeToken(
    @Body() body: { nexusToken?: string; token?: string },
  ) {
    const token = body.nexusToken || body.token;
    if (!token) {
      throw new BadRequestException('token is required');
    }
    return this.oauthService.exchangeToken(token);
  }

  // ────────────────────────────────────
  //  Helpers
  // ────────────────────────────────────

  private parseFrontendUrl(state: string): string {
    try {
      const data = JSON.parse(
        Buffer.from(state, 'base64url').toString('utf-8'),
      );
      return data.frontendUrl?.replace(/\/$/, '') || 'http://localhost:5175';
    } catch {
      return 'http://localhost:5175';
    }
  }
}
