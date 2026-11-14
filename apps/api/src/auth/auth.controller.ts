import {
  signInRequestSchema,
  refreshRequestSchema,
  invitationAcceptRequestSchema,
  forgotPasswordRequestSchema,
  resetPasswordRequestSchema,
} from '@catering/shared-types';
import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AuthService } from './auth.service.js';

@Controller('platform/auth')
export class PlatformAuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('sign-in')
  async signIn(@Body() body: unknown) {
    const dto = signInRequestSchema.parse(body);
    return this.authService.platformSignIn(dto);
  }

  @Post('sign-out')
  async signOut(@Body() body: unknown) {
    const { refreshToken } = refreshRequestSchema.parse(body);
    await this.authService.signOut(refreshToken);
    return { message: 'Signed out.' };
  }
}

@Controller('auth')
export class TenantAuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('tenant-info/:tenantSlug')
  async getTenantInfo(@Param('tenantSlug') tenantSlug: string) {
    return this.authService.getTenantInfo(tenantSlug);
  }

  @Post('sign-in/:tenantSlug')
  async signIn(@Param('tenantSlug') tenantSlug: string, @Body() body: unknown) {
    const dto = signInRequestSchema.parse(body);
    return this.authService.tenantSignIn(dto, tenantSlug);
  }

  @Post('sign-out')
  async signOut(@Body() body: unknown) {
    const { refreshToken } = refreshRequestSchema.parse(body);
    await this.authService.signOut(refreshToken);
    return { message: 'Signed out.' };
  }

  @Post('refresh')
  async refresh(@Body() body: unknown) {
    const { refreshToken } = refreshRequestSchema.parse(body);
    return this.authService.refreshTokens(refreshToken);
  }

  @Post('invitations/accept')
  async acceptInvitation(@Body() body: unknown) {
    const dto = invitationAcceptRequestSchema.parse(body);
    return this.authService.acceptInvitation(dto);
  }

  @Post('password/forgot')
  async forgotPassword(@Body() body: unknown) {
    const dto = forgotPasswordRequestSchema.parse(body);
    return this.authService.forgotPassword(dto);
  }

  @Post('password/reset')
  async resetPassword(@Body() body: unknown) {
    const dto = resetPasswordRequestSchema.parse(body);
    return this.authService.resetPassword(dto);
  }
}
