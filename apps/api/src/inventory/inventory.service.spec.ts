import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InventoryService } from './inventory.service.js';

describe('InventoryService', () => {
  let service: InventoryService;
  let prisma: any;
  let auditLogService: any;

  const mockTenantId = 'tenant-test-123';
  const mockUserId = 'user-test-456';
  const mockUserEmail = 'chef@culinary.example';

  beforeEach(() => {
    prisma = {
      tenantSettings: {
        findUnique: vi.fn().mockResolvedValue({ currencyCode: 'INR' }),
      },
      inventoryItem: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
      stockMovement: {
        findMany: vi.fn(),
        create: vi.fn(),
        count: vi.fn(),
      },
      catalogueItem: {
        findFirst: vi.fn(),
      },
      $transaction: vi.fn((callback: any) => callback(prisma)),
    };

    auditLogService = {
      record: vi.fn().mockReturnValue(undefined),
    };

    service = new InventoryService(prisma, auditLogService);
  });

  describe('currency check and resolution', () => {
    it('should return tenant currency saved in the database', async () => {
      prisma.tenantSettings.findUnique.mockResolvedValueOnce({ currencyCode: 'USD' });
      const currency = await service.getTenantCurrency(mockTenantId);
      expect(currency).toBe('USD');
      expect(prisma.tenantSettings.findUnique).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId },
        select: { currencyCode: true },
      });
    });

    it('should fallback to INR when tenant settings currency is not defined', async () => {
      prisma.tenantSettings.findUnique.mockResolvedValueOnce(null);
      const currency = await service.getTenantCurrency(mockTenantId);
      expect(currency).toBe('INR');
    });
  });

  describe('createItem', () => {
    it('should create an inventory item with unique SKU and opening balance movement', async () => {
      prisma.inventoryItem.findFirst.mockResolvedValueOnce(null); // No existing SKU
      prisma.stockMovement.count.mockResolvedValueOnce(0); // For SM-YYYYMM-0001
      prisma.inventoryItem.create.mockResolvedValueOnce({
        id: 'item-1',
        tenantId: mockTenantId,
        sku: 'RICE-BAS-01',
        name: 'Basmati Rice Premium',
        description: 'Extra long grain aged basmati rice',
        category: 'dry_goods',
        unit: 'kg',
        currentStock: 50,
        minStockLevel: 20,
        maxStockLevel: 100,
        reorderQuantity: 30,
        unitCost: 120,
        storageLocation: 'Dry Pantry A',
        isArchived: false,
        notes: null,
        catalogueItemId: null,
        catalogueItem: null,
        createdAt: new Date('2026-11-16T10:00:00Z'),
        updatedAt: new Date('2026-11-16T10:00:00Z'),
      });

      const result = await service.createItem(
        mockTenantId,
        {
          sku: 'rice-bas-01',
          name: 'Basmati Rice Premium',
          description: 'Extra long grain aged basmati rice',
          category: 'dry_goods',
          unit: 'kg',
          currentStock: 50,
          minStockLevel: 20,
          unitCost: 120,
        },
        { id: mockUserId, email: mockUserEmail },
      );

      expect(result.sku).toBe('RICE-BAS-01');
      expect(result.currentStock).toBe(50);
      expect(result.unitCost).toBe(120);
      expect(result.valuation).toBe(6000); // 50 * 120
      expect(result.status).toBe('in_stock');
      expect(result.currency).toBe('INR');

      // Verify opening balance movement created
      expect(prisma.stockMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            inventoryItemId: 'item-1',
            type: 'adjustment_in',
            quantity: 50,
            signedQuantity: 50,
            quantityBefore: 0,
            quantityAfter: 50,
            unitCost: 120,
            totalCost: 6000,
          }),
        }),
      );
    });

    it('should throw ConflictException if SKU already exists in tenant', async () => {
      prisma.inventoryItem.findFirst.mockResolvedValueOnce({ id: 'existing-item' });

      await expect(
        service.createItem(mockTenantId, {
          sku: 'DUPLICATE-SKU',
          name: 'Item',
          category: 'dairy',
          unit: 'ltr',
          currentStock: 0,
          minStockLevel: 0,
          unitCost: 50,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('recordMovement', () => {
    it('should record a purchase_received movement and increment current stock', async () => {
      const mockItem = {
        id: 'item-1',
        tenantId: mockTenantId,
        sku: 'MILK-WHL-01',
        name: 'Whole Milk',
        unit: 'ltr',
        currentStock: 15,
        unitCost: 60,
        isArchived: false,
      };

      prisma.inventoryItem.findFirst.mockResolvedValueOnce(mockItem);
      prisma.stockMovement.count.mockResolvedValueOnce(3); // count for movementNumber
      prisma.stockMovement.create.mockImplementationOnce(({ data }: any) => ({
        ...data,
        id: 'mov-1',
        createdAt: new Date('2026-11-16T12:00:00Z'),
      }));
      prisma.inventoryItem.update.mockResolvedValueOnce({});

      const movement = await service.recordMovement(
        mockTenantId,
        {
          inventoryItemId: 'item-1',
          type: 'purchase_received',
          quantity: 25,
          unitCost: 62,
          reason: 'Weekly dairy supplier delivery',
        },
        { id: mockUserId, email: mockUserEmail },
      );

      expect(movement.signedQuantity).toBe(25);
      expect(movement.quantityBefore).toBe(15);
      expect(movement.quantityAfter).toBe(40);
      expect(movement.totalCost).toBe(1550); // 25 * 62

      expect(prisma.inventoryItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: {
          currentStock: 40,
          unitCost: 62,
        },
      });
    });

    it('should record a kitchen_consumption movement and decrement stock', async () => {
      const mockItem = {
        id: 'item-1',
        tenantId: mockTenantId,
        sku: 'MILK-WHL-01',
        name: 'Whole Milk',
        unit: 'ltr',
        currentStock: 40,
        unitCost: 62,
        isArchived: false,
      };

      prisma.inventoryItem.findFirst.mockResolvedValueOnce(mockItem);
      prisma.stockMovement.count.mockResolvedValueOnce(4);
      prisma.stockMovement.create.mockImplementationOnce(({ data }: any) => ({
        ...data,
        id: 'mov-2',
        createdAt: new Date('2026-11-16T14:00:00Z'),
      }));
      prisma.inventoryItem.update.mockResolvedValueOnce({});

      const movement = await service.recordMovement(
        mockTenantId,
        {
          inventoryItemId: 'item-1',
          type: 'kitchen_consumption',
          quantity: 10,
          reason: 'Batch prep for custard pudding',
        },
        { id: mockUserId, email: mockUserEmail },
      );

      expect(movement.signedQuantity).toBe(-10);
      expect(movement.quantityBefore).toBe(40);
      expect(movement.quantityAfter).toBe(30);

      expect(prisma.inventoryItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: {
          currentStock: 30,
        },
      });
    });

    it('should throw BadRequestException if consumption exceeds current stock', async () => {
      const mockItem = {
        id: 'item-1',
        tenantId: mockTenantId,
        sku: 'MILK-WHL-01',
        name: 'Whole Milk',
        unit: 'ltr',
        currentStock: 5,
        unitCost: 62,
        isArchived: false,
      };

      prisma.inventoryItem.findFirst.mockResolvedValueOnce(mockItem);

      await expect(
        service.recordMovement(mockTenantId, {
          inventoryItemId: 'item-1',
          type: 'kitchen_consumption',
          quantity: 20, // exceeds 5
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject recording movements on archived items', async () => {
      prisma.inventoryItem.findFirst.mockResolvedValueOnce({
        id: 'item-archived',
        tenantId: mockTenantId,
        sku: 'OLD-ITEM',
        name: 'Old Discontinued Item',
        isArchived: true,
      });

      await expect(
        service.recordMovement(mockTenantId, {
          inventoryItemId: 'item-archived',
          type: 'adjustment_in',
          quantity: 5,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getSummary', () => {
    it('should calculate valuation and stock level thresholds accurately in tenant currency', async () => {
      prisma.tenantSettings.findUnique.mockResolvedValueOnce({ currencyCode: 'INR' });
      prisma.inventoryItem.findMany.mockResolvedValueOnce([
        {
          id: '1',
          category: 'produce',
          currentStock: 10,
          minStockLevel: 5,
          unitCost: 40,
        }, // in_stock, val = 400
        {
          id: '2',
          category: 'produce',
          currentStock: 3,
          minStockLevel: 5,
          unitCost: 50,
        }, // low_stock, val = 150
        {
          id: '3',
          category: 'dairy',
          currentStock: 0,
          minStockLevel: 10,
          unitCost: 80,
        }, // out_of_stock, val = 0
      ]);

      const summary = await service.getSummary(mockTenantId);

      expect(summary.currency).toBe('INR');
      expect(summary.totalActiveSkus).toBe(3);
      expect(summary.totalValuation).toBe(550); // 400 + 150 + 0
      expect(summary.lowStockCount).toBe(1);
      expect(summary.outOfStockCount).toBe(1);
      expect(summary.categoryBreakdown.length).toBe(2);
    });
  });
});
