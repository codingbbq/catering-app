import type { AuthenticatedTenantContext } from '@catering/shared-types';
import {
  createInvitationRequestSchema,
  updateTenantProfileSchema,
  updateTenantUserRoleSchema,
} from '@catering/shared-types';
import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { AccessScope } from '../tenancy/access-scope.decorator.js';
import { CurrentRequestContext } from '../tenancy/request-context.decorator.js';
import { TenantAdminService } from './tenant-admin.service.js';

@Controller('tenant')
@AccessScope('tenant')
export class TenantAdminController {
  constructor(private readonly tenantAdminService: TenantAdminService) {}

  private getTenantContext(ctx: unknown): AuthenticatedTenantContext {
    const tenantCtx = ctx as AuthenticatedTenantContext;
    if (tenantCtx.scope !== 'tenant' || !tenantCtx.tenantId) {
      throw new Error('Invalid tenant context');
    }
    return tenantCtx;
  }

  // --- Profile ---

  @Get('me')
  async getProfile(@CurrentRequestContext() ctx: unknown) {
    const tenantCtx = this.getTenantContext(ctx);
    return this.tenantAdminService.getProfile(tenantCtx.tenantId);
  }

  @Patch('me')
  async updateProfile(@CurrentRequestContext() ctx: unknown, @Body() body: unknown) {
    const tenantCtx = this.getTenantContext(ctx);
    const dto = updateTenantProfileSchema.parse(body);
    return this.tenantAdminService.updateProfile(tenantCtx.tenantId, dto, tenantCtx);
  }

  // --- Users ---

  @Get('users')
  async listUsers(@CurrentRequestContext() ctx: unknown) {
    const tenantCtx = this.getTenantContext(ctx);
    return this.tenantAdminService.listUsers(tenantCtx.tenantId);
  }

  @Patch('users/:tenantUserId')
  async updateUserRole(
    @CurrentRequestContext() ctx: unknown,
    @Param('tenantUserId') tenantUserId: string,
    @Body() body: unknown,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    const dto = updateTenantUserRoleSchema.parse(body);
    return this.tenantAdminService.updateUserRole(tenantCtx.tenantId, tenantUserId, dto.role, tenantCtx);
  }

  @Post('users/:tenantUserId/deactivate')
  async deactivateUser(
    @CurrentRequestContext() ctx: unknown,
    @Param('tenantUserId') tenantUserId: string,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    return this.tenantAdminService.deactivateUser(tenantCtx.tenantId, tenantUserId, tenantCtx);
  }

  // --- Invitations ---

  @Get('users/invitations')
  async listInvitations(@CurrentRequestContext() ctx: unknown) {
    const tenantCtx = this.getTenantContext(ctx);
    return this.tenantAdminService.listInvitations(tenantCtx.tenantId);
  }

  @Post('users/invitations')
  async createInvitation(@CurrentRequestContext() ctx: unknown, @Body() body: unknown) {
    const tenantCtx = this.getTenantContext(ctx);
    const dto = createInvitationRequestSchema.parse(body);
    return this.tenantAdminService.createInvitation(tenantCtx.tenantId, dto, tenantCtx);
  }
}
