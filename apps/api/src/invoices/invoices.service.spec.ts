import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InvoicesService } from './invoices.service.js';

describe('InvoicesService', () => {
  let service: InvoicesService;
  let prisma: any;
  let auditLogService: any;

  const tenantId = '00000000-0000-0000-0000-000000000001';
  const customerId = '22222222-2222-2222-2222-222222222222';
  const bookingId = '55555555-5555-5555-5555-555555555555';
  const invoiceId = '66666666-6666-6666-6666-666666666666';

  const mockCustomer = {
    id: customerId,
    tenantId,
    name: 'Acme Corporation',
    email: 'events@acme.com',
    phone: '+1 555-0100',
    address: '123 Market St',
  };

  const mockBooking = {
    id: bookingId,
    tenantId,
    bookingNumber: 'BK-202611-0001',
    title: 'Acme Corporate Dinner',
    currency: 'INR',
    customerId,
    totalAmount: 15000,
    eventDate: new Date('2026-12-15'),
    customer: mockCustomer,
    enquiryId: 'enq-1',
    quotation: {
      revisions: [
        {
          status: 'accepted',
          items: [
            {
              description: 'Buffet Service (100 guests)',
              quantity: 100,
              unitPrice: 150,
              sortOrder: 0,
            },
          ],
        },
      ],
    },
  };

  const mockInvoice = {
    id: invoiceId,
    tenantId,
    invoiceNumber: 'INV-202611-0001',
    status: 'draft',
    customerId,
    customer: mockCustomer,
    bookingId,
    booking: {
      id: bookingId,
      bookingNumber: 'BK-202611-0001',
      title: 'Acme Corporate Dinner',
      eventDate: new Date('2026-12-15'),
    },
    title: 'Invoice for Acme Corporate Dinner',
    issueDate: new Date('2026-11-12'),
    dueDate: new Date('2026-11-26'),
    currency: 'INR',
    subtotal: 15000,
    taxRate: 18,
    taxAmount: 2700,
    discountAmount: 0,
    totalAmount: 17700,
    paidAmount: 0,
    balanceDue: 17700,
    notes: null,
    terms: null,
    issuedAt: null,
    voidedAt: null,
    voidReason: null,
    lineItems: [
      {
        id: 'li-1',
        invoiceId,
        description: 'Buffet Service (100 guests)',
        quantity: 100,
        unitPrice: 150,
        totalAmount: 15000,
        notes: null,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    payments: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    prisma = {
      invoice: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      invoiceLineItem: {
        deleteMany: vi.fn(),
        createMany: vi.fn(),
      },
      invoicePayment: {
        create: vi.fn(),
      },
      payment: {
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn().mockResolvedValue({ id: 'pay-1' }),
      },
      paymentAllocation: {
        create: vi.fn(),
      },
      customer: {
        findFirst: vi.fn(),
      },
      booking: {
        findFirst: vi.fn(),
      },
      tenantSettings: {
        findUnique: vi.fn().mockResolvedValue({ currencyCode: 'INR' }),
      },
      enquiryActivity: {
        create: vi.fn(),
      },
      $transaction: vi.fn((cb: any) => cb(prisma)),
    };

    auditLogService = {
      record: vi.fn(),
    };

    service = new InvoicesService(prisma, auditLogService);
  });

  describe('listInvoices', () => {
    it('should list invoices and calculate summary stats in tenant currency', async () => {
      prisma.invoice.findMany
        .mockResolvedValueOnce([mockInvoice]) // paginated list
        .mockResolvedValueOnce([
          {
            status: 'draft',
            totalAmount: 17700,
            paidAmount: 0,
            balanceDue: 17700,
            dueDate: new Date('2026-11-26'),
          },
          {
            status: 'paid',
            totalAmount: 5000,
            paidAmount: 5000,
            balanceDue: 0,
            dueDate: new Date('2026-11-01'),
          },
        ]);
      prisma.invoice.count.mockResolvedValue(1);

      const result = await service.listInvoices(tenantId);
      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.invoiceNumber).toBe('INV-202611-0001');
      expect(result.items[0]?.currency).toBe('INR');
      expect(result.stats.totalInvoiced).toBe(22700);
      expect(result.stats.totalPaid).toBe(5000);
      expect(result.stats.draftCount).toBe(1);
      expect(result.stats.paidCount).toBe(1);
    });
  });

  describe('getInvoice', () => {
    it('should return invoice details when found', async () => {
      prisma.invoice.findFirst.mockResolvedValue(mockInvoice);

      const result = await service.getInvoice(tenantId, invoiceId);
      expect(result.id).toBe(invoiceId);
      expect(result.currency).toBe('INR');
      expect(result.lineItems).toHaveLength(1);
    });

    it('should throw NotFoundException if invoice does not exist', async () => {
      prisma.invoice.findFirst.mockResolvedValue(null);

      await expect(service.getInvoice(tenantId, 'non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createInvoice', () => {
    it('should create a draft invoice with calculated totals and tenant currency', async () => {
      prisma.customer.findFirst.mockResolvedValue(mockCustomer);
      prisma.invoice.count.mockResolvedValue(0);
      prisma.invoice.create.mockResolvedValue({
        ...mockInvoice,
        invoiceNumber: 'INV-202611-0001',
      });

      const result = await service.createInvoice(tenantId, 'user-1', {
        customerId,
        title: 'Draft Invoice',
        issueDate: '2026-11-12',
        dueDate: '2026-11-26',
        taxRate: 18,
        discountAmount: 0,
        lineItems: [
          {
            description: 'Item 1',
            quantity: 2,
            unitPrice: 500,
            sortOrder: 0,
          },
        ],
      });

      expect(result.invoiceNumber).toBe('INV-202611-0001');
      expect(prisma.invoice.create).toHaveBeenCalled();
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'invoice.created',
        }),
      );
    });
  });

  describe('createInvoiceFromBooking', () => {
    it('should generate an invoice from booking with line items from accepted quotation', async () => {
      prisma.booking.findFirst.mockResolvedValue(mockBooking);
      prisma.invoice.count.mockResolvedValue(2);
      prisma.invoice.create.mockResolvedValue({
        ...mockInvoice,
        bookingId,
      });

      const result = await service.createInvoiceFromBooking(tenantId, 'user-1', {
        bookingId,
        taxRate: 18,
        discountAmount: 0,
      });

      expect(result.bookingId).toBe(bookingId);
      expect(prisma.invoice.create).toHaveBeenCalled();
      expect(prisma.enquiryActivity.create).toHaveBeenCalled();
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'invoice.created_from_booking',
        }),
      );
    });
  });

  describe('issueInvoice', () => {
    it('should transition a draft invoice to issued', async () => {
      prisma.invoice.findFirst.mockResolvedValue(mockInvoice);
      prisma.invoice.update.mockResolvedValue({
        ...mockInvoice,
        status: 'issued',
        issuedAt: new Date(),
      });

      const result = await service.issueInvoice(tenantId, 'user-1', invoiceId);
      expect(result.status).toBe('issued');
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'invoice.issued',
        }),
      );
    });

    it('should throw error when trying to issue a non-draft invoice', async () => {
      prisma.invoice.findFirst.mockResolvedValue({
        ...mockInvoice,
        status: 'paid',
      });

      await expect(service.issueInvoice(tenantId, 'user-1', invoiceId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('recordPayment', () => {
    it('should record partial payment and transition status to partially_paid', async () => {
      prisma.invoice.findFirst.mockResolvedValue({
        ...mockInvoice,
        status: 'issued',
        totalAmount: 1000,
        paidAmount: 0,
        balanceDue: 1000,
      });
      prisma.invoice.update.mockResolvedValue({
        ...mockInvoice,
        status: 'partially_paid',
        totalAmount: 1000,
        paidAmount: 400,
        balanceDue: 600,
      });

      const result = await service.recordPayment(tenantId, 'user-1', invoiceId, {
        amount: 400,
        paymentDate: '2026-11-12',
        paymentMethod: 'bank_transfer',
      });

      expect(result.status).toBe('partially_paid');
      expect(result.paidAmount).toBe(400);
      expect(result.balanceDue).toBe(600);
      expect(prisma.invoicePayment.create).toHaveBeenCalled();
    });

    it('should transition to paid when payment covers balance in full', async () => {
      prisma.invoice.findFirst.mockResolvedValue({
        ...mockInvoice,
        status: 'issued',
        totalAmount: 1000,
        paidAmount: 0,
        balanceDue: 1000,
      });
      prisma.invoice.update.mockResolvedValue({
        ...mockInvoice,
        status: 'paid',
        totalAmount: 1000,
        paidAmount: 1000,
        balanceDue: 0,
      });

      const result = await service.recordPayment(tenantId, 'user-1', invoiceId, {
        amount: 1000,
        paymentDate: '2026-11-12',
        paymentMethod: 'credit_card',
      });

      expect(result.status).toBe('paid');
      expect(result.balanceDue).toBe(0);
    });
  });

  describe('voidInvoice', () => {
    it('should void invoice when no payments exist', async () => {
      prisma.invoice.findFirst.mockResolvedValue({
        ...mockInvoice,
        status: 'issued',
        paidAmount: 0,
      });
      prisma.invoice.update.mockResolvedValue({
        ...mockInvoice,
        status: 'void',
        voidReason: 'Client cancelled event',
        voidedAt: new Date(),
      });

      const result = await service.voidInvoice(tenantId, 'user-1', invoiceId, {
        voidReason: 'Client cancelled event',
      });

      expect(result.status).toBe('void');
      expect(result.voidReason).toBe('Client cancelled event');
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'invoice.voided',
        }),
      );
    });

    it('should throw BadRequestException if trying to void an invoice with payments', async () => {
      prisma.invoice.findFirst.mockResolvedValue({
        ...mockInvoice,
        status: 'partially_paid',
        paidAmount: 500,
      });

      await expect(
        service.voidInvoice(tenantId, 'user-1', invoiceId, {
          voidReason: 'Cancelled',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
