import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { AuditLogService } from '../tenancy/audit-log.service.js';
import type { InvoicesService } from '../invoices/invoices.service.js';
import { DailyMealOrdersService } from './daily-meal-orders.service.js';

describe('DailyMealOrdersService', () => {
  let service: DailyMealOrdersService;
  let prisma: any;
  let auditLogService: any;
  let invoicesService: any;

  const tenantId = '00000000-0000-0000-0000-000000000001';
  const customerId = '11111111-1111-1111-1111-111111111111';
  const orderId = '22222222-2222-2222-2222-222222222222';
  const planId = '33333333-3333-3333-3333-333333333333';
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
          name: 'Apex Corp',
          email: 'apex@example.test',
          address: '42 Tech Park',
        }),
      },
      menu: {
        findFirst: vi.fn().mockResolvedValue({
          id: '55555555-5555-5555-5555-555555555555',
          name: 'Executive Bento Lunch Menu',
        }),
      },
      dailyMealOrder: {
        count: vi.fn().mockResolvedValue(0),
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      dailyMealOrderLine: {
        deleteMany: vi.fn(),
        createMany: vi.fn(),
      },
      dailyMealPlan: {
        count: vi.fn().mockResolvedValue(0),
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      $transaction: vi.fn().mockImplementation(async (cb: any) => cb(prisma)),
    };

    auditLogService = {
      record: vi.fn(),
    };

    invoicesService = {
      createInvoiceFromDailyMealOrder: vi.fn().mockResolvedValue({
        id: 'inv-1',
        invoiceNumber: 'INV-202611-0001',
      }),
    };

    service = new DailyMealOrdersService(
      prisma as PrismaService,
      auditLogService as AuditLogService,
      invoicesService as InvoicesService,
    );
  });

  describe('createOrder', () => {
    it('creates a daily meal order with calculated totals, sequential number, and tenant database currency', async () => {
      prisma.dailyMealOrder.create.mockResolvedValue({
        id: orderId,
        tenantId,
        orderNumber: 'DMO-202611-0001',
        status: 'draft',
        customerId,
        serviceDate: new Date('2026-11-20T12:00:00Z'),
        serviceSlot: 'lunch',
        deliveryAddress: '42 Tech Park',
        currency: 'INR',
        subtotal: 3600,
        taxRate: 5,
        taxAmount: 180,
        discountAmount: 0,
        totalAmount: 3780,
        totalQuantity: 20,
        lines: [
          {
            id: 'line-1',
            orderId,
            name: 'Executive Lunch Box',
            quantity: 20,
            unitPrice: 180,
            totalAmount: 3600,
            sortOrder: 0,
          },
        ],
        customer: { id: customerId, name: 'Apex Corp' },
        invoices: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.createOrder(tenantId, userId, {
        customerId,
        serviceDate: '2026-11-20',
        serviceSlot: 'lunch',
        taxRate: 5,
        discountAmount: 0,
        lines: [
          {
            name: 'Executive Lunch Box',
            quantity: 20,
            unitPrice: 180,
          },
        ],
      });

      expect(result.orderNumber).toBe('DMO-202611-0001');
      expect(result.currency).toBe('INR');
      expect(result.totalAmount).toBe(3780);
      expect(result.totalQuantity).toBe(20);
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'daily_meal_order.created',
          scope: 'tenant',
        }),
      );
    });

    it('throws BadRequestException when customer is not found', async () => {
      prisma.customer.findFirst.mockResolvedValue(null);

      await expect(
        service.createOrder(tenantId, userId, {
          customerId: 'invalid-id',
          serviceDate: '2026-11-20',
          serviceSlot: 'lunch',
          taxRate: 0,
          discountAmount: 0,
          lines: [{ name: 'Box', quantity: 1, unitPrice: 100 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateOrderStatus', () => {
    it('transitions order status and logs audit entry', async () => {
      prisma.dailyMealOrder.findFirst.mockResolvedValue({
        id: orderId,
        tenantId,
        orderNumber: 'DMO-202611-0001',
        status: 'draft',
      });

      prisma.dailyMealOrder.update.mockResolvedValue({
        id: orderId,
        tenantId,
        orderNumber: 'DMO-202611-0001',
        status: 'confirmed',
        customerId,
        serviceDate: new Date('2026-11-20T12:00:00Z'),
        serviceSlot: 'lunch',
        currency: 'INR',
        subtotal: 1800,
        taxRate: 0,
        taxAmount: 0,
        discountAmount: 0,
        totalAmount: 1800,
        totalQuantity: 10,
        customer: { id: customerId, name: 'Apex Corp' },
        lines: [],
        invoices: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.updateOrderStatus(tenantId, userId, orderId, {
        status: 'confirmed',
        notes: 'Confirmed by corporate catering manager',
      });

      expect(result.status).toBe('confirmed');
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'daily_meal_order.status_updated',
          metadata: expect.objectContaining({
            previousStatus: 'draft',
            newStatus: 'confirmed',
          }),
        }),
      );
    });
  });

  describe('getOrderStats', () => {
    it('correctly calculates order volume, portion counts, and slot distributions', async () => {
      prisma.dailyMealOrder.findMany.mockResolvedValue([
        {
          id: '1',
          status: 'confirmed',
          serviceSlot: 'lunch',
          totalQuantity: 30,
          totalAmount: 5400,
        },
        {
          id: '2',
          status: 'in_preparation',
          serviceSlot: 'lunch',
          totalQuantity: 20,
          totalAmount: 3600,
        },
        {
          id: '3',
          status: 'dispatched',
          serviceSlot: 'morning_tea',
          totalQuantity: 15,
          totalAmount: 2250,
        },
      ]);

      const stats = await service.getOrderStats(tenantId, '2026-11-20');

      expect(stats.totalOrders).toBe(3);
      expect(stats.totalQuantity).toBe(65);
      expect(stats.totalRevenue).toBe(11250);
      expect(stats.confirmedCount).toBe(1);
      expect(stats.inPreparationCount).toBe(1);
      expect(stats.dispatchedCount).toBe(1);
      expect(stats.currency).toBe('INR');

      const lunchSlot = stats.bySlot.find((s) => s.slot === 'lunch');
      expect(lunchSlot?.orderCount).toBe(2);
      expect(lunchSlot?.totalQuantity).toBe(50);
      expect(lunchSlot?.totalAmount).toBe(9000);
    });
  });

  describe('createPlan & generateOrdersFromPlan', () => {
    it('creates recurring meal plan with DMP sequential number', async () => {
      prisma.dailyMealPlan.create.mockResolvedValue({
        id: planId,
        tenantId,
        planNumber: 'DMP-202611-0001',
        name: 'Apex Weekday Lunch Plan',
        status: 'active',
        customerId,
        serviceSlot: 'lunch',
        daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        startDate: new Date('2026-11-01T00:00:00Z'),
        defaultQuantity: 40,
        defaultUnitPrice: 180,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      prisma.dailyMealPlan.findFirst.mockResolvedValue({
        id: planId,
        tenantId,
        planNumber: 'DMP-202611-0001',
        name: 'Apex Weekday Lunch Plan',
        status: 'active',
        customerId,
        serviceSlot: 'lunch',
        daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        startDate: new Date('2026-11-01T00:00:00Z'),
        defaultQuantity: 40,
        defaultUnitPrice: 180,
        customer: { id: customerId, name: 'Apex Corp' },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const plan = await service.createPlan(tenantId, userId, {
        customerId,
        name: 'Apex Weekday Lunch Plan',
        serviceSlot: 'lunch',
        daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        startDate: '2026-11-01',
        defaultQuantity: 40,
        defaultUnitPrice: 180,
      });

      expect(plan.planNumber).toBe('DMP-202611-0001');
      expect(plan.status).toBe('active');
    });

    it('batch generates orders for matching days of the week', async () => {
      prisma.dailyMealPlan.findFirst.mockResolvedValue({
        id: planId,
        tenantId,
        planNumber: 'DMP-202611-0001',
        name: 'Apex Weekday Lunch Plan',
        status: 'active',
        customerId,
        serviceSlot: 'lunch',
        daysOfWeek: ['monday', 'wednesday', 'friday'],
        startDate: new Date('2026-11-01T00:00:00Z'),
        defaultQuantity: 40,
        defaultUnitPrice: 180,
      });

      prisma.dailyMealOrder.findFirst.mockResolvedValue(null);
      prisma.dailyMealOrder.create.mockResolvedValue({
        orderNumber: 'DMO-202611-0010',
      });

      // 2026-11-16 (Mon) to 2026-11-20 (Fri) has Mon, Tue, Wed, Thu, Fri
      // Matching days: Mon (16), Wed (18), Fri (20) -> 3 orders
      const result = await service.generateOrdersFromPlan(tenantId, userId, planId, {
        fromDate: '2026-11-16',
        toDate: '2026-11-20',
        overwriteExisting: false,
      });

      expect(result.generatedCount).toBe(3);
      expect(result.createdOrderNumbers.length).toBe(3);
    });

    it('rejects order generation for paused plan', async () => {
      prisma.dailyMealPlan.findFirst.mockResolvedValue({
        id: planId,
        status: 'paused',
      });

      await expect(
        service.generateOrdersFromPlan(tenantId, userId, planId, {
          fromDate: '2026-11-16',
          toDate: '2026-11-20',
          overwriteExisting: false,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('createInvoiceForOrder', () => {
    it('delegates downstream invoice creation to InvoicesService', async () => {
      const res = await service.createInvoiceForOrder(tenantId, userId, orderId, {
        title: 'Weekly Meal Invoice',
      });

      expect(invoicesService.createInvoiceFromDailyMealOrder).toHaveBeenCalledWith(
        tenantId,
        userId,
        expect.objectContaining({
          orderId,
          title: 'Weekly Meal Invoice',
        }),
      );
      expect(res.invoiceNumber).toBe('INV-202611-0001');
    });
  });
});
