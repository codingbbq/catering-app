import type { AuthenticatedTenantContext } from '@catering/shared-types';
import {
  createMenuRequestSchema,
  duplicateMenuRequestSchema,
  menuSearchParamsSchema,
  updateMenuRequestSchema,
} from '@catering/shared-types';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AccessScope } from '../tenancy/access-scope.decorator.js';
import { CurrentRequestContext } from '../tenancy/request-context.decorator.js';
import { MenusService } from './menus.service.js';

@Controller()
@AccessScope('tenant')
export class MenusController {
  constructor(private readonly menusService: MenusService) {}

  private getTenantContext(ctx: unknown): AuthenticatedTenantContext {
    const tenantCtx = ctx as AuthenticatedTenantContext;
    if (tenantCtx.scope !== 'tenant' || !tenantCtx.tenantId) {
      throw new Error('Invalid tenant context');
    }
    return tenantCtx;
  }

  @Get('menus')
  async listMenus(
    @CurrentRequestContext() ctx: unknown,
    @Query('search') search?: string,
    @Query('status') status?: 'active' | 'draft' | 'archived' | 'all',
    @Query('serviceStyle') serviceStyle?: string,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    const parsed = menuSearchParamsSchema.parse({
      search,
      status,
      serviceStyle,
    });
    return this.menusService.listMenus(tenantCtx.tenantId, parsed);
  }

  @Post('menus')
  async createMenu(
    @CurrentRequestContext() ctx: unknown,
    @Body() body: unknown,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    const dto = createMenuRequestSchema.parse(body);
    return this.menusService.createMenu(
      tenantCtx.tenantId,
      tenantCtx.userId,
      dto,
    );
  }

  @Get('menus/:menuId')
  async getMenu(
    @CurrentRequestContext() ctx: unknown,
    @Param('menuId') menuId: string,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    return this.menusService.getMenuById(tenantCtx.tenantId, menuId);
  }

  @Patch('menus/:menuId')
  async updateMenu(
    @CurrentRequestContext() ctx: unknown,
    @Param('menuId') menuId: string,
    @Body() body: unknown,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    const dto = updateMenuRequestSchema.parse(body);
    return this.menusService.updateMenu(
      tenantCtx.tenantId,
      menuId,
      tenantCtx.userId,
      dto,
    );
  }

  @Post('menus/:menuId/duplicate')
  async duplicateMenu(
    @CurrentRequestContext() ctx: unknown,
    @Param('menuId') menuId: string,
    @Body() body: unknown,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    const dto = duplicateMenuRequestSchema.parse(body || {});
    return this.menusService.duplicateMenu(
      tenantCtx.tenantId,
      menuId,
      tenantCtx.userId,
      dto,
    );
  }

  @Post('menus/:menuId/archive')
  async archiveMenu(
    @CurrentRequestContext() ctx: unknown,
    @Param('menuId') menuId: string,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    return this.menusService.archiveMenu(
      tenantCtx.tenantId,
      menuId,
      tenantCtx.userId,
    );
  }

  @Post('menus/:menuId/reactivate')
  async reactivateMenu(
    @CurrentRequestContext() ctx: unknown,
    @Param('menuId') menuId: string,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    return this.menusService.reactivateMenu(
      tenantCtx.tenantId,
      menuId,
      tenantCtx.userId,
    );
  }

  @Delete('menus/:menuId')
  async deleteMenu(
    @CurrentRequestContext() ctx: unknown,
    @Param('menuId') menuId: string,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    return this.menusService.deleteMenu(
      tenantCtx.tenantId,
      menuId,
      tenantCtx.userId,
    );
  }
}
