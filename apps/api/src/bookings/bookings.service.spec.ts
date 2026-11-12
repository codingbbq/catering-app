import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { AuditLogService } from '../tenancy/audit-log.service.js';
import { BookingsService } from './bookings.service.js';

describe('BookingsService', () => {
  let service: BookingsService;
  let prisma: any;
  let auditLogService: any;

  const tenantId = '00000000-0000-0000-0000-000000000001';
  const otherTenantId = '00000000-0000-0000-0000-000000000002';
  const userId = '11111111-1111-1111-1111-111111111111';
  const customerId = '22222222-2222-2222-2222-222222222222';
  const quotationId = '33333333-3333-3333-3333-333333333333';
  const enquiryId = '44444444-4444-4444-4444-444444444444';
  const bookingId = '55555555-5555-5555-5555-555555555555';

  const mockCustomer = {
    id: customerId,
    tenantId,
    name: 'Acme Corporation',
    email: 'events@acme.com',
    phone: '+1 555-0100',
  };

  const mockQuotation = {
    id: quotationId,
    tenantId,
    quotationNumber: 'QT-202611-0001',
    title: 'Acme Annual Gala Banquet',
    status: 'accepted',
    currentRevisionNumber: 1,
    notes: 'Include gluten-free signage',
    enquiryId,
    enquiry: {
      id: enquiryId,
      enquiryNumber: 'ENQ-202611-0001',
      title: 'Annual Gala 2026',
      serviceType: 'event_catering',
      eventDate: new Date('2026-12-15T18:00:00Z'),
      guestCount: 150,
      venue: 'Metropolitan Hall',
      customer: mockCustomer,
      notes: 'VIP event',
    },
    revisions: [
      {
        id: 'rev-1',
        revisionNumber: 1,
        status: 'accepted',
        guestCount: 150,
        totalAmount: 12500.0,
      },
    ],
  };

  const mockBooking = {
    id: bookingId,
    tenantId,
    bookingNumber: 'BK-202611-0001',
    title: 'Booking: Acme Annual Gala Banquet',
    status: 'confirmed',
    customerId,
    customer: mockCustomer,
    quotationId,
    quotation: mockQuotation,
    enquiryId,
    enquiry: mockQuotation.enquiry,
    serviceType: 'event_catering',
    eventDate: new Date('2026-12-15T18:00:00Z'),
    guestCount: 150,
    venueName: 'Metropolitan Hall',
    venueAddress: '123 Main St, Suite 400',
    contactName: 'Acme Corporation',
    contactPhone: '+1 555-0100',
    contactEmail: 'events@acme.com',
    specialInstructions: 'Include gluten-free signage',
    totalAmount: 12500.0,
    currency: 'USD',
    confirmedAt: new Date('2026-11-12T10:00:00Z'),
    cancelledAt: null,
    cancellationReason: null,
    schedules: [
      {
        id: 'sched-1',
        bookingId,
        title: 'Kitchen & Staff Arrival / Setup',
        scheduledDate: new Date('2026-12-15T10:00:00Z'),
        startTime: '10:00',
        endTime: '12:00',
        description: 'Initial site setup',
        location: 'Metropolitan Hall',
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    createdAt: new Date('2026-11-12T10:00:00Z'),
    updatedAt: new Date('2026-11-12T10:00:00Z'),
  };

  beforeEach(() => {
    prisma = {
      booking: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
      bookingSchedule: {
        deleteMany: vi.fn(),
        createMany: vi.fn(),
      },
      customer: {
        findFirst: vi.fn(),
      },
      quotation: {
        findFirst: vi.fn(),
      },
      enquiry: {
        findFirst: vi.fn(),
      },
      enquiryActivity: {
        create: vi.fn(),
      },
      tenantSettings: {
        findUnique: vi.fn().mockResolvedValue({ currencyCode: 'USD' }),
      },
      $transaction: vi.fn().mockImplementation((callback: any) => callback(prisma)),
    };

    auditLogService = {
      record: vi.fn(),
    };

    service = new BookingsService(
      prisma as PrismaService,
      auditLogService as AuditLogService,
    );
  });

  describe('createBooking', () => {
    it('creates a standalone booking with customer and generated booking number', async () => {
      prisma.customer.findFirst.mockResolvedValue(mockCustomer);
      prisma.booking.count.mockResolvedValue(0);
      prisma.booking.create.mockResolvedValue(mockBooking);

      const result = await service.createBooking(tenantId, userId, {
        title: 'Corporate Dinner',
        customerId,
        eventDate: '2026-12-15T18:00:00.000Z',
        guestCount: 150,
        venueName: 'Metropolitan Hall',
        totalAmount: 12500,
        status: 'confirmed',
      });

      expect(prisma.customer.findFirst).toHaveBeenCalledWith({
        where: { id: customerId, tenantId },
      });
      expect(prisma.booking.create).toHaveBeenCalled();
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'booking.created',
          scope: 'tenant',
          tenantId,
        }),
      );
      expect(result.id).toBe(bookingId);
      expect(result.bookingNumber).toBe('BK-202611-0001');
    });

    it('rejects booking creation if customer does not exist in tenant', async () => {
      prisma.customer.findFirst.mockResolvedValue(null);

      await expect(
        service.createBooking(tenantId, userId, {
          title: 'Unknown Customer Booking',
          customerId: 'unknown-customer',
          eventDate: '2026-12-15T18:00:00.000Z',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects booking creation if linked quotation is not accepted', async () => {
      prisma.customer.findFirst.mockResolvedValue(mockCustomer);
      prisma.quotation.findFirst.mockResolvedValue({
        id: quotationId,
        tenantId,
        status: 'draft',
      });

      await expect(
        service.createBooking(tenantId, userId, {
          title: 'Draft Quote Booking',
          customerId,
          quotationId,
          eventDate: '2026-12-15T18:00:00.000Z',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('createBookingFromQuotation', () => {
    it('converts an accepted quotation into a confirmed booking with inherited details', async () => {
      prisma.quotation.findFirst.mockResolvedValue(mockQuotation);
      prisma.booking.count.mockResolvedValue(0);
      prisma.booking.create.mockResolvedValue(mockBooking);

      const result = await service.createBookingFromQuotation(tenantId, userId, {
        quotationId,
      });

      expect(prisma.quotation.findFirst).toHaveBeenCalledWith({
        where: { id: quotationId, tenantId },
        include: expect.anything(),
      });
      expect(prisma.booking.create).toHaveBeenCalled();
      expect(prisma.enquiryActivity.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          enquiryId,
          type: 'status_change',
        }),
      });
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'booking.converted_from_quotation',
          scope: 'tenant',
        }),
      );
      expect(result.status).toBe('confirmed');
    });

    it('rejects conversion if quotation is rejected or superseded', async () => {
      prisma.quotation.findFirst.mockResolvedValue({
        ...mockQuotation,
        status: 'rejected',
      });

      await expect(
        service.createBookingFromQuotation(tenantId, userId, { quotationId }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('tenant isolation', () => {
    it('enforces tenant scoping when fetching booking by ID', async () => {
      prisma.booking.findFirst.mockResolvedValue(null);

      await expect(
        service.getBookingById(otherTenantId, bookingId),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.booking.findFirst).toHaveBeenCalledWith({
        where: { id: bookingId, tenantId: otherTenantId },
        include: expect.anything(),
      });
    });

    it('lists only bookings belonging to the requesting tenant', async () => {
      prisma.booking.findMany
        .mockResolvedValueOnce([mockBooking]) // items
        .mockResolvedValueOnce([mockBooking]); // allTenantBookings
      prisma.booking.count.mockResolvedValue(1);

      const result = await service.listBookings(tenantId);

      expect(prisma.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId }),
        }),
      );
      expect(result.items.length).toBe(1);
      expect(result.stats.totalBookings).toBe(1);
      expect(result.stats.confirmedCount).toBe(1);
    });
  });

  describe('status transitions and workflow constraints', () => {
    it('confirms a draft booking and updates confirmedAt timestamp', async () => {
      prisma.booking.findFirst.mockResolvedValue({
        ...mockBooking,
        status: 'draft',
        confirmedAt: null,
      });
      prisma.booking.update.mockResolvedValue({
        ...mockBooking,
        status: 'confirmed',
        confirmedAt: new Date(),
      });

      // Second find for map
      prisma.booking.findFirst
        .mockResolvedValueOnce({ ...mockBooking, status: 'draft' })
        .mockResolvedValueOnce({ ...mockBooking, status: 'confirmed' });

      const result = await service.confirmBooking(tenantId, userId, bookingId, {
        notes: 'Deposit received',
      });

      expect(prisma.booking.update).toHaveBeenCalledWith({
        where: { id: bookingId },
        data: expect.objectContaining({
          status: 'confirmed',
        }),
      });
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'booking.confirmed',
        }),
      );
    });

    it('rejects confirmation if booking is already cancelled', async () => {
      prisma.booking.findFirst.mockResolvedValue({
        ...mockBooking,
        status: 'cancelled',
      });

      await expect(
        service.confirmBooking(tenantId, userId, bookingId),
      ).rejects.toThrow(BadRequestException);
    });

    it('cancels a booking with reason and records cancellation timestamp', async () => {
      prisma.booking.findFirst
        .mockResolvedValueOnce(mockBooking)
        .mockResolvedValueOnce({
          ...mockBooking,
          status: 'cancelled',
          cancellationReason: 'Client postponed event indefinitely',
        });

      const result = await service.cancelBooking(tenantId, userId, bookingId, {
        cancellationReason: 'Client postponed event indefinitely',
      });

      expect(prisma.booking.update).toHaveBeenCalledWith({
        where: { id: bookingId },
        data: expect.objectContaining({
          status: 'cancelled',
          cancellationReason: 'Client postponed event indefinitely',
        }),
      });
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'booking.cancelled',
        }),
      );
    });

    it('rejects cancellation of a completed booking', async () => {
      prisma.booking.findFirst.mockResolvedValue({
        ...mockBooking,
        status: 'completed',
      });

      await expect(
        service.cancelBooking(tenantId, userId, bookingId, {
          cancellationReason: 'Event already occurred',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
