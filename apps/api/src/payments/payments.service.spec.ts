import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { AuditLogService } from '../tenancy/audit-log.service.js';
import { PaymentsService } from './payments.service.js';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prisma: any;
  let auditLogService: any;

  const tenantId = '00000000-0000-0000-0000-000000000001';
  const customerId = '11111111-1111-1111-1111-111111111111';
  const invoiceId = '22222222-2222-2222-2222-222222222222';
  const paymentId = '33333333-3333-3333-3333-333333333333';
  const userId = '44444444-4444-4444-4444-444444444444';

  beforeEach(() => {
    prisma = {
      tenantSettings: {
        findUnique: vi.fn().mockResolvedValue({ currencyCode: 'INR' }),
      },
      customer: {
        findFirst: vi.fn().mockResolvedValue({
          id: customerId,
          tenantId,
          name: 'Acme Corp',
          email: 'acme@example.com',
        }),
      },
      invoice: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        findUniqueOrThrow: vi.fn(),
        update: vi.fn(),
      },
      payment: {
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
        findUniqueOrThrow: vi.fn(),
        update: vi.fn(),
      },
      paymentAllocation: {
        create: vi.fn(),
        delete: vi.fn(),
        deleteMany: vi.fn(),
        findFirst: vi.fn(),
      },
      invoicePayment: {
        create: vi.fn(),
      },
      $transaction: vi.fn().mockImplementation(async (cb: any) => cb(prisma)),
    };

    auditLogService = {
      record: vi.fn(),
    };

    service = new PaymentsService(
      prisma as PrismaService,
      auditLogService as AuditLogService,
    );
  });

  describe('createPayment', () => {
    it('creates an unallocated payment when no allocations are provided', async () => {
      prisma.payment.create.mockResolvedValue({
        id: paymentId,
        tenantId,
        paymentNumber: 'PAY-202611-0001',
        customerId,
        amount: 5000,
        currency: 'INR',
        paymentDate: new Date('2026-11-12'),
        paymentMethod: 'bank_transfer',
        status: 'unallocated',
        reference: 'TXN123',
        notes: 'Advance deposit',
        recordedBy: userId,
        allocatedAmount: 0,
        unallocatedAmount: 5000,
        voidedAt: null,
        voidReason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      prisma.payment.findUniqueOrThrow.mockResolvedValue({
        id: paymentId,
        tenantId,
        paymentNumber: 'PAY-202611-0001',
        customerId,
        customer: { name: 'Acme Corp', email: 'acme@example.com' },
        amount: 5000,
        currency: 'INR',
        paymentDate: new Date('2026-11-12'),
        paymentMethod: 'bank_transfer',
        status: 'unallocated',
        reference: 'TXN123',
        notes: 'Advance deposit',
        recordedBy: userId,
        allocatedAmount: 0,
        unallocatedAmount: 5000,
        voidedAt: null,
        voidReason: null,
        allocations: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await service.createPayment(tenantId, userId, {
        customerId,
        amount: 5000,
        paymentDate: '2026-11-12',
        paymentMethod: 'bank_transfer',
        reference: 'TXN123',
        notes: 'Advance deposit',
      });

      expect(res.paymentNumber).toContain('PAY-');
      expect(res.amount).toBe(5000);
      expect(res.allocatedAmount).toBe(0);
      expect(res.unallocatedAmount).toBe(5000);
      expect(res.status).toBe('unallocated');
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'payment.created',
          scope: 'tenant',
          tenantId,
        }),
      );
    });

    it('creates a fully allocated payment and updates invoice balance due', async () => {
      prisma.invoice.findFirst.mockResolvedValue({
        id: invoiceId,
        tenantId,
        customerId,
        invoiceNumber: 'INV-202611-0001',
        status: 'issued',
        totalAmount: 1000,
        paidAmount: 0,
        balanceDue: 1000,
      });

      prisma.invoice.findUniqueOrThrow.mockResolvedValue({
        id: invoiceId,
        tenantId,
        customerId,
        invoiceNumber: 'INV-202611-0001',
        status: 'issued',
        totalAmount: 1000,
        paidAmount: 0,
        balanceDue: 1000,
      });

      prisma.payment.create.mockResolvedValue({
        id: paymentId,
        tenantId,
      });

      prisma.payment.findUniqueOrThrow.mockResolvedValue({
        id: paymentId,
        tenantId,
        paymentNumber: 'PAY-202611-0002',
        customerId,
        customer: { name: 'Acme Corp', email: 'acme@example.com' },
        amount: 1000,
        currency: 'INR',
        paymentDate: new Date('2026-11-12'),
        paymentMethod: 'bank_transfer',
        status: 'allocated',
        reference: 'TXN-FULL',
        notes: null,
        recordedBy: userId,
        allocatedAmount: 1000,
        unallocatedAmount: 0,
        voidedAt: null,
        voidReason: null,
        allocations: [
          {
            id: 'alloc-1',
            tenantId,
            paymentId,
            invoiceId,
            amount: 1000,
            notes: null,
            createdAt: new Date(),
            invoice: {
              id: invoiceId,
              invoiceNumber: 'INV-202611-0001',
              title: 'Catering Service',
              totalAmount: 1000,
              balanceDue: 0,
              status: 'paid',
            },
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await service.createPayment(tenantId, userId, {
        customerId,
        amount: 1000,
        paymentDate: '2026-11-12',
        paymentMethod: 'bank_transfer',
        allocations: [{ invoiceId, amount: 1000 }],
      });

      expect(res.status).toBe('allocated');
      expect(res.allocatedAmount).toBe(1000);
      expect(res.unallocatedAmount).toBe(0);
      expect(prisma.invoice.update).toHaveBeenCalledWith({
        where: { id: invoiceId },
        data: expect.objectContaining({
          paidAmount: 1000,
          balanceDue: 0,
          status: 'paid',
        }),
      });
    });

    it('rejects allocation when allocation amount exceeds invoice balance due', async () => {
      prisma.invoice.findFirst.mockResolvedValue({
        id: invoiceId,
        tenantId,
        customerId,
        invoiceNumber: 'INV-202611-0001',
        status: 'issued',
        totalAmount: 1000,
        paidAmount: 800,
        balanceDue: 200,
      });

      await expect(
        service.createPayment(tenantId, userId, {
          customerId,
          amount: 500,
          paymentDate: '2026-11-12',
          paymentMethod: 'bank_transfer',
          allocations: [{ invoiceId, amount: 300 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects allocation when total allocated exceeds payment amount', async () => {
      prisma.invoice.findFirst.mockResolvedValue({
        id: invoiceId,
        tenantId,
        customerId,
        invoiceNumber: 'INV-202611-0001',
        status: 'issued',
        totalAmount: 2000,
        paidAmount: 0,
        balanceDue: 2000,
      });

      await expect(
        service.createPayment(tenantId, userId, {
          customerId,
          amount: 500,
          paymentDate: '2026-11-12',
          paymentMethod: 'bank_transfer',
          allocations: [{ invoiceId, amount: 700 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects allocation to draft invoice', async () => {
      prisma.invoice.findFirst.mockResolvedValue({
        id: invoiceId,
        tenantId,
        customerId,
        invoiceNumber: 'INV-202611-0001',
        status: 'draft',
        totalAmount: 1000,
        paidAmount: 0,
        balanceDue: 1000,
      });

      await expect(
        service.createPayment(tenantId, userId, {
          customerId,
          amount: 500,
          paymentDate: '2026-11-12',
          paymentMethod: 'bank_transfer',
          allocations: [{ invoiceId, amount: 500 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('allocatePayment', () => {
    it('allocates unallocated payment funds to an outstanding invoice', async () => {
      prisma.payment.findFirst.mockResolvedValue({
        id: paymentId,
        tenantId,
        customerId,
        paymentNumber: 'PAY-202611-0001',
        amount: 2000,
        allocatedAmount: 500,
        unallocatedAmount: 1500,
        status: 'partially_allocated',
        paymentDate: new Date(),
        paymentMethod: 'bank_transfer',
        reference: 'REF1',
        allocations: [],
      });

      prisma.invoice.findFirst.mockResolvedValue({
        id: invoiceId,
        tenantId,
        customerId,
        invoiceNumber: 'INV-202611-0001',
        status: 'issued',
        totalAmount: 1000,
        paidAmount: 0,
        balanceDue: 1000,
      });

      prisma.invoice.findUniqueOrThrow.mockResolvedValue({
        id: invoiceId,
        tenantId,
        customerId,
        invoiceNumber: 'INV-202611-0001',
        status: 'issued',
        totalAmount: 1000,
        paidAmount: 0,
        balanceDue: 1000,
      });

      prisma.payment.findUniqueOrThrow.mockResolvedValue({
        id: paymentId,
        tenantId,
        paymentNumber: 'PAY-202611-0001',
        customerId,
        customer: { name: 'Acme Corp' },
        amount: 2000,
        currency: 'INR',
        paymentDate: new Date(),
        paymentMethod: 'bank_transfer',
        status: 'partially_allocated',
        reference: 'REF1',
        notes: null,
        recordedBy: userId,
        allocatedAmount: 1500,
        unallocatedAmount: 500,
        voidedAt: null,
        voidReason: null,
        allocations: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await service.allocatePayment(tenantId, userId, paymentId, {
        allocations: [{ invoiceId, amount: 1000 }],
      });

      expect(res.allocatedAmount).toBe(1500);
      expect(prisma.paymentAllocation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            paymentId,
            invoiceId,
            amount: 1000,
          }),
        }),
      );
      expect(prisma.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: invoiceId },
          data: expect.objectContaining({
            paidAmount: 1000,
            balanceDue: 0,
            status: 'paid',
          }),
        }),
      );
    });

    it('rejects allocation when allocation exceeds unallocated balance of payment', async () => {
      prisma.payment.findFirst.mockResolvedValue({
        id: paymentId,
        tenantId,
        customerId,
        paymentNumber: 'PAY-202611-0001',
        amount: 2000,
        allocatedAmount: 1800,
        unallocatedAmount: 200,
        status: 'partially_allocated',
        allocations: [],
      });

      prisma.invoice.findFirst.mockResolvedValue({
        id: invoiceId,
        tenantId,
        customerId,
        invoiceNumber: 'INV-202611-0001',
        status: 'issued',
        totalAmount: 1000,
        paidAmount: 0,
        balanceDue: 1000,
      });

      await expect(
        service.allocatePayment(tenantId, userId, paymentId, {
          allocations: [{ invoiceId, amount: 500 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deallocatePayment', () => {
    it('removes allocation, restores invoice balance and increases unallocated amount', async () => {
      const allocationId = 'alloc-123';

      prisma.payment.findFirst.mockResolvedValue({
        id: paymentId,
        tenantId,
        amount: 1000,
        allocatedAmount: 1000,
        unallocatedAmount: 0,
        status: 'allocated',
      });

      prisma.paymentAllocation.findFirst.mockResolvedValue({
        id: allocationId,
        paymentId,
        tenantId,
        invoiceId,
        amount: 600,
      });

      prisma.invoice.findUnique.mockResolvedValue({
        id: invoiceId,
        totalAmount: 1000,
        paidAmount: 600,
        balanceDue: 400,
        status: 'partially_paid',
      });

      prisma.payment.findUniqueOrThrow.mockResolvedValue({
        id: paymentId,
        tenantId,
        paymentNumber: 'PAY-202611-0001',
        customerId,
        customer: { name: 'Acme Corp' },
        amount: 1000,
        currency: 'INR',
        paymentDate: new Date(),
        paymentMethod: 'bank_transfer',
        status: 'partially_allocated',
        reference: null,
        notes: null,
        recordedBy: userId,
        allocatedAmount: 400,
        unallocatedAmount: 600,
        voidedAt: null,
        voidReason: null,
        allocations: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await service.deallocatePayment(
        tenantId,
        userId,
        paymentId,
        allocationId,
      );

      expect(prisma.paymentAllocation.delete).toHaveBeenCalledWith({
        where: { id: allocationId },
      });
      expect(prisma.invoice.update).toHaveBeenCalledWith({
        where: { id: invoiceId },
        data: expect.objectContaining({
          paidAmount: 0,
          balanceDue: 1000,
          status: 'issued',
        }),
      });
      expect(res.allocatedAmount).toBe(400);
      expect(res.unallocatedAmount).toBe(600);
    });
  });

  describe('voidPayment', () => {
    it('voids a payment, reverses all allocations and updates invoice balances', async () => {
      prisma.payment.findFirst.mockResolvedValue({
        id: paymentId,
        tenantId,
        amount: 1000,
        allocatedAmount: 1000,
        unallocatedAmount: 0,
        status: 'allocated',
        allocations: [
          {
            id: 'alloc-1',
            invoiceId,
            amount: 1000,
          },
        ],
      });

      prisma.invoice.findUnique.mockResolvedValue({
        id: invoiceId,
        totalAmount: 1000,
        paidAmount: 1000,
        balanceDue: 0,
        status: 'paid',
      });

      prisma.payment.update.mockResolvedValue({
        id: paymentId,
        tenantId,
        paymentNumber: 'PAY-202611-0001',
        customerId,
        customer: { name: 'Acme Corp' },
        amount: 1000,
        currency: 'INR',
        paymentDate: new Date(),
        paymentMethod: 'bank_transfer',
        status: 'void',
        reference: null,
        notes: null,
        recordedBy: userId,
        allocatedAmount: 0,
        unallocatedAmount: 0,
        voidedAt: new Date(),
        voidReason: 'Cheque bounced',
        allocations: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await service.voidPayment(tenantId, userId, paymentId, {
        voidReason: 'Cheque bounced',
      });

      expect(res.status).toBe('void');
      expect(prisma.invoice.update).toHaveBeenCalledWith({
        where: { id: invoiceId },
        data: expect.objectContaining({
          paidAmount: 0,
          balanceDue: 1000,
          status: 'issued',
        }),
      });
      expect(prisma.paymentAllocation.deleteMany).toHaveBeenCalledWith({
        where: { paymentId },
      });
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'payment.voided',
          tenantId,
        }),
      );
    });

    it('rejects voiding an already voided payment', async () => {
      prisma.payment.findFirst.mockResolvedValue({
        id: paymentId,
        tenantId,
        status: 'void',
        allocations: [],
      });

      await expect(
        service.voidPayment(tenantId, userId, paymentId, {
          voidReason: 'Already voided',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getPaymentStats', () => {
    it('aggregates total received, allocated and unallocated metrics', async () => {
      prisma.payment.findMany.mockResolvedValue([
        { amount: 5000, allocatedAmount: 3000, unallocatedAmount: 2000 },
        { amount: 1500, allocatedAmount: 1500, unallocatedAmount: 0 },
      ]);
      prisma.payment.count
        .mockResolvedValueOnce(1) // unallocatedPaymentsCount
        .mockResolvedValueOnce(2); // totalCount

      const stats = await service.getPaymentStats(tenantId);

      expect(stats.totalReceived).toBe(6500);
      expect(stats.totalAllocated).toBe(4500);
      expect(stats.totalUnallocated).toBe(2000);
      expect(stats.currency).toBe('INR');
      expect(stats.unallocatedPaymentsCount).toBe(1);
      expect(stats.totalPayments).toBe(2);
    });
  });
});
