import type {
  CreateRecipeRequest,
  Recipe,
  RecipeItem,
  RecipeListResponse,
  RecipeSearchParams,
  UpdateRecipeRequest,
} from '@catering/shared-types';
import { calculateRecipeMetrics } from '@catering/shared-types';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditLogService } from '../tenancy/audit-log.service.js';

@Injectable()
export class RecipesService {
  private readonly logger = new Logger(RecipesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  private mapRecipeItem(item: {
    id: string;
    recipeId: string;
    catalogueItemId: string | null;
    name: string;
    quantity: Prisma.Decimal | number;
    unit: string;
    unitCost: Prisma.Decimal | number;
    totalCost: Prisma.Decimal | number;
    notes: string | null;
    sortOrder: number;
    createdAt?: Date;
    updatedAt?: Date;
  }): RecipeItem {
    return {
      id: item.id,
      recipeId: item.recipeId,
      catalogueItemId: item.catalogueItemId,
      name: item.name,
      quantity: Number(item.quantity),
      unit: item.unit,
      unitCost: Number(item.unitCost),
      totalCost: Number(item.totalCost),
      notes: item.notes,
      sortOrder: item.sortOrder,
    };
  }

  private mapRecipe(recipe: {
    id: string;
    tenantId: string;
    name: string;
    description: string | null;
    category: string | null;
    yield: Prisma.Decimal | number;
    yieldUnit: string;
    prepTimeMinutes: number | null;
    cookTimeMinutes: number | null;
    notes: string | null;
    targetMargin: Prisma.Decimal | number | null;
    isArchived: boolean;
    items: Array<{
      id: string;
      recipeId: string;
      catalogueItemId: string | null;
      name: string;
      quantity: Prisma.Decimal | number;
      unit: string;
      unitCost: Prisma.Decimal | number;
      totalCost: Prisma.Decimal | number;
      notes: string | null;
      sortOrder: number;
    }>;
    createdAt: Date;
    updatedAt: Date;
  }): Recipe {
    const items = recipe.items.map((i) => this.mapRecipeItem(i));
    const yieldNum = Number(recipe.yield) > 0 ? Number(recipe.yield) : 1;
    const targetMarginNum =
      recipe.targetMargin !== null ? Number(recipe.targetMargin) : 30;

    const metrics = calculateRecipeMetrics(items, yieldNum, targetMarginNum);

    return {
      id: recipe.id,
      name: recipe.name,
      description: recipe.description,
      category: recipe.category,
      yield: yieldNum,
      yieldUnit: recipe.yieldUnit,
      prepTimeMinutes: recipe.prepTimeMinutes,
      cookTimeMinutes: recipe.cookTimeMinutes,
      notes: recipe.notes,
      targetMargin: recipe.targetMargin !== null ? Number(recipe.targetMargin) : null,
      isArchived: recipe.isArchived,
      items,
      totalCost: metrics.totalCost,
      costPerYieldUnit: metrics.costPerYieldUnit,
      suggestedSellingPrice: metrics.suggestedSellingPrice,
      createdAt: recipe.createdAt.toISOString(),
      updatedAt: recipe.updatedAt.toISOString(),
    };
  }

  async listRecipes(
    tenantId: string,
    filters?: RecipeSearchParams,
  ): Promise<RecipeListResponse> {
    const where: Prisma.RecipeWhereInput = { tenantId };

    if (filters?.isArchived !== undefined && filters.isArchived !== 'all') {
      where.isArchived = filters.isArchived === 'true';
    }

    if (filters?.category && filters.category !== 'all') {
      where.category = { equals: filters.category, mode: 'insensitive' };
    }

    if (filters?.search) {
      const term = filters.search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        { notes: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [recipes, allRecipesForStats] = await Promise.all([
      this.prisma.recipe.findMany({
        where,
        include: {
          items: {
            orderBy: { sortOrder: 'asc' },
          },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.recipe.findMany({
        where: { tenantId },
        select: {
          id: true,
          isArchived: true,
          yield: true,
          items: {
            select: { quantity: true, unitCost: true },
          },
        },
      }),
    ]);

    const mapped = recipes.map((r) => this.mapRecipe(r));

    let totalPortionCostSum = 0;
    let countedPortions = 0;

    const totalRecipes = allRecipesForStats.length;
    let activeRecipes = 0;
    let archivedRecipes = 0;

    for (const r of allRecipesForStats) {
      if (r.isArchived) {
        archivedRecipes++;
      } else {
        activeRecipes++;
        const cost = r.items.reduce(
          (acc, it) => acc + Number(it.quantity) * Number(it.unitCost),
          0,
        );
        const y = Number(r.yield) > 0 ? Number(r.yield) : 1;
        totalPortionCostSum += cost / y;
        countedPortions++;
      }
    }

    const avgCostPerPortion =
      countedPortions > 0
        ? Math.round((totalPortionCostSum / countedPortions + Number.EPSILON) * 100) / 100
        : 0;

    return {
      data: mapped,
      total: mapped.length,
      stats: {
        totalRecipes,
        activeRecipes,
        archivedRecipes,
        avgCostPerPortion,
      },
    };
  }

  async getRecipeById(tenantId: string, recipeId: string): Promise<Recipe> {
    const recipe = await this.prisma.recipe.findFirst({
      where: { id: recipeId, tenantId },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!recipe) {
      throw new NotFoundException(`Recipe with ID "${recipeId}" not found`);
    }

    return this.mapRecipe(recipe);
  }

  async createRecipe(
    tenantId: string,
    userId: string | undefined,
    dto: CreateRecipeRequest,
  ): Promise<Recipe> {
    if (!dto.name.trim()) {
      throw new BadRequestException('Recipe name is required');
    }

    const yieldVal = (dto.yield ?? 1) > 0 ? (dto.yield ?? 1) : 1;
    const itemsList = dto.items ?? [];

    const created = await this.prisma.recipe.create({
      data: {
        tenantId,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        category: dto.category?.trim() || 'general',
        yield: yieldVal,
        yieldUnit: dto.yieldUnit?.trim() || 'portion',
        prepTimeMinutes: dto.prepTimeMinutes ?? null,
        cookTimeMinutes: dto.cookTimeMinutes ?? null,
        notes: dto.notes?.trim() || null,
        targetMargin: dto.targetMargin ?? 30,
        items: {
          create: itemsList.map((item, idx) => ({
            catalogueItemId: item.catalogueItemId || null,
            name: item.name.trim(),
            quantity: item.quantity,
            unit: item.unit ?? 'kg',
            unitCost: item.unitCost ?? 0,
            totalCost:
              Math.round(
                (Number(item.quantity) * Number(item.unitCost ?? 0) + Number.EPSILON) * 100,
              ) / 100,
            sortOrder: item.sortOrder ?? idx,
            notes: item.notes?.trim() || null,
          })),
        },
      },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    await this.auditLogService.record({
      scope: 'tenant',
      tenantId,
      outcome: 'allowed',
      action: 'recipe.created',
      actorType: userId ? 'tenant_user' : 'system',
      metadata: {
        recipeId: created.id,
        name: created.name,
        itemCount: String(created.items.length),
      },
    });

    return this.mapRecipe(created);
  }

  async updateRecipe(
    tenantId: string,
    recipeId: string,
    userId: string | undefined,
    dto: UpdateRecipeRequest,
  ): Promise<Recipe> {
    const existing = await this.prisma.recipe.findFirst({
      where: { id: recipeId, tenantId },
      include: { items: true },
    });

    if (!existing) {
      throw new NotFoundException(`Recipe with ID "${recipeId}" not found`);
    }

    const updateData: Prisma.RecipeUpdateInput = {};

    if (dto.name !== undefined) updateData.name = dto.name.trim();
    if (dto.description !== undefined)
      updateData.description = dto.description?.trim() || null;
    if (dto.category !== undefined)
      updateData.category = dto.category?.trim() || 'general';
    if (dto.yield !== undefined)
      updateData.yield = dto.yield > 0 ? dto.yield : 1;
    if (dto.yieldUnit !== undefined)
      updateData.yieldUnit = dto.yieldUnit.trim();
    if (dto.prepTimeMinutes !== undefined)
      updateData.prepTimeMinutes = dto.prepTimeMinutes;
    if (dto.cookTimeMinutes !== undefined)
      updateData.cookTimeMinutes = dto.cookTimeMinutes;
    if (dto.notes !== undefined)
      updateData.notes = dto.notes?.trim() || null;
    if (dto.targetMargin !== undefined)
      updateData.targetMargin = dto.targetMargin;
    if (dto.isArchived !== undefined)
      updateData.isArchived = dto.isArchived;

    // Replace items if provided
    if (dto.items !== undefined) {
      await this.prisma.recipeItem.deleteMany({
        where: { recipeId },
      });

      updateData.items = {
        create: dto.items.map((item, idx) => ({
          catalogueItemId: item.catalogueItemId || null,
          name: item.name.trim(),
          quantity: item.quantity,
          unit: item.unit ?? 'kg',
          unitCost: item.unitCost ?? 0,
          totalCost:
            Math.round(
              (Number(item.quantity) * Number(item.unitCost ?? 0) + Number.EPSILON) * 100,
            ) / 100,
          sortOrder: item.sortOrder ?? idx,
          notes: item.notes?.trim() || null,
        })),
      };
    }

    const updated = await this.prisma.recipe.update({
      where: { id: recipeId },
      data: updateData,
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    await this.auditLogService.record({
      scope: 'tenant',
      tenantId,
      outcome: 'allowed',
      action: 'recipe.updated',
      actorType: userId ? 'tenant_user' : 'system',
      metadata: {
        recipeId: updated.id,
        name: updated.name,
        isArchived: String(updated.isArchived),
      },
    });

    return this.mapRecipe(updated);
  }

  async deleteRecipe(
    tenantId: string,
    recipeId: string,
    userId?: string,
  ): Promise<{ success: boolean; id: string }> {
    const existing = await this.prisma.recipe.findFirst({
      where: { id: recipeId, tenantId },
    });

    if (!existing) {
      throw new NotFoundException(`Recipe with ID "${recipeId}" not found`);
    }

    await this.prisma.recipe.delete({
      where: { id: recipeId },
    });

    await this.auditLogService.record({
      scope: 'tenant',
      tenantId,
      outcome: 'allowed',
      action: 'recipe.deleted',
      actorType: userId ? 'tenant_user' : 'system',
      metadata: { recipeId, name: existing.name },
    });

    return { success: true, id: recipeId };
  }
}
