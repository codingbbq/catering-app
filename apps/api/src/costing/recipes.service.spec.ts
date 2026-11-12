import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { AuditLogService } from '../tenancy/audit-log.service.js';
import { RecipesService } from './recipes.service.js';

describe('RecipesService', () => {
  let service: RecipesService;
  let prisma: Partial<PrismaService>;
  let auditLogService: Partial<AuditLogService>;

  const tenantId = '00000000-0000-0000-0000-000000000001';
  const userId = '11111111-1111-1111-1111-111111111111';

  beforeEach(() => {
    prisma = {
      recipe: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      } as unknown as PrismaService['recipe'],
      recipeItem: {
        deleteMany: vi.fn(),
      } as unknown as PrismaService['recipeItem'],
    };

    auditLogService = {
      record: vi.fn(),
    };

    service = new RecipesService(
      prisma as PrismaService,
      auditLogService as AuditLogService,
    );
  });

  describe('listRecipes', () => {
    it('returns tenant recipes with calculated cost metrics and statistics', async () => {
      const mockRecipes = [
        {
          id: 'recipe-1',
          tenantId,
          name: 'Herb Crusted Salmon',
          description: 'Pan-seared salmon fillet with herb crust',
          category: 'main',
          yield: 4,
          yieldUnit: 'portion',
          prepTimeMinutes: 20,
          cookTimeMinutes: 25,
          notes: 'Use fresh dill',
          targetMargin: 35,
          isArchived: false,
          items: [
            {
              id: 'item-1',
              recipeId: 'recipe-1',
              catalogueItemId: null,
              name: 'Salmon Fillet',
              quantity: 0.8,
              unit: 'kg',
              unitCost: 25.0,
              totalCost: 20.0,
              notes: null,
              sortOrder: 0,
            },
            {
              id: 'item-2',
              recipeId: 'recipe-1',
              catalogueItemId: null,
              name: 'Herb Butter',
              quantity: 0.1,
              unit: 'kg',
              unitCost: 10.0,
              totalCost: 1.0,
              notes: null,
              sortOrder: 1,
            },
          ],
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      ];

      (prisma.recipe?.findMany as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(mockRecipes)
        .mockResolvedValueOnce([
          {
            id: 'recipe-1',
            isArchived: false,
            yield: 4,
            items: [
              { quantity: 0.8, unitCost: 25.0 },
              { quantity: 0.1, unitCost: 10.0 },
            ],
          },
        ]);

      const result = await service.listRecipes(tenantId, {});

      expect(result.data).toHaveLength(1);
      const recipe = result.data[0]!;
      expect(recipe.name).toBe('Herb Crusted Salmon');
      // Total cost = 0.8 * 25 + 0.1 * 10 = 21.0
      expect(recipe.totalCost).toBe(21.0);
      // Cost per yield unit = 21 / 4 = 5.25
      expect(recipe.costPerYieldUnit).toBe(5.25);
      // Suggested selling price with 35% margin = 21 / (1 - 0.35) = 32.31
      expect(recipe.suggestedSellingPrice).toBe(32.31);
      expect(result.stats?.totalRecipes).toBe(1);
      expect(result.stats?.activeRecipes).toBe(1);
      expect(result.stats?.avgCostPerPortion).toBe(5.25);
    });
  });

  describe('createRecipe', () => {
    it('creates a recipe with items and records audit log', async () => {
      const mockCreated = {
        id: 'new-recipe-1',
        tenantId,
        name: 'Truffle Mashed Potatoes',
        description: 'Velvety mash with white truffle oil',
        category: 'side',
        yield: 10,
        yieldUnit: 'portion',
        prepTimeMinutes: 15,
        cookTimeMinutes: 30,
        notes: null,
        targetMargin: 40,
        isArchived: false,
        items: [
          {
            id: 'item-1',
            recipeId: 'new-recipe-1',
            catalogueItemId: null,
            name: 'Russet Potatoes',
            quantity: 3,
            unit: 'kg',
            unitCost: 2.0,
            totalCost: 6.0,
            notes: null,
            sortOrder: 0,
          },
        ],
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      };

      (prisma.recipe?.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockCreated);

      const result = await service.createRecipe(tenantId, userId, {
        name: 'Truffle Mashed Potatoes',
        description: 'Velvety mash with white truffle oil',
        category: 'side',
        yield: 10,
        yieldUnit: 'portion',
        prepTimeMinutes: 15,
        cookTimeMinutes: 30,
        targetMargin: 40,
        items: [
          {
            name: 'Russet Potatoes',
            quantity: 3,
            unit: 'kg',
            unitCost: 2.0,
            sortOrder: 0,
          },
        ],
      });

      expect(result.id).toBe('new-recipe-1');
      expect(result.totalCost).toBe(6.0);
      expect(result.costPerYieldUnit).toBe(0.6);
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          scope: 'tenant',
          tenantId,
          action: 'recipe.created',
        }),
      );
    });
  });

  describe('deleteRecipe', () => {
    it('enforces tenant isolation and deletes recipe', async () => {
      (prisma.recipe?.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'recipe-1',
        tenantId,
        name: 'Herb Crusted Salmon',
      });
      (prisma.recipe?.delete as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'recipe-1',
      });

      const res = await service.deleteRecipe(tenantId, 'recipe-1', userId);
      expect(res.success).toBe(true);
      expect(prisma.recipe?.delete).toHaveBeenCalledWith({
        where: { id: 'recipe-1' },
      });
    });
  });
});
