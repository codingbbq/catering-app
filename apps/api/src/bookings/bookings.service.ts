import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type {
  BookingDetail,
  BookingListItem,
  BookingListResponse,
  BookingListStats,
  BookingSearchParams,
  BookingStatus,
  CancelBookingRequest,
  ConfirmBookingRequest,
  CreateBookingFromQuotationRequest,
  CreateBookingRequest,
  ServiceType,
  UpdateBookingRequest,
} from '@catering/shared-types';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditLogService } from '../tenancy/audit-log.service.js';

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  private async generateBookingNumber(tenantId: string): Promise<string> {
    const date = new Date();
    const yearMonth = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
    const count = await this.prisma.booking.count({
      where: { tenantId },
    });
    return `BK-${yearMonth}-${String(count + 1).padStart(4, '0')}`;
  }

  private mapBookingDetail(b: any): BookingDetail {
    return {
      id: b.id,
      tenantId: b.tenantId,
      bookingNumber: b.bookingNumber,
      title: b.title,
      status: b.status as BookingStatus,
      customerId: b.customerId,
      customer: {
        id: b.customer.id,
        name: b.customer.name,
        email: b.customer.email,
        phone: b.customer.phone,
      },
      quotationId: b.quotationId,
      quotation: b.quotation
        ? {
            id: b.quotation.id,
            quotationNumber: b.quotation.quotationNumber,
            title: b.quotation.title,
            status: b.quotation.status,
            currentRevisionNumber: b.quotation.currentRevisionNumber,
          }
        : null,
      enquiryId: b.enquiryId,
      enquiry: b.enquiry
        ? {
            id: b.enquiry.id,
            enquiryNumber: b.enquiry.enquiryNumber,
            title: b.enquiry.title,
          }
        : null,
      serviceType: b.serviceType as ServiceType,
      eventDate: b.eventDate.toISOString(),
      guestCount: b.guestCount,
      venueName: b.venueName,
      venueAddress: b.venueAddress,
      contactName: b.contactName,
      contactPhone: b.contactPhone,
      contactEmail: b.contactEmail,
      specialInstructions: b.specialInstructions,
      cancellationReason: b.cancellationReason,
      totalAmount: Number(b.totalAmount),
      currency: b.currency,
      confirmedAt: b.confirmedAt ? b.confirmedAt.toISOString() : null,
      cancelledAt: b.cancelledAt ? b.cancelledAt.toISOString() : null,
      schedules: (b.schedules || []).map((s: any) => ({
        id: s.id,
        bookingId: s.bookingId,
        title: s.title,
        scheduledDate: s.scheduledDate.toISOString(),
        startTime: s.startTime,
        endTime: s.endTime,
        description: s.description,
        location: s.location,
        sortOrder: s.sortOrder,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      })),
      createdAt: b.createdAt.toISOString(),
      updatedAt: b.updatedAt.toISOString(),
    };
  }

  private mapBookingListItem(b: any): BookingListItem {
    return {
      id: b.id,
      bookingNumber: b.bookingNumber,
      title: b.title,
      status: b.status as BookingStatus,
      customerId: b.customerId,
      customerName: b.customer.name,
      customerEmail: b.customer.email,
      customerPhone: b.customer.phone,
      quotationId: b.quotationId,
      quotationNumber: b.quotation?.quotationNumber || null,
      enquiryId: b.enquiryId,
      enquiryNumber: b.enquiry?.enquiryNumber || null,
      serviceType: b.serviceType as ServiceType,
      eventDate: b.eventDate.toISOString(),
      guestCount: b.guestCount,
      venueName: b.venueName,
      venueAddress: b.venueAddress,
      totalAmount: Number(b.totalAmount),
      currency: b.currency,
      confirmedAt: b.confirmedAt ? b.confirmedAt.toISOString() : null,
      cancelledAt: b.cancelledAt ? b.cancelledAt.toISOString() : null,
      createdAt: b.createdAt.toISOString(),
      updatedAt: b.updatedAt.toISOString(),
    };
  }

  async listBookings(
    tenantId: string,
    params?: BookingSearchParams,
  ): Promise<BookingListResponse> {
    const where: any = { tenantId };

    if (params?.status && params.status !== 'all') {
      where.status = params.status;
    }

    if (params?.customerId) {
      where.customerId = params.customerId;
    }

    if (params?.enquiryId) {
      where.enquiryId = params.enquiryId;
    }

    if (params?.quotationId) {
      where.quotationId = params.quotationId;
    }

    if (params?.fromDate || params?.toDate) {
      where.eventDate = {};
      if (params.fromDate) {
        where.eventDate.gte = new Date(params.fromDate);
      }
      if (params.toDate) {
        where.eventDate.lte = new Date(params.toDate);
      }
    }

    if (params?.search) {
      const search = params.search.trim();
      where.OR = [
        { bookingNumber: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { venueName: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
        { quotation: { quotationNumber: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const page = Number(params?.page ?? 1);
    const limit = Number(params?.limit ?? 25);
    const skip = (page - 1) * limit;

    const [items, total, allTenantBookings] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        include: {
          customer: true,
          quotation: true,
          enquiry: true,
        },
        orderBy: { eventDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.booking.count({ where }),
      this.prisma.booking.findMany({
        where: { tenantId },
        select: {
          status: true,
          totalAmount: true,
          eventDate: true,
        },
      }),
    ]);

    const now = new Date();
    const thirtyDaysAhead = new Date();
    thirtyDaysAhead.setDate(now.getDate() + 30);

    let confirmedCount = 0;
    let inProgressCount = 0;
    let completedCount = 0;
    let cancelledCount = 0;
    let draftCount = 0;
    let upcomingCount = 0;
    let totalConfirmedValue = 0;

    for (const b of allTenantBookings) {
      const amount = Number(b.totalAmount) || 0;
      switch (b.status) {
        case 'confirmed':
          confirmedCount += 1;
          totalConfirmedValue += amount;
          break;
        case 'in_progress':
          inProgressCount += 1;
          totalConfirmedValue += amount;
          break;
        case 'completed':
          completedCount += 1;
          break;
        case 'cancelled':
          cancelledCount += 1;
          break;
        case 'draft':
          draftCount += 1;
          break;
      }

      if (b.status !== 'cancelled' && b.eventDate >= now && b.eventDate <= thirtyDaysAhead) {
        upcomingCount += 1;
      }
    }

    const stats: BookingListStats = {
      totalBookings: allTenantBookings.length,
      confirmedCount,
      inProgressCount,
      completedCount,
      cancelledCount,
      draftCount,
      upcomingCount,
      totalConfirmedValue: Math.round(totalConfirmedValue * 100) / 100,
    };

    return {
      items: items.map((b) => this.mapBookingListItem(b)),
      stats,
      total,
    };
  }

  async getBookingById(tenantId: string, bookingId: string): Promise<BookingDetail> {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, tenantId },
      include: {
        customer: true,
        quotation: true,
        enquiry: true,
        schedules: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException(`Booking ${bookingId} not found`);
    }

    return this.mapBookingDetail(booking);
  }

  async createBooking(
    tenantId: string,
    userId: string | undefined,
    dto: CreateBookingRequest,
  ): Promise<BookingDetail> {
    // 1. Verify customer exists and belongs to tenant
    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, tenantId },
    });
    if (!customer) {
      throw new NotFoundException(`Customer ${dto.customerId} not found`);
    }

    // 2. Verify quotation if provided
    let quotation: any = null;
    if (dto.quotationId) {
      quotation = await this.prisma.quotation.findFirst({
        where: { id: dto.quotationId, tenantId },
        include: { enquiry: true },
      });
      if (!quotation) {
        throw new NotFoundException(`Quotation ${dto.quotationId} not found`);
      }
      if (quotation.status !== 'accepted') {
        throw new BadRequestException('Bookings can only be linked to accepted quotations');
      }
    }

    // 3. Verify enquiry if provided
    const enquiryId = dto.enquiryId || quotation?.enquiryId || null;
    if (enquiryId) {
      const enquiry = await this.prisma.enquiry.findFirst({
        where: { id: enquiryId, tenantId },
      });
      if (!enquiry) {
        throw new NotFoundException(`Enquiry ${enquiryId} not found`);
      }
    }

    // 4. Default currency from settings
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
    });
    const currency = dto.currency || settings?.currencyCode || 'USD';

    // 5. Generate booking number
    const bookingNumber = await this.generateBookingNumber(tenantId);
    const initialStatus = dto.status || 'confirmed';
    const eventDate = new Date(dto.eventDate);

    const createData: any = {
      tenantId,
      bookingNumber,
      title: dto.title,
      status: initialStatus,
      customerId: dto.customerId,
      quotationId: dto.quotationId ?? null,
      enquiryId,
      serviceType: dto.serviceType || 'event_catering',
      eventDate,
      guestCount: dto.guestCount ?? null,
      venueName: dto.venueName ?? null,
      venueAddress: dto.venueAddress ?? null,
      contactName: dto.contactName ?? customer.name,
      contactPhone: dto.contactPhone ?? customer.phone,
      contactEmail: dto.contactEmail ?? customer.email,
      specialInstructions: dto.specialInstructions ?? null,
      totalAmount: dto.totalAmount ?? 0,
      currency,
      confirmedAt: initialStatus === 'confirmed' ? new Date() : null,
    };

    if (dto.schedules && dto.schedules.length > 0) {
      createData.schedules = {
        create: dto.schedules.map((s, idx) => ({
          title: s.title,
          scheduledDate: new Date(s.scheduledDate),
          startTime: s.startTime ?? null,
          endTime: s.endTime ?? null,
          description: s.description ?? null,
          location: s.location ?? null,
          sortOrder: s.sortOrder ?? idx,
        })),
      };
    }

    const booking = await this.prisma.booking.create({
      data: createData,
      include: {
        customer: true,
        quotation: true,
        enquiry: true,
        schedules: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    // 6. Record activity in Enquiry timeline if linked
    if (enquiryId) {
      await this.prisma.enquiryActivity.create({
        data: {
          enquiryId,
          type: 'status_change',
          content: `Booking ${bookingNumber} created for event on ${eventDate.toISOString().split('T')[0]} (${currency} ${Number(booking.totalAmount).toFixed(2)}).`,
          authorId: userId ?? null,
        },
      });
    }

    // 7. Audit log
    this.auditLogService.record({
      scope: 'tenant',
      tenantId,
      actorType: userId ? 'tenant_user' : 'system',
      action: 'booking.created',
      outcome: 'allowed',
      metadata: {
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
        quotationId: dto.quotationId || '',
        totalAmount: String(booking.totalAmount),
      },
    });

    return this.mapBookingDetail(booking);
  }

  async createBookingFromQuotation(
    tenantId: string,
    userId: string | undefined,
    dto: CreateBookingFromQuotationRequest,
  ): Promise<BookingDetail> {
    const quotation = await this.prisma.quotation.findFirst({
      where: { id: dto.quotationId, tenantId },
      include: {
        enquiry: {
          include: {
            customer: true,
          },
        },
        revisions: {
          orderBy: { revisionNumber: 'desc' },
        },
      },
    });

    if (!quotation) {
      throw new NotFoundException(`Quotation ${dto.quotationId} not found`);
    }

    if (quotation.status !== 'accepted') {
      throw new BadRequestException(
        `Quotation ${quotation.quotationNumber} is ${quotation.status}. Only accepted quotations can be converted to bookings.`,
      );
    }

    const activeRev =
      quotation.revisions.find((r) => r.revisionNumber === quotation.currentRevisionNumber) ||
      quotation.revisions[0];

    const customer = quotation.enquiry.customer;
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
    });
    const currency = settings?.currencyCode || 'USD';

    const eventDate = dto.eventDate
      ? new Date(dto.eventDate)
      : quotation.enquiry.eventDate || new Date();

    const title = dto.title || `Booking: ${quotation.title}`;
    const bookingNumber = await this.generateBookingNumber(tenantId);
    const initialStatus = dto.status || 'confirmed';

    // Standard default schedules if none provided
    const defaultSchedules =
      dto.schedules && dto.schedules.length > 0
        ? dto.schedules
        : [
            {
              title: 'Kitchen & Staff Arrival / Setup',
              scheduledDate: eventDate.toISOString().split('T')[0],
              startTime: '10:00',
              endTime: '12:00',
              description: 'Initial site setup, equipment load-in, kitchen prep',
              location: dto.venueName || quotation.enquiry.venue || 'Venue',
              sortOrder: 0,
            },
            {
              title: 'Catering Service Execution',
              scheduledDate: eventDate.toISOString().split('T')[0],
              startTime: '13:00',
              endTime: '16:00',
              description: 'Guest service and food presentation as per menu',
              location: dto.venueName || quotation.enquiry.venue || 'Venue',
              sortOrder: 1,
            },
            {
              title: 'Packdown & Site Teardown',
              scheduledDate: eventDate.toISOString().split('T')[0],
              startTime: '16:30',
              endTime: '18:00',
              description: 'Clearing stations, waste management, breakdown',
              location: dto.venueName || quotation.enquiry.venue || 'Venue',
              sortOrder: 2,
            },
          ];

    const booking = await this.prisma.booking.create({
      data: {
        tenantId,
        bookingNumber,
        title,
        status: initialStatus,
        customerId: customer.id,
        quotationId: quotation.id,
        enquiryId: quotation.enquiryId,
        serviceType: quotation.enquiry.serviceType,
        eventDate,
        guestCount: activeRev?.guestCount ?? quotation.enquiry.guestCount ?? null,
        venueName: dto.venueName ?? quotation.enquiry.venue ?? null,
        venueAddress: dto.venueAddress ?? quotation.enquiry.venue ?? null,
        contactName: dto.contactName ?? customer.name,
        contactPhone: dto.contactPhone ?? customer.phone,
        contactEmail: dto.contactEmail ?? customer.email,
        specialInstructions:
          dto.specialInstructions ?? quotation.notes ?? quotation.enquiry.notes ?? null,
        totalAmount: activeRev?.totalAmount ?? 0,
        currency,
        confirmedAt: initialStatus === 'confirmed' ? new Date() : null,
        schedules: {
          create: defaultSchedules.map((s, idx) => ({
            title: s.title,
            scheduledDate: new Date(s.scheduledDate || eventDate),
            startTime: s.startTime ?? null,
            endTime: s.endTime ?? null,
            description: s.description ?? null,
            location: s.location ?? null,
            sortOrder: s.sortOrder ?? idx,
          })),
        },
      },
      include: {
        customer: true,
        quotation: true,
        enquiry: true,
        schedules: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    // Activity note on Enquiry
    await this.prisma.enquiryActivity.create({
      data: {
        enquiryId: quotation.enquiryId,
        type: 'status_change',
        content: `Booking ${bookingNumber} confirmed from accepted Quotation ${quotation.quotationNumber} (${currency} ${Number(booking.totalAmount).toFixed(2)}).`,
        authorId: userId ?? null,
      },
    });

    // Audit log
    this.auditLogService.record({
      scope: 'tenant',
      tenantId,
      actorType: userId ? 'tenant_user' : 'system',
      action: 'booking.converted_from_quotation',
      outcome: 'allowed',
      metadata: {
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
        quotationId: quotation.id,
        quotationNumber: quotation.quotationNumber,
        totalAmount: String(booking.totalAmount),
      },
    });

    return this.mapBookingDetail(booking);
  }

  async updateBooking(
    tenantId: string,
    userId: string | undefined,
    bookingId: string,
    dto: UpdateBookingRequest,
  ): Promise<BookingDetail> {
    const existing = await this.prisma.booking.findFirst({
      where: { id: bookingId, tenantId },
    });

    if (!existing) {
      throw new NotFoundException(`Booking ${bookingId} not found`);
    }

    if (existing.status === 'cancelled') {
      throw new BadRequestException('Cannot update a cancelled booking');
    }

    const dataToUpdate: any = {};
    if (dto.title !== undefined) dataToUpdate.title = dto.title;
    if (dto.serviceType !== undefined) dataToUpdate.serviceType = dto.serviceType;
    if (dto.eventDate !== undefined) dataToUpdate.eventDate = new Date(dto.eventDate);
    if (dto.guestCount !== undefined) dataToUpdate.guestCount = dto.guestCount;
    if (dto.venueName !== undefined) dataToUpdate.venueName = dto.venueName;
    if (dto.venueAddress !== undefined) dataToUpdate.venueAddress = dto.venueAddress;
    if (dto.contactName !== undefined) dataToUpdate.contactName = dto.contactName;
    if (dto.contactPhone !== undefined) dataToUpdate.contactPhone = dto.contactPhone;
    if (dto.contactEmail !== undefined) dataToUpdate.contactEmail = dto.contactEmail;
    if (dto.specialInstructions !== undefined)
      dataToUpdate.specialInstructions = dto.specialInstructions;
    if (dto.totalAmount !== undefined) dataToUpdate.totalAmount = dto.totalAmount;

    // Update booking in transaction if schedules provided
    await this.prisma.$transaction(async (tx: any) => {
      await tx.booking.update({
        where: { id: bookingId },
        data: dataToUpdate,
      });

      if (dto.schedules !== undefined) {
        await tx.bookingSchedule.deleteMany({
          where: { bookingId },
        });

        if (dto.schedules.length > 0) {
          await tx.bookingSchedule.createMany({
            data: dto.schedules.map((s, idx) => ({
              bookingId,
              title: s.title,
              scheduledDate: new Date(s.scheduledDate),
              startTime: s.startTime ?? null,
              endTime: s.endTime ?? null,
              description: s.description ?? null,
              location: s.location ?? null,
              sortOrder: s.sortOrder ?? idx,
            })),
          });
        }
      }
    });

    this.auditLogService.record({
      scope: 'tenant',
      tenantId,
      actorType: userId ? 'tenant_user' : 'system',
      action: 'booking.updated',
      outcome: 'allowed',
      metadata: {
        bookingId,
        bookingNumber: existing.bookingNumber,
      },
    });

    return this.getBookingById(tenantId, bookingId);
  }

  async confirmBooking(
    tenantId: string,
    userId: string | undefined,
    bookingId: string,
    dto?: ConfirmBookingRequest,
  ): Promise<BookingDetail> {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, tenantId },
    });

    if (!booking) {
      throw new NotFoundException(`Booking ${bookingId} not found`);
    }

    if (booking.status === 'cancelled') {
      throw new BadRequestException('Cannot confirm a cancelled booking');
    }

    if (booking.status === 'confirmed') {
      return this.getBookingById(tenantId, bookingId);
    }

    await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'confirmed',
        confirmedAt: new Date(),
      },
    });

    if (booking.enquiryId) {
      await this.prisma.enquiryActivity.create({
        data: {
          enquiryId: booking.enquiryId,
          type: 'status_change',
          content: `Booking ${booking.bookingNumber} marked as Confirmed.${dto?.notes ? ` Notes: ${dto.notes}` : ''}`,
          authorId: userId ?? null,
        },
      });
    }

    try {
      const recipient = booking.contactEmail || 'Customer';
      await this.prisma.communicationLog.create({
        data: {
          tenantId,
          customerId: booking.customerId,
          enquiryId: booking.enquiryId,
          quotationId: booking.quotationId,
          bookingId: booking.id,
          channel: 'email',
          direction: 'outbound',
          status: 'delivered',
          recipient,
          sender: 'Operations Desk',
          subject: `Booking Confirmed - ${booking.bookingNumber} - ${booking.title}`,
          content: `Booking ${booking.bookingNumber} (${booking.title}) has been confirmed for ${new Date(booking.eventDate).toLocaleDateString()}.${dto?.notes ? ` Notes: ${dto.notes}` : ''}`.trim(),
          provider: 'mock',
          providerMessageId: `mock_email_${Date.now()}_bkg`,
          sentAt: new Date(),
          deliveredAt: new Date(),
        },
      });
    } catch {
      // Non-blocking
    }

    this.auditLogService.record({
      scope: 'tenant',
      tenantId,
      actorType: userId ? 'tenant_user' : 'system',
      action: 'booking.confirmed',
      outcome: 'allowed',
      metadata: {
        bookingId,
        bookingNumber: booking.bookingNumber,
        notes: dto?.notes || '',
      },
    });

    return this.getBookingById(tenantId, bookingId);
  }

  async cancelBooking(
    tenantId: string,
    userId: string | undefined,
    bookingId: string,
    dto: CancelBookingRequest,
  ): Promise<BookingDetail> {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, tenantId },
    });

    if (!booking) {
      throw new NotFoundException(`Booking ${bookingId} not found`);
    }

    if (booking.status === 'completed') {
      throw new BadRequestException('Cannot cancel a completed booking');
    }

    if (booking.status === 'cancelled') {
      return this.getBookingById(tenantId, bookingId);
    }

    await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'cancelled',
        cancellationReason: dto.cancellationReason,
        cancelledAt: new Date(),
      },
    });

    if (booking.enquiryId) {
      await this.prisma.enquiryActivity.create({
        data: {
          enquiryId: booking.enquiryId,
          type: 'status_change',
          content: `Booking ${booking.bookingNumber} was Cancelled. Reason: ${dto.cancellationReason}`,
          authorId: userId ?? null,
        },
      });
    }

    this.auditLogService.record({
      scope: 'tenant',
      tenantId,
      actorType: userId ? 'tenant_user' : 'system',
      action: 'booking.cancelled',
      outcome: 'allowed',
      metadata: {
        bookingId,
        bookingNumber: booking.bookingNumber,
        reason: dto.cancellationReason,
      },
    });

    return this.getBookingById(tenantId, bookingId);
  }
}
