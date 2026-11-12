import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { AuditLogService } from '../tenancy/audit-log.service.js';
import { CostSheetsService } from './cost-sheets.service.js';

describe('CostSheetsService', () => {
  let service: CostSheetsService;
  let prisma: Partial<PrismaService>;
  let auditLogService: Partial<AuditLogService>;

  const tenantId = '00000000-0000-0000-0000-000000000001';
  const otherTenantId = '00000000-0000-0000-0000-000000000002';
  const userId = '11111111-1111-1111-1111-111111111111';

  beforeEach(() => {
    prisma = {
      costSheet: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      } as unknown as PrismaService['costSheet'],
      costSheetItem: {
        deleteMany: vi.fn(),
      } as unknown as PrismaService['costSheetItem'],
      menu: {
        findFirst: vi.fn(),
      } as unknown as PrismaService['menu'],
      recipe: {
        findFirst: vi.fn(),
      } as unknown as PrismaService['recipe'],
    };

    auditLogService = {
      record: vi.fn(),
    };

    service = new CostSheetsService(
      prisma as PrismaService,
      auditLogService as AuditLogService,
    );
  });

  describe('calculate', () => {
    it('deterministically calculates cost breakdown, margins, and markups', () => {
      const calculation = service.calculate({
        servings: 50,
        items: [
          {
            itemType: 'ingredient',
            name: 'Beef Tenderloin',
            quantity: 15,
            unit: 'kg',
            unitCost: 20,
          },
          {
            itemType: 'labor',
            name: 'Sous Chef Prep',
            quantity: 4,
            unit: 'hours',
            unitCost: 25,
          },
          {
            itemType: 'overhead',
            name: 'Chafing Fuel & Transport',
            quantity: 1,
            unit: 'package',
            unitCost: 50,
          },
        ],
        laborCost: 0,
        overheadCost: 0,
        otherCost: 0,
        targetMarginPercent: 35,
        quotedPrice: 800,
      });

      // Ingredients: 15 * 20 = 300
      expect(calculation.ingredientCost).toBe(300);
      // Labor: 4 * 25 = 100
      expect(calculation.laborCost).toBe(100);
      // Overhead: 1 * 50 = 50
      expect(calculation.overheadCost).toBe(50);
      // Total Cost = 450
      expect(calculation.totalCost).toBe(450);
      // Cost per serving = 450 / 50 = 9
      expect(calculation.costPerServing).toBe(9);
      // Suggested price at 35% margin = 450 / (1 - 0.35) = 692.31
      expect(calculation.suggestedPrice).toBe(692.31);
      // Quoted price = 800
      expect(calculation.quotedPrice).toBe(800);
      // Gross profit = 800 - 450 = 350
      expect(calculation.grossProfit).toBe(350);
      // Actual margin % = (350 / 800) * 100 = 43.75%
      expect(calculation.actualMarginPercent).toBe(43.75);
      // Actual markup % = (350 / 450) * 100 = 77.78%
      expect(calculation.actualMarkupPercent).toBe(77.78);
    });
  });

  describe('createCostSheet', () => {
    it('creates cost sheet snapshot and persists computed costs', async () => {
      const mockCreated = {
        id: 'cs-1',
        tenantId,
        name: 'Gala Dinner Cost Sheet',
        description: 'Annual corporate gala costing',
        status: 'draft',
        menuId: null,
        recipeId: null,
        servings: 100,
        ingredientCost: 800,
        laborCost: 200,
        overheadCost: 100,
        otherCost: 0,
        totalCost: 1100,
        costPerServing: 11,
        targetMarginPercent: 30,
        markupPercent: 42.86,
        suggestedPrice: 1571.43,
        quotedPrice: 1600,
        actualMarginPercent: 31.25,
        notes: null,
        items: [],
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      };

      (prisma.costSheet?.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockCreated);

      const result = await service.createCostSheet(tenantId, userId, {
        name: 'Gala Dinner Cost Sheet',
        servings: 100,
        targetMarginPercent: 30,
        quotedPrice: 1600,
        items: [
          {
            itemType: 'ingredient',
            name: 'Food Ingredients',
            quantity: 1,
            unit: 'lot',
            unitCost: 800,
          },
        ],
        laborCost: 200,
        overheadCost: 100,
      });

      expect(result.id).toBe('cs-1');
      expect(result.name).toBe('Gala Dinner Cost Sheet');
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          scope: 'tenant',
          tenantId,
          action: 'cost_sheet.created',
        }),
      );
    });
  });

  describe('tenant isolation', () => {
    it('prevents accessing cost sheet from different tenant', async () => {
      (prisma.costSheet?.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        service.getCostSheetById(otherTenantId, 'cs-1'),
      ).rejects.toThrow('not found');

      expect(prisma.costSheet?.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'cs-1', tenantId: otherTenantId },
        }),
      );
    });
  });
});
