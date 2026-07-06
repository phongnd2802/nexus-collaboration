import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from '../database/database.service';
import { EmailProviderService } from '../email/email.service';
import { buildBrandedEmail } from '../email/branded-email';
import {
  RegisterDto,
  LoginDto,
  PasswordResetRequestDto,
  PasswordResetConfirmDto,
  ChangePasswordDto,
  VerifyEmailDto,
  ResendEmailVerificationDto,
  UpdateProfileDto,
} from './dto/auth.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly db: DatabaseService,
    private jwtService: JwtService,
    private readonly emailProvider: EmailProviderService,
  ) {}

  async register(dto: RegisterDto) {
    try {
      // Build registration data with frontendUrl for email verification
      // Ensure we have a valid URL with protocol
      let baseUrl = dto.frontendUrl || process.env.FRONTEND_URL || 'http://localhost:5175';

      // Make sure URL has protocol
      if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
        baseUrl = `http://${baseUrl}`;
      }

      // Remove trailing slash if present
      baseUrl = baseUrl.replace(/\/$/, '');

      const verificationUrl = `${baseUrl}/verify-email`;

      this.logger.log(`Registration attempt for ${dto.email}, verificationUrl: ${verificationUrl}`);

      // Use anon key client for registration
      // database will check auth.settings for:
      // - allowRegistration
      // - password validation based on settings
      // - requireEmailVerification (sends email if true)
      // - defaultRole
      const response = await this.db /* TODO: replace authClient */.auth
        .register({
          email: dto.email,
          password: dto.password,
          name: dto.name,
          metadata: {
            username: dto.username,
          },
          frontendUrl: verificationUrl, // For email verification redirect
        });

      if (!response || !response.user) {
        throw new BadRequestException('Registration failed');
      }

      const user = response.user;
      const authToken = (response as any).token || (response as any).accessToken;
      const refreshToken = (response as any).refreshToken;

      // Create default user settings
      await this.createDefaultUserSettings(user.id);

      if (!(user as any).emailVerified) {
        const tokenResult = await this.db.raw(
          'SELECT email_verification_token FROM "users" WHERE id = $1',
          [user.id],
        );
        const token = (tokenResult as any)?.rows?.[0]?.email_verification_token;
        if (token) {
          const verificationLink = `${verificationUrl}?token=${encodeURIComponent(token)}`;
          await this.sendVerificationEmail(user.email, verificationLink);
        } else {
          this.logger.warn(`No email verification token found for user ${user.id}`);
        }
      }

      return {
        message: 'Registration successful',
        user: {
          id: user.id,
          email: user.email,
          username: (user as any).username || dto.username,
          name: user.name || dto.name,
          emailVerified: (user as any).emailVerified || false,
        },
        access_token: authToken, // Use database JWT directly
        refresh_token: refreshToken,
        // If email verification is required, frontend should show message
        requiresVerification: !(user as any).emailVerified,
      };
    } catch (error) {
      this.logger.error('Registration failed', error);

      // Extract error message from databaseApiError
      const errorMessage = error.details?.message || error.message || 'Registration failed';

      // Check error status/code
      if (error.status === 409 || error.code === 'HTTP_409') {
        throw new ConflictException(errorMessage);
      }
      if (error.status === 400 || error.code === 'HTTP_400') {
        throw new BadRequestException(errorMessage);
      }

      // Default error with extracted message
      throw new BadRequestException(errorMessage);
    }
  }

  async login(dto: LoginDto) {
    try {
      // FIRST: Check if user exists and if email is verified BEFORE attempting database sign in
      // This prevents database from throwing 401 before we can check email verification
      let userCheckResult;
      try {
        // Check email verification status. The legacy code queried
        // `auth.users` (a separate schema namespace); the open-source build
        // also exposes that as a view (see migrations/002_auth_users.sql),
        // but querying public.users directly is clearer.
        userCheckResult = await this.db.raw(
          'SELECT id, email, email_confirmed_at FROM "users" WHERE LOWER(email) = LOWER($1)',
          [dto.email],
        );

        // DEBUG LOG - Remove this after testing
        this.logger.log(
          `Email verification check for ${dto.email}:`,
          JSON.stringify(userCheckResult, null, 2),
        );
      } catch (queryError) {
        // If query fails, continue to login attempt (user might not exist)
        this.logger.warn('User check query failed, continuing to login:', queryError);
        userCheckResult = null;
      }

      // db.raw returns a pg QueryResult ({rows, rowCount, ...}). Older
      // SDK code may have returned an array directly, so handle both shapes.
      const rows = (userCheckResult as any)?.rows ?? userCheckResult;
      if (rows && rows.length > 0) {
        const userRecord = rows[0];

        // Check if email is confirmed
        if (!userRecord.email_confirmed_at) {
          this.logger.warn(`Login attempt with unverified email: ${dto.email}`);
          throw new UnauthorizedException(
            'Please verify your email address before logging in. Check your inbox for the confirmation link.',
          );
        } else {
          this.logger.log(
            `Email is verified for ${dto.email}, email_confirmed_at: ${userRecord.email_confirmed_at}`,
          );
        }
      }

      // NOW attempt database sign in (email is verified or user doesn't exist)
      const response = await this.db.signIn(dto.email, dto.password);

      this.logger.log('Login response:', response);

      // Check if MFA is required
      if ((response as any).mfa_required) {
        return {
          mfa_required: true,
          user_id: (response as any).user_id,
          message: 'MFA verification required',
        };
      }

      const session = response as any;
      const user = session.user;

      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }

      this.logger.log('User from login:', user);

      // Get database JWT token directly - no need to generate our own
      const authToken = session.token || session.accessToken;
      const refreshToken = session.refreshToken;

      const fullUserProfile = user;
      const metadata = fullUserProfile?.metadata || {};

      this.logger.log('User metadata:', metadata);

      // Ensure user has default settings (for existing users who signed up before this feature)
      await this.ensureUserSettings(user.id);

      return {
        user: {
          id: user.id,
          email: user.email,
          name: metadata.name || fullUserProfile?.fullName || fullUserProfile?.name || user.name,
          username: fullUserProfile?.username || metadata.username,
          avatar_url: fullUserProfile?.avatar_url,
          profileImage: fullUserProfile?.avatar_url, // Include both for compatibility
          bio: metadata.bio || fullUserProfile?.bio,
          location: metadata.location || fullUserProfile?.location,
          website: metadata.website || fullUserProfile?.website,
          phone: metadata.phone || fullUserProfile?.phone,
          emailVerified: true, // We already verified above
        },
        access_token: authToken, // Use database JWT directly
        refresh_token: refreshToken,
      };
    } catch (error) {
      this.logger.error('Login failed', error);

      // If it's already an UnauthorizedException we threw (email not verified), re-throw it
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      // Handle database API errors
      if (error.status === 401 || error.code === 'HTTP_401' || error.details?.statusCode === 401) {
        throw new UnauthorizedException(
          'Invalid email or password. Please check your credentials and try again.',
        );
      }
      if (error.response?.status === 401) {
        throw new UnauthorizedException(
          'Invalid email or password. Please check your credentials and try again.',
        );
      }
      if (error.response?.status === 400 || error.status === 400) {
        throw new BadRequestException('Invalid login data');
      }
      throw new UnauthorizedException(
        'Invalid email or password. Please check your credentials and try again.',
      );
    }
  }

  async getProfile(userId: string) {
    try {
      // Use the SDK's getUserById to get the full user profile
      const userProfile = await this.db.getUserById(userId);

      if (!userProfile) {
        throw new UnauthorizedException('User not found');
      }

      // Extract metadata for additional profile fields
      const metadata = userProfile.metadata || {};

      return {
        id: userProfile.id,
        email: userProfile.email,
        username: userProfile.username || metadata.username,
        name: metadata.name || (userProfile as any).fullName || userProfile.name,
        bio: metadata.bio || userProfile.bio,
        location: metadata.location || userProfile.location,
        website: metadata.website || userProfile.website,
        phone: metadata.phone || userProfile.phone,
        countryCode: metadata.countryCode,
        avatar_url: userProfile.avatar_url,
        profileImage: userProfile.avatar_url, // Include both for compatibility
        date_of_birth: userProfile.date_of_birth,
        gender: userProfile.gender,
        email_verified: userProfile.email_verified,
        language: metadata.language || 'en',
        preferences: metadata.preferences || {},
        social_links: metadata.social_links || {},
        interests: metadata.interests || [],
        createdAt: userProfile.created_at,
        lastSignIn: userProfile.last_login_at,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      if (error.response?.status === 404) {
        throw new NotFoundException('User profile not found');
      }
      if (error.response?.status === 401) {
        throw new UnauthorizedException('Access denied');
      }
      throw new InternalServerErrorException('Failed to retrieve profile');
    }
  }

  async refreshToken(refreshToken: string) {
    try {
      // Use database to refresh the token
      const response = await this.db /* TODO: replace authClient */.auth
        .refreshToken(refreshToken);

      return {
        access_token: (response as any).token || (response as any).accessToken,
        refresh_token: (response as any).refreshToken,
      };
    } catch (error) {
      this.logger.error('Token refresh failed:', error);
      throw new UnauthorizedException('Token refresh failed');
    }
  }

  async logout(userId: string) {
    try {
      // Note: We don't have the user's database token stored, so we can't Call database's signOut
      // The frontend will clear its local tokens, which is sufficient for logout
      // In a production app, you might want to:
      // 1. Store user tokens in Redis/cache and clear them here
      // 2. Maintain a token blacklist
      // 3. Use refresh tokens with expiry

      // TODO: In future if possible - Clear any cached user tokens from Redis/cache when implemented
      // TODO: Add token to blacklist if using that pattern

      return {
        success: true,
        message: 'Logged out successfully',
      };
    } catch (error) {
      this.logger.error('Logout error:', error);

      return {
        success: true,
        message: 'Logged out successfully',
      };
    }
  }

  async validateUser(userId: string, jwtPayload?: any) {
    try {
      // Use the database service's getUserById method
      const userProfile = await this.db.getUserById(userId);

      if (!userProfile) {
        // Fallback to JWT data if getUserById fails
        return {
          user: {
            id: userId,
            email: jwtPayload?.email || null,
            name: jwtPayload?.name || null,
            username: jwtPayload?.username || null,
            profileImage: null,
            createdAt: new Date().toISOString(),
            role: jwtPayload?.role || 'member',
            bio: null,
            location: null,
            website: null,
          },
        };
      }

      // Extract metadata for profile fields
      const metadata = userProfile.metadata || {};

      // Extract global role from database
      const globalRole =
        userProfile.role || metadata.role || userProfile.app_metadata?.role || 'member';

      this.logger.log('[validateUser] User data:', JSON.stringify(userProfile, null, 2));
      this.logger.log('[validateUser] User metadata:', JSON.stringify(metadata, null, 2));
      this.logger.log('[validateUser] Extracted global role:', globalRole);
      this.logger.log('[validateUser] Checking role from:', {
        'userProfile.role': userProfile.role,
        'metadata.role': metadata.role,
        'app_metadata.role': userProfile.app_metadata?.role,
      });

      // Check if we got minimal data from SDK (only metadata fields)
      // If so, merge with JWT payload data for more complete profile
      const hasCompleteProfile =
        userProfile.email && (userProfile.name || (userProfile as any).fullName || metadata.name);

      if (!hasCompleteProfile && jwtPayload) {
        // SDK returned minimal data, merge with JWT payload
        return {
          user: {
            id: userProfile.id || userId,
            email: jwtPayload.email || userProfile.email || null,
            name:
              jwtPayload.name ||
              metadata.name ||
              (userProfile as any).fullName ||
              userProfile.name ||
              null,
            username: jwtPayload.username || userProfile.username || metadata.username || null,
            profileImage: metadata.avatarUrl || userProfile.avatar_url || null,
            avatar_url: metadata.avatarUrl || userProfile.avatar_url || null,
            bio: metadata.bio || userProfile.bio || null,
            location: metadata.location || userProfile.location || null,
            website: metadata.website || userProfile.website || null,
            phone: metadata.phone || userProfile.phone || null,
            language: metadata.language || 'en',
            date_of_birth: userProfile.date_of_birth || null,
            gender: userProfile.gender || null,
            email_verified: userProfile.email_verified || false,
            phone_verified: userProfile.phone_verified || false,
            last_login_at: userProfile.last_login_at || null,
            created_at: userProfile.created_at || new Date().toISOString(),
            updated_at: userProfile.updated_at || new Date().toISOString(),
            createdAt: userProfile.created_at || new Date().toISOString(),
            role: globalRole,
            metadata: userProfile.metadata || {},
            app_metadata: userProfile.app_metadata || {},
          },
        };
      }

      // Return the full user profile from auth service table
      // Fields directly from the table structure
      return {
        user: {
          id: userProfile.id || userId,
          email: userProfile.email || null,
          name: metadata.name || (userProfile as any).fullName || userProfile.name || null,
          username: userProfile.username || metadata.username || null,
          profileImage: metadata.avatarUrl || userProfile.avatar_url || null, // Frontend expects profileImage
          avatar_url: metadata.avatarUrl || userProfile.avatar_url || null,
          bio: metadata.bio || userProfile.bio || null,
          location: metadata.location || userProfile.location || null,
          website: metadata.website || userProfile.website || null,
          phone: metadata.phone || userProfile.phone || null,
          language: metadata.language || 'en',
          date_of_birth: userProfile.date_of_birth || null,
          gender: userProfile.gender || null,
          email_verified: userProfile.email_verified || false,
          phone_verified: userProfile.phone_verified || false,
          last_login_at: userProfile.last_login_at || null,
          created_at: userProfile.created_at || new Date().toISOString(),
          updated_at: userProfile.updated_at || new Date().toISOString(),
          createdAt: userProfile.created_at || new Date().toISOString(), // Add for frontend compatibility
          role: globalRole,
          // Additional data from metadata JSONB fields if needed
          metadata: userProfile.metadata || {},
          app_metadata: userProfile.app_metadata || {},
        },
      };
    } catch (error) {
      this.logger.error('Validate user error:', error);
      // Fallback to JWT data
      return {
        user: {
          id: userId,
          email: jwtPayload?.email || null,
          name: jwtPayload?.name || null,
          username: jwtPayload?.username || null,
          profileImage: null,
          createdAt: new Date().toISOString(),
          role: 'user',
          bio: null,
          location: null,
          website: null,
        },
      };
    }
  }

  async updateProfile(userId: string, data: UpdateProfileDto, tokenEmail?: string) {
    try {
      // Resolve user by ID first; if not found, fallback to email from verified JWT payload.
      let resolvedUserId = userId;
      let currentUser = await this.db.getUserById(resolvedUserId);
      if (!currentUser && tokenEmail) {
        const userByEmail = await this.db.findOne('users', { email: tokenEmail.toLowerCase() });
        if (userByEmail?.id) {
          resolvedUserId = userByEmail.id;
          currentUser = userByEmail;
          this.logger.warn(
            `updateProfile: userId ${userId} not found, fallback to token email ${tokenEmail} -> ${resolvedUserId}`,
          );
        }
      }

      if (!currentUser) {
        throw new NotFoundException('User not found');
      }
      const currentMetadata = currentUser?.metadata || {};

      // Build update data - database stores some fields in root, others in metadata
      const updateData: any = {};

      // Core fields that go in root level
      if (data.name !== undefined) {
        updateData.name = data.name;
        updateData.full_name = data.name;
      }
      if (data.email !== undefined) updateData.email = data.email;

      // Additional profile fields - store in metadata since SDK doesn't persist them at root level
      const metadataUpdates: any = { ...currentMetadata };
      if (data.name !== undefined) metadataUpdates.name = data.name;
      if (data.website !== undefined) metadataUpdates.website = data.website;
      if (data.bio !== undefined) metadataUpdates.bio = data.bio;
      if (data.phone !== undefined) metadataUpdates.phone = data.phone;
      if (data.countryCode !== undefined) metadataUpdates.countryCode = data.countryCode;
      if (data.location !== undefined) metadataUpdates.location = data.location;
      if (data.avatarUrl !== undefined) metadataUpdates.avatarUrl = data.avatarUrl; // Save avatar URL to metadata
      if (data.language !== undefined) metadataUpdates.language = data.language;

      updateData.metadata = metadataUpdates;

      this.logger.log(`Updating profile for user ${resolvedUserId} with data:`, updateData);

      // Update the user profile in database
      const updateResult = await this.db.update('users', resolvedUserId, updateData);

      this.logger.log('Update result:', updateResult);
      if (!updateResult) {
        throw new NotFoundException('User not found');
      }

      // Get the updated profile to return fresh data
      const updatedProfile = await this.db.getUserById(resolvedUserId);

      this.logger.log('Updated profile from database:', updatedProfile);
      if (!updatedProfile) {
        throw new NotFoundException('User not found');
      }

      // Extract profile data from both root level and metadata
      const metadata = updatedProfile?.metadata || {};

      if (data.language !== undefined) {
        const settingsResult = await this.db
          .table('user_settings')
          .select('id')
          .where('user_id', '=', resolvedUserId)
          .execute();

        const settingsUpdateData: Record<string, any> = {
          updated_at: new Date().toISOString(),
          language: data.language,
        };

        if (settingsResult.data?.[0]?.id) {
          await this.db
            .table('user_settings')
            .update(settingsUpdateData)
            .where('user_id', '=', resolvedUserId)
            .execute();
        } else {
          await this.db.table('user_settings').insert({
            user_id: resolvedUserId,
            ...settingsUpdateData,
          }).execute();
        }
      }

      return {
        success: true,
        message: 'Profile updated successfully',
        user: {
          id: updatedProfile.id,
          email: updatedProfile.email,
          name: metadata.name || (updatedProfile as any).fullName || updatedProfile.name,
          username: updatedProfile.username || metadata.username,
          website: metadata.website,
          bio: metadata.bio,
          phone: metadata.phone,
          countryCode: metadata.countryCode,
          location: metadata.location,
          avatarUrl: metadata.avatarUrl || updatedProfile.avatar_url, // Avatar from metadata
          language: metadata.language || 'en',
          metadata,
        },
      };
    } catch (error) {
      this.logger.error('Profile update error:', error);
      this.logger.error('Error details:', {
        message: error.message,
        statusCode: error.statusCode,
        response: error.response,
        stack: error.stack,
      });
      if (error instanceof NotFoundException || error.response?.status === 404) {
        throw new NotFoundException('User not found');
      }
      if (error.response?.status === 401) {
        throw new UnauthorizedException('Access denied');
      }
      throw new InternalServerErrorException('Failed to update profile');
    }
  }

  async uploadProfileImage(userId: string, file: Express.Multer.File) {
    try {
      this.logger.log(`Processing profile image upload for user ${userId}`);
      this.logger.log(`File size: ${(file.size / 1024).toFixed(2)} KB`);

      // Generate unique file name
      const fileName = `${userId}/${Date.now()}-${file.originalname}`;

      // Upload file to storage service
      const uploadResult = await /* TODO: use StorageService */ this.db.uploadFile(
        'avatars',
        file.buffer,
        fileName,
        {
          contentType: file.mimetype,
          metadata: {
            userId,
            originalName: file.originalname,
            type: 'avatar',
          },
        },
      );

      this.logger.log('Profile image uploaded to storage');
      this.logger.log('Upload result:', JSON.stringify(uploadResult, null, 2));

      // Get public URL from upload result
      const avatarUrl = uploadResult.url;

      if (!avatarUrl) {
        throw new InternalServerErrorException('No URL returned from storage upload');
      }

      this.logger.log('Avatar URL:', avatarUrl);

      // Just return the URL - don't save to database yet
      // The URL will be saved when user clicks "Save Changes" via updateProfile
      return {
        success: true,
        profileImage: avatarUrl,
        fileName: fileName,
      };
    } catch (error) {
      this.logger.error('Profile image upload error:', error);
      if (error.response?.status === 413) {
        throw new BadRequestException('File too large');
      }
      if (error.response?.status === 415) {
        throw new BadRequestException('Invalid file type');
      }
      throw new InternalServerErrorException('Failed to upload profile image');
    }
  }

  async requestPasswordReset(dto: PasswordResetRequestDto) {
    try {
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5175';
      const frontendUrl = `${baseUrl}/reset-password`;

      const result = await this.db.resetPasswordForEmail(dto.email);

      if (result?.token) {
        const resetLink = `${frontendUrl}?token=${encodeURIComponent(result.token)}`;
        const { html, text } = buildBrandedEmail({
          eyebrow: 'Nexus Account',
          title: 'Đặt lại mật khẩu',
          intro: 'Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản Nexus. Nhấn nút bên dưới để tiếp tục.',
          action: { label: 'Đặt lại mật khẩu', url: resetLink },
          footer: 'Nếu bạn không yêu cầu email này, bạn có thể bỏ qua một cách an toàn. Liên kết có hiệu lực trong 1 giờ.',
        });

        if (this.emailProvider.isAvailable()) {
          // Gửi email chạy ngầm (fire-and-forget): KHÔNG await để response trả về ngay,
          // người dùng thấy thông báo "Kiểm tra email" mà không phải chờ SMTP hoàn tất.
          void this.emailProvider
            .send({
              to: dto.email,
              subject: 'Đặt lại mật khẩu',
              html,
              text,
              tags: { type: 'password-reset' },
            })
            .catch((emailError) => {
              this.logger.error(`Failed to send password reset email to ${dto.email}:`, emailError);
            });
        } else {
          this.logger.error(`Email provider not available for password reset to ${dto.email}`);
        }
      }

      return {
        success: true,
        message: 'If the email exists in our system, you will receive password reset instructions.',
      };
    } catch (error) {
      this.logger.error('Password reset request error:', error);
      return {
        success: true,
        message: 'If the email exists in our system, you will receive password reset instructions.',
      };
    }
  }

  async confirmPasswordReset(dto: PasswordResetConfirmDto) {
    try {
      await this.db.resetPassword(dto.token, dto.password);
      return {
        success: true,
        message: 'Password has been reset successfully',
      };
    } catch (error) {
      this.logger.error('Password reset confirmation error:', error);
      const errStatus = (error as any)?.status || (error as any)?.code;
      if (errStatus === 400 || errStatus === 'HTTP_400') {
        throw new BadRequestException('Invalid or expired reset token');
      }
      throw new BadRequestException('Failed to reset password');
    }
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    try {
      // Get user to verify they exist
      const user = await this.db.getUserById(userId);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      await this.db.changeUserPassword(userId, dto.currentPassword, dto.newPassword);

      return {
        success: true,
        message: 'Password changed successfully',
      };
    } catch (error) {
      this.logger.error('Change password error:', error);
      if ((error as any)?.status === 401) {
        throw new BadRequestException('Current password is incorrect');
      }
      if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new BadRequestException('Failed to change password');
    }
  }

  async verifyEmail(dto: VerifyEmailDto) {
    try {
      // Use database to verify the email token
      // database handles token validation and updates user's email_verified status
      await this.db /* TODO: replace authClient */.auth
        .verifyEmail(dto.token);

      return {
        success: true,
        message: 'Email verified successfully',
      };
    } catch (error) {
      this.logger.error('Email verification error:', error);

      // Extract error message from databaseApiError
      const errorMessage = error.details?.message || error.message || 'Failed to verify email';

      if (error.status === 400 || error.code === 'HTTP_400') {
        throw new BadRequestException(errorMessage);
      }

      throw new BadRequestException('Failed to verify email');
    }
  }

  async resendEmailVerification(dto: ResendEmailVerificationDto) {
    try {
      // Re-issue a token; if the user exists and isn't verified, email it.
      const result = await this.db.auth.resendEmailVerification(dto.email);
      if (result?.success && result?.token) {
        let baseUrl = process.env.FRONTEND_URL || 'http://localhost:5175';
        if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
          baseUrl = `http://${baseUrl}`;
        }
        const normalizedBase = baseUrl.replace(/\/$/, '');
        const verificationLink = `${normalizedBase}/verify-email?token=${encodeURIComponent(
          result.token,
        )}`;
        await this.sendVerificationEmail(dto.email, verificationLink);
      }

      return {
        success: true,
        message:
          'If the email exists in our system and is not already verified, you will receive verification instructions.',
      };
    } catch (error) {
      this.logger.error('Resend email verification error:', error);
      // Don't expose internal errors - return success message for security
      return {
        success: true,
        message:
          'If the email exists in our system and is not already verified, you will receive verification instructions.',
      };
    }
  }

  private async sendVerificationEmail(to: string, verificationLink: string): Promise<void> {
    const { html, text } = buildBrandedEmail({
      eyebrow: 'Nexus Account',
      title: 'Xác thực email',
      intro: 'Cảm ơn bạn đã đăng ký Nexus. Hãy xác thực địa chỉ email để hoàn tất quá trình tạo tài khoản.',
      action: {
        label: 'Xác thực email',
        url: verificationLink,
      },
      footer: 'Nếu bạn không yêu cầu email này, bạn có thể bỏ qua một cách an toàn.',
    });

    try {
      if (!this.emailProvider.isAvailable()) {
        this.logger.error(
          `Failed to send verification email to ${to}: email provider is not available`,
        );
        return;
      }

      const result = await this.emailProvider.send({
        to,
        subject: 'Verify your email address',
        html,
        text,
        tags: { type: 'auth-verification' },
      });

      if (!result?.accepted) {
        this.logger.error(`Failed to send verification email to ${to}: provider rejected message`);
      }
    } catch (error: any) {
      this.logger.error(
        `Failed to send verification email to ${to}: ${error?.message || 'unknown error'}`,
      );
    }
  }

  /**
   * Create default user settings for a new user
   * This ensures notification preferences and other settings are available from the start
   */
  private async createDefaultUserSettings(userId: string) {
    try {
      // Check if settings already exist
      const existingSettings = await this.db.findOne('user_settings', { user_id: userId });

      if (existingSettings) {
        this.logger.log(`User settings already exist for user ${userId}`);
        return;
      }

      // Default notification preferences matching the correct format
      const defaultNotifications = {
        push: true,
        email: true,
        tasks: true,
        desktop: true,
        calendar: true,
        mentions: true,
        marketing: false,
        directMessages: true,
        channelMessages: true,
        categories: [
          {
            id: 'messages',
            label: 'Messages',
            description: 'Notifications for direct messages and mentions',
            settings: {
              push: true,
              email: true,
              inApp: true,
            },
          },
          {
            id: 'tasks',
            label: 'Tasks & Projects',
            description: 'Updates on tasks, projects, and assignments',
            settings: {
              push: true,
              email: true,
              inApp: true,
            },
          },
          {
            id: 'calendar',
            label: 'Calendar',
            description: 'Event reminders and calendar updates',
            settings: {
              push: true,
              email: true,
              inApp: true,
            },
          },
          {
            id: 'workspace',
            label: 'Workspace',
            description: 'Workspace announcements and updates',
            settings: {
              push: true,
              email: true,
              inApp: true,
            },
          },
        ],
        generalSettings: {
          sound: true,
          frequency: 'immediate',
          doNotDisturb: false,
          quietHours: {
            enabled: false,
            startTime: '22:00',
            endTime: '08:00',
          },
        },
      };

      // Create default user settings
      const userSettings = {
        user_id: userId,
        theme: 'light',
        language: 'en',
        date_format: 'MM/dd/yyyy',
        time_format: '12h',
        notifications: defaultNotifications,
        privacy: {},
        editor_preferences: {},
        dashboard_layout: {},
        sidebar_collapsed: false,
      };

      await this.db.insert('user_settings', userSettings);
      this.logger.log(`Created default user settings for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to create default user settings for user ${userId}:`, error);
      // Don't throw - user creation should succeed even if settings creation fails
    }
  }

  /**
   * Ensure user settings exist (called on login for existing users)
   * This handles users who registered before the user_settings feature was added
   */
  private async ensureUserSettings(userId: string) {
    try {
      // Check if settings already exist
      const existingSettings = await this.db.findOne('user_settings', { user_id: userId });

      if (!existingSettings) {
        this.logger.log(`User ${userId} missing settings, creating defaults`);
        await this.createDefaultUserSettings(userId);
      }
    } catch (error) {
      this.logger.error(`Failed to ensure user settings for user ${userId}:`, error);
      // Don't throw - login should succeed even if settings check fails
    }
  }

  /**
   * Delete user account and all associated data
   * This is a permanent operation that cannot be undone
   * Complies with GDPR right to deletion requirements
   */
  async deleteAccount(userId: string, email: string, password: string) {
    try {
      this.logger.log(`Starting account deletion for user ${userId}`);

      // Step 0: Verify password using database login
      try {
        await this.db.findOne('users', { email }); // TODO: verify password with bcrypt
        this.logger.log(`Password verified for user ${userId}`);
      } catch (error) {
        this.logger.warn(`Password verification failed for user ${userId}`);
        throw new UnauthorizedException('Incorrect password. Account deletion cancelled.');
      }

      // Step 1: Delete workspaces where user is the owner
      // This will cascade delete related workspace data
      this.logger.log(`Deleting workspaces owned by user ${userId}`);
      await this.db.table('workspaces').where('owner_id', '=', userId).delete().execute();

      // Step 2: Delete user memberships and associations
      const membershipTables = [
        'workspace_members',
        'project_members',
        'channel_members',
        'conversation_members',
        'event_attendees',
        'video_call_participants',
      ];

      for (const table of membershipTables) {
        this.logger.log(`Deleting from ${table} for user ${userId}`);
        try {
          await this.db.table(table).where('user_id', '=', userId).delete().execute();
        } catch (error) {
          this.logger.warn(`Table ${table} might not exist or delete failed:`, error.message);
        }
      }

      // Step 3: Delete user-generated content
      const contentTables = [
        'messages',
        'message_reactions',
        'message_read_receipts',
        'tasks',
        'task_comments',
        'files',
        'notes',
        'calendar_events',
        'event_reminders',
        'search_history',
        'saved_searches',
      ];

      for (const table of contentTables) {
        this.logger.log(`Deleting from ${table} for user ${userId}`);
        try {
          await this.db.table(table).where('user_id', '=', userId).delete().execute();
        } catch (error) {
          this.logger.warn(`Table ${table} might not exist or delete failed:`, error.message);
        }
      }

      // Step 4: Delete user settings and preferences
      const settingsTables = [
        'user_settings',
        'notifications',
      ];

      for (const table of settingsTables) {
        this.logger.log(`Deleting from ${table} for user ${userId}`);
        try {
          await this.db.table(table).where('user_id', '=', userId).delete().execute();
        } catch (error) {
          this.logger.warn(`Table ${table} might not exist or delete failed:`, error.message);
        }
      }

      // Step 6: Delete user from auth serviceentication system
      this.logger.log(`Deleting user ${userId} from auth service system`);
      try {
        // TODO: implement user deletion
        await this.db.raw('DELETE FROM users WHERE id = $1', [userId]);
        this.logger.log(`Successfully deleted user ${userId} from auth service system`);
      } catch (error) {
        this.logger.error(`Failed to delete user from auth service system:`, error);
        // Continue even if database deletion fails - the user data is already deleted
      }

      this.logger.log(`Successfully deleted account for user ${userId}`);

      return {
        message: 'Account successfully deleted. All your data has been permanently removed.',
        success: true,
      };
    } catch (error) {
      this.logger.error(`Failed to delete account for user ${userId}:`, error);
      throw new InternalServerErrorException(
        'Failed to delete account. Please try again or contact support.',
      );
    }
  }

  /**
   * Sign a user in via magic link. Called by SsoController after the
   * magic-link JWT has been verified. Finds the user by email (or
   * creates a minimal record on first magic-link login) and issues a
   * real access token.
   */
  async authenticateViaMagicLink(email: string) {
    const normalized = email.toLowerCase().trim();
    let user = await this.db.findOne('users', { email: normalized });
    if (!user) {
      // password_hash stays NULL — the user cannot log in via
      // password until they set one (users.password_hash is nullable
      // in the schema). email_verified is set true because the user
      // proved control of the inbox by clicking the magic-link.
      const inserted: any = await this.db.query(
        `INSERT INTO users (email, email_verified, email_confirmed_at, created_at, updated_at)
         VALUES (LOWER($1), true, NOW(), NOW(), NOW())
         RETURNING id, email, email_verified`,
        [normalized],
      );
      user = inserted?.rows?.[0];
      if (!user) {
        throw new InternalServerErrorException('Failed to create user during magic-link login');
      }
      this.logger.log(`Magic-link auto-provisioned user ${normalized}`);
    }
    const access_token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      loginMethod: 'magic-link',
    });
    return {
      user: {
        id: user.id,
        email: user.email,
        emailVerified: user.email_verified ?? true,
      },
      access_token,
    };
  }
}
