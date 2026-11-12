import type { AuthenticatedTenantContext } from '@catering/shared-types';
import {
  bookingSearchParamsSchema,
  cancelBookingRequestSchema,
  confirmBookingRequestSchema,
  createBookingFromQuotationSchema,
  createBookingRequestSchema,
  updateBookingRequestSchema,
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
import { BookingsService } from './bookings.service.js';

@Controller()
@AccessScope('tenant')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  private getTenantContext(ctx: unknown): AuthenticatedTenantContext {
    const tenantCtx = ctx as AuthenticatedTenantContext;
    if (tenantCtx.scope !== 'tenant' || !tenantCtx.tenantId) {
      throw new Error('Invalid tenant context');
    }
    return tenantCtx;
  }

  @Get('bookings')
  async listBookings(
    @CurrentRequestContext() ctx: unknown,
    @Query('search') search?: string,
    @Query('status') status?: 'draft' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'all',
    @Query('customerId') customerId?: string,
    @Query('enquiryId') enquiryId?: string,
    @Query('quotationId') quotationId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    const parsed = bookingSearchParamsSchema.parse({
      search,
      status,
      customerId,
      enquiryId,
      quotationId,
      fromDate,
      toDate,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    return this.bookingsService.listBookings(tenantCtx.tenantId, parsed);
  }

  @Post('bookings')
  async createBooking(
    @CurrentRequestContext() ctx: unknown,
    @Body() body: unknown,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    const dto = createBookingRequestSchema.parse(body);
    return this.bookingsService.createBooking(
      tenantCtx.tenantId,
      tenantCtx.userId,
      dto,
    );
  }

  @Post('bookings/from-quotation')
  async createBookingFromQuotation(
    @CurrentRequestContext() ctx: unknown,
    @Body() body: unknown,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    const dto = createBookingFromQuotationSchema.parse(body);
    return this.bookingsService.createBookingFromQuotation(
      tenantCtx.tenantId,
      tenantCtx.userId,
      dto,
    );
  }

  @Get('bookings/:bookingId')
  async getBooking(
    @CurrentRequestContext() ctx: unknown,
    @Param('bookingId') bookingId: string,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    return this.bookingsService.getBookingById(tenantCtx.tenantId, bookingId);
  }

  @Patch('bookings/:bookingId')
  async updateBooking(
    @CurrentRequestContext() ctx: unknown,
    @Param('bookingId') bookingId: string,
    @Body() body: unknown,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    const dto = updateBookingRequestSchema.parse(body);
    return this.bookingsService.updateBooking(
      tenantCtx.tenantId,
      tenantCtx.userId,
      bookingId,
      dto,
    );
  }

  @Post('bookings/:bookingId/confirm')
  async confirmBooking(
    @CurrentRequestContext() ctx: unknown,
    @Param('bookingId') bookingId: string,
    @Body() body: unknown,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    const dto = body ? confirmBookingRequestSchema.parse(body) : undefined;
    return this.bookingsService.confirmBooking(
      tenantCtx.tenantId,
      tenantCtx.userId,
      bookingId,
      dto,
    );
  }

  @Post('bookings/:bookingId/cancel')
  async cancelBooking(
    @CurrentRequestContext() ctx: unknown,
    @Param('bookingId') bookingId: string,
    @Body() body: unknown,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    const dto = cancelBookingRequestSchema.parse(body);
    return this.bookingsService.cancelBooking(
      tenantCtx.tenantId,
      tenantCtx.userId,
      bookingId,
      dto,
    );
  }
}
