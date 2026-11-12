import type { AuthenticatedTenantContext } from '@catering/shared-types';
import {
  createQuotationRequestSchema,
  createQuotationRevisionRequestSchema,
  quotationSearchParamsSchema,
  sendQuotationRequestSchema,
  updateDraftRevisionRequestSchema,
  updateQuotationRequestSchema,
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
import { QuotationsService } from './quotations.service.js';

@Controller()
@AccessScope('tenant')
export class QuotationsController {
  constructor(private readonly quotationsService: QuotationsService) {}

  private getTenantContext(ctx: unknown): AuthenticatedTenantContext {
    const tenantCtx = ctx as AuthenticatedTenantContext;
    if (tenantCtx.scope !== 'tenant' || !tenantCtx.tenantId) {
      throw new Error('Invalid tenant context');
    }
    return tenantCtx;
  }

  @Get('quotations')
  async listQuotations(
    @CurrentRequestContext() ctx: unknown,
    @Query('search') search?: string,
    @Query('status') status?: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'superseded' | 'all',
    @Query('enquiryId') enquiryId?: string,
    @Query('customerId') customerId?: string,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    const parsed = quotationSearchParamsSchema.parse({
      search,
      status,
      enquiryId,
      customerId,
    });
    return this.quotationsService.listQuotations(tenantCtx.tenantId, parsed);
  }

  @Post('quotations')
  async createQuotation(
    @CurrentRequestContext() ctx: unknown,
    @Body() body: unknown,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    const dto = createQuotationRequestSchema.parse(body);
    return this.quotationsService.createQuotation(
      tenantCtx.tenantId,
      tenantCtx.userId,
      dto,
    );
  }

  @Get('quotations/:quotationId')
  async getQuotation(
    @CurrentRequestContext() ctx: unknown,
    @Param('quotationId') quotationId: string,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    return this.quotationsService.getQuotationById(tenantCtx.tenantId, quotationId);
  }

  @Patch('quotations/:quotationId')
  async updateQuotation(
    @CurrentRequestContext() ctx: unknown,
    @Param('quotationId') quotationId: string,
    @Body() body: unknown,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    const dto = updateQuotationRequestSchema.parse(body);
    return this.quotationsService.updateQuotation(
      tenantCtx.tenantId,
      tenantCtx.userId,
      quotationId,
      dto,
    );
  }

  @Post('quotations/:quotationId/revisions')
  async createRevision(
    @CurrentRequestContext() ctx: unknown,
    @Param('quotationId') quotationId: string,
    @Body() body: unknown,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    const dto = createQuotationRevisionRequestSchema.parse(body);
    return this.quotationsService.createRevision(
      tenantCtx.tenantId,
      tenantCtx.userId,
      quotationId,
      dto,
    );
  }

  @Patch('quotations/:quotationId/revisions/:revisionId')
  async updateDraftRevision(
    @CurrentRequestContext() ctx: unknown,
    @Param('quotationId') quotationId: string,
    @Param('revisionId') revisionId: string,
    @Body() body: unknown,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    const dto = updateDraftRevisionRequestSchema.parse(body);
    return this.quotationsService.updateDraftRevision(
      tenantCtx.tenantId,
      tenantCtx.userId,
      quotationId,
      revisionId,
      dto,
    );
  }

  @Post('quotations/:quotationId/send')
  async sendQuotation(
    @CurrentRequestContext() ctx: unknown,
    @Param('quotationId') quotationId: string,
    @Body() body?: unknown,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    const dto = body ? sendQuotationRequestSchema.parse(body) : undefined;
    return this.quotationsService.sendQuotation(
      tenantCtx.tenantId,
      tenantCtx.userId,
      quotationId,
      dto,
    );
  }

  @Post('quotations/:quotationId/accept')
  async acceptQuotation(
    @CurrentRequestContext() ctx: unknown,
    @Param('quotationId') quotationId: string,
    @Body('revisionId') revisionId?: string,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    return this.quotationsService.acceptQuotation(
      tenantCtx.tenantId,
      tenantCtx.userId,
      quotationId,
      revisionId,
    );
  }

  @Post('quotations/:quotationId/reject')
  async rejectQuotation(
    @CurrentRequestContext() ctx: unknown,
    @Param('quotationId') quotationId: string,
    @Body('reason') reason?: string,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    return this.quotationsService.rejectQuotation(
      tenantCtx.tenantId,
      tenantCtx.userId,
      quotationId,
      reason,
    );
  }
}
