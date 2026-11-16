import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateInventoryItemRequest,
  InventoryItem,
  InventoryQuery,
  InventorySummary,
  RecordStockMovementRequest,
  StockMovement,
  UpdateInventoryItemRequest,
} from '@catering/shared-types';
import {
  calculateSignedQuantity,
  calculateStockStatus,
  calculateValuation,
} from '@catering/shared-types';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditLogService } from '../tenancy/audit-log.service.js';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  private async generateMovementNumber(tenantId: string): Promise<string> {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prefix = `SM-${yearMonth}-`;

    const count = await this.prisma.stockMovement.count({
      where: {
        tenantId,
        movementNumber: { startsWith: prefix },
      },
    });

    return `${prefix}${String(count + 1).padStart(4, '0')}`;
  }

  async getTenantCurrency(tenantId: string): Promise<string> {
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: { currencyCode: true },
    });
    return settings?.currencyCode || 'INR';
  }

  private mapItem(item: any, currency: string): InventoryItem {
    const currentStock = Number(item.currentStock ?? 0);
    const minStockLevel = Number(item.minStockLevel ?? 0);
    const unitCost = Number(item.unitCost ?? 0);
    const status = calculateStockStatus(currentStock, minStockLevel);
    const valuation = calculateValuation(currentStock, unitCost);

    return {
      id: item.id,
      tenantId: item.tenantId,
      sku: item.sku,
      name: item.name,
      description: item.description,
      category: item.category,
      unit: item.unit,
      currentStock,
      minStockLevel,
      maxStockLevel: item.maxStockLevel ? Number(item.maxStockLevel) : null,
      reorderQuantity: item.reorderQuantity ? Number(item.reorderQuantity) : null,
      unitCost,
      valuation,
      status,
      storageLocation: item.storageLocation,
      isArchived: item.isArchived,
      notes: item.notes,
      catalogueItemId: item.catalogueItemId,
      catalogueItem: item.catalogueItem
        ? {
            id: item.catalogueItem.id,
            name: item.catalogueItem.name,
            sku: item.catalogueItem.sku ?? null,
          }
        : null,
      currency,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }

  private mapMovement(mov: any): StockMovement {
    return {
      id: mov.id,
      tenantId: mov.tenantId,
      movementNumber: mov.movementNumber,
      inventoryItemId: mov.inventoryItemId,
      inventoryItem: mov.inventoryItem
        ? {
            id: mov.inventoryItem.id,
            sku: mov.inventoryItem.sku,
            name: mov.inventoryItem.name,
            unit: mov.inventoryItem.unit,
          }
        : null,
      type: mov.type,
      quantity: Number(mov.quantity),
      signedQuantity: Number(mov.signedQuantity),
      quantityBefore: Number(mov.quantityBefore),
      quantityAfter: Number(mov.quantityAfter),
      unitCost: mov.unitCost !== null && mov.unitCost !== undefined ? Number(mov.unitCost) : null,
      totalCost: mov.totalCost !== null && mov.totalCost !== undefined ? Number(mov.totalCost) : null,
      referenceType: mov.referenceType,
      referenceId: mov.referenceId,
      reason: mov.reason,
      recordedBy: mov.recordedBy,
      createdAt: mov.createdAt.toISOString(),
    };
  }

  async getItems(
    tenantId: string,
    query: InventoryQuery,
  ): Promise<{ items: InventoryItem[]; total: number; page: number; limit: number; totalPages: number }> {
    const currency = await this.getTenantCurrency(tenantId);
    const where: any = {
      tenantId,
    };

    if (!query.includeArchived) {
      where.isArchived = false;
    }

    if (query.category) {
      where.category = query.category;
    }

    if (query.search && query.search.trim()) {
      const s = query.search.trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { sku: { contains: s, mode: 'insensitive' } },
        { storageLocation: { contains: s, mode: 'insensitive' } },
      ];
    }

    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const [dbItems, totalCount] = await Promise.all([
      this.prisma.inventoryItem.findMany({
        where,
        include: {
          catalogueItem: {
            select: { id: true, name: true },
          },
        },
        orderBy: [{ isArchived: 'asc' }, { name: 'asc' }],
        skip,
        take: limit,
      }),
      this.prisma.inventoryItem.count({ where }),
    ]);

    let items = dbItems.map((item: any) => this.mapItem(item, currency));

    if (query.status) {
      items = items.filter((item: InventoryItem) => item.status === query.status);
    }

    return {
      items,
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit) || 1,
    };
  }

  async getItemById(tenantId: string, id: string): Promise<InventoryItem & { recentMovements: StockMovement[] }> {
    const currency = await this.getTenantCurrency(tenantId);
    const item = await this.prisma.inventoryItem.findFirst({
      where: { id, tenantId },
      include: {
        catalogueItem: {
          select: { id: true, name: true },
        },
        movements: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!item) {
      throw new NotFoundException(`Inventory item ${id} not found`);
    }

    const mapped = this.mapItem(item, currency);
    const recentMovements = ((item as any).movements || []).map((m: any) => this.mapMovement({ ...m, inventoryItem: item }));

    return {
      ...mapped,
      recentMovements,
    };
  }

  async createItem(
    tenantId: string,
    dto: CreateInventoryItemRequest,
    user?: { id?: string; email?: string },
  ): Promise<InventoryItem> {
    const currency = await this.getTenantCurrency(tenantId);
    const sku = dto.sku.trim().toUpperCase();

    const existingSku = await this.prisma.inventoryItem.findFirst({
      where: { tenantId, sku },
    });
    if (existingSku) {
      throw new ConflictException(`Inventory item with SKU "${sku}" already exists`);
    }

    if (dto.catalogueItemId) {
      const catItem = await this.prisma.catalogueItem.findFirst({
        where: { id: dto.catalogueItemId, tenantId },
      });
      if (!catItem) {
        throw new BadRequestException(`Catalogue item ${dto.catalogueItemId} not found`);
      }
    }

    const initialStock = dto.currentStock ?? 0;

    const created = await this.prisma.$transaction(async (tx: any) => {
      const item = await tx.inventoryItem.create({
        data: {
          tenantId,
          sku,
          name: dto.name.trim(),
          description: dto.description?.trim() || null,
          category: dto.category,
          unit: dto.unit.trim(),
          currentStock: initialStock,
          minStockLevel: dto.minStockLevel ?? 0,
          maxStockLevel: dto.maxStockLevel ?? null,
          reorderQuantity: dto.reorderQuantity ?? null,
          unitCost: dto.unitCost ?? 0,
          storageLocation: dto.storageLocation?.trim() || null,
          notes: dto.notes?.trim() || null,
          catalogueItemId: dto.catalogueItemId || null,
        },
        include: {
          catalogueItem: {
            select: { id: true, name: true },
          },
        },
      });

      if (initialStock > 0) {
        const movementNumber = await this.generateMovementNumber(tenantId);
        const signedQuantity = initialStock;
        const totalCost = (dto.unitCost ?? 0) * initialStock;

        await tx.stockMovement.create({
          data: {
            tenantId,
            movementNumber,
            inventoryItemId: item.id,
            type: 'adjustment_in',
            quantity: initialStock,
            signedQuantity,
            quantityBefore: 0,
            quantityAfter: initialStock,
            unitCost: dto.unitCost ?? 0,
            totalCost,
            referenceType: 'initial_opening_balance',
            reason: 'Opening stock intake on item creation',
            recordedBy: user?.email || user?.id || 'system',
          },
        });
      }

      return item;
    });

    this.auditLogService.record({
      scope: 'tenant',
      outcome: 'allowed',
      action: 'inventory.item.created',
      actorType: 'tenant_user',
      tenantId,
      metadata: { sku: created.sku, name: created.name, initialStock: String(initialStock) },
    });

    return this.mapItem(created, currency);
  }

  async updateItem(
    tenantId: string,
    id: string,
    dto: UpdateInventoryItemRequest,
    user?: { id?: string; email?: string },
  ): Promise<InventoryItem> {
    const currency = await this.getTenantCurrency(tenantId);
    const existing = await this.prisma.inventoryItem.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new NotFoundException(`Inventory item ${id} not found`);
    }

    if (dto.sku) {
      const nextSku = dto.sku.trim().toUpperCase();
      if (nextSku !== existing.sku) {
        const duplicate = await this.prisma.inventoryItem.findFirst({
          where: { tenantId, sku: nextSku },
        });
        if (duplicate) {
          throw new ConflictException(`SKU "${nextSku}" already in use`);
        }
      }
    }

    if (dto.catalogueItemId) {
      const catItem = await this.prisma.catalogueItem.findFirst({
        where: { id: dto.catalogueItemId, tenantId },
      });
      if (!catItem) {
        throw new BadRequestException(`Catalogue item ${dto.catalogueItemId} not found`);
      }
    }

    const updated = await this.prisma.inventoryItem.update({
      where: { id },
      data: {
        ...(dto.sku ? { sku: dto.sku.trim().toUpperCase() } : {}),
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
        ...(dto.category ? { category: dto.category } : {}),
        ...(dto.unit ? { unit: dto.unit.trim() } : {}),
        ...(dto.minStockLevel !== undefined ? { minStockLevel: dto.minStockLevel } : {}),
        ...(dto.maxStockLevel !== undefined ? { maxStockLevel: dto.maxStockLevel } : {}),
        ...(dto.reorderQuantity !== undefined ? { reorderQuantity: dto.reorderQuantity } : {}),
        ...(dto.unitCost !== undefined ? { unitCost: dto.unitCost } : {}),
        ...(dto.storageLocation !== undefined ? { storageLocation: dto.storageLocation?.trim() || null } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes?.trim() || null } : {}),
        ...(dto.catalogueItemId !== undefined ? { catalogueItemId: dto.catalogueItemId || null } : {}),
        ...(dto.isArchived !== undefined ? { isArchived: dto.isArchived } : {}),
      },
      include: {
        catalogueItem: {
          select: { id: true, name: true },
        },
      },
    });

    this.auditLogService.record({
      scope: 'tenant',
      outcome: 'allowed',
      action: 'inventory.item.updated',
      actorType: 'tenant_user',
      tenantId,
      metadata: { sku: updated.sku, name: updated.name },
    });

    return this.mapItem(updated, currency);
  }

  async archiveItem(
    tenantId: string,
    id: string,
    user?: { id?: string; email?: string },
  ): Promise<InventoryItem> {
    return this.updateItem(tenantId, id, { isArchived: true }, user);
  }

  async restoreItem(
    tenantId: string,
    id: string,
    user?: { id?: string; email?: string },
  ): Promise<InventoryItem> {
    return this.updateItem(tenantId, id, { isArchived: false }, user);
  }

  async recordMovement(
    tenantId: string,
    dto: RecordStockMovementRequest,
    user?: { id?: string; email?: string },
  ): Promise<StockMovement> {
    const item = await this.prisma.inventoryItem.findFirst({
      where: { id: dto.inventoryItemId, tenantId },
    });
    if (!item) {
      throw new NotFoundException(`Inventory item ${dto.inventoryItemId} not found`);
    }

    if (item.isArchived) {
      throw new BadRequestException(`Cannot record movement for archived inventory item "${item.name}"`);
    }

    const quantity = Math.abs(dto.quantity);
    const signedQuantity = calculateSignedQuantity(dto.type, quantity);
    const quantityBefore = Number(item.currentStock);
    const quantityAfter = quantityBefore + signedQuantity;

    if (signedQuantity < 0 && quantityAfter < -0.0001) {
      throw new BadRequestException(
        `Insufficient stock for "${item.name}". Current stock is ${quantityBefore.toFixed(2)} ${item.unit}, attempted deduction is ${quantity.toFixed(2)} ${item.unit}.`,
      );
    }

    const movementNumber = await this.generateMovementNumber(tenantId);
    const effectiveUnitCost = dto.unitCost !== undefined && dto.unitCost !== null ? dto.unitCost : Number(item.unitCost);
    const totalCost = Math.round(quantity * effectiveUnitCost * 100) / 100;

    const movement = await this.prisma.$transaction(async (tx: any) => {
      const mov = await tx.stockMovement.create({
        data: {
          tenantId,
          movementNumber,
          inventoryItemId: item.id,
          type: dto.type,
          quantity,
          signedQuantity,
          quantityBefore,
          quantityAfter: Math.max(0, quantityAfter),
          unitCost: effectiveUnitCost,
          totalCost,
          referenceType: dto.referenceType || 'manual',
          referenceId: dto.referenceId || null,
          reason: dto.reason?.trim() || null,
          recordedBy: user?.email || user?.id || 'system',
        },
        include: {
          inventoryItem: {
            select: { id: true, sku: true, name: true, unit: true },
          },
        },
      });

      await tx.inventoryItem.update({
        where: { id: item.id },
        data: {
          currentStock: Math.max(0, quantityAfter),
          ...(dto.type === 'purchase_received' && dto.unitCost !== undefined && dto.unitCost !== null
            ? { unitCost: dto.unitCost }
            : {}),
        },
      });

      return mov;
    });

    this.auditLogService.record({
      scope: 'tenant',
      outcome: 'allowed',
      action: 'inventory.movement.recorded',
      actorType: 'tenant_user',
      tenantId,
      metadata: {
        movementNumber: movement.movementNumber,
        type: movement.type,
        signedQuantity: String(movement.signedQuantity),
        itemSku: item.sku,
      },
    });

    return this.mapMovement(movement);
  }

  async getMovements(
    tenantId: string,
    params: {
      inventoryItemId?: string | undefined;
      type?: string | undefined;
      page?: number | undefined;
      limit?: number | undefined;
    },
  ): Promise<{ movements: StockMovement[]; total: number; page: number; limit: number; totalPages: number }> {
    const where: any = { tenantId };

    if (params.inventoryItemId) {
      where.inventoryItemId = params.inventoryItemId;
    }

    if (params.type) {
      where.type = params.type;
    }

    const page = params.page || 1;
    const limit = params.limit || 50;
    const skip = (page - 1) * limit;

    const [dbMovements, totalCount] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where,
        include: {
          inventoryItem: {
            select: { id: true, sku: true, name: true, unit: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.stockMovement.count({ where }),
    ]);

    return {
      movements: dbMovements.map((m: any) => this.mapMovement(m)),
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit) || 1,
    };
  }

  async getSummary(tenantId: string): Promise<InventorySummary> {
    const currency = await this.getTenantCurrency(tenantId);
    const activeItems = await this.prisma.inventoryItem.findMany({
      where: { tenantId, isArchived: false },
    });

    let totalValuation = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    const categoryMap = new Map<string, { itemCount: number; totalValuation: number }>();

    for (const item of activeItems) {
      const stock = Number(item.currentStock);
      const minStock = Number(item.minStockLevel);
      const cost = Number(item.unitCost);
      const val = calculateValuation(stock, cost);

      totalValuation += val;

      if (stock <= 0) {
        outOfStockCount++;
      } else if (stock <= minStock) {
        lowStockCount++;
      }

      const existingCat = categoryMap.get(item.category) || { itemCount: 0, totalValuation: 0 };
      categoryMap.set(item.category, {
        itemCount: existingCat.itemCount + 1,
        totalValuation: Math.round((existingCat.totalValuation + val) * 100) / 100,
      });
    }

    const categoryBreakdown = Array.from(categoryMap.entries()).map(([category, data]) => ({
      category: category as any,
      itemCount: data.itemCount,
      totalValuation: data.totalValuation,
    }));

    return {
      totalActiveSkus: activeItems.length,
      totalValuation: Math.round(totalValuation * 100) / 100,
      lowStockCount,
      outOfStockCount,
      currency,
      categoryBreakdown,
    };
  }
}
