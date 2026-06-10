import {
  Controller,
  Post,
  Body,
  Get,
  Put,
  Delete,
  Patch,
  Param,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import * as multer from 'multer';
import { AuthService } from './auth.service';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  UpdateProfileDto,
  PasswordResetRequestDto,
  PasswordResetConfirmDto,
  ChangePasswordDto,
  VerifyEmailDto,
  ResendEmailVerificationDto,
  DeleteAccountDto,
} from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  async register(@Body() dto: RegisterDto) {
    return await this.authService.register(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login user' })
  async login(@Body() dto: LoginDto) {
    return await this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@Request() req) {
    // Pass the entire JWT payload which contains email, name, username
    return await this.authService.validateUser(req.user.sub, req.user);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh JWT token using refresh token' })
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return await this.authService.refreshToken(dto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout user' })
  async logout(@Request() req) {
    return await this.authService.logout(req.user.sub);
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user profile' })
  async updateProfile(@Request() req, @Body() dto: UpdateProfileDto) {
    return await this.authService.updateProfile(req.user.sub, dto, req.user.email);
  }

  @Post('profile/image')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload profile image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        avatar: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: multer.memoryStorage(), // Use memory storage for buffer access
      fileFilter: (req, file, cb) => {
        // Accept only image files
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          return cb(new BadRequestException('Only image files are allowed'), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
      },
    }),
  )
  async uploadProfileImage(@Request() req, @UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Upload to storage service
    const result = await this.authService.uploadProfileImage(req.user.sub, file);

    return result;
  }

  @Post('password/reset-request')
  @ApiOperation({ summary: 'Request password reset' })
  async requestPasswordReset(@Body() dto: PasswordResetRequestDto) {
    return await this.authService.requestPasswordReset(dto);
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset (alias)' })
  async forgotPassword(@Body() dto: PasswordResetRequestDto) {
    return await this.authService.requestPasswordReset(dto);
  }

  @Post('password/reset-confirm')
  @ApiOperation({ summary: 'Confirm password reset' })
  async confirmPasswordReset(@Body() dto: PasswordResetConfirmDto) {
    return await this.authService.confirmPasswordReset(dto);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password with token (alias)' })
  async resetPassword(@Body() dto: PasswordResetConfirmDto) {
    return await this.authService.confirmPasswordReset(dto);
  }

  @Post('password/change')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change password for authenticated user' })
  async changePassword(@Request() req, @Body() dto: ChangePasswordDto) {
    return await this.authService.changePassword(req.user.sub, dto);
  }

  @Post('verify-email')
  @ApiOperation({ summary: 'Verify email address' })
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return await this.authService.verifyEmail(dto);
  }

  @Post('verify-email/resend')
  @ApiOperation({ summary: 'Resend email verification' })
  async resendEmailVerification(@Body() dto: ResendEmailVerificationDto) {
    return await this.authService.resendEmailVerification(dto);
  }

  @Delete('account')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete user account and all associated data' })
  async deleteAccount(@Request() req, @Body() dto: DeleteAccountDto) {
    const userId = req.user.sub || req.user.userId;
    const email = req.user.email;
    return await this.authService.deleteAccount(userId, email, dto.password);
  }

}
