import type { AuthenticatedTenantContext } from '@catering/shared-types';
import {
  createEnquiryActivityRequestSchema,
  createEnquiryRequestSchema,
  enquirySearchParamsSchema,
  updateEnquiryRequestSchema,
} from '@catering/shared-types';
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AccessScope } from '../tenancy/access-scope.decorator.js';
import { CurrentRequestContext } from '../tenancy/request-context.decorator.js';
import { EnquiriesService } from './enquiries.service.js';

@Controller('enquiries')
@AccessScope('tenant')
export class EnquiriesController {
  constructor(private readonly enquiriesService: EnquiriesService) {}

  private getTenantContext(ctx: unknown): AuthenticatedTenantContext {
    const tenantCtx = ctx as AuthenticatedTenantContext;
    if (tenantCtx.scope !== 'tenant' || !tenantCtx.tenantId) {
      throw new Error('Invalid tenant context');
    }
    return tenantCtx;
  }

  @Get()
  async list(
    @CurrentRequestContext() ctx: unknown,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
    @Query('serviceType') serviceType?: string,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    const parsed = enquirySearchParamsSchema.parse({
      search,
      status,
      customerId,
      serviceType,
    });
    return this.enquiriesService.listEnquiries(tenantCtx.tenantId, parsed);
  }

  @Post()
  async create(@CurrentRequestContext() ctx: unknown, @Body() body: unknown) {
    const tenantCtx = this.getTenantContext(ctx);
    const dto = createEnquiryRequestSchema.parse(body);
    return this.enquiriesService.createEnquiry(
      tenantCtx.tenantId,
      dto,
      tenantCtx.userId,
    );
  }

  @Get(':enquiryId')
  async getOne(
    @CurrentRequestContext() ctx: unknown,
    @Param('enquiryId') enquiryId: string,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    return this.enquiriesService.getEnquiry(tenantCtx.tenantId, enquiryId);
  }

  @Patch(':enquiryId')
  async update(
    @CurrentRequestContext() ctx: unknown,
    @Param('enquiryId') enquiryId: string,
    @Body() body: unknown,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    const dto = updateEnquiryRequestSchema.parse(body);
    return this.enquiriesService.updateEnquiry(
      tenantCtx.tenantId,
      enquiryId,
      dto,
      tenantCtx.userId,
    );
  }

  @Post(':enquiryId/qualify')
  async qualify(
    @CurrentRequestContext() ctx: unknown,
    @Param('enquiryId') enquiryId: string,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    return this.enquiriesService.qualifyEnquiry(
      tenantCtx.tenantId,
      enquiryId,
      tenantCtx.userId,
    );
  }

  @Post(':enquiryId/activities')
  async addActivity(
    @CurrentRequestContext() ctx: unknown,
    @Param('enquiryId') enquiryId: string,
    @Body() body: unknown,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    const dto = createEnquiryActivityRequestSchema.parse(body);
    return this.enquiriesService.addActivity(
      tenantCtx.tenantId,
      enquiryId,
      dto,
      tenantCtx.userId,
    );
  }
}
