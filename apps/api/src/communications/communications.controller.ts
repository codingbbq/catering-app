import type { AuthenticatedTenantContext } from '@catering/shared-types';
import {
  communicationFilterParamsSchema,
  createCommunicationSchema,
} from '@catering/shared-types';
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { AccessScope } from '../tenancy/access-scope.decorator.js';
import { CurrentRequestContext } from '../tenancy/request-context.decorator.js';
import { CommunicationsService } from './communications.service.js';

@Controller()
@AccessScope('tenant')
export class CommunicationsController {
  constructor(private readonly communicationsService: CommunicationsService) {}

  private getTenantContext(ctx: unknown): AuthenticatedTenantContext {
    const tenantCtx = ctx as AuthenticatedTenantContext;
    if (tenantCtx.scope !== 'tenant' || !tenantCtx.tenantId) {
      throw new Error('Invalid tenant context');
    }
    return tenantCtx;
  }

  @Get('communications')
  async listCommunications(
    @CurrentRequestContext() ctx: unknown,
    @Query('channel') channel?: string,
    @Query('status') status?: string,
    @Query('direction') direction?: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    const parsed = communicationFilterParamsSchema.parse({
      channel: channel as any,
      status: status as any,
      direction: direction as any,
      entityType: entityType as any,
      entityId,
      search,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
    return this.communicationsService.listCommunications(tenantCtx.tenantId, parsed);
  }

  @Get('communications/stats')
  async getStats(@CurrentRequestContext() ctx: unknown) {
    const tenantCtx = this.getTenantContext(ctx);
    return this.communicationsService.getStats(tenantCtx.tenantId);
  }

  @Get('communications/templates')
  async getTemplates(@CurrentRequestContext() ctx: unknown) {
    const tenantCtx = this.getTenantContext(ctx);
    return this.communicationsService.getTemplates(tenantCtx.tenantId);
  }

  @Get('communications/:id')
  async getCommunication(
    @CurrentRequestContext() ctx: unknown,
    @Param('id') id: string,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    return this.communicationsService.getCommunicationById(tenantCtx.tenantId, id);
  }

  @Post('communications')
  async createCommunication(
    @CurrentRequestContext() ctx: unknown,
    @Body() body: unknown,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    const dto = createCommunicationSchema.parse(body);
    return this.communicationsService.createCommunication(
      tenantCtx.tenantId,
      tenantCtx.userId,
      dto,
    );
  }

  @Post('communications/:id/retry')
  async retryCommunication(
    @CurrentRequestContext() ctx: unknown,
    @Param('id') id: string,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    return this.communicationsService.retryCommunication(
      tenantCtx.tenantId,
      tenantCtx.userId,
      id,
    );
  }
}
