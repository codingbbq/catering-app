import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateDailyMealOrderRequest,
  CreateDailyMealPlanRequest,
  DailyMealOrderDetail,
  DailyMealOrderFilterParams,
  DailyMealOrderListItem,
  DailyMealOrderListResponse,
  DailyMealOrderSlotStats,
  DailyMealOrderStatus,
  DailyMealOrderStats,
  DailyMealPlanDetail,
  DailyMealPlanListItem,
  DailyMealPlanStatus,
  DailyMealSlot,
  DayOfWeek,
  GenerateOrdersFromPlanRequest,
  GenerateOrdersResult,
  UpdateDailyMealOrderRequest,
  UpdateDailyMealOrderStatusRequest,
  UpdateDailyMealPlanRequest,
} from '@catering/shared-types';
import { calculateDailyMealOrderTotals } from '@catering/shared-types';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditLogService } from '../tenancy/audit-log.service.js';
import { InvoicesService } from '../invoices/invoices.service.js';

@Injectable()
export class DailyMealOrdersService {
  private readonly logger = new Logger(DailyMealOrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly invoicesService: InvoicesService,
  ) {}

  private async generateOrderNumber(tenantId: string): Promise<string> {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prefix = `DMO-${yearMonth}-`;

    const count = await this.prisma.dailyMealOrder.count({
      where: {
        tenantId,
        orderNumber: { startsWith: prefix },
      },
    });

    return `${prefix}${String(count + 1).padStart(4, '0')}`;
  }

  private async generatePlanNumber(tenantId: string): Promise<string> {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prefix = `DMP-${yearMonth}-`;

    const count = await this.prisma.dailyMealPlan.count({
      where: {
        tenantId,
        planNumber: { startsWith: prefix },
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

  private mapOrderListItem(order: any): DailyMealOrderListItem {
    return {
      id: order.id,
      tenantId: order.tenantId,
      orderNumber: order.orderNumber,
      status: order.status as DailyMealOrderStatus,
      customerId: order.customerId,
      customerName: order.customer?.name ?? 'Unknown Customer',
      customerEmail: order.customer?.email ?? null,
      customerPhone: order.customer?.phone ?? null,
      planId: order.planId ?? null,
      planName: order.plan?.name ?? null,
      menuId: order.menuId ?? null,
      menuName: order.menu?.name ?? null,
      serviceDate: order.serviceDate.toISOString(),
      serviceSlot: order.serviceSlot as DailyMealSlot,
      deliveryAddress: order.deliveryAddress ?? null,
      deliveryNotes: order.deliveryNotes ?? null,
      dietaryNotes: order.dietaryNotes ?? null,
      currency: order.currency,
      subtotal: Number(order.subtotal),
      taxRate: Number(order.taxRate),
      taxAmount: Number(order.taxAmount),
      discountAmount: Number(order.discountAmount),
      totalAmount: Number(order.totalAmount),
      totalQuantity: Number(order.totalQuantity),
      lineCount: order.lines?.length ?? 0,
      invoiceCount: order.invoices?.length ?? 0,
      invoices: (order.invoices || []).map((inv: any) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        status: inv.status,
        totalAmount: Number(inv.totalAmount),
        balanceDue: Number(inv.balanceDue),
      })),
      notes: order.notes ?? null,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    };
  }

  private mapOrderDetail(order: any): DailyMealOrderDetail {
    const base = this.mapOrderListItem(order);
    return {
      ...base,
      internalNotes: order.internalNotes ?? null,
      customer: order.customer
        ? {
            id: order.customer.id,
            name: order.customer.name,
            email: order.customer.email ?? null,
            phone: order.customer.phone ?? null,
            company: order.customer.company ?? null,
          }
        : undefined,
      menu: order.menu
        ? {
            id: order.menu.id,
            name: order.menu.name,
          }
        : null,
      plan: order.plan
        ? {
            id: order.plan.id,
            name: order.plan.name,
            planNumber: order.plan.planNumber,
          }
        : null,
      lines: (order.lines || []).map((li: any) => ({
        id: li.id,
        orderId: li.orderId,
        catalogueItemId: li.catalogueItemId ?? null,
        catalogueItemName: li.catalogueItem?.name,
        name: li.name,
        description: li.description ?? null,
        quantity: Number(li.quantity),
        unitPrice: Number(li.unitPrice),
        totalAmount: Number(li.totalAmount),
        dietaryNotes: li.dietaryNotes ?? null,
        packagingNotes: li.packagingNotes ?? null,
        sortOrder: li.sortOrder ?? 0,
        createdAt: li.createdAt?.toISOString(),
        updatedAt: li.updatedAt?.toISOString(),
      })),
    };
  }

  private mapPlanListItem(plan: any): DailyMealPlanListItem {
    return {
      id: plan.id,
      tenantId: plan.tenantId,
      planNumber: plan.planNumber,
      name: plan.name,
      status: plan.status as DailyMealPlanStatus,
      customerId: plan.customerId,
      customerName: plan.customer?.name ?? 'Unknown Customer',
      customerEmail: plan.customer?.email ?? null,
      customerPhone: plan.customer?.phone ?? null,
      serviceSlot: plan.serviceSlot as DailyMealSlot,
      daysOfWeek: (plan.daysOfWeek || []) as DayOfWeek[],
      startDate: plan.startDate.toISOString(),
      endDate: plan.endDate?.toISOString() ?? null,
      defaultMenuId: plan.defaultMenuId ?? null,
      defaultMenuName: plan.defaultMenu?.name ?? null,
      defaultQuantity: Number(plan.defaultQuantity),
      defaultUnitPrice: Number(plan.defaultUnitPrice),
      deliveryAddress: plan.deliveryAddress ?? null,
      deliveryNotes: plan.deliveryNotes ?? null,
      dietaryNotes: plan.dietaryNotes ?? null,
      notes: plan.notes ?? null,
      ordersCount: plan._count?.orders ?? (plan.orders ? plan.orders.length : 0),
      createdAt: plan.createdAt.toISOString(),
      updatedAt: plan.updatedAt.toISOString(),
    };
  }

  // ==========================================
  // Daily Meal Orders
  // ==========================================

  async listOrders(
    tenantId: string,
    params?: DailyMealOrderFilterParams,
  ): Promise<DailyMealOrderListResponse> {
    const where: any = { tenantId };

    if (params?.status && params.status !== 'all') {
      where.status = params.status;
    }

    if (params?.serviceSlot && params.serviceSlot !== 'all') {
      where.serviceSlot = params.serviceSlot;
    }

    if (params?.customerId) {
      where.customerId = params.customerId;
    }

    if (params?.planId) {
      where.planId = params.planId;
    }

    if (params?.serviceDate) {
      const d = new Date(params.serviceDate);
      const start = new Date(d);
      start.setHours(0, 0, 0, 0);
      const end = new Date(d);
      end.setHours(23, 59, 59, 999);
      where.serviceDate = { gte: start, lte: end };
    } else if (params?.fromDate || params?.toDate) {
      where.serviceDate = {};
      if (params.fromDate) {
        const from = new Date(params.fromDate);
        from.setHours(0, 0, 0, 0);
        where.serviceDate.gte = from;
      }
      if (params.toDate) {
        const to = new Date(params.toDate);
        to.setHours(23, 59, 59, 999);
        where.serviceDate.lte = to;
      }
    }

    if (params?.search && params.search.trim()) {
      const q = params.search.trim();
      where.OR = [
        { orderNumber: { contains: q, mode: 'insensitive' } },
        { customer: { name: { contains: q, mode: 'insensitive' } } },
        { deliveryAddress: { contains: q, mode: 'insensitive' } },
      ];
    }

    const page = params?.page || 1;
    const limit = params?.limit || 20;
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      this.prisma.dailyMealOrder.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, email: true, phone: true } },
          plan: { select: { id: true, name: true, planNumber: true } },
          menu: { select: { id: true, name: true } },
          lines: true,
          invoices: {
            select: {
              id: true,
              invoiceNumber: true,
              status: true,
              totalAmount: true,
              balanceDue: true,
            },
          },
        },
        orderBy: [{ serviceDate: 'asc' }, { serviceSlot: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.dailyMealOrder.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items: orders.map((o: any) => this.mapOrderListItem(o)),
      total,
      page,
      limit,
      totalPages,
    };
  }

  async getOrderStats(
    tenantId: string,
    dateStr?: string,
    fromDateStr?: string,
    toDateStr?: string,
  ): Promise<DailyMealOrderStats> {
    const tenantCurrency = await this.getTenantCurrency(tenantId);
    const where: any = { tenantId };

    if (dateStr) {
      const target = new Date(dateStr);
      const start = new Date(target);
      start.setHours(0, 0, 0, 0);
      const end = new Date(target);
      end.setHours(23, 59, 59, 999);
      where.serviceDate = { gte: start, lte: end };
    } else if (fromDateStr || toDateStr) {
      where.serviceDate = {};
      if (fromDateStr) {
        const from = new Date(fromDateStr);
        from.setHours(0, 0, 0, 0);
        where.serviceDate.gte = from;
      }
      if (toDateStr) {
        const to = new Date(toDateStr);
        to.setHours(23, 59, 59, 999);
        where.serviceDate.lte = to;
      }
    }

    const orders = await this.prisma.dailyMealOrder.findMany({
      where,
      select: {
        id: true,
        status: true,
        serviceSlot: true,
        totalQuantity: true,
        totalAmount: true,
      },
    });

    const slots: DailyMealSlot[] = [
      'breakfast',
      'morning_tea',
      'lunch',
      'afternoon_tea',
      'dinner',
      'snack',
    ];

    const slotMap = new Map<DailyMealSlot, { orderCount: number; totalQuantity: number; totalAmount: number }>();
    slots.forEach((s) => slotMap.set(s, { orderCount: 0, totalQuantity: 0, totalAmount: 0 }));

    let totalQuantity = 0;
    let totalRevenue = 0;
    let draftCount = 0;
    let confirmedCount = 0;
    let inPreparationCount = 0;
    let dispatchedCount = 0;
    let deliveredCount = 0;
    let cancelledCount = 0;

    orders.forEach((o: any) => {
      const qty = Number(o.totalQuantity);
      const amt = Number(o.totalAmount);

      totalQuantity += qty;
      totalRevenue += amt;

      switch (o.status) {
        case 'draft':
          draftCount++;
          break;
        case 'confirmed':
          confirmedCount++;
          break;
        case 'in_preparation':
          inPreparationCount++;
          break;
        case 'dispatched':
          dispatchedCount++;
          break;
        case 'delivered':
          deliveredCount++;
          break;
        case 'cancelled':
          cancelledCount++;
          break;
      }

      const slotStats = slotMap.get(o.serviceSlot as DailyMealSlot);
      if (slotStats) {
        slotStats.orderCount++;
        slotStats.totalQuantity += qty;
        slotStats.totalAmount += amt;
      }
    });

    const bySlot: DailyMealOrderSlotStats[] = slots.map((s) => {
      const data = slotMap.get(s)!;
      return {
        slot: s,
        orderCount: data.orderCount,
        totalQuantity: Math.round(data.totalQuantity * 100) / 100,
        totalAmount: Math.round(data.totalAmount * 100) / 100,
      };
    });

    return {
      date: dateStr,
      totalOrders: orders.length,
      totalQuantity: Math.round(totalQuantity * 100) / 100,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      draftCount,
      confirmedCount,
      inPreparationCount,
      dispatchedCount,
      deliveredCount,
      cancelledCount,
      bySlot,
      currency: tenantCurrency,
    };
  }

  async getOrder(tenantId: string, id: string): Promise<DailyMealOrderDetail> {
    const order = await this.prisma.dailyMealOrder.findFirst({
      where: { id, tenantId },
      include: {
        customer: true,
        plan: { select: { id: true, name: true, planNumber: true } },
        menu: { select: { id: true, name: true } },
        lines: {
          include: { catalogueItem: { select: { id: true, name: true } } },
          orderBy: { sortOrder: 'asc' },
        },
        invoices: {
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
            totalAmount: true,
            balanceDue: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Daily meal order ${id} not found`);
    }

    return this.mapOrderDetail(order);
  }

  async createOrder(
    tenantId: string,
    userId: string | undefined,
    dto: CreateDailyMealOrderRequest,
  ): Promise<DailyMealOrderDetail> {
    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, tenantId },
    });
    if (!customer) {
      throw new BadRequestException(`Customer ${dto.customerId} not found`);
    }

    if (dto.planId) {
      const plan = await this.prisma.dailyMealPlan.findFirst({
        where: { id: dto.planId, tenantId },
      });
      if (!plan) {
        throw new BadRequestException(`Daily meal plan ${dto.planId} not found`);
      }
    }

    if (dto.menuId) {
      const menu = await this.prisma.menu.findFirst({
        where: { id: dto.menuId, tenantId },
      });
      if (!menu) {
        throw new BadRequestException(`Menu ${dto.menuId} not found`);
      }
    }

    const tenantCurrency = await this.getTenantCurrency(tenantId);
    const orderNumber = await this.generateOrderNumber(tenantId);
    const totals = calculateDailyMealOrderTotals(dto.lines, dto.taxRate, dto.discountAmount);

    const serviceDate = new Date(dto.serviceDate);

    const created = await this.prisma.$transaction(async (tx) => {
      return tx.dailyMealOrder.create({
        data: {
          tenantId,
          orderNumber,
          status: 'draft',
          customerId: dto.customerId,
          planId: dto.planId ?? null,
          menuId: dto.menuId ?? null,
          serviceDate,
          serviceSlot: dto.serviceSlot,
          deliveryAddress: dto.deliveryAddress?.trim() || customer.address || null,
          deliveryNotes: dto.deliveryNotes?.trim() || null,
          dietaryNotes: dto.dietaryNotes?.trim() || null,
          currency: tenantCurrency,
          subtotal: totals.subtotal,
          taxRate: totals.taxRate,
          taxAmount: totals.taxAmount,
          discountAmount: totals.discountAmount,
          totalAmount: totals.totalAmount,
          totalQuantity: totals.totalQuantity,
          notes: dto.notes?.trim() || null,
          internalNotes: dto.internalNotes?.trim() || null,
          lines: {
            create: dto.lines.map((l, index) => ({
              catalogueItemId: l.catalogueItemId ?? null,
              name: l.name.trim(),
              description: l.description?.trim() || null,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              totalAmount: Math.round(l.quantity * l.unitPrice * 100) / 100,
              dietaryNotes: l.dietaryNotes?.trim() || null,
              packagingNotes: l.packagingNotes?.trim() || null,
              sortOrder: l.sortOrder ?? index,
            })),
          },
        },
        include: {
          customer: true,
          plan: { select: { id: true, name: true, planNumber: true } },
          menu: { select: { id: true, name: true } },
          lines: {
            include: { catalogueItem: { select: { id: true, name: true } } },
            orderBy: { sortOrder: 'asc' },
          },
          invoices: true,
        },
      });
    });

    this.auditLogService.record({
      scope: 'tenant',
      tenantId,
      actorType: userId ? 'tenant_user' : 'system',
      action: 'daily_meal_order.created',
      outcome: 'allowed',
      metadata: {
        orderId: created.id,
        orderNumber: created.orderNumber,
        customerId: created.customerId,
        totalAmount: String(Number(created.totalAmount)),
        totalQuantity: String(Number(created.totalQuantity)),
        currency: created.currency,
      },
    });

    return this.mapOrderDetail(created);
  }

  async updateOrder(
    tenantId: string,
    userId: string | undefined,
    id: string,
    dto: UpdateDailyMealOrderRequest,
  ): Promise<DailyMealOrderDetail> {
    const existing = await this.prisma.dailyMealOrder.findFirst({
      where: { id, tenantId },
      include: { lines: true },
    });

    if (!existing) {
      throw new NotFoundException(`Daily meal order ${id} not found`);
    }

    if (dto.customerId && dto.customerId !== existing.customerId) {
      const cust = await this.prisma.customer.findFirst({
        where: { id: dto.customerId, tenantId },
      });
      if (!cust) {
        throw new BadRequestException(`Customer ${dto.customerId} not found`);
      }
    }

    if (dto.menuId) {
      const menu = await this.prisma.menu.findFirst({
        where: { id: dto.menuId, tenantId },
      });
      if (!menu) {
        throw new BadRequestException(`Menu ${dto.menuId} not found`);
      }
    }

    const linesToCalculate = dto.lines || existing.lines.map((li: any) => ({
      quantity: Number(li.quantity),
      unitPrice: Number(li.unitPrice),
    }));

    const taxRate = dto.taxRate !== undefined ? dto.taxRate : Number(existing.taxRate);
    const discountAmount = dto.discountAmount !== undefined ? dto.discountAmount : Number(existing.discountAmount);
    const totals = calculateDailyMealOrderTotals(linesToCalculate, taxRate, discountAmount);

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.lines) {
        await tx.dailyMealOrderLine.deleteMany({
          where: { orderId: id },
        });

        await tx.dailyMealOrderLine.createMany({
          data: dto.lines.map((l, index) => ({
            orderId: id,
            catalogueItemId: l.catalogueItemId ?? null,
            name: l.name.trim(),
            description: l.description?.trim() || null,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            totalAmount: Math.round(l.quantity * l.unitPrice * 100) / 100,
            dietaryNotes: l.dietaryNotes?.trim() || null,
            packagingNotes: l.packagingNotes?.trim() || null,
            sortOrder: l.sortOrder ?? index,
          })),
        });
      }

      const dataToUpdate: any = {
        menuId: dto.menuId !== undefined ? dto.menuId : existing.menuId,
        serviceDate: dto.serviceDate ? new Date(dto.serviceDate) : existing.serviceDate,
        serviceSlot: dto.serviceSlot || existing.serviceSlot,
        deliveryAddress: dto.deliveryAddress !== undefined ? dto.deliveryAddress : existing.deliveryAddress,
        deliveryNotes: dto.deliveryNotes !== undefined ? dto.deliveryNotes : existing.deliveryNotes,
        dietaryNotes: dto.dietaryNotes !== undefined ? dto.dietaryNotes : existing.dietaryNotes,
        subtotal: totals.subtotal,
        taxRate: totals.taxRate,
        taxAmount: totals.taxAmount,
        discountAmount: totals.discountAmount,
        totalAmount: totals.totalAmount,
        totalQuantity: totals.totalQuantity,
        notes: dto.notes !== undefined ? dto.notes : existing.notes,
        internalNotes: dto.internalNotes !== undefined ? dto.internalNotes : existing.internalNotes,
      };

      if (dto.customerId) {
        dataToUpdate.customerId = dto.customerId;
      }

      return tx.dailyMealOrder.update({
        where: { id },
        data: dataToUpdate,
        include: {
          customer: true,
          plan: { select: { id: true, name: true, planNumber: true } },
          menu: { select: { id: true, name: true } },
          lines: {
            include: { catalogueItem: { select: { id: true, name: true } } },
            orderBy: { sortOrder: 'asc' },
          },
          invoices: true,
        },
      });
    });

    this.auditLogService.record({
      scope: 'tenant',
      tenantId,
      actorType: userId ? 'tenant_user' : 'system',
      action: 'daily_meal_order.updated',
      outcome: 'allowed',
      metadata: {
        orderId: updated.id,
        orderNumber: updated.orderNumber,
        totalAmount: String(Number(updated.totalAmount)),
      },
    });

    return this.mapOrderDetail(updated);
  }

  async updateOrderStatus(
    tenantId: string,
    userId: string | undefined,
    id: string,
    dto: UpdateDailyMealOrderStatusRequest,
  ): Promise<DailyMealOrderDetail> {
    const existing = await this.prisma.dailyMealOrder.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new NotFoundException(`Daily meal order ${id} not found`);
    }

    const updated = await this.prisma.dailyMealOrder.update({
      where: { id },
      data: {
        status: dto.status,
        notes: dto.notes ? `${existing.notes ? existing.notes + '\n' : ''}[Status Note]: ${dto.notes}` : existing.notes,
      },
      include: {
        customer: true,
        plan: { select: { id: true, name: true, planNumber: true } },
        menu: { select: { id: true, name: true } },
        lines: {
          include: { catalogueItem: { select: { id: true, name: true } } },
          orderBy: { sortOrder: 'asc' },
        },
        invoices: true,
      },
    });

    this.auditLogService.record({
      scope: 'tenant',
      tenantId,
      actorType: userId ? 'tenant_user' : 'system',
      action: 'daily_meal_order.status_updated',
      outcome: 'allowed',
      metadata: {
        orderId: updated.id,
        orderNumber: updated.orderNumber,
        previousStatus: existing.status,
        newStatus: updated.status,
      },
    });

    return this.mapOrderDetail(updated);
  }

  async createInvoiceForOrder(
    tenantId: string,
    userId: string | undefined,
    id: string,
    dto?: { title?: string; dueDate?: string; notes?: string },
  ) {
    return this.invoicesService.createInvoiceFromDailyMealOrder(tenantId, userId, {
      orderId: id,
      title: dto?.title,
      dueDate: dto?.dueDate,
      notes: dto?.notes,
    });
  }

  // ==========================================
  // Daily Meal Plans (Standing Recurring Subscriptions)
  // ==========================================

  async listPlans(tenantId: string): Promise<DailyMealPlanListItem[]> {
    const plans = await this.prisma.dailyMealPlan.findMany({
      where: { tenantId },
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        defaultMenu: { select: { id: true, name: true } },
        _count: { select: { orders: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return plans.map((p: any) => this.mapPlanListItem(p));
  }

  async getPlan(tenantId: string, id: string): Promise<DailyMealPlanDetail> {
    const plan = await this.prisma.dailyMealPlan.findFirst({
      where: { id, tenantId },
      include: {
        customer: true,
        defaultMenu: true,
        orders: {
          take: 5,
          orderBy: { serviceDate: 'desc' },
        },
        _count: { select: { orders: true } },
      },
    });

    if (!plan) {
      throw new NotFoundException(`Daily meal plan ${id} not found`);
    }

    const base = this.mapPlanListItem(plan);
    return {
      ...base,
      customer: plan.customer
        ? {
            id: plan.customer.id,
            name: plan.customer.name,
            email: plan.customer.email ?? null,
            phone: plan.customer.phone ?? null,
          }
        : undefined,
      defaultMenu: plan.defaultMenu
        ? {
            id: plan.defaultMenu.id,
            name: plan.defaultMenu.name,
          }
        : null,
    };
  }

  async createPlan(
    tenantId: string,
    userId: string | undefined,
    dto: CreateDailyMealPlanRequest,
  ): Promise<DailyMealPlanDetail> {
    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, tenantId },
    });
    if (!customer) {
      throw new BadRequestException(`Customer ${dto.customerId} not found`);
    }

    if (dto.defaultMenuId) {
      const menu = await this.prisma.menu.findFirst({
        where: { id: dto.defaultMenuId, tenantId },
      });
      if (!menu) {
        throw new BadRequestException(`Menu ${dto.defaultMenuId} not found`);
      }
    }

    const planNumber = await this.generatePlanNumber(tenantId);
    const startDate = new Date(dto.startDate);
    const endDate = dto.endDate ? new Date(dto.endDate) : null;

    const plan = await this.prisma.dailyMealPlan.create({
      data: {
        tenantId,
        planNumber,
        name: dto.name.trim(),
        status: 'active',
        customerId: dto.customerId,
        serviceSlot: dto.serviceSlot,
        daysOfWeek: dto.daysOfWeek,
        startDate,
        endDate,
        defaultMenuId: dto.defaultMenuId ?? null,
        defaultQuantity: dto.defaultQuantity,
        defaultUnitPrice: dto.defaultUnitPrice,
        deliveryAddress: dto.deliveryAddress?.trim() || customer.address || null,
        deliveryNotes: dto.deliveryNotes?.trim() || null,
        dietaryNotes: dto.dietaryNotes?.trim() || null,
        notes: dto.notes?.trim() || null,
      },
      include: {
        customer: true,
        defaultMenu: true,
        _count: { select: { orders: true } },
      },
    });

    this.auditLogService.record({
      scope: 'tenant',
      tenantId,
      actorType: userId ? 'tenant_user' : 'system',
      action: 'daily_meal_plan.created',
      outcome: 'allowed',
      metadata: {
        planId: plan.id,
        planNumber: plan.planNumber,
        name: plan.name,
        customerId: plan.customerId,
      },
    });

    return this.getPlan(tenantId, plan.id);
  }

  async updatePlan(
    tenantId: string,
    userId: string | undefined,
    id: string,
    dto: UpdateDailyMealPlanRequest,
  ): Promise<DailyMealPlanDetail> {
    const existing = await this.prisma.dailyMealPlan.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new NotFoundException(`Daily meal plan ${id} not found`);
    }

    if (dto.defaultMenuId) {
      const menu = await this.prisma.menu.findFirst({
        where: { id: dto.defaultMenuId, tenantId },
      });
      if (!menu) {
        throw new BadRequestException(`Menu ${dto.defaultMenuId} not found`);
      }
    }

    const updated = await this.prisma.dailyMealPlan.update({
      where: { id },
      data: {
        name: dto.name !== undefined ? dto.name.trim() : existing.name,
        status: dto.status || existing.status,
        serviceSlot: dto.serviceSlot || existing.serviceSlot,
        daysOfWeek: dto.daysOfWeek || existing.daysOfWeek,
        startDate: dto.startDate ? new Date(dto.startDate) : existing.startDate,
        endDate: dto.endDate !== undefined ? (dto.endDate ? new Date(dto.endDate) : null) : existing.endDate,
        defaultMenuId: dto.defaultMenuId !== undefined ? dto.defaultMenuId : existing.defaultMenuId,
        defaultQuantity: dto.defaultQuantity !== undefined ? dto.defaultQuantity : existing.defaultQuantity,
        defaultUnitPrice: dto.defaultUnitPrice !== undefined ? dto.defaultUnitPrice : existing.defaultUnitPrice,
        deliveryAddress: dto.deliveryAddress !== undefined ? dto.deliveryAddress : existing.deliveryAddress,
        deliveryNotes: dto.deliveryNotes !== undefined ? dto.deliveryNotes : existing.deliveryNotes,
        dietaryNotes: dto.dietaryNotes !== undefined ? dto.dietaryNotes : existing.dietaryNotes,
        notes: dto.notes !== undefined ? dto.notes : existing.notes,
      },
      include: {
        customer: true,
        defaultMenu: true,
        _count: { select: { orders: true } },
      },
    });

    this.auditLogService.record({
      scope: 'tenant',
      tenantId,
      actorType: userId ? 'tenant_user' : 'system',
      action: 'daily_meal_plan.updated',
      outcome: 'allowed',
      metadata: {
        planId: updated.id,
        planNumber: updated.planNumber,
        status: updated.status,
      },
    });

    return this.getPlan(tenantId, id);
  }

  async generateOrdersFromPlan(
    tenantId: string,
    userId: string | undefined,
    planId: string,
    dto: GenerateOrdersFromPlanRequest,
  ): Promise<GenerateOrdersResult> {
    const plan = await this.prisma.dailyMealPlan.findFirst({
      where: { id: planId, tenantId },
      include: {
        customer: true,
        defaultMenu: true,
      },
    });

    if (!plan) {
      throw new NotFoundException(`Daily meal plan ${planId} not found`);
    }

    if (plan.status !== 'active') {
      throw new BadRequestException(`Cannot generate orders for non-active plan (${plan.status})`);
    }

    const from = new Date(dto.fromDate);
    from.setHours(0, 0, 0, 0);

    const to = new Date(dto.toDate);
    to.setHours(23, 59, 59, 999);

    if (from > to) {
      throw new BadRequestException('fromDate must be on or before toDate');
    }

    const diffDays = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 31) {
      throw new BadRequestException('Batch order generation limited to a maximum of 31 days per run');
    }

    const dayNameMap: Record<number, DayOfWeek> = {
      0: 'sunday',
      1: 'monday',
      2: 'tuesday',
      3: 'wednesday',
      4: 'thursday',
      5: 'friday',
      6: 'saturday',
    };

    const planDays = new Set(plan.daysOfWeek as DayOfWeek[]);
    const tenantCurrency = await this.getTenantCurrency(tenantId);

    const createdOrderNumbers: string[] = [];
    const skippedDates: string[] = [];

    const curr = new Date(from);
    while (curr <= to) {
      const dayOfWeek = dayNameMap[curr.getDay()];
      const dateStr = curr.toISOString().split('T')[0];

      if (!dayOfWeek || !planDays.has(dayOfWeek)) {
        curr.setDate(curr.getDate() + 1);
        continue;
      }

      // Check plan validity bounds
      const dayStart = new Date(curr);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(curr);
      dayEnd.setHours(23, 59, 59, 999);

      if (dayStart < plan.startDate) {
        skippedDates.push(`${dateStr} (Before plan start date)`);
        curr.setDate(curr.getDate() + 1);
        continue;
      }

      if (plan.endDate && dayEnd > plan.endDate) {
        skippedDates.push(`${dateStr} (After plan end date)`);
        curr.setDate(curr.getDate() + 1);
        continue;
      }

      // Check if order already exists for this customer, slot, and day
      const existing = await this.prisma.dailyMealOrder.findFirst({
        where: {
          tenantId,
          customerId: plan.customerId,
          serviceSlot: plan.serviceSlot,
          serviceDate: { gte: dayStart, lte: dayEnd },
        },
      });

      if (existing) {
        if (!dto.overwriteExisting) {
          skippedDates.push(`${dateStr} (Order ${existing.orderNumber} already exists)`);
          curr.setDate(curr.getDate() + 1);
          continue;
        }
      }

      // Generate order
      const orderNumber = await this.generateOrderNumber(tenantId);
      const qty = Number(plan.defaultQuantity) || 1;
      const unitPrice = Number(plan.defaultUnitPrice) || 0;
      const lineName = plan.defaultMenu
        ? `${plan.defaultMenu.name} Standard Package`
        : `${plan.name} Portion`;

      const totals = calculateDailyMealOrderTotals(
        [{ quantity: qty, unitPrice }],
        5, // 5% default tax
        0,
      );

      const orderDate = new Date(curr);
      orderDate.setHours(12, 0, 0, 0);

      const newOrder = await this.prisma.dailyMealOrder.create({
        data: {
          tenantId,
          orderNumber,
          status: 'confirmed',
          customerId: plan.customerId,
          planId: plan.id,
          menuId: plan.defaultMenuId,
          serviceDate: orderDate,
          serviceSlot: plan.serviceSlot,
          deliveryAddress: plan.deliveryAddress,
          deliveryNotes: plan.deliveryNotes,
          dietaryNotes: plan.dietaryNotes,
          currency: tenantCurrency,
          subtotal: totals.subtotal,
          taxRate: totals.taxRate,
          taxAmount: totals.taxAmount,
          discountAmount: totals.discountAmount,
          totalAmount: totals.totalAmount,
          totalQuantity: totals.totalQuantity,
          notes: `Batch generated from recurring plan ${plan.planNumber} (${plan.name})`,
          lines: {
            create: [
              {
                name: lineName,
                description: `Recurring meal delivery for ${plan.name}`,
                quantity: qty,
                unitPrice,
                totalAmount: Math.round(qty * unitPrice * 100) / 100,
                dietaryNotes: plan.dietaryNotes,
                sortOrder: 0,
              },
            ],
          },
        },
      });

      createdOrderNumbers.push(newOrder.orderNumber);
      curr.setDate(curr.getDate() + 1);
    }

    this.auditLogService.record({
      scope: 'tenant',
      tenantId,
      actorType: userId ? 'tenant_user' : 'system',
      action: 'daily_meal_plan.orders_generated',
      outcome: 'allowed',
      metadata: {
        planId: plan.id,
        planNumber: plan.planNumber,
        generatedCount: String(createdOrderNumbers.length),
        skippedCount: String(skippedDates.length),
      },
    });

    return {
      planId,
      generatedCount: createdOrderNumbers.length,
      skippedDates,
      createdOrderNumbers,
    };
  }
}
