import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProcurementService } from './procurement.service.js';

describe('ProcurementService', () => {
  let service: ProcurementService;
  let prisma: any;
  let auditLogService: any;

  const mockTenantId = 'tenant-test-123';
  const mockUserId = 'user-test-456';
  const mockUserEmail = 'buyer@culinary.example';

  beforeEach(() => {
    prisma = {
      tenantSettings: {
        findUnique: vi.fn().mockResolvedValue({ currencyCode: 'INR' }),
      },
      supplier: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
      purchaseOrder: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
      purchaseOrderLine: {
        findMany: vi.fn(),
        createMany: vi.fn(),
        update: vi.fn(),
        deleteMany: vi.fn(),
      },
      inventoryItem: {
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      stockMovement: {
        create: vi.fn(),
        count: vi.fn().mockResolvedValue(0),
      },
      $transaction: vi.fn((callback: any) => callback(prisma)),
    };

    auditLogService = {
      record: vi.fn().mockReturnValue(undefined),
    };

    service = new ProcurementService(prisma, auditLogService);
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

    it('should default to INR if no currency setting found', async () => {
      prisma.tenantSettings.findUnique.mockResolvedValueOnce(null);
      const currency = await service.getTenantCurrency(mockTenantId);
      expect(currency).toBe('INR');
    });
  });

  describe('supplier management', () => {
    it('should create a supplier with normalized uppercase code', async () => {
      prisma.supplier.findFirst.mockResolvedValueOnce(null);
      prisma.supplier.create.mockResolvedValueOnce({
        id: 'sup-1',
        tenantId: mockTenantId,
        code: 'SUP-001',
        name: 'Organic Farm Fresh',
        contactName: 'John Farmer',
        email: 'john@farmfresh.example',
        phone: '+91 9876543210',
        address: 'Nashik, Maharashtra',
        taxId: '27AAAAA0000A1Z5',
        paymentTerms: 'net_30',
        notes: 'Delivers daily 6 AM',
        isArchived: false,
        _count: { purchaseOrders: 0 },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.createSupplier(
        mockTenantId,
        {
          code: 'sup-001',
          name: 'Organic Farm Fresh',
          contactName: 'John Farmer',
          email: 'john@farmfresh.example',
          phone: '+91 9876543210',
          address: 'Nashik, Maharashtra',
          taxId: '27AAAAA0000A1Z5',
          paymentTerms: 'net_30',
          notes: 'Delivers daily 6 AM',
        },
        { id: mockUserId, email: mockUserEmail },
      );

      expect(result.code).toBe('SUP-001');
      expect(result.name).toBe('Organic Farm Fresh');
      expect(prisma.supplier.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: mockTenantId,
            code: 'SUP-001',
            name: 'Organic Farm Fresh',
          }),
        }),
      );
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'procurement.supplier.created',
          tenantId: mockTenantId,
        }),
      );
    });

    it('should throw ConflictException if supplier code already exists for tenant', async () => {
      prisma.supplier.findFirst.mockResolvedValueOnce({ id: 'sup-existing', code: 'SUP-001' });

      await expect(
        service.createSupplier(mockTenantId, {
          code: 'SUP-001',
          name: 'Another Supplier',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should update and archive supplier properly', async () => {
      prisma.supplier.findFirst.mockResolvedValueOnce({
        id: 'sup-1',
        tenantId: mockTenantId,
        code: 'SUP-001',
        name: 'Old Name',
      });
      prisma.supplier.update.mockResolvedValueOnce({
        id: 'sup-1',
        tenantId: mockTenantId,
        code: 'SUP-001',
        name: 'Updated Name',
        isArchived: true,
        _count: { purchaseOrders: 2 },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const archived = await service.archiveSupplier(mockTenantId, 'sup-1', { id: mockUserId });
      expect(archived.isArchived).toBe(true);
      expect(prisma.supplier.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'sup-1' },
          data: expect.objectContaining({ isArchived: true }),
        }),
      );
    });
  });

  describe('purchase order management', () => {
    const mockSupplier = {
      id: 'sup-1',
      code: 'SUP-001',
      name: 'Dairy Best Supplies',
      isArchived: false,
    };

    it('should create purchase order with sequential number, line calculations, and tenant currency', async () => {
      prisma.supplier.findFirst.mockResolvedValueOnce(mockSupplier);
      prisma.purchaseOrder.count.mockResolvedValueOnce(0); // PO count for number generation

      prisma.purchaseOrder.create.mockResolvedValueOnce({
        id: 'po-1',
        tenantId: mockTenantId,
        poNumber: 'PO-202611-0001',
        supplierId: 'sup-1',
        status: 'draft',
        orderDate: new Date('2026-11-17'),
        expectedDeliveryDate: new Date('2026-11-19'),
        deliveryAddress: 'Central Kitchen, Bay 4',
        currency: 'INR',
        subtotal: 5000,
        taxRate: 5,
        taxAmount: 250,
        totalAmount: 5250,
        notes: 'Morning delivery before 7 AM',
        internalNotes: null,
        supplier: mockSupplier,
        lines: [
          {
            id: 'pol-1',
            purchaseOrderId: 'po-1',
            inventoryItemId: 'inv-item-1',
            name: 'Cow Milk Full Cream',
            description: null,
            quantityOrdered: 100,
            quantityReceived: 0,
            unit: 'ltr',
            unitPrice: 50,
            totalAmount: 5000,
            sortOrder: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.createPurchaseOrder(
        mockTenantId,
        {
          supplierId: 'sup-1',
          expectedDeliveryDate: '2026-11-19',
          deliveryAddress: 'Central Kitchen, Bay 4',
          taxRate: 5,
          notes: 'Morning delivery before 7 AM',
          lines: [
            {
              inventoryItemId: undefined,
              name: 'Cow Milk Full Cream',
              quantityOrdered: 100,
              unit: 'ltr',
              unitPrice: 50,
            },
          ],
        },
        { id: mockUserId, email: mockUserEmail },
      );

      expect(result.poNumber).toBe('PO-202611-0001');
      expect(result.status).toBe('draft');
      expect(result.currency).toBe('INR');
      expect(result.subtotal).toBe(5000);
      expect(result.taxAmount).toBe(250);
      expect(result.totalAmount).toBe(5250);
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'procurement.po.created',
          tenantId: mockTenantId,
        }),
      );
    });

    it('should reject creating PO for archived supplier', async () => {
      prisma.supplier.findFirst.mockResolvedValueOnce({
        ...mockSupplier,
        isArchived: true,
      });

      await expect(
        service.createPurchaseOrder(mockTenantId, {
          supplierId: 'sup-1',
          lines: [{ name: 'Potatoes', quantityOrdered: 50, unit: 'kg', unitPrice: 20 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should submit draft purchase order to ordered status', async () => {
      prisma.purchaseOrder.findFirst.mockResolvedValueOnce({
        id: 'po-1',
        tenantId: mockTenantId,
        status: 'draft',
        lines: [{ id: 'pol-1', name: 'Item 1' }],
      });
      prisma.purchaseOrder.update.mockResolvedValueOnce({
        id: 'po-1',
        tenantId: mockTenantId,
        poNumber: 'PO-202611-0001',
        status: 'ordered',
        currency: 'INR',
        lines: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.submitPurchaseOrder(mockTenantId, 'po-1', { id: mockUserId });
      expect(result.status).toBe('ordered');
      expect(prisma.purchaseOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'po-1' },
          data: { status: 'ordered' },
        }),
      );
    });

    it('should reject submitting non-draft purchase order', async () => {
      prisma.purchaseOrder.findFirst.mockResolvedValueOnce({
        id: 'po-1',
        tenantId: mockTenantId,
        status: 'ordered',
        lines: [{ id: 'pol-1' }],
      });

      await expect(service.submitPurchaseOrder(mockTenantId, 'po-1')).rejects.toThrow(BadRequestException);
    });

    it('should cancel purchase order in draft or ordered status', async () => {
      prisma.purchaseOrder.findFirst.mockResolvedValueOnce({
        id: 'po-1',
        tenantId: mockTenantId,
        status: 'ordered',
        lines: [],
      });
      prisma.purchaseOrder.update.mockResolvedValueOnce({
        id: 'po-1',
        tenantId: mockTenantId,
        poNumber: 'PO-202611-0001',
        status: 'cancelled',
        currency: 'INR',
        lines: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.cancelPurchaseOrder(mockTenantId, 'po-1', { id: mockUserId });
      expect(result.status).toBe('cancelled');
    });

    it('should reject cancelling already received purchase order', async () => {
      prisma.purchaseOrder.findFirst.mockResolvedValueOnce({
        id: 'po-1',
        tenantId: mockTenantId,
        status: 'received',
        lines: [],
      });

      await expect(service.cancelPurchaseOrder(mockTenantId, 'po-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('receiving goods and inventory integration', () => {
    it('should atomically receive items, record StockMovement, increment Inventory stock, and transition status to partially_received', async () => {
      const mockOrder = {
        id: 'po-1',
        tenantId: mockTenantId,
        poNumber: 'PO-202611-0005',
        status: 'ordered',
        lines: [
          {
            id: 'pol-1',
            inventoryItemId: 'inv-item-1',
            name: 'Basmati Rice Premium',
            quantityOrdered: 100,
            quantityReceived: 0,
            unit: 'kg',
            unitPrice: 85,
            inventoryItem: {
              id: 'inv-item-1',
              sku: 'RICE-001',
              currentStock: 20,
              unitCost: 80,
            },
          },
        ],
      };

      prisma.purchaseOrder.findFirst.mockResolvedValueOnce(mockOrder);
      prisma.stockMovement.count.mockResolvedValueOnce(0); // movement number generation

      // Inside transaction:
      prisma.purchaseOrderLine.findMany.mockResolvedValueOnce([
        {
          id: 'pol-1',
          quantityOrdered: 100,
          quantityReceived: 40, // partial
        },
      ]);

      prisma.purchaseOrder.update.mockResolvedValueOnce({
        id: 'po-1',
        tenantId: mockTenantId,
        poNumber: 'PO-202611-0005',
        status: 'partially_received',
        currency: 'INR',
        lines: [
          {
            id: 'pol-1',
            quantityOrdered: 100,
            quantityReceived: 40,
            unit: 'kg',
            unitPrice: 85,
            totalAmount: 8500,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.receiveItems(
        mockTenantId,
        'po-1',
        {
          items: [{ lineId: 'pol-1', quantityReceived: 40 }],
          notes: 'Batch #B-9021',
        },
        { id: mockUserId, email: mockUserEmail },
      );

      expect(result.status).toBe('partially_received');

      // Verify stock movement was created
      expect(prisma.stockMovement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: mockTenantId,
          inventoryItemId: 'inv-item-1',
          type: 'purchase_received',
          quantity: 40,
          signedQuantity: 40,
          quantityBefore: 20,
          quantityAfter: 60,
          unitCost: 85,
          totalCost: 3400,
          referenceType: 'purchase_order',
          referenceId: 'po-1',
        }),
      });

      // Verify inventory item currentStock was incremented from 20 -> 60 and unitCost updated
      expect(prisma.inventoryItem.update).toHaveBeenCalledWith({
        where: { id: 'inv-item-1' },
        data: expect.objectContaining({
          currentStock: 60,
          unitCost: 85,
        }),
      });

      // Verify audit log
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'procurement.po.items_received',
          tenantId: mockTenantId,
        }),
      );
    });

    it('should transition status to received when all lines are fully received', async () => {
      const mockOrder = {
        id: 'po-1',
        tenantId: mockTenantId,
        poNumber: 'PO-202611-0005',
        status: 'ordered',
        lines: [
          {
            id: 'pol-1',
            inventoryItemId: null,
            name: 'Paper Napkins',
            quantityOrdered: 50,
            quantityReceived: 0,
            unit: 'pack',
            unitPrice: 10,
          },
        ],
      };

      prisma.purchaseOrder.findFirst.mockResolvedValueOnce(mockOrder);

      prisma.purchaseOrderLine.findMany.mockResolvedValueOnce([
        {
          id: 'pol-1',
          quantityOrdered: 50,
          quantityReceived: 50, // fully received!
        },
      ]);

      prisma.purchaseOrder.update.mockResolvedValueOnce({
        id: 'po-1',
        tenantId: mockTenantId,
        poNumber: 'PO-202611-0005',
        status: 'received',
        currency: 'INR',
        lines: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.receiveItems(
        mockTenantId,
        'po-1',
        {
          items: [{ lineId: 'pol-1', quantityReceived: 50 }],
        },
        { id: mockUserId },
      );

      expect(result.status).toBe('received');
    });

    it('should throw BadRequestException if attempting to receive more than remaining quantity', async () => {
      const mockOrder = {
        id: 'po-1',
        tenantId: mockTenantId,
        poNumber: 'PO-202611-0005',
        status: 'ordered',
        lines: [
          {
            id: 'pol-1',
            name: 'Sugar',
            quantityOrdered: 50,
            quantityReceived: 40,
            unit: 'kg',
          },
        ],
      };

      prisma.purchaseOrder.findFirst.mockResolvedValueOnce(mockOrder);

      await expect(
        service.receiveItems(mockTenantId, 'po-1', {
          items: [{ lineId: 'pol-1', quantityReceived: 15 }], // 15 > (50 - 40)
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('procurement summary', () => {
    it('should compute KPI counts, total spend, and active suppliers', async () => {
      prisma.purchaseOrder.count
        .mockResolvedValueOnce(12) // totalOrders
        .mockResolvedValueOnce(3) // draft
        .mockResolvedValueOnce(4) // ordered
        .mockResolvedValueOnce(2) // partiallyReceived
        .mockResolvedValueOnce(3); // received

      prisma.purchaseOrder.findMany.mockResolvedValueOnce([
        { totalAmount: 1000 },
        { totalAmount: 2500.5 },
        { totalAmount: 300 },
      ]);

      prisma.supplier.count.mockResolvedValueOnce(8); // active suppliers

      const summary = await service.getSummary(mockTenantId);

      expect(summary.totalOrders).toBe(12);
      expect(summary.draftOrders).toBe(3);
      expect(summary.orderedCount).toBe(4);
      expect(summary.partiallyReceivedCount).toBe(2);
      expect(summary.receivedCount).toBe(3);
      expect(summary.totalSpend).toBe(3800.5);
      expect(summary.activeSuppliersCount).toBe(8);
      expect(summary.currency).toBe('INR');
    });
  });
});
