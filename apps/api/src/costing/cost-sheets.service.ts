import type {
  CostSheet,
  CostSheetCalculationInput,
  CostSheetCalculationResult,
  CostSheetItem,
  CostSheetListResponse,
  CostSheetSearchParams,
  CreateCostSheetRequest,
  UpdateCostSheetRequest,
} from '@catering/shared-types';
import { calculateCostSheetEngine } from '@catering/shared-types';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { CostSheetItemType, CostSheetStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditLogService } from '../tenancy/audit-log.service.js';

@Injectable()
export class CostSheetsService {
  private readonly logger = new Logger(CostSheetsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  private mapCostSheetItem(item: {
    id: string;
    costSheetId: string;
    itemType: CostSheetItemType;
    name: string;
    quantity: Prisma.Decimal | number;
    unit: string;
    unitCost: Prisma.Decimal | number;
    totalCost: Prisma.Decimal | number;
    sortOrder: number;
    notes: string | null;
  }): CostSheetItem {
    return {
      id: item.id,
      costSheetId: item.costSheetId,
      itemType: item.itemType,
      name: item.name,
      quantity: Number(item.quantity),
      unit: item.unit,
      unitCost: Number(item.unitCost),
      totalCost: Number(item.totalCost),
      sortOrder: item.sortOrder,
      notes: item.notes,
    };
  }

  private mapCostSheet(sheet: {
    id: string;
    tenantId: string;
    name: string;
    description: string | null;
    status: CostSheetStatus;
    menuId: string | null;
    menu?: { name: string } | null;
    recipeId: string | null;
    recipe?: { name: string } | null;
    servings: Prisma.Decimal | number;
    ingredientCost: Prisma.Decimal | number;
    laborCost: Prisma.Decimal | number;
    overheadCost: Prisma.Decimal | number;
    otherCost: Prisma.Decimal | number;
    totalCost: Prisma.Decimal | number;
    costPerServing: Prisma.Decimal | number;
    targetMarginPercent: Prisma.Decimal | number;
    markupPercent: Prisma.Decimal | number;
    suggestedPrice: Prisma.Decimal | number;
    quotedPrice: Prisma.Decimal | number;
    actualMarginPercent: Prisma.Decimal | number;
    notes: string | null;
    items: Array<{
      id: string;
      costSheetId: string;
      itemType: CostSheetItemType;
      name: string;
      quantity: Prisma.Decimal | number;
      unit: string;
      unitCost: Prisma.Decimal | number;
      totalCost: Prisma.Decimal | number;
      sortOrder: number;
      notes: string | null;
    }>;
    createdAt: Date;
    updatedAt: Date;
  }): CostSheet {
    return {
      id: sheet.id,
      name: sheet.name,
      description: sheet.description,
      status: sheet.status,
      menuId: sheet.menuId,
      menuName: sheet.menu?.name ?? null,
      recipeId: sheet.recipeId,
      recipeName: sheet.recipe?.name ?? null,
      servings: Number(sheet.servings),
      ingredientCost: Number(sheet.ingredientCost),
      laborCost: Number(sheet.laborCost),
      overheadCost: Number(sheet.overheadCost),
      otherCost: Number(sheet.otherCost),
      totalCost: Number(sheet.totalCost),
      costPerServing: Number(sheet.costPerServing),
      targetMarginPercent: Number(sheet.targetMarginPercent),
      markupPercent: Number(sheet.markupPercent),
      suggestedPrice: Number(sheet.suggestedPrice),
      quotedPrice: Number(sheet.quotedPrice),
      actualMarginPercent: Number(sheet.actualMarginPercent),
      notes: sheet.notes,
      items: sheet.items.map((i) => this.mapCostSheetItem(i)),
      createdAt: sheet.createdAt.toISOString(),
      updatedAt: sheet.updatedAt.toISOString(),
    };
  }

  calculate(dto: CostSheetCalculationInput): CostSheetCalculationResult {
    return calculateCostSheetEngine({
      servings: dto.servings,
      items: dto.items,
      laborCost: dto.laborCost,
      overheadCost: dto.overheadCost,
      otherCost: dto.otherCost,
      targetMarginPercent: dto.targetMarginPercent,
      quotedPrice: dto.quotedPrice,
    });
  }

  async listCostSheets(
    tenantId: string,
    filters?: CostSheetSearchParams,
  ): Promise<CostSheetListResponse> {
    const where: Prisma.CostSheetWhereInput = { tenantId };

    if (filters?.status && filters.status !== 'all') {
      where.status = filters.status as CostSheetStatus;
    }

    if (filters?.menuId) {
      where.menuId = filters.menuId;
    }

    if (filters?.recipeId) {
      where.recipeId = filters.recipeId;
    }

    if (filters?.search) {
      const term = filters.search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        { notes: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [sheets, allSheetsForStats] = await Promise.all([
      this.prisma.costSheet.findMany({
        where,
        include: {
          menu: { select: { name: true } },
          recipe: { select: { name: true } },
          items: {
            orderBy: { sortOrder: 'asc' },
          },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.costSheet.findMany({
        where: { tenantId },
        select: {
          id: true,
          status: true,
          actualMarginPercent: true,
          costPerServing: true,
        },
      }),
    ]);

    const mapped = sheets.map((s) => this.mapCostSheet(s));

    let activeCount = 0;
    let draftCount = 0;
    let archivedCount = 0;
    let marginSum = 0;
    let costPerServingSum = 0;

    for (const s of allSheetsForStats) {
      if (s.status === 'active') activeCount++;
      else if (s.status === 'draft') draftCount++;
      else if (s.status === 'archived') archivedCount++;

      marginSum += Number(s.actualMarginPercent);
      costPerServingSum += Number(s.costPerServing);
    }

    const totalCostSheets = allSheetsForStats.length;
    const avgMarginPercent =
      totalCostSheets > 0
        ? Math.round((marginSum / totalCostSheets + Number.EPSILON) * 100) / 100
        : 0;
    const avgCostPerServing =
      totalCostSheets > 0
        ? Math.round((costPerServingSum / totalCostSheets + Number.EPSILON) * 100) / 100
        : 0;

    return {
      data: mapped,
      total: mapped.length,
      stats: {
        totalCostSheets,
        activeCount,
        draftCount,
        archivedCount,
        avgMarginPercent,
        avgCostPerServing,
      },
    };
  }

  async getCostSheetById(
    tenantId: string,
    costSheetId: string,
  ): Promise<CostSheet> {
    const sheet = await this.prisma.costSheet.findFirst({
      where: { id: costSheetId, tenantId },
      include: {
        menu: { select: { name: true } },
        recipe: { select: { name: true } },
        items: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!sheet) {
      throw new NotFoundException(
        `Cost Sheet with ID "${costSheetId}" not found`,
      );
    }

    return this.mapCostSheet(sheet);
  }

  async createCostSheet(
    tenantId: string,
    userId: string | undefined,
    dto: CreateCostSheetRequest,
  ): Promise<CostSheet> {
    if (!dto.name.trim()) {
      throw new BadRequestException('Cost sheet name is required');
    }

    if (dto.menuId) {
      const menu = await this.prisma.menu.findFirst({
        where: { id: dto.menuId, tenantId },
      });
      if (!menu) {
        throw new NotFoundException(`Menu with ID "${dto.menuId}" not found`);
      }
    }

    if (dto.recipeId) {
      const recipe = await this.prisma.recipe.findFirst({
        where: { id: dto.recipeId, tenantId },
      });
      if (!recipe) {
        throw new NotFoundException(`Recipe with ID "${dto.recipeId}" not found`);
      }
    }

    const itemsList = dto.items ?? [];

    const calc = calculateCostSheetEngine({
      servings: dto.servings,
      items: itemsList,
      laborCost: dto.laborCost,
      overheadCost: dto.overheadCost,
      otherCost: dto.otherCost,
      targetMarginPercent: dto.targetMarginPercent,
      quotedPrice: dto.quotedPrice,
    });

    const created = await this.prisma.costSheet.create({
      data: {
        tenantId,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        status: (dto.status as CostSheetStatus) || 'draft',
        menuId: dto.menuId || null,
        recipeId: dto.recipeId || null,
        servings: calc.servings,
        ingredientCost: calc.ingredientCost,
        laborCost: calc.laborCost,
        overheadCost: calc.overheadCost,
        otherCost: calc.otherCost,
        totalCost: calc.totalCost,
        costPerServing: calc.costPerServing,
        targetMarginPercent: calc.targetMarginPercent,
        markupPercent: calc.markupPercent,
        suggestedPrice: calc.suggestedPrice,
        quotedPrice: calc.quotedPrice,
        actualMarginPercent: calc.actualMarginPercent,
        notes: dto.notes?.trim() || null,
        items: {
          create: itemsList.map((item, idx) => ({
            itemType: (item.itemType as CostSheetItemType) || 'ingredient',
            name: item.name.trim(),
            quantity: item.quantity,
            unit: item.unit ?? 'unit',
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
        menu: { select: { name: true } },
        recipe: { select: { name: true } },
        items: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    await this.auditLogService.record({
      scope: 'tenant',
      tenantId,
      outcome: 'allowed',
      action: 'cost_sheet.created',
      actorType: userId ? 'tenant_user' : 'system',
      metadata: {
        costSheetId: created.id,
        name: created.name,
        totalCost: String(created.totalCost),
        quotedPrice: String(created.quotedPrice),
      },
    });

    return this.mapCostSheet(created);
  }

  async updateCostSheet(
    tenantId: string,
    costSheetId: string,
    userId: string | undefined,
    dto: UpdateCostSheetRequest,
  ): Promise<CostSheet> {
    const existing = await this.prisma.costSheet.findFirst({
      where: { id: costSheetId, tenantId },
      include: { items: true },
    });

    if (!existing) {
      throw new NotFoundException(
        `Cost Sheet with ID "${costSheetId}" not found`,
      );
    }

    if (dto.menuId) {
      const menu = await this.prisma.menu.findFirst({
        where: { id: dto.menuId, tenantId },
      });
      if (!menu) {
        throw new NotFoundException(`Menu with ID "${dto.menuId}" not found`);
      }
    }

    if (dto.recipeId) {
      const recipe = await this.prisma.recipe.findFirst({
        where: { id: dto.recipeId, tenantId },
      });
      if (!recipe) {
        throw new NotFoundException(`Recipe with ID "${dto.recipeId}" not found`);
      }
    }

    const itemsToCalculate =
      dto.items !== undefined
        ? dto.items
        : existing.items.map((it) => ({
            itemType: it.itemType,
            name: it.name,
            quantity: Number(it.quantity),
            unit: it.unit,
            unitCost: Number(it.unitCost),
            totalCost: Number(it.totalCost),
            sortOrder: it.sortOrder,
            notes: it.notes,
          }));

    const servings = dto.servings !== undefined ? dto.servings : Number(existing.servings);
    const laborCost = dto.laborCost !== undefined ? dto.laborCost : Number(existing.laborCost);
    const overheadCost = dto.overheadCost !== undefined ? dto.overheadCost : Number(existing.overheadCost);
    const otherCost = dto.otherCost !== undefined ? dto.otherCost : Number(existing.otherCost);
    const targetMarginPercent =
      dto.targetMarginPercent !== undefined
        ? dto.targetMarginPercent
        : Number(existing.targetMarginPercent);
    const quotedPrice =
      dto.quotedPrice !== undefined ? dto.quotedPrice : Number(existing.quotedPrice);

    const calc = calculateCostSheetEngine({
      servings,
      items: itemsToCalculate,
      laborCost,
      overheadCost,
      otherCost,
      targetMarginPercent,
      quotedPrice,
    });

    const updateData: Prisma.CostSheetUpdateInput = {
      servings: calc.servings,
      ingredientCost: calc.ingredientCost,
      laborCost: calc.laborCost,
      overheadCost: calc.overheadCost,
      otherCost: calc.otherCost,
      totalCost: calc.totalCost,
      costPerServing: calc.costPerServing,
      targetMarginPercent: calc.targetMarginPercent,
      markupPercent: calc.markupPercent,
      suggestedPrice: calc.suggestedPrice,
      quotedPrice: calc.quotedPrice,
      actualMarginPercent: calc.actualMarginPercent,
    };

    if (dto.name !== undefined) updateData.name = dto.name.trim();
    if (dto.description !== undefined)
      updateData.description = dto.description?.trim() || null;
    if (dto.status !== undefined) updateData.status = dto.status as CostSheetStatus;
    if (dto.menuId !== undefined) {
      updateData.menu = dto.menuId ? { connect: { id: dto.menuId } } : { disconnect: true };
    }
    if (dto.recipeId !== undefined) {
      updateData.recipe = dto.recipeId ? { connect: { id: dto.recipeId } } : { disconnect: true };
    }
    if (dto.notes !== undefined) updateData.notes = dto.notes?.trim() || null;

    if (dto.items !== undefined) {
      await this.prisma.costSheetItem.deleteMany({
        where: { costSheetId },
      });

      updateData.items = {
        create: dto.items.map((item, idx) => ({
          itemType: (item.itemType as CostSheetItemType) || 'ingredient',
          name: item.name.trim(),
          quantity: item.quantity,
          unit: item.unit ?? 'unit',
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

    const updated = await this.prisma.costSheet.update({
      where: { id: costSheetId },
      data: updateData,
      include: {
        menu: { select: { name: true } },
        recipe: { select: { name: true } },
        items: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    await this.auditLogService.record({
      scope: 'tenant',
      tenantId,
      outcome: 'allowed',
      action: 'cost_sheet.updated',
      actorType: userId ? 'tenant_user' : 'system',
      metadata: {
        costSheetId: updated.id,
        name: updated.name,
        status: String(updated.status),
      },
    });

    return this.mapCostSheet(updated);
  }

  async deleteCostSheet(
    tenantId: string,
    costSheetId: string,
    userId?: string,
  ): Promise<{ success: boolean; id: string }> {
    const existing = await this.prisma.costSheet.findFirst({
      where: { id: costSheetId, tenantId },
    });

    if (!existing) {
      throw new NotFoundException(
        `Cost Sheet with ID "${costSheetId}" not found`,
      );
    }

    await this.prisma.costSheet.delete({
      where: { id: costSheetId },
    });

    await this.auditLogService.record({
      scope: 'tenant',
      tenantId,
      outcome: 'allowed',
      action: 'cost_sheet.deleted',
      actorType: userId ? 'tenant_user' : 'system',
      metadata: { costSheetId, name: existing.name },
    });

    return { success: true, id: costSheetId };
  }
}
