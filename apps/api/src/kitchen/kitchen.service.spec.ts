import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { KitchenService } from './kitchen.service.js';

describe('KitchenService', () => {
  let service: KitchenService;
  let prisma: any;
  let auditLogService: any;

  const mockTenantId = 'tenant-test-123';
  const mockUserId = 'user-test-456';

  beforeEach(() => {
    prisma = {
      kitchenProductionPlan: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
      kitchenTask: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
      booking: {
        findFirst: vi.fn(),
      },
      dailyMealOrder: {
        findFirst: vi.fn(),
      },
      inventoryItem: {
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      stockMovement: {
        create: vi.fn(),
        count: vi.fn(),
      },
      $transaction: vi.fn((callback: any) => callback(prisma)),
    };

    auditLogService = {
      record: vi.fn().mockReturnValue(undefined),
    };

    service = new KitchenService(prisma, auditLogService);
  });

  describe('createPlan', () => {
    it('should create a production plan with sequential plan number and provided tasks', async () => {
      prisma.kitchenProductionPlan.count.mockResolvedValueOnce(0); // For KPP-YYYYMM-0001
      const createdMock = {
        id: 'plan-1',
        tenantId: mockTenantId,
        planNumber: 'KPP-202611-0001',
        title: 'Wedding Gala Banquet Prep',
        status: 'scheduled',
        source: 'manual',
        planDate: new Date('2026-11-20T10:00:00Z'),
        serviceSlot: 'dinner',
        estimatedServings: 150,
        bookingId: null,
        dailyMealOrderId: null,
        venueNotes: 'Grand Ballroom',
        dietaryNotes: '5 gluten-free, 2 vegan',
        notes: 'Prep hot dishes by 17:00',
        tasks: [
          {
            id: 'task-1',
            tenantId: mockTenantId,
            planId: 'plan-1',
            taskNumber: 'TK-01',
            title: 'Mise en place',
            station: 'prep',
            status: 'pending',
            targetQuantity: 150,
            unit: 'portions',
            dueTime: '14:00',
            assignedTo: 'Sous Chef Marco',
            dietaryAlerts: null,
            notes: null,
            sortOrder: 1,
            completedAt: null,
            completedBy: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        booking: null,
        dailyMealOrder: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prisma.kitchenProductionPlan.create.mockResolvedValueOnce(createdMock);

      const result = await service.createPlan(
        mockTenantId,
        {
          title: 'Wedding Gala Banquet Prep',
          planDate: '2026-11-20T10:00:00Z',
          serviceSlot: 'dinner',
          estimatedServings: 150,
          source: 'manual',
          venueNotes: 'Grand Ballroom',
          dietaryNotes: '5 gluten-free, 2 vegan',
          tasks: [
            {
              title: 'Mise en place',
              station: 'prep',
              targetQuantity: 150,
              unit: 'portions',
              dueTime: '14:00',
              assignedTo: 'Sous Chef Marco',
              sortOrder: 1,
            },
          ],
        },
        { id: mockUserId },
      );

      expect(result.planNumber).toBe('KPP-202611-0001');
      expect(result.title).toBe('Wedding Gala Banquet Prep');
      expect(result.tasks).toHaveLength(1);
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'kitchen_plan_created',
          tenantId: mockTenantId,
        }),
      );
    });

    it('should auto-generate kitchen tasks when source is a booking with quotation items', async () => {
      prisma.kitchenProductionPlan.count.mockResolvedValueOnce(2);
      prisma.booking.findFirst.mockResolvedValueOnce({
        id: 'bkg-123',
        tenantId: mockTenantId,
        title: 'Tech Summit VIP Lunch',
        guestCount: 80,
        quotation: {
          revisions: [
            {
              items: [
                { name: 'Herb Crusted Salmon', quantity: 80, unit: 'portions', description: 'Fresh dill glaze' },
                { name: 'Roasted Root Vegetables', quantity: 80, unit: 'portions', description: 'Parsnip & carrot' },
              ],
            },
          ],
        },
      });

      const createdMock = {
        id: 'plan-2',
        tenantId: mockTenantId,
        planNumber: 'KPP-202611-0003',
        title: 'Tech Summit VIP Lunch Prep',
        status: 'scheduled',
        source: 'booking',
        planDate: new Date('2026-11-22T08:00:00Z'),
        serviceSlot: 'lunch',
        estimatedServings: 80,
        bookingId: 'bkg-123',
        dailyMealOrderId: null,
        venueNotes: null,
        dietaryNotes: null,
        notes: null,
        tasks: [
          {
            id: 'task-1',
            tenantId: mockTenantId,
            planId: 'plan-2',
            taskNumber: 'TK-01',
            title: 'Prepare: Herb Crusted Salmon',
            station: 'hot_kitchen',
            status: 'pending',
            targetQuantity: 80,
            unit: 'portions',
            sortOrder: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 'task-2',
            tenantId: mockTenantId,
            planId: 'plan-2',
            taskNumber: 'TK-02',
            title: 'Prepare: Roasted Root Vegetables',
            station: 'hot_kitchen',
            status: 'pending',
            targetQuantity: 80,
            unit: 'portions',
            sortOrder: 2,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        booking: {
          id: 'bkg-123',
          bookingNumber: 'BK-202611-0012',
          title: 'Tech Summit VIP Lunch',
          guestCount: 80,
        },
        dailyMealOrder: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prisma.kitchenProductionPlan.create.mockResolvedValueOnce(createdMock);

      const result = await service.createPlan(
        mockTenantId,
        {
          title: 'Tech Summit VIP Lunch Prep',
          planDate: '2026-11-22T08:00:00Z',
          source: 'booking',
          bookingId: 'bkg-123',
          estimatedServings: 80,
          tasks: [],
        },
        { id: mockUserId },
      );

      expect(result.source).toBe('booking');
      expect(result.tasks).toHaveLength(2);
      expect(result.tasks[0]?.title).toContain('Herb Crusted Salmon');
    });
  });

  describe('updateTask and status transitions', () => {
    it('should complete a task, record completedAt/completedBy, and auto-complete plan when all tasks are done', async () => {
      prisma.kitchenTask.findFirst.mockResolvedValueOnce({
        id: 'task-10',
        planId: 'plan-1',
        tenantId: mockTenantId,
        status: 'in_progress',
        title: 'Sear Tenderloin',
      });

      prisma.kitchenTask.update.mockResolvedValueOnce({
        id: 'task-10',
        tenantId: mockTenantId,
        planId: 'plan-1',
        taskNumber: 'TK-01',
        title: 'Sear Tenderloin',
        station: 'hot_kitchen',
        status: 'completed',
        targetQuantity: 50,
        unit: 'portions',
        completedAt: new Date(),
        completedBy: 'Chef Alex',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // No other pending tasks remaining
      prisma.kitchenTask.count.mockResolvedValueOnce(0);

      const updated = await service.updateTask(
        mockTenantId,
        'plan-1',
        'task-10',
        { status: 'completed' },
        { id: mockUserId, displayName: 'Chef Alex' },
      );

      expect(updated.status).toBe('completed');
      expect(updated.completedBy).toBe('Chef Alex');
      expect(prisma.kitchenProductionPlan.update).toHaveBeenCalledWith({
        where: { id: 'plan-1' },
        data: { status: 'completed' },
      });
    });
  });

  describe('recordConsumption', () => {
    it('should deduct stock and record a kitchen_consumption stock movement', async () => {
      prisma.kitchenProductionPlan.findFirst.mockResolvedValueOnce({
        id: 'plan-1',
        planNumber: 'KPP-202611-0001',
        tenantId: mockTenantId,
      });

      prisma.inventoryItem.findFirst.mockResolvedValueOnce({
        id: 'item-1',
        tenantId: mockTenantId,
        sku: 'RICE-01',
        name: 'Basmati Rice',
        unit: 'kg',
        currentStock: 50,
        unitCost: 2.5,
      });

      prisma.stockMovement.count.mockResolvedValueOnce(0);
      prisma.stockMovement.create.mockResolvedValueOnce({
        id: 'mov-1',
        movementNumber: 'SM-202611-0001',
      });

      const result = await service.recordConsumption(
        mockTenantId,
        'plan-1',
        {
          inventoryItemId: 'item-1',
          quantity: 15,
          notes: 'Consumed for buffet prep',
        },
        { id: mockUserId, displayName: 'Chef Marco' },
      );

      expect(result.newStock).toBe(35);
      expect(prisma.inventoryItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: { currentStock: 35 },
      });
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'kitchen_consumption_recorded',
        }),
      );
    });

    it('should reject consumption if inventory stock is insufficient', async () => {
      prisma.kitchenProductionPlan.findFirst.mockResolvedValueOnce({
        id: 'plan-1',
        planNumber: 'KPP-202611-0001',
        tenantId: mockTenantId,
      });

      prisma.inventoryItem.findFirst.mockResolvedValueOnce({
        id: 'item-1',
        tenantId: mockTenantId,
        sku: 'SAFFRON-01',
        name: 'Pure Saffron',
        unit: 'g',
        currentStock: 10,
        unitCost: 15.0,
      });

      await expect(
        service.recordConsumption(mockTenantId, 'plan-1', {
          inventoryItemId: 'item-1',
          quantity: 25,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getSummary', () => {
    it('should compute daily plan counts, task counts, and station workloads', async () => {
      prisma.kitchenProductionPlan.findMany.mockResolvedValueOnce([
        {
          id: 'plan-1',
          status: 'scheduled',
          estimatedServings: 50,
          tasks: [
            { id: 't1', status: 'completed', station: 'prep' },
            { id: 't2', status: 'pending', station: 'hot_kitchen' },
          ],
        },
        {
          id: 'plan-2',
          status: 'in_progress',
          estimatedServings: 75,
          tasks: [
            { id: 't3', status: 'in_progress', station: 'hot_kitchen' },
            { id: 't4', status: 'completed', station: 'bakery_pastry' },
          ],
        },
      ]);

      const summary = await service.getSummary(mockTenantId, '2026-11-20');

      expect(summary.totalPlans).toBe(2);
      expect(summary.scheduledPlans).toBe(1);
      expect(summary.inProgressPlans).toBe(1);
      expect(summary.totalServings).toBe(125);
      expect(summary.totalTasks).toBe(4);
      expect(summary.completedTasks).toBe(2);
      expect(summary.pendingTasks).toBe(2);
      expect(summary.stationWorkload['prep']).toBe(1);
      expect(summary.stationWorkload['hot_kitchen']).toBe(2);
      expect(summary.stationWorkload['bakery_pastry']).toBe(1);
    });
  });
});
