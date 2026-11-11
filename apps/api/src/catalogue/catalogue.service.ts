import type {
  CatalogueImportJob,
  CatalogueImportRequest,
  CatalogueImportResult,
  CatalogueImportRowError,
  CatalogueItem,
  CatalogueItemListResponse,
  CatalogueSearchParams,
  CreateCatalogueItemRequest,
  PricingUnit,
  UpdateCatalogueItemRequest,
} from '@catering/shared-types';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditLogService } from '../tenancy/audit-log.service.js';

const VALID_PRICING_UNITS: Set<string> = new Set([
  'per_person',
  'per_plate',
  'per_kg',
  'per_tray',
  'per_piece',
  'per_liter',
  'fixed',
]);

@Injectable()
export class CatalogueService {
  private readonly logger = new Logger(CatalogueService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async listItems(
    tenantId: string,
    filters?: CatalogueSearchParams,
  ): Promise<CatalogueItemListResponse> {
    const where: Prisma.CatalogueItemWhereInput = { tenantId };

    if (filters?.status === 'active') {
      where.isArchived = false;
    } else if (filters?.status === 'archived') {
      where.isArchived = true;
    }

    if (filters?.category && filters.category !== 'all') {
      where.category = { equals: filters.category, mode: 'insensitive' };
    }

    if (filters?.dietaryTag && filters.dietaryTag !== 'all') {
      where.dietaryTags = { has: filters.dietaryTag.toLowerCase() };
    }

    if (filters?.search?.trim()) {
      const q = filters.search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { category: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [items, total, allItemsForStats] = await Promise.all([
      this.prisma.catalogueItem.findMany({
        where,
        orderBy: [{ isArchived: 'asc' }, { category: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.catalogueItem.count({ where }),
      this.prisma.catalogueItem.findMany({
        where: { tenantId },
        select: { category: true, isArchived: true },
      }),
    ]);

    const activeCount = allItemsForStats.filter((i) => !i.isArchived).length;
    const archivedCount = allItemsForStats.filter((i) => i.isArchived).length;
    const uniqueCategories = new Set(allItemsForStats.map((i) => i.category.toLowerCase()));

    const data: CatalogueItem[] = items.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      category: item.category,
      pricingUnit: item.pricingUnit as PricingUnit,
      costPrice: item.costPrice ? Number(item.costPrice) : null,
      sellingPrice: Number(item.sellingPrice),
      dietaryTags: item.dietaryTags,
      minQuantity: item.minQuantity,
      isArchived: item.isArchived,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    }));

    return {
      data,
      total,
      stats: {
        totalItems: allItemsForStats.length,
        activeItems: activeCount,
        archivedItems: archivedCount,
        categoriesCount: uniqueCategories.size,
      },
    };
  }

  async getItemById(tenantId: string, itemId: string): Promise<CatalogueItem> {
    const item = await this.prisma.catalogueItem.findFirst({
      where: { id: itemId, tenantId },
    });

    if (!item) {
      throw new NotFoundException(`Catalogue item not found: ${itemId}`);
    }

    return {
      id: item.id,
      name: item.name,
      description: item.description,
      category: item.category,
      pricingUnit: item.pricingUnit as PricingUnit,
      costPrice: item.costPrice ? Number(item.costPrice) : null,
      sellingPrice: Number(item.sellingPrice),
      dietaryTags: item.dietaryTags,
      minQuantity: item.minQuantity,
      isArchived: item.isArchived,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }

  async createItem(
    tenantId: string,
    userId: string | undefined,
    dto: CreateCatalogueItemRequest,
  ): Promise<CatalogueItem> {
    const existing = await this.prisma.catalogueItem.findFirst({
      where: {
        tenantId,
        name: { equals: dto.name.trim(), mode: 'insensitive' },
        category: { equals: dto.category.trim(), mode: 'insensitive' },
      },
    });

    if (existing) {
      this.logger.warn(
        `Duplicate catalogue item warning: "${dto.name}" in category "${dto.category}" for tenant ${tenantId}`,
      );
    }

    const item = await this.prisma.catalogueItem.create({
      data: {
        tenantId,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        category: dto.category.trim().toLowerCase(),
        pricingUnit: dto.pricingUnit as PricingUnit,
        costPrice: dto.costPrice !== undefined ? dto.costPrice : null,
        sellingPrice: dto.sellingPrice,
        dietaryTags: (dto.dietaryTags || []).map((t) => t.trim().toLowerCase()),
        minQuantity: dto.minQuantity ?? null,
        isArchived: false,
      },
    });

    this.auditLogService.record({
      scope: 'tenant',
      tenantId,
      actorType: 'tenant_user',
      action: 'catalogue.item_created',
      outcome: 'allowed',
      metadata: { itemId: item.id, userId: userId || 'anonymous' },
    });

    return {
      id: item.id,
      name: item.name,
      description: item.description,
      category: item.category,
      pricingUnit: item.pricingUnit as PricingUnit,
      costPrice: item.costPrice ? Number(item.costPrice) : null,
      sellingPrice: Number(item.sellingPrice),
      dietaryTags: item.dietaryTags,
      minQuantity: item.minQuantity,
      isArchived: item.isArchived,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }

  async updateItem(
    tenantId: string,
    userId: string | undefined,
    itemId: string,
    dto: UpdateCatalogueItemRequest,
  ): Promise<CatalogueItem> {
    await this.getItemById(tenantId, itemId);

    const updateData: Prisma.CatalogueItemUpdateInput = {};

    if (dto.name !== undefined) {
      updateData.name = dto.name.trim();
    }
    if (dto.description !== undefined) {
      updateData.description = dto.description ? dto.description.trim() : null;
    }
    if (dto.category !== undefined) {
      updateData.category = dto.category.trim().toLowerCase();
    }
    if (dto.pricingUnit !== undefined) {
      updateData.pricingUnit = dto.pricingUnit as PricingUnit;
    }
    if (dto.costPrice !== undefined) {
      updateData.costPrice = dto.costPrice !== null ? dto.costPrice : null;
    }
    if (dto.sellingPrice !== undefined) {
      updateData.sellingPrice = dto.sellingPrice;
    }
    if (dto.dietaryTags !== undefined) {
      updateData.dietaryTags = dto.dietaryTags.map((t) => t.trim().toLowerCase());
    }
    if (dto.minQuantity !== undefined) {
      updateData.minQuantity = dto.minQuantity;
    }
    if (dto.isArchived !== undefined) {
      updateData.isArchived = dto.isArchived;
    }

    const updated = await this.prisma.catalogueItem.update({
      where: { id: itemId },
      data: updateData,
    });

    this.auditLogService.record({
      scope: 'tenant',
      tenantId,
      actorType: 'tenant_user',
      action: 'catalogue.item_updated',
      outcome: 'allowed',
      metadata: { itemId, userId: userId || 'anonymous' },
    });

    return {
      id: updated.id,
      name: updated.name,
      description: updated.description,
      category: updated.category,
      pricingUnit: updated.pricingUnit as PricingUnit,
      costPrice: updated.costPrice ? Number(updated.costPrice) : null,
      sellingPrice: Number(updated.sellingPrice),
      dietaryTags: updated.dietaryTags,
      minQuantity: updated.minQuantity,
      isArchived: updated.isArchived,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async toggleArchive(
    tenantId: string,
    userId: string | undefined,
    itemId: string,
    archive: boolean,
  ): Promise<CatalogueItem> {
    await this.getItemById(tenantId, itemId);

    const updated = await this.prisma.catalogueItem.update({
      where: { id: itemId },
      data: { isArchived: archive },
    });

    this.auditLogService.record({
      scope: 'tenant',
      tenantId,
      actorType: 'tenant_user',
      action: archive ? 'catalogue.item_archived' : 'catalogue.item_reactivated',
      outcome: 'allowed',
      metadata: { itemId, userId: userId || 'anonymous' },
    });

    return {
      id: updated.id,
      name: updated.name,
      description: updated.description,
      category: updated.category,
      pricingUnit: updated.pricingUnit as PricingUnit,
      costPrice: updated.costPrice ? Number(updated.costPrice) : null,
      sellingPrice: Number(updated.sellingPrice),
      dietaryTags: updated.dietaryTags,
      minQuantity: updated.minQuantity,
      isArchived: updated.isArchived,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async importCatalogue(
    tenantId: string,
    userId: string | undefined,
    req: CatalogueImportRequest,
  ): Promise<CatalogueImportResult> {
    const rawRows = req.rows || [];
    if (rawRows.length === 0) {
      throw new BadRequestException('Import file does not contain any rows.');
    }

    const rowErrors: CatalogueImportRowError[] = [];
    const validItemsToCreate: Array<{
      tenantId: string;
      name: string;
      description: string | null;
      category: string;
      pricingUnit: PricingUnit;
      costPrice: number | null;
      sellingPrice: number;
      dietaryTags: string[];
      minQuantity: number | null;
    }> = [];

    // Pre-fetch existing item names for duplicate heuristics
    const existingItems = await this.prisma.catalogueItem.findMany({
      where: { tenantId },
      select: { name: true, category: true },
    });

    const existingSet = new Set(
      existingItems.map((i) => `${i.category.toLowerCase()}::${i.name.toLowerCase()}`),
    );

    const batchSeenSet = new Set<string>();

    for (const [index, row] of rawRows.entries()) {
      const rowNum = index + 1;
      const errors: string[] = [];

      // Validate name
      const name = (row.name || '').trim();
      if (!name) {
        errors.push('Item name is required');
      } else if (name.length > 200) {
        errors.push('Item name exceeds 200 characters');
      }

      // Validate selling price
      const rawSelling = typeof row.sellingPrice === 'string'
        ? Number.parseFloat(row.sellingPrice.replace(/[^0-9.-]+/g, ''))
        : Number(row.sellingPrice);

      if (Number.isNaN(rawSelling) || rawSelling < 0) {
        errors.push('Selling price must be a valid non-negative number');
      }

      // Validate cost price
      let costPrice: number | null = null;
      if (row.costPrice !== undefined && row.costPrice !== null && row.costPrice !== '') {
        const rawCost = typeof row.costPrice === 'string'
          ? Number.parseFloat(row.costPrice.replace(/[^0-9.-]+/g, ''))
          : Number(row.costPrice);

        if (Number.isNaN(rawCost) || rawCost < 0) {
          errors.push('Cost price must be a valid non-negative number');
        } else {
          costPrice = rawCost;
        }
      }

      // Validate pricing unit
      const rawUnit = (row.pricingUnit || 'per_person').toLowerCase().trim();
      const pricingUnit = VALID_PRICING_UNITS.has(rawUnit)
        ? (rawUnit as PricingUnit)
        : 'per_person';

      // Category
      const category = (row.category || 'main').trim().toLowerCase();

      // Dietary tags
      let dietaryTags: string[] = [];
      if (Array.isArray(row.dietaryTags)) {
        dietaryTags = row.dietaryTags.map((t) => String(t).trim().toLowerCase()).filter(Boolean);
      } else if (typeof row.dietaryTags === 'string') {
        dietaryTags = row.dietaryTags
          .split(/[,;|]/)
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean);
      }

      // Min quantity
      let minQuantity: number | null = null;
      if (row.minQuantity !== undefined && row.minQuantity !== null && row.minQuantity !== '') {
        const q = Number(row.minQuantity);
        if (Number.isInteger(q) && q > 0) {
          minQuantity = q;
        }
      }

      // Duplicate detection in batch or existing
      const key = `${category}::${name.toLowerCase()}`;
      if (batchSeenSet.has(key)) {
        errors.push(`Duplicate item within the same import file for category "${category}"`);
      } else {
        batchSeenSet.add(key);
      }

      if (existingSet.has(key)) {
        // Warning: already exists in catalogue
        this.logger.warn(`Import warning: item "${name}" already exists in category "${category}"`);
      }

      if (errors.length > 0) {
        rowErrors.push({
          row: rowNum,
          name: name || undefined,
          errors,
        });
      } else {
        validItemsToCreate.push({
          tenantId,
          name,
          description: row.description ? row.description.trim() : null,
          category,
          pricingUnit,
          costPrice,
          sellingPrice: rawSelling,
          dietaryTags,
          minQuantity,
        });
      }
    }

    const successfulRows = validItemsToCreate.length;
    const failedRows = rowErrors.length;
    let status: 'completed' | 'failed' | 'partially_failed' = 'completed';

    if (successfulRows === 0 && failedRows > 0) {
      status = 'failed';
    } else if (failedRows > 0) {
      status = 'partially_failed';
    }

    // Persist valid items in bulk/transaction if any
    if (validItemsToCreate.length > 0) {
      await this.prisma.catalogueItem.createMany({
        data: validItemsToCreate,
      });
    }

    // Record CatalogueImportJob
    const job = await this.prisma.catalogueImportJob.create({
      data: {
        tenantId,
        status,
        filename: req.filename || 'import.csv',
        totalRows: rawRows.length,
        successfulRows,
        failedRows,
        errors: rowErrors as unknown as Prisma.InputJsonValue,
        importedById: userId || null,
      },
    });

    this.auditLogService.record({
      scope: 'tenant',
      tenantId,
      actorType: 'tenant_user',
      action: 'catalogue.bulk_imported',
      outcome: 'allowed',
      metadata: { jobId: job.id, userId: userId || 'anonymous' },
    });

    return {
      jobId: job.id,
      status,
      totalRows: rawRows.length,
      successfulRows,
      failedRows,
      errors: rowErrors,
    };
  }

  async getImportJobs(tenantId: string): Promise<CatalogueImportJob[]> {
    const jobs = await this.prisma.catalogueImportJob.findMany({
      where: { tenantId },
      include: {
        importedBy: { select: { displayName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return jobs.map((j) => ({
      id: j.id,
      status: j.status,
      filename: j.filename,
      totalRows: j.totalRows,
      successfulRows: j.successfulRows,
      failedRows: j.failedRows,
      errors: (j.errors as unknown as CatalogueImportRowError[]) || [],
      importedByName: j.importedBy?.displayName || null,
      createdAt: j.createdAt.toISOString(),
    }));
  }

  async getImportJobById(tenantId: string, jobId: string): Promise<CatalogueImportJob> {
    const job = await this.prisma.catalogueImportJob.findFirst({
      where: { id: jobId, tenantId },
      include: {
        importedBy: { select: { displayName: true } },
      },
    });

    if (!job) {
      throw new NotFoundException(`Import job not found: ${jobId}`);
    }

    return {
      id: job.id,
      status: job.status,
      filename: job.filename,
      totalRows: job.totalRows,
      successfulRows: job.successfulRows,
      failedRows: job.failedRows,
      errors: (job.errors as unknown as CatalogueImportRowError[]) || [],
      importedByName: job.importedBy?.displayName || null,
      createdAt: job.createdAt.toISOString(),
    };
  }
}
