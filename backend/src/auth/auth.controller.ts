import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterStartDto } from './dto/register-start.dto';
import { RegisterVerifyDto } from './dto/register-verify.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser } from '../common/types/auth-user.type';

@ApiTags('Authentication')
@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Initiate verified student registration (Checks official academic records & sends OTP)' })
  @SwaggerResponse({ status: 200, description: 'OTP dispatched to institute email' })
  async registerStart(@Body() dto: RegisterStartDto) {
    return this.authService.registerStart(dto);
  }

  @Public()
  @Post('register/verify')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Verify OTP and finalize verified student profile creation' })
  @SwaggerResponse({ status: 201, description: 'Student registered and verified' })
  async registerVerify(@Body() dto: RegisterVerifyDto) {
    return this.authService.registerVerify(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Student login using institute email and password' })
  @SwaggerResponse({ status: 200, description: 'User authenticated with session tokens' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign out and invalidate session' })
  async logout(@CurrentUser() user: AuthUser) {
    return this.authService.logout(user?.accessToken || '');
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset email' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset account password with token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Get('session')
  @ApiOperation({ summary: 'Get current authenticated user and linked student profile' })
  async getSession(@CurrentUser() user: AuthUser) {
    return {
      authenticated: true,
      user,
    };
  }
}
