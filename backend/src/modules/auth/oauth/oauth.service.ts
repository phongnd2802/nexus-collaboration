import { Injectable, Logger, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../../database/database.service';
import * as crypto from 'crypto';

export interface OAuthUserInfo {
  oauthId: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

export interface OAuthCallbackResult {
  exchangeToken: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
  };
  isNew: boolean;
}

@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ────────────────────────────────────
  //  Authorization URL builders
  // ────────────────────────────────────

  getAuthorizationUrl(provider: 'google' | 'github', frontendUrl: string): string {
    const state = Buffer.from(JSON.stringify({ provider, frontendUrl })).toString('base64url');

    const prefix = frontendUrl.replace(/\/$/, '');

    if (provider === 'google') {
      return this.buildGoogleUrl(prefix, state);
    }
    return this.buildGithubUrl(prefix, state);
  }

  private buildGoogleUrl(frontendUrl: string, state: string): string {
    const clientId = this.config.get('GOOGLE_AUTH_CLIENT_ID');
    const redirectUri = this.config.get('GOOGLE_AUTH_REDIRECT_URI');
    const scope = 'openid profile email';
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope,
      state,
      access_type: 'offline',
      prompt: 'consent',
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  private buildGithubUrl(frontendUrl: string, state: string): string {
    const clientId = this.config.get('GITHUB_AUTH_CLIENT_ID');
    const redirectUri = this.config.get('GITHUB_AUTH_REDIRECT_URI');
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'user:email',
      state,
    });
    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  // ────────────────────────────────────
  //  Callback handlers
  // ────────────────────────────────────

  async handleCallback(
    provider: 'google' | 'github',
    code: string,
    stateParam: string,
  ): Promise<OAuthCallbackResult> {
    const userInfo =
      provider === 'google' ? await this.fetchGoogleUser(code) : await this.fetchGithubUser(code);

    const result = await this.findOrCreateUser(provider, userInfo);

    const exchangeToken = this.jwtService.sign(
      { sub: result.user.id, email: result.user.email, type: 'oauth_exchange' },
      { expiresIn: '60s' },
    );

    return {
      exchangeToken,
      user: result.user,
      isNew: result.isNew,
    };
  }

  // ────────────────────────────────────
  //  Exchange (short-lived token → full JWT)
  // ────────────────────────────────────

  async exchangeToken(token: string): Promise<{
    token: string;
    refreshToken: string;
    user: any;
  }> {
    let payload: any;
    try {
      payload = this.jwtService.verify(token);
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired exchange token');
    }

    if (payload.type !== 'oauth_exchange') {
      throw new UnauthorizedException('Invalid token type');
    }

    const userId = payload.sub;
    const user = await this.db.getUserById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const fullToken = this.jwtService.sign({
      sub: user.id,
      userId: user.id,
      email: user.email,
      emailVerified: !!user.email_verified,
      role: user.role || 'user',
    });

    const refreshToken = await this.issueRefreshToken(user.id);

    await this.db.query(`UPDATE "users" SET "last_login_at" = now() WHERE "id" = $1`, [user.id]);

    return {
      token: fullToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name || user.full_name || user.metadata?.name,
        username: user.username,
        avatar_url: user.avatar_url,
        email_verified: !!user.email_verified,
      },
    };
  }

  // ────────────────────────────────────
  //  Google helpers
  // ────────────────────────────────────

  private async fetchGoogleUser(code: string): Promise<OAuthUserInfo> {
    const clientId = this.config.get('GOOGLE_AUTH_CLIENT_ID');
    const clientSecret = this.config.get('GOOGLE_AUTH_CLIENT_SECRET');
    const redirectUri = this.config.get('GOOGLE_AUTH_REDIRECT_URI');

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      this.logger.error('Google token exchange failed:', err);
      throw new BadRequestException('Failed to exchange authorization code with Google');
    }

    const tokens = await tokenRes.json();

    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userRes.ok) {
      throw new BadRequestException('Failed to fetch Google user info');
    }

    const googleUser = await userRes.json();
    return {
      oauthId: googleUser.id,
      email: googleUser.email,
      name: googleUser.name || null,
      avatarUrl: googleUser.picture || null,
    };
  }

  // ────────────────────────────────────
  //  GitHub helpers
  // ────────────────────────────────────

  private async fetchGithubUser(code: string): Promise<OAuthUserInfo> {
    const clientId = this.config.get('GITHUB_AUTH_CLIENT_ID');
    const clientSecret = this.config.get('GITHUB_AUTH_CLIENT_SECRET');
    const redirectUri = this.config.get('GITHUB_AUTH_REDIRECT_URI');

    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      this.logger.error('GitHub token exchange failed:', err);
      throw new BadRequestException('Failed to exchange authorization code with GitHub');
    }

    const tokens = await tokenRes.json();
    if (tokens.error) {
      this.logger.error('GitHub OAuth error:', tokens.error_description || tokens.error);
      throw new BadRequestException('GitHub authorization failed');
    }

    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        'User-Agent': 'Nexus-App',
      },
    });

    if (!userRes.ok) {
      throw new BadRequestException('Failed to fetch GitHub user info');
    }

    const githubUser = await userRes.json();

    let email = githubUser.email;
    if (!email) {
      const emailsRes = await fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          'User-Agent': 'Nexus-App',
        },
      });
      if (emailsRes.ok) {
        const emails = await emailsRes.json();
        const primary = emails.find((e: any) => e.primary && e.verified);
        if (primary) email = primary.email;
        else if (emails.length > 0) email = emails[0].email;
      }
    }

    if (!email) {
      throw new BadRequestException('Could not retrieve a verified email from GitHub');
    }

    return {
      oauthId: String(githubUser.id),
      email,
      name: githubUser.name || githubUser.login || null,
      avatarUrl: githubUser.avatar_url || null,
    };
  }

  // ────────────────────────────────────
  //  User find-or-create
  // ────────────────────────────────────

  private async findOrCreateUser(
    provider: string,
    info: OAuthUserInfo,
  ): Promise<{
    user: { id: string; email: string; name: string | null; avatarUrl: string | null };
    isNew: boolean;
  }> {
    const normalizedEmail = info.email.toLowerCase().trim();

    // 1. Try by OAuth provider + ID
    const byProvider = await this.db.query(
      `SELECT * FROM "users" WHERE "oauth_provider" = $1 AND "oauth_provider_id" = $2 LIMIT 1`,
      [provider, info.oauthId],
    );
    if (byProvider.rows?.length > 0) {
      const user = byProvider.rows[0];
      await this.syncUserProfile(user, info);
      return {
        user: {
          id: user.id,
          email: user.email,
          name: info.name || user.name,
          avatarUrl: info.avatarUrl || user.avatar_url,
        },
        isNew: false,
      };
    }

    // 2. Try by email (link OAuth to existing account)
    const byEmail = await this.db.query(
      `SELECT * FROM "users" WHERE LOWER("email") = LOWER($1) LIMIT 1`,
      [normalizedEmail],
    );
    if (byEmail.rows?.length > 0) {
      const user = byEmail.rows[0];
      await this.db.query(
        `UPDATE "users" SET "oauth_provider" = $1, "oauth_provider_id" = $2, "updated_at" = now() WHERE "id" = $3`,
        [provider, info.oauthId, user.id],
      );
      if (info.avatarUrl && !user.avatar_url) {
        await this.db.query(
          `UPDATE "users" SET "avatar_url" = $1, "updated_at" = now() WHERE "id" = $2`,
          [info.avatarUrl, user.id],
        );
      }
      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name || info.name,
          avatarUrl: info.avatarUrl || user.avatar_url,
        },
        isNew: false,
      };
    }

    // 3. Create new user
    const insert = await this.db.query(
      `INSERT INTO "users" (
        "email", "name", "full_name", "avatar_url",
        "email_verified", "email_confirmed_at",
        "oauth_provider", "oauth_provider_id",
        "role", "metadata", "user_metadata", "raw_user_meta_data",
        "app_metadata", "raw_app_meta_data"
      ) VALUES (
        $1, $2, $3, $4, true, now(),
        $5, $6, 'user',
        '{}'::jsonb, '{}'::jsonb, '{}'::jsonb,
        '{"role":"user"}'::jsonb, '{"role":"user"}'::jsonb
      )
      RETURNING *`,
      [normalizedEmail, info.name, info.name, info.avatarUrl, provider, info.oauthId],
    );

    const newUser = insert.rows[0];
    this.logger.log(`OAuth auto-provisioned user ${normalizedEmail} (${provider})`);

    return {
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        avatarUrl: newUser.avatar_url,
      },
      isNew: true,
    };
  }

  private async syncUserProfile(dbUser: any, info: OAuthUserInfo): Promise<void> {
    const updates: string[] = [];
    const values: any[] = [];

    if (info.name && info.name !== dbUser.name) {
      updates.push(`"name" = $${values.length + 1}`, `"full_name" = $${values.length + 1}`);
      values.push(info.name);
    }
    if (info.avatarUrl && info.avatarUrl !== dbUser.avatar_url) {
      updates.push(`"avatar_url" = $${values.length + 1}`);
      values.push(info.avatarUrl);
    }
    if (!dbUser.email_verified) {
      updates.push(`"email_verified" = true`, `"email_confirmed_at" = now()`);
    }

    if (updates.length > 0) {
      values.push(dbUser.id);
      await this.db.query(
        `UPDATE "users" SET ${updates.join(', ')}, "updated_at" = now() WHERE "id" = $${values.length}`,
        values,
      );
    }
  }

  // ────────────────────────────────────
  //  Refresh token
  // ────────────────────────────────────

  private async issueRefreshToken(userId: string): Promise<string> {
    const days = parseInt(this.config.get('REFRESH_TOKEN_EXPIRES_DAYS', '30'), 10);
    const raw = crypto.randomBytes(48).toString('hex');
    const hash = crypto.createHash('sha256').update(raw).digest('hex');
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    await this.db.query(
      `INSERT INTO "auth_refresh_tokens" ("user_id", "token_hash", "expires_at")
       VALUES ($1, $2, $3)`,
      [userId, hash, expiresAt.toISOString()],
    );
    return raw;
  }
}
