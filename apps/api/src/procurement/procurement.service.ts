import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreatePurchaseOrderRequest,
  CreateSupplierRequest,
  ProcurementSummary,
  PurchaseOrder,
  PurchaseOrdersQuery,
  ReceivePurchaseOrderItemsRequest,
  Supplier,
  SupplierQuery,
  UpdatePurchaseOrderRequest,
  UpdateSupplierRequest,
} from '@catering/shared-types';
import {
  calculatePurchaseOrderTotals,
  calculateSignedQuantity,
  determinePurchaseOrderStatus,
} from '@catering/shared-types';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditLogService } from '../tenancy/audit-log.service.js';

@Injectable()
export class ProcurementService {
  private readonly logger = new Logger(ProcurementService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async getTenantCurrency(tenantId: string): Promise<string> {
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: { currencyCode: true },
    });
    return settings?.currencyCode || 'INR';
  }

  private async generatePoNumber(tenantId: string): Promise<string> {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prefix = `PO-${yearMonth}-`;

    const count = await this.prisma.purchaseOrder.count({
      where: {
        tenantId,
        poNumber: { startsWith: prefix },
      },
    });

    return `${prefix}${String(count + 1).padStart(4, '0')}`;
  }

  private async generateStockMovementNumber(tenantId: string): Promise<string> {
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

  private mapSupplier(item: any): Supplier {
    return {
      id: item.id,
      tenantId: item.tenantId,
      code: item.code,
      name: item.name,
      contactName: item.contactName,
      email: item.email,
      phone: item.phone,
      address: item.address,
      taxId: item.taxId,
      paymentTerms: item.paymentTerms,
      notes: item.notes,
      isArchived: item.isArchived,
      purchaseOrdersCount: item._count?.purchaseOrders ?? item.purchaseOrdersCount ?? 0,
      createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : String(item.createdAt),
      updatedAt: item.updatedAt instanceof Date ? item.updatedAt.toISOString() : String(item.updatedAt),
    };
  }

  private mapPurchaseOrder(order: any, currency: string): PurchaseOrder {
    return {
      id: order.id,
      tenantId: order.tenantId,
      poNumber: order.poNumber,
      supplierId: order.supplierId,
      supplier: order.supplier
        ? {
            id: order.supplier.id,
            code: order.supplier.code,
            name: order.supplier.name,
            contactName: order.supplier.contactName,
            email: order.supplier.email,
            phone: order.supplier.phone,
            paymentTerms: order.supplier.paymentTerms,
          }
        : undefined,
      status: order.status,
      orderDate: order.orderDate instanceof Date ? order.orderDate.toISOString() : String(order.orderDate),
      expectedDeliveryDate: order.expectedDeliveryDate
        ? order.expectedDeliveryDate instanceof Date
          ? order.expectedDeliveryDate.toISOString()
          : String(order.expectedDeliveryDate)
        : null,
      deliveryAddress: order.deliveryAddress,
      currency: order.currency || currency,
      subtotal: Number(order.subtotal ?? 0),
      taxRate: Number(order.taxRate ?? 0),
      taxAmount: Number(order.taxAmount ?? 0),
      totalAmount: Number(order.totalAmount ?? 0),
      notes: order.notes,
      internalNotes: order.internalNotes,
      lines: (order.lines || []).map((line: any) => ({
        id: line.id,
        purchaseOrderId: line.purchaseOrderId,
        inventoryItemId: line.inventoryItemId,
        inventoryItem: line.inventoryItem
          ? {
              id: line.inventoryItem.id,
              sku: line.inventoryItem.sku,
              name: line.inventoryItem.name,
              unit: line.inventoryItem.unit,
            }
          : null,
        name: line.name,
        description: line.description,
        quantityOrdered: Number(line.quantityOrdered ?? 0),
        quantityReceived: Number(line.quantityReceived ?? 0),
        unit: line.unit,
        unitPrice: Number(line.unitPrice ?? 0),
        totalAmount: Number(line.totalAmount ?? 0),
        sortOrder: line.sortOrder ?? 0,
        createdAt: line.createdAt instanceof Date ? line.createdAt.toISOString() : String(line.createdAt),
        updatedAt: line.updatedAt instanceof Date ? line.updatedAt.toISOString() : String(line.updatedAt),
      })),
      createdAt: order.createdAt instanceof Date ? order.createdAt.toISOString() : String(order.createdAt),
      updatedAt: order.updatedAt instanceof Date ? order.updatedAt.toISOString() : String(order.updatedAt),
    };
  }

  // ==========================================
  // Supplier Methods
  // ==========================================

  async getSuppliers(
    tenantId: string,
    query: SupplierQuery,
  ): Promise<{ items: Supplier[]; total: number; page: number; limit: number; totalPages: number }> {
    const where: any = { tenantId };

    if (!query.includeArchived) {
      where.isArchived = false;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
        { contactName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 50));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isArchived: 'asc' }, { name: 'asc' }],
        include: {
          _count: {
            select: { purchaseOrders: true },
          },
        },
      }),
      this.prisma.supplier.count({ where }),
    ]);

    return {
      items: items.map((s: any) => this.mapSupplier(s)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getSupplierById(tenantId: string, id: string): Promise<Supplier & { recentOrders: PurchaseOrder[] }> {
    const currency = await this.getTenantCurrency(tenantId);
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, tenantId },
      include: {
        _count: {
          select: { purchaseOrders: true },
        },
        purchaseOrders: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            lines: {
              include: {
                inventoryItem: {
                  select: { id: true, sku: true, name: true, unit: true },
                },
              },
            },
          },
        },
      },
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier ${id} not found`);
    }

    return {
      ...this.mapSupplier(supplier),
      recentOrders: supplier.purchaseOrders.map((o: any) => this.mapPurchaseOrder(o, currency)),
    };
  }

  async createSupplier(
    tenantId: string,
    dto: CreateSupplierRequest,
    user?: { id?: string; email?: string },
  ): Promise<Supplier> {
    const normalizedCode = dto.code.trim().toUpperCase();

    const existing = await this.prisma.supplier.findFirst({
      where: { tenantId, code: normalizedCode },
    });
    if (existing) {
      throw new ConflictException(`Supplier with code "${normalizedCode}" already exists`);
    }

    const created = await this.prisma.supplier.create({
      data: {
        tenantId,
        code: normalizedCode,
        name: dto.name.trim(),
        contactName: dto.contactName?.trim() || null,
        email: dto.email?.trim() || null,
        phone: dto.phone?.trim() || null,
        address: dto.address?.trim() || null,
        taxId: dto.taxId?.trim() || null,
        paymentTerms: dto.paymentTerms || 'net_30',
        notes: dto.notes?.trim() || null,
      },
      include: {
        _count: {
          select: { purchaseOrders: true },
        },
      },
    });

    this.auditLogService.record({
      scope: 'tenant',
      outcome: 'allowed',
      action: 'procurement.supplier.created',
      actorType: 'tenant_user',
      tenantId,
      metadata: { code: created.code, name: created.name },
    });

    return this.mapSupplier(created);
  }

  async updateSupplier(
    tenantId: string,
    id: string,
    dto: UpdateSupplierRequest,
    user?: { id?: string; email?: string },
  ): Promise<Supplier> {
    const existing = await this.prisma.supplier.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new NotFoundException(`Supplier ${id} not found`);
    }

    if (dto.code) {
      const normalizedCode = dto.code.trim().toUpperCase();
      if (normalizedCode !== existing.code) {
        const duplicate = await this.prisma.supplier.findFirst({
          where: { tenantId, code: normalizedCode },
        });
        if (duplicate) {
          throw new ConflictException(`Supplier with code "${normalizedCode}" already exists`);
        }
      }
    }

    const updated = await this.prisma.supplier.update({
      where: { id },
      data: {
        ...(dto.code ? { code: dto.code.trim().toUpperCase() } : {}),
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.contactName !== undefined ? { contactName: dto.contactName?.trim() || null } : {}),
        ...(dto.email !== undefined ? { email: dto.email?.trim() || null } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone?.trim() || null } : {}),
        ...(dto.address !== undefined ? { address: dto.address?.trim() || null } : {}),
        ...(dto.taxId !== undefined ? { taxId: dto.taxId?.trim() || null } : {}),
        ...(dto.paymentTerms ? { paymentTerms: dto.paymentTerms } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes?.trim() || null } : {}),
        ...(dto.isArchived !== undefined ? { isArchived: dto.isArchived } : {}),
      },
      include: {
        _count: {
          select: { purchaseOrders: true },
        },
      },
    });

    this.auditLogService.record({
      scope: 'tenant',
      outcome: 'allowed',
      action: 'procurement.supplier.updated',
      actorType: 'tenant_user',
      tenantId,
      metadata: { code: updated.code, name: updated.name },
    });

    return this.mapSupplier(updated);
  }

  async archiveSupplier(tenantId: string, id: string, user?: { id?: string; email?: string }): Promise<Supplier> {
    return this.updateSupplier(tenantId, id, { isArchived: true }, user);
  }

  async restoreSupplier(tenantId: string, id: string, user?: { id?: string; email?: string }): Promise<Supplier> {
    return this.updateSupplier(tenantId, id, { isArchived: false }, user);
  }

  // ==========================================
  // Purchase Order Methods
  // ==========================================

  async getSummary(tenantId: string): Promise<ProcurementSummary> {
    const currency = await this.getTenantCurrency(tenantId);

    const [totalOrders, draftOrders, orderedCount, partiallyReceivedCount, receivedCount, allOrders, activeSuppliersCount] =
      await Promise.all([
        this.prisma.purchaseOrder.count({ where: { tenantId } }),
        this.prisma.purchaseOrder.count({ where: { tenantId, status: 'draft' } }),
        this.prisma.purchaseOrder.count({ where: { tenantId, status: 'ordered' } }),
        this.prisma.purchaseOrder.count({ where: { tenantId, status: 'partially_received' } }),
        this.prisma.purchaseOrder.count({ where: { tenantId, status: 'received' } }),
        this.prisma.purchaseOrder.findMany({
          where: { tenantId, status: { not: 'cancelled' } },
          select: { totalAmount: true },
        }),
        this.prisma.supplier.count({ where: { tenantId, isArchived: false } }),
      ]);

    const totalSpend = allOrders.reduce((sum: number, o: any) => sum + Number(o.totalAmount || 0), 0);

    return {
      totalOrders,
      draftOrders,
      orderedCount,
      partiallyReceivedCount,
      receivedCount,
      totalSpend: Math.round(totalSpend * 100) / 100,
      activeSuppliersCount,
      currency,
    };
  }

  async getPurchaseOrders(
    tenantId: string,
    query: PurchaseOrdersQuery,
  ): Promise<{ items: PurchaseOrder[]; total: number; page: number; limit: number; totalPages: number }> {
    const currency = await this.getTenantCurrency(tenantId);
    const where: any = { tenantId };

    if (query.supplierId) {
      where.supplierId = query.supplierId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.startDate || query.endDate) {
      where.orderDate = {};
      if (query.startDate) where.orderDate.gte = new Date(query.startDate);
      if (query.endDate) where.orderDate.lte = new Date(query.endDate);
    }

    if (query.search) {
      where.OR = [
        { poNumber: { contains: query.search, mode: 'insensitive' } },
        { supplier: { name: { contains: query.search, mode: 'insensitive' } } },
        { notes: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 50));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ orderDate: 'desc' }, { createdAt: 'desc' }],
        include: {
          supplier: {
            select: { id: true, code: true, name: true, contactName: true, email: true, phone: true, paymentTerms: true },
          },
          lines: {
            include: {
              inventoryItem: {
                select: { id: true, sku: true, name: true, unit: true },
              },
            },
            orderBy: { sortOrder: 'asc' },
          },
        },
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);

    return {
      items: items.map((o: any) => this.mapPurchaseOrder(o, currency)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getPurchaseOrderById(tenantId: string, id: string): Promise<PurchaseOrder> {
    const currency = await this.getTenantCurrency(tenantId);
    const order = await this.prisma.purchaseOrder.findFirst({
      where: { id, tenantId },
      include: {
        supplier: {
          select: { id: true, code: true, name: true, contactName: true, email: true, phone: true, paymentTerms: true },
        },
        lines: {
          include: {
            inventoryItem: {
              select: { id: true, sku: true, name: true, unit: true },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Purchase order ${id} not found`);
    }

    return this.mapPurchaseOrder(order, currency);
  }

  async createPurchaseOrder(
    tenantId: string,
    dto: CreatePurchaseOrderRequest,
    user?: { id?: string; email?: string },
  ): Promise<PurchaseOrder> {
    const currency = await this.getTenantCurrency(tenantId);

    // Validate supplier
    const supplier = await this.prisma.supplier.findFirst({
      where: { id: dto.supplierId, tenantId },
    });
    if (!supplier) {
      throw new BadRequestException(`Supplier ${dto.supplierId} not found`);
    }
    if (supplier.isArchived) {
      throw new BadRequestException(`Cannot create purchase order for archived supplier "${supplier.name}"`);
    }

    // Validate inventory items if provided
    for (const line of dto.lines) {
      if (line.inventoryItemId) {
        const invItem = await this.prisma.inventoryItem.findFirst({
          where: { id: line.inventoryItemId, tenantId },
        });
        if (!invItem) {
          throw new BadRequestException(`Inventory item ${line.inventoryItemId} not found`);
        }
      }
    }

    const poNumber = await this.generatePoNumber(tenantId);
    const normalizedLines = dto.lines.map((line, idx) => {
      const unit = line.unit ? line.unit.trim() : 'kg';
      const unitPrice = line.unitPrice !== undefined ? Number(line.unitPrice) : 0;
      const quantityOrdered = Number(line.quantityOrdered);
      return {
        inventoryItemId: line.inventoryItemId || null,
        name: line.name.trim(),
        description: line.description?.trim() || null,
        quantityOrdered,
        quantityReceived: 0,
        unit,
        unitPrice,
        totalAmount: Math.round(quantityOrdered * unitPrice * 100) / 100,
        sortOrder: line.sortOrder ?? idx,
      };
    });

    const taxRate = dto.taxRate !== undefined ? Number(dto.taxRate) : 0;
    const totals = calculatePurchaseOrderTotals(normalizedLines, taxRate);

    const created = await this.prisma.purchaseOrder.create({
      data: {
        tenantId,
        poNumber,
        supplierId: dto.supplierId,
        status: 'draft',
        orderDate: dto.orderDate ? new Date(dto.orderDate) : new Date(),
        expectedDeliveryDate: dto.expectedDeliveryDate ? new Date(dto.expectedDeliveryDate) : null,
        deliveryAddress: dto.deliveryAddress?.trim() || null,
        currency,
        subtotal: totals.subtotal,
        taxRate,
        taxAmount: totals.taxAmount,
        totalAmount: totals.totalAmount,
        notes: dto.notes?.trim() || null,
        internalNotes: dto.internalNotes?.trim() || null,
        lines: {
          create: normalizedLines,
        },
      },
      include: {
        supplier: {
          select: { id: true, code: true, name: true, contactName: true, email: true, phone: true, paymentTerms: true },
        },
        lines: {
          include: {
            inventoryItem: {
              select: { id: true, sku: true, name: true, unit: true },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    this.auditLogService.record({
      scope: 'tenant',
      outcome: 'allowed',
      action: 'procurement.po.created',
      actorType: 'tenant_user',
      tenantId,
      metadata: { poNumber: created.poNumber, supplierId: created.supplierId, totalAmount: String(created.totalAmount) },
    });

    return this.mapPurchaseOrder(created, currency);
  }

  async updatePurchaseOrder(
    tenantId: string,
    id: string,
    dto: UpdatePurchaseOrderRequest,
    user?: { id?: string; email?: string },
  ): Promise<PurchaseOrder> {
    const currency = await this.getTenantCurrency(tenantId);
    const existing = await this.prisma.purchaseOrder.findFirst({
      where: { id, tenantId },
      include: { lines: true },
    });

    if (!existing) {
      throw new NotFoundException(`Purchase order ${id} not found`);
    }

    if (existing.status !== 'draft') {
      throw new BadRequestException(`Cannot modify purchase order in "${existing.status}" status. Only draft orders can be edited.`);
    }

    if (dto.supplierId && dto.supplierId !== existing.supplierId) {
      const supplier = await this.prisma.supplier.findFirst({
        where: { id: dto.supplierId, tenantId },
      });
      if (!supplier) {
        throw new BadRequestException(`Supplier ${dto.supplierId} not found`);
      }
      if (supplier.isArchived) {
        throw new BadRequestException(`Cannot assign archived supplier "${supplier.name}"`);
      }
    }

    const linesToProcess = (dto.lines || existing.lines).map((l: any, idx: number) => ({
      purchaseOrderId: id,
      inventoryItemId: l.inventoryItemId || null,
      name: l.name.trim(),
      description: l.description?.trim() || null,
      quantityOrdered: Number(l.quantityOrdered),
      quantityReceived: Number(l.quantityReceived || 0),
      unit: l.unit ? l.unit.trim() : 'kg',
      unitPrice: l.unitPrice !== undefined ? Number(l.unitPrice) : 0,
      totalAmount: Math.round(Number(l.quantityOrdered) * (l.unitPrice !== undefined ? Number(l.unitPrice) : 0) * 100) / 100,
      sortOrder: l.sortOrder ?? idx,
    }));

    const taxRate = dto.taxRate !== undefined ? Number(dto.taxRate) : Number(existing.taxRate);
    const totals = calculatePurchaseOrderTotals(linesToProcess, taxRate);

    const updated = await this.prisma.$transaction(async (tx: any) => {
      if (dto.lines) {
        await tx.purchaseOrderLine.deleteMany({
          where: { purchaseOrderId: id },
        });

        await tx.purchaseOrderLine.createMany({
          data: linesToProcess,
        });
      }

      return tx.purchaseOrder.update({
        where: { id },
        data: {
          ...(dto.supplierId ? { supplierId: dto.supplierId } : {}),
          ...(dto.orderDate ? { orderDate: new Date(dto.orderDate) } : {}),
          ...(dto.expectedDeliveryDate !== undefined
            ? { expectedDeliveryDate: dto.expectedDeliveryDate ? new Date(dto.expectedDeliveryDate) : null }
            : {}),
          ...(dto.deliveryAddress !== undefined ? { deliveryAddress: dto.deliveryAddress?.trim() || null } : {}),
          taxRate,
          subtotal: totals.subtotal,
          taxAmount: totals.taxAmount,
          totalAmount: totals.totalAmount,
          ...(dto.notes !== undefined ? { notes: dto.notes?.trim() || null } : {}),
          ...(dto.internalNotes !== undefined ? { internalNotes: dto.internalNotes?.trim() || null } : {}),
        },
        include: {
          supplier: {
            select: { id: true, code: true, name: true, contactName: true, email: true, phone: true, paymentTerms: true },
          },
          lines: {
            include: {
              inventoryItem: {
                select: { id: true, sku: true, name: true, unit: true },
              },
            },
            orderBy: { sortOrder: 'asc' },
          },
        },
      });
    });

    this.auditLogService.record({
      scope: 'tenant',
      outcome: 'allowed',
      action: 'procurement.po.updated',
      actorType: 'tenant_user',
      tenantId,
      metadata: { poNumber: updated.poNumber },
    });

    return this.mapPurchaseOrder(updated, currency);
  }

  async submitPurchaseOrder(tenantId: string, id: string, user?: { id?: string; email?: string }): Promise<PurchaseOrder> {
    const currency = await this.getTenantCurrency(tenantId);
    const existing = await this.prisma.purchaseOrder.findFirst({
      where: { id, tenantId },
      include: { lines: true },
    });

    if (!existing) {
      throw new NotFoundException(`Purchase order ${id} not found`);
    }

    if (existing.status !== 'draft') {
      throw new BadRequestException(`Only draft purchase orders can be submitted (current status: ${existing.status})`);
    }

    if (existing.lines.length === 0) {
      throw new BadRequestException('Cannot submit purchase order with no line items');
    }

    const updated = await this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'ordered' },
      include: {
        supplier: {
          select: { id: true, code: true, name: true, contactName: true, email: true, phone: true, paymentTerms: true },
        },
        lines: {
          include: {
            inventoryItem: {
              select: { id: true, sku: true, name: true, unit: true },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    this.auditLogService.record({
      scope: 'tenant',
      outcome: 'allowed',
      action: 'procurement.po.submitted',
      actorType: 'tenant_user',
      tenantId,
      metadata: { poNumber: updated.poNumber, status: 'ordered' },
    });

    return this.mapPurchaseOrder(updated, currency);
  }

  async cancelPurchaseOrder(tenantId: string, id: string, user?: { id?: string; email?: string }): Promise<PurchaseOrder> {
    const currency = await this.getTenantCurrency(tenantId);
    const existing = await this.prisma.purchaseOrder.findFirst({
      where: { id, tenantId },
      include: { lines: true },
    });

    if (!existing) {
      throw new NotFoundException(`Purchase order ${id} not found`);
    }

    if (existing.status === 'received') {
      throw new BadRequestException('Cannot cancel fully received purchase orders');
    }

    if (existing.status === 'cancelled') {
      throw new BadRequestException('Purchase order is already cancelled');
    }

    const updated = await this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'cancelled' },
      include: {
        supplier: {
          select: { id: true, code: true, name: true, contactName: true, email: true, phone: true, paymentTerms: true },
        },
        lines: {
          include: {
            inventoryItem: {
              select: { id: true, sku: true, name: true, unit: true },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    this.auditLogService.record({
      scope: 'tenant',
      outcome: 'allowed',
      action: 'procurement.po.cancelled',
      actorType: 'tenant_user',
      tenantId,
      metadata: { poNumber: updated.poNumber, status: 'cancelled' },
    });

    return this.mapPurchaseOrder(updated, currency);
  }

  async receiveItems(
    tenantId: string,
    id: string,
    dto: ReceivePurchaseOrderItemsRequest,
    user?: { id?: string; email?: string },
  ): Promise<PurchaseOrder> {
    const currency = await this.getTenantCurrency(tenantId);
    const order = await this.prisma.purchaseOrder.findFirst({
      where: { id, tenantId },
      include: {
        lines: {
          include: {
            inventoryItem: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Purchase order ${id} not found`);
    }

    if (order.status !== 'ordered' && order.status !== 'partially_received') {
      throw new BadRequestException(`Cannot receive items for purchase order in "${order.status}" status.`);
    }

    // Map of line id to item in db
    const linesMap = new Map<string, any>();
    order.lines.forEach((l: any) => linesMap.set(l.id, l));

    // Validate all items in request
    for (const receipt of dto.items) {
      const line = linesMap.get(receipt.lineId);
      if (!line) {
        throw new BadRequestException(`Purchase order line ${receipt.lineId} does not belong to PO ${order.poNumber}`);
      }
      const qtyOrdered = Number(line.quantityOrdered);
      const currentReceived = Number(line.quantityReceived);
      const remaining = qtyOrdered - currentReceived;

      if (receipt.quantityReceived > remaining + 0.0001) {
        throw new BadRequestException(
          `Cannot receive ${receipt.quantityReceived} for "${line.name}". Remaining unreceived quantity is ${remaining.toFixed(2)} ${line.unit}.`,
        );
      }
    }

    // Atomic transaction: update lines, create stock movements, increment stock
    const updated = await this.prisma.$transaction(async (tx: any) => {
      for (const receipt of dto.items) {
        const line = linesMap.get(receipt.lineId);
        const qtyReceived = Math.abs(receipt.quantityReceived);
        const newReceivedTotal = Number(line.quantityReceived) + qtyReceived;

        await tx.purchaseOrderLine.update({
          where: { id: line.id },
          data: {
            quantityReceived: newReceivedTotal,
          },
        });

        // If line is linked to inventory item, create stock movement and increment stock!
        if (line.inventoryItemId && line.inventoryItem) {
          const invItem = line.inventoryItem;
          const movementNumber = await this.generateStockMovementNumber(tenantId);
          const currentStock = Number(invItem.currentStock);
          const newStock = currentStock + qtyReceived;
          const unitCost = Number(line.unitPrice);
          const totalCost = Math.round(qtyReceived * unitCost * 100) / 100;

          await tx.stockMovement.create({
            data: {
              tenantId,
              movementNumber,
              inventoryItemId: invItem.id,
              type: 'purchase_received',
              quantity: qtyReceived,
              signedQuantity: qtyReceived,
              quantityBefore: currentStock,
              quantityAfter: newStock,
              unitCost,
              totalCost,
              referenceType: 'purchase_order',
              referenceId: order.id,
              reason: `Received against PO ${order.poNumber}${dto.notes ? `: ${dto.notes}` : ''}`,
              recordedBy: user?.email || user?.id || 'system',
            },
          });

          await tx.inventoryItem.update({
            where: { id: invItem.id },
            data: {
              currentStock: newStock,
              ...(unitCost > 0 ? { unitCost } : {}),
            },
          });
        }
      }

      // Re-fetch all lines to compute overall status
      const refreshedLines = await tx.purchaseOrderLine.findMany({
        where: { purchaseOrderId: id },
      });

      const nextStatus = determinePurchaseOrderStatus(
        refreshedLines.map((l: any) => ({
          quantityOrdered: Number(l.quantityOrdered),
          quantityReceived: Number(l.quantityReceived),
        })),
        order.status,
      );

      return tx.purchaseOrder.update({
        where: { id },
        data: {
          status: nextStatus,
        },
        include: {
          supplier: {
            select: { id: true, code: true, name: true, contactName: true, email: true, phone: true, paymentTerms: true },
          },
          lines: {
            include: {
              inventoryItem: {
                select: { id: true, sku: true, name: true, unit: true },
              },
            },
            orderBy: { sortOrder: 'asc' },
          },
        },
      });
    });

    this.auditLogService.record({
      scope: 'tenant',
      outcome: 'allowed',
      action: 'procurement.po.items_received',
      actorType: 'tenant_user',
      tenantId,
      metadata: {
        poNumber: updated.poNumber,
        newStatus: updated.status,
        itemCount: String(dto.items.length),
      },
    });

    return this.mapPurchaseOrder(updated, currency);
  }
}
