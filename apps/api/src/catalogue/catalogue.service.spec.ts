import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { AuditLogService } from '../tenancy/audit-log.service.js';
import { CatalogueService } from './catalogue.service.js';

describe('CatalogueService', () => {
  let service: CatalogueService;
  let prisma: Partial<PrismaService>;
  let auditLogService: Partial<AuditLogService>;

  const tenantId = '00000000-0000-0000-0000-000000000001';
  const otherTenantId = '00000000-0000-0000-0000-000000000002';
  const userId = '11111111-1111-1111-1111-111111111111';

  beforeEach(() => {
    prisma = {
      catalogueItem: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        createMany: vi.fn(),
        update: vi.fn(),
      } as unknown as PrismaService['catalogueItem'],
      catalogueItemImage: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      } as unknown as PrismaService['catalogueItemImage'],
      catalogueImportJob: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
      } as unknown as PrismaService['catalogueImportJob'],
      $transaction: vi.fn().mockImplementation((promises: Promise<unknown>[]) => Promise.all(promises)),
    };

    auditLogService = {
      record: vi.fn(),
    };

    service = new CatalogueService(
      prisma as PrismaService,
      auditLogService as AuditLogService,
    );
  });

  describe('listItems', () => {
    it('returns filtered catalogue items and statistics for tenant', async () => {
      const mockItems = [
        {
          id: 'item-1',
          name: 'Herb Crusted Salmon',
          description: 'Fresh Atlantic salmon',
          category: 'main',
          pricingUnit: 'per_person',
          costPrice: 8.5,
          sellingPrice: 19.5,
          dietaryTags: ['halal', 'gluten_free'],
          minQuantity: 10,
          isArchived: false,
          createdAt: new Date('2026-01-01T00:00:00Z'),
          updatedAt: new Date('2026-01-01T00:00:00Z'),
        },
      ];

      (prisma.catalogueItem!.findMany as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(mockItems)
        .mockResolvedValueOnce([
          { category: 'main', isArchived: false },
          { category: 'dessert', isArchived: true },
        ]);
      (prisma.catalogueItem!.count as ReturnType<typeof vi.fn>).mockResolvedValueOnce(1);

      const result = await service.listItems(tenantId, {
        category: 'main',
        status: 'active',
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.name).toBe('Herb Crusted Salmon');
      expect(result.total).toBe(1);
      expect(result.stats).toEqual({
        totalItems: 2,
        activeItems: 1,
        archivedItems: 1,
        categoriesCount: 2,
      });
    });
  });

  describe('getItemById', () => {
    it('retrieves item within tenant scope', async () => {
      (prisma.catalogueItem!.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: 'item-1',
        tenantId,
        name: 'Tiramisu',
        description: 'Classic Italian dessert',
        category: 'dessert',
        pricingUnit: 'per_portion',
        costPrice: 3.0,
        sellingPrice: 7.5,
        dietaryTags: ['vegetarian'],
        minQuantity: null,
        isArchived: false,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
      });

      const item = await service.getItemById(tenantId, 'item-1');
      expect(item.id).toBe('item-1');
      expect(item.name).toBe('Tiramisu');
    });

    it('throws NotFoundException if item does not exist or belongs to another tenant', async () => {
      (prisma.catalogueItem!.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

      await expect(service.getItemById(otherTenantId, 'item-1')).rejects.toThrow(
        'Catalogue item not found: item-1',
      );
    });
  });

  describe('createItem', () => {
    it('creates an item and logs audit event', async () => {
      (prisma.catalogueItem!.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
      (prisma.catalogueItem!.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: 'item-new',
        tenantId,
        name: 'Bruschetta',
        description: 'Toasted bread with tomatoes',
        category: 'starter',
        pricingUnit: 'per_tray',
        costPrice: 12.0,
        sellingPrice: 28.0,
        dietaryTags: ['vegetarian', 'vegan'],
        minQuantity: 2,
        isArchived: false,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
      });

      const result = await service.createItem(tenantId, userId, {
        name: 'Bruschetta',
        description: 'Toasted bread with tomatoes',
        category: 'starter',
        pricingUnit: 'per_tray',
        costPrice: 12.0,
        sellingPrice: 28.0,
        dietaryTags: ['vegetarian', 'vegan'],
        minQuantity: 2,
      });

      expect(result.id).toBe('item-new');
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'catalogue.item_created',
        }),
      );
    });
  });

  describe('toggleArchive', () => {
    it('archives item and records audit log', async () => {
      (prisma.catalogueItem!.findFirst as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          id: 'item-1',
          tenantId,
          name: 'Seasonal Soup',
          description: null,
          category: 'starter',
          pricingUnit: 'per_person',
          costPrice: null,
          sellingPrice: 5.0,
          dietaryTags: [],
          minQuantity: null,
          isArchived: false,
          images: [],
          createdAt: new Date('2026-01-01T00:00:00Z'),
          updatedAt: new Date('2026-01-01T00:00:00Z'),
        })
        .mockResolvedValueOnce({
          id: 'item-1',
          tenantId,
          name: 'Seasonal Soup',
          description: null,
          category: 'starter',
          pricingUnit: 'per_person',
          costPrice: null,
          sellingPrice: 5.0,
          dietaryTags: [],
          minQuantity: null,
          isArchived: true,
          images: [],
          createdAt: new Date('2026-01-01T00:00:00Z'),
          updatedAt: new Date('2026-01-01T00:00:00Z'),
        });

      (prisma.catalogueItem!.update as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: 'item-1',
        name: 'Seasonal Soup',
        description: null,
        category: 'starter',
        pricingUnit: 'per_person',
        costPrice: null,
        sellingPrice: 5.0,
        dietaryTags: [],
        minQuantity: null,
        isArchived: true,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
      });

      const result = await service.toggleArchive(tenantId, userId, 'item-1', true);
      expect(result.isArchived).toBe(true);
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'catalogue.item_archived',
        }),
      );
    });
  });

  describe('importCatalogue', () => {
    it('validates rows, detects duplicates within batch, and persists valid items', async () => {
      (prisma.catalogueItem!.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
        { name: 'Existing Dish', category: 'main' },
      ]);
      (prisma.catalogueItem!.createMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ count: 2 });
      (prisma.catalogueImportJob!.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: 'job-1',
        tenantId,
        status: 'partially_failed',
        filename: 'menu.csv',
        totalRows: 4,
        successfulRows: 2,
        failedRows: 2,
        errors: [],
      });

      const result = await service.importCatalogue(tenantId, userId, {
        filename: 'menu.csv',
        rows: [
          // Row 1: Valid
          {
            name: 'Beef Tenderloin',
            category: 'main',
            sellingPrice: 35.0,
            costPrice: 15.0,
            pricingUnit: 'per_person',
            dietaryTags: 'halal, gluten_free',
          },
          // Row 2: Invalid price
          {
            name: 'Invalid Item',
            category: 'main',
            sellingPrice: 'not-a-number',
          },
          // Row 3: Valid
          {
            name: 'Greek Salad',
            category: 'salad',
            sellingPrice: 8.5,
            pricingUnit: 'per_plate',
            dietaryTags: ['vegetarian'],
          },
          // Row 4: Duplicate within same batch
          {
            name: 'Beef Tenderloin',
            category: 'main',
            sellingPrice: 40.0,
          },
        ],
      });

      expect(result.totalRows).toBe(4);
      expect(result.successfulRows).toBe(2);
      expect(result.failedRows).toBe(2);
      expect(result.status).toBe('partially_failed');
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]?.row).toBe(2);
      expect(result.errors[1]?.row).toBe(4);
      expect(prisma.catalogueItem!.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ name: 'Beef Tenderloin' }),
          expect.objectContaining({ name: 'Greek Salad' }),
        ]),
      });
    });
  });

  describe('image operations', () => {
    const mockItem = {
      id: 'item-1',
      tenantId,
      name: 'Salmon',
      category: 'main',
      pricingUnit: 'per_person',
      sellingPrice: 20,
      dietaryTags: [],
      isArchived: false,
      images: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('adds an image to a dish and sets primary if first image', async () => {
      (prisma.catalogueItem!.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockItem);
      (prisma.catalogueItemImage!.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (prisma.catalogueItemImage!.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'img-1',
        itemId: 'item-1',
        url: 'https://example.com/salmon.jpg',
        caption: 'Plated dish',
        isPrimary: true,
        order: 0,
        createdAt: new Date(),
      });

      const result = await service.addImage(tenantId, userId, 'item-1', {
        url: 'https://example.com/salmon.jpg',
        caption: 'Plated dish',
      });

      expect(result.id).toBe('img-1');
      expect(result.isPrimary).toBe(true);
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'catalogue.image_added',
        }),
      );
    });

    it('sets an image as primary', async () => {
      (prisma.catalogueItem!.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockItem);
      (prisma.catalogueItemImage!.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'img-2',
        itemId: 'item-1',
        url: 'https://example.com/salmon-2.jpg',
        caption: null,
        isPrimary: false,
        order: 1,
        createdAt: new Date(),
      });

      const result = await service.setPrimaryImage(tenantId, userId, 'item-1', 'img-2');
      expect(result.isPrimary).toBe(true);
      expect(prisma.catalogueItemImage!.updateMany).toHaveBeenCalledWith({
        where: { itemId: 'item-1' },
        data: { isPrimary: false },
      });
    });

    it('deletes an image', async () => {
      (prisma.catalogueItem!.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockItem);
      (prisma.catalogueItemImage!.findFirst as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          id: 'img-1',
          itemId: 'item-1',
          isPrimary: false,
        })
        .mockResolvedValueOnce(null);
      (prisma.catalogueItemImage!.delete as ReturnType<typeof vi.fn>).mockResolvedValue({});

      const result = await service.deleteImage(tenantId, userId, 'item-1', 'img-1');
      expect(result.success).toBe(true);
      expect(prisma.catalogueItemImage!.delete).toHaveBeenCalledWith({
        where: { id: 'img-1' },
      });
    });
  });
});
