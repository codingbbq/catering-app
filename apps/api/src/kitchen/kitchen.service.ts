import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateKitchenPlanRequest,
  CreateKitchenTaskItem,
  KitchenPlansQuery,
  KitchenProductionPlan,
  KitchenStation,
  KitchenSummary,
  KitchenTask,
  RecordKitchenConsumptionRequest,
  UpdateKitchenPlanRequest,
  UpdateKitchenTaskRequest,
} from '@catering/shared-types';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditLogService } from '../tenancy/audit-log.service.js';

@Injectable()
export class KitchenService {
  private readonly logger = new Logger(KitchenService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  private async generatePlanNumber(tenantId: string): Promise<string> {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prefix = `KPP-${yearMonth}-`;

    const count = await this.prisma.kitchenProductionPlan.count({
      where: {
        tenantId,
        planNumber: { startsWith: prefix },
      },
    });

    return `${prefix}${String(count + 1).padStart(4, '0')}`;
  }

  private mapTask(task: any): KitchenTask {
    return {
      id: task.id,
      tenantId: task.tenantId,
      planId: task.planId,
      taskNumber: task.taskNumber,
      title: task.title,
      station: task.station as KitchenStation,
      status: task.status,
      targetQuantity: task.targetQuantity ? Number(task.targetQuantity) : null,
      unit: task.unit ?? null,
      dueTime: task.dueTime ?? null,
      assignedTo: task.assignedTo ?? null,
      dietaryAlerts: task.dietaryAlerts ?? null,
      notes: task.notes ?? null,
      sortOrder: task.sortOrder ?? 0,
      completedAt: task.completedAt ? task.completedAt.toISOString() : null,
      completedBy: task.completedBy ?? null,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    };
  }

  private mapPlan(plan: any): KitchenProductionPlan {
    return {
      id: plan.id,
      tenantId: plan.tenantId,
      planNumber: plan.planNumber,
      title: plan.title,
      status: plan.status,
      source: plan.source,
      planDate: plan.planDate.toISOString(),
      serviceSlot: plan.serviceSlot ?? null,
      estimatedServings: plan.estimatedServings ?? 1,
      bookingId: plan.bookingId ?? null,
      dailyMealOrderId: plan.dailyMealOrderId ?? null,
      venueNotes: plan.venueNotes ?? null,
      dietaryNotes: plan.dietaryNotes ?? null,
      notes: plan.notes ?? null,
      tasks: (plan.tasks ?? []).map((t: any) => this.mapTask(t)),
      booking: plan.booking
        ? {
            id: plan.booking.id,
            bookingNumber: plan.booking.bookingNumber,
            title: plan.booking.title,
            guestCount: plan.booking.guestCount ?? null,
            customer: plan.booking.customer
              ? {
                  id: plan.booking.customer.id,
                  name: plan.booking.customer.name,
                }
              : undefined,
          }
        : null,
      dailyMealOrder: plan.dailyMealOrder
        ? {
            id: plan.dailyMealOrder.id,
            orderNumber: plan.dailyMealOrder.orderNumber,
            serviceDate: plan.dailyMealOrder.serviceDate.toISOString(),
            serviceSlot: plan.dailyMealOrder.serviceSlot,
            customer: plan.dailyMealOrder.customer
              ? {
                  id: plan.dailyMealOrder.customer.id,
                  name: plan.dailyMealOrder.customer.name,
                }
              : undefined,
          }
        : null,
      createdAt: plan.createdAt.toISOString(),
      updatedAt: plan.updatedAt.toISOString(),
    };
  }

  async getPlans(
    tenantId: string,
    query: KitchenPlansQuery,
  ): Promise<{
    plans: KitchenProductionPlan[];
    total: number;
    page: number;
    limit: number;
  }> {
    const where: any = { tenantId };

    if (query.date) {
      const start = new Date(query.date);
      start.setUTCHours(0, 0, 0, 0);
      const end = new Date(query.date);
      end.setUTCHours(23, 59, 59, 999);
      where.planDate = { gte: start, lte: end };
    } else if (query.startDate || query.endDate) {
      where.planDate = {};
      if (query.startDate) {
        const start = new Date(query.startDate);
        start.setUTCHours(0, 0, 0, 0);
        where.planDate.gte = start;
      }
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setUTCHours(23, 59, 59, 999);
        where.planDate.lte = end;
      }
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.source) {
      where.source = query.source;
    }

    if (query.station) {
      where.tasks = {
        some: {
          station: query.station,
        },
      };
    }

    if (query.search) {
      const term = query.search.trim();
      where.OR = [
        { planNumber: { contains: term, mode: 'insensitive' } },
        { title: { contains: term, mode: 'insensitive' } },
        { venueNotes: { contains: term, mode: 'insensitive' } },
        { dietaryNotes: { contains: term, mode: 'insensitive' } },
      ];
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    const [total, records] = await Promise.all([
      this.prisma.kitchenProductionPlan.count({ where }),
      this.prisma.kitchenProductionPlan.findMany({
        where,
        include: {
          tasks: {
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          },
          booking: {
            select: {
              id: true,
              bookingNumber: true,
              title: true,
              guestCount: true,
              customer: { select: { id: true, name: true } },
            },
          },
          dailyMealOrder: {
            select: {
              id: true,
              orderNumber: true,
              serviceDate: true,
              serviceSlot: true,
              customer: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: [{ planDate: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
    ]);

    return {
      plans: records.map((r: any) => this.mapPlan(r)),
      total,
      page,
      limit,
    };
  }

  async getSummary(tenantId: string, dateStr?: string): Promise<KitchenSummary> {
    const targetDate = dateStr ? new Date(dateStr) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const plans = await this.prisma.kitchenProductionPlan.findMany({
      where: {
        tenantId,
        planDate: { gte: startOfDay, lte: endOfDay },
      },
      include: {
        tasks: true,
      },
    });

    const totalPlans = plans.length;
    let scheduledPlans = 0;
    let inProgressPlans = 0;
    let completedPlans = 0;
    let totalServings = 0;
    let totalTasks = 0;
    let completedTasks = 0;
    let pendingTasks = 0;

    const stationWorkload: Record<string, number> = {
      prep: 0,
      hot_kitchen: 0,
      cold_kitchen: 0,
      bakery_pastry: 0,
      assembly_packing: 0,
      beverages: 0,
      other: 0,
    };

    for (const plan of plans) {
      if (plan.status === 'scheduled') scheduledPlans++;
      else if (plan.status === 'in_progress') inProgressPlans++;
      else if (plan.status === 'completed') completedPlans++;

      totalServings += plan.estimatedServings ?? 0;

      for (const task of plan.tasks) {
        totalTasks++;
        if (task.status === 'completed') {
          completedTasks++;
        } else {
          pendingTasks++;
        }

        const station = task.station as string;
        if (stationWorkload[station] !== undefined) {
          stationWorkload[station]++;
        } else {
          stationWorkload[station] = 1;
        }
      }
    }

    return {
      date: targetDate.toISOString().split('T')[0]!,
      totalPlans,
      scheduledPlans,
      inProgressPlans,
      completedPlans,
      totalTasks,
      completedTasks,
      pendingTasks,
      totalServings,
      stationWorkload,
    };
  }

  async getPlanById(tenantId: string, id: string): Promise<KitchenProductionPlan> {
    const plan = await this.prisma.kitchenProductionPlan.findFirst({
      where: { id, tenantId },
      include: {
        tasks: {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
        booking: {
          include: {
            customer: true,
            schedules: { orderBy: { sortOrder: 'asc' } },
            quotation: {
              include: {
                revisions: {
                  orderBy: { revisionNumber: 'desc' },
                  take: 1,
                  include: {
                    items: { orderBy: { sortOrder: 'asc' } },
                  },
                },
              },
            },
          },
        },
        dailyMealOrder: {
          include: {
            customer: true,
            lines: { orderBy: { sortOrder: 'asc' } },
          },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException(`Kitchen production plan ${id} not found`);
    }

    return this.mapPlan(plan);
  }

  async createPlan(
    tenantId: string,
    dto: CreateKitchenPlanRequest,
    user?: { id?: string; displayName?: string },
  ): Promise<KitchenProductionPlan> {
    const planNumber = await this.generatePlanNumber(tenantId);
    const planDate = new Date(dto.planDate);

    // Initial task preparation
    const taskItems: CreateKitchenTaskItem[] = [...(dto.tasks || [])];

    // Auto-generate prep items if empty and booking source is selected
    if (taskItems.length === 0 && dto.source === 'booking' && dto.bookingId) {
      const booking = await this.prisma.booking.findFirst({
        where: { id: dto.bookingId, tenantId },
        include: {
          quotation: {
            include: {
              revisions: {
                orderBy: { revisionNumber: 'desc' },
                take: 1,
                include: { items: true },
              },
            },
          },
        },
      });

      if (booking) {
        const latestRevision = booking.quotation?.revisions[0];
        if (latestRevision && latestRevision.items.length > 0) {
          latestRevision.items.forEach((item: any, idx: number) => {
            taskItems.push({
              title: `Prepare: ${item.name}`,
              station: 'hot_kitchen',
              targetQuantity: Number(item.quantity || booking.guestCount || 1),
              unit: item.unit || 'portions',
              notes: item.description || undefined,
              sortOrder: idx + 1,
            });
          });
        } else {
          taskItems.push(
            {
              title: `Mise-en-place & Ingredient Prep for ${booking.title}`,
              station: 'prep',
              targetQuantity: booking.guestCount || 1,
              unit: 'portions',
              sortOrder: 1,
            },
            {
              title: `Main Kitchen Cookery & Assembly for ${booking.title}`,
              station: 'hot_kitchen',
              targetQuantity: booking.guestCount || 1,
              unit: 'portions',
              sortOrder: 2,
            },
            {
              title: `Packaging & Plating Quality Check`,
              station: 'assembly_packing',
              targetQuantity: booking.guestCount || 1,
              unit: 'portions',
              sortOrder: 3,
            },
          );
        }
      }
    }

    // Auto-generate items if daily meal order source is selected
    if (taskItems.length === 0 && dto.source === 'daily_meal_order' && dto.dailyMealOrderId) {
      const order = await this.prisma.dailyMealOrder.findFirst({
        where: { id: dto.dailyMealOrderId, tenantId },
        include: { lines: true },
      });

      if (order && order.lines.length > 0) {
        order.lines.forEach((line: any, idx: number) => {
          taskItems.push({
            title: `Meal Prep: ${line.name}`,
            station: 'assembly_packing',
            targetQuantity: Number(line.quantity),
            unit: 'portions',
            dietaryAlerts: line.dietaryNotes || undefined,
            notes: line.packagingNotes || undefined,
            sortOrder: idx + 1,
          });
        });
      }
    }

    // Default fallback task if still zero
    if (taskItems.length === 0) {
      taskItems.push({
        title: `Kitchen Prep: ${dto.title}`,
        station: 'prep',
        targetQuantity: dto.estimatedServings || 1,
        unit: 'portions',
        sortOrder: 1,
      });
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const plan = await tx.kitchenProductionPlan.create({
        data: {
          tenantId,
          planNumber,
          title: dto.title,
          status: 'scheduled',
          source: dto.source,
          planDate,
          serviceSlot: dto.serviceSlot ?? null,
          estimatedServings: dto.estimatedServings ?? 1,
          bookingId: dto.bookingId ?? null,
          dailyMealOrderId: dto.dailyMealOrderId ?? null,
          venueNotes: dto.venueNotes ?? null,
          dietaryNotes: dto.dietaryNotes ?? null,
          notes: dto.notes ?? null,
          tasks: {
            create: taskItems.map((t, idx) => ({
              tenantId,
              taskNumber: `TK-${String(idx + 1).padStart(2, '0')}`,
              title: t.title,
              station: t.station,
              status: 'pending',
              targetQuantity: t.targetQuantity ?? null,
              unit: t.unit ?? 'portions',
              dueTime: t.dueTime ?? null,
              assignedTo: t.assignedTo ?? null,
              dietaryAlerts: t.dietaryAlerts ?? null,
              notes: t.notes ?? null,
              sortOrder: t.sortOrder ?? idx + 1,
            })),
          },
        },
        include: {
          tasks: {
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          },
          booking: {
            select: {
              id: true,
              bookingNumber: true,
              title: true,
              guestCount: true,
              customer: { select: { id: true, name: true } },
            },
          },
          dailyMealOrder: {
            select: {
              id: true,
              orderNumber: true,
              serviceDate: true,
              serviceSlot: true,
              customer: { select: { id: true, name: true } },
            },
          },
        },
      });

      return plan;
    });

    this.auditLogService.record({
      scope: 'tenant',
      outcome: 'allowed',
      action: 'kitchen_plan_created',
      actorType: 'tenant_user',
      tenantId,
      metadata: {
        planNumber: created.planNumber,
        title: created.title,
        source: created.source,
        taskCount: String(created.tasks.length),
      },
    });

    return this.mapPlan(created);
  }

  async updatePlan(
    tenantId: string,
    id: string,
    dto: UpdateKitchenPlanRequest,
    user?: { id?: string; displayName?: string },
  ): Promise<KitchenProductionPlan> {
    const existing = await this.prisma.kitchenProductionPlan.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new NotFoundException(`Kitchen production plan ${id} not found`);
    }

    const data: any = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.planDate !== undefined) data.planDate = new Date(dto.planDate);
    if (dto.serviceSlot !== undefined) data.serviceSlot = dto.serviceSlot;
    if (dto.estimatedServings !== undefined) data.estimatedServings = dto.estimatedServings;
    if (dto.venueNotes !== undefined) data.venueNotes = dto.venueNotes;
    if (dto.dietaryNotes !== undefined) data.dietaryNotes = dto.dietaryNotes;
    if (dto.notes !== undefined) data.notes = dto.notes;

    const updated = await this.prisma.kitchenProductionPlan.update({
      where: { id },
      data,
      include: {
        tasks: {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
        booking: {
          select: {
            id: true,
            bookingNumber: true,
            title: true,
            guestCount: true,
            customer: { select: { id: true, name: true } },
          },
        },
        dailyMealOrder: {
          select: {
            id: true,
            orderNumber: true,
            serviceDate: true,
            serviceSlot: true,
            customer: { select: { id: true, name: true } },
          },
        },
      },
    });

    this.auditLogService.record({
      scope: 'tenant',
      outcome: 'allowed',
      action: 'kitchen_plan_updated',
      actorType: 'tenant_user',
      tenantId,
      metadata: {
        planNumber: updated.planNumber,
      },
    });

    return this.mapPlan(updated);
  }

  async addTask(
    tenantId: string,
    planId: string,
    dto: CreateKitchenTaskItem,
    user?: { id?: string; displayName?: string },
  ): Promise<KitchenTask> {
    const plan = await this.prisma.kitchenProductionPlan.findFirst({
      where: { id: planId, tenantId },
    });

    if (!plan) {
      throw new NotFoundException(`Kitchen production plan ${planId} not found`);
    }

    const count = await this.prisma.kitchenTask.count({
      where: { planId, tenantId },
    });

    const taskNumber = `TK-${String(count + 1).padStart(2, '0')}`;

    const task = await this.prisma.kitchenTask.create({
      data: {
        tenantId,
        planId,
        taskNumber,
        title: dto.title,
        station: dto.station,
        status: 'pending',
        targetQuantity: dto.targetQuantity ?? null,
        unit: dto.unit ?? 'portions',
        dueTime: dto.dueTime ?? null,
        assignedTo: dto.assignedTo ?? null,
        dietaryAlerts: dto.dietaryAlerts ?? null,
        notes: dto.notes ?? null,
        sortOrder: dto.sortOrder ?? count + 1,
      },
    });

    this.auditLogService.record({
      scope: 'tenant',
      outcome: 'allowed',
      action: 'kitchen_task_created',
      actorType: 'tenant_user',
      tenantId,
      metadata: {
        planId,
        taskNumber: task.taskNumber,
        title: task.title,
        station: task.station,
      },
    });

    return this.mapTask(task);
  }

  async updateTask(
    tenantId: string,
    planId: string,
    taskId: string,
    dto: UpdateKitchenTaskRequest,
    user?: { id?: string; displayName?: string },
  ): Promise<KitchenTask> {
    const existing = await this.prisma.kitchenTask.findFirst({
      where: { id: taskId, planId, tenantId },
    });

    if (!existing) {
      throw new NotFoundException(`Kitchen task ${taskId} not found`);
    }

    const data: any = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.station !== undefined) data.station = dto.station;
    if (dto.status !== undefined) {
      data.status = dto.status;
      if (dto.status === 'completed' && existing.status !== 'completed') {
        data.completedAt = new Date();
        data.completedBy = dto.completedBy || user?.displayName || user?.id || 'Kitchen Staff';
      } else if (dto.status !== 'completed' && existing.status === 'completed') {
        data.completedAt = null;
        data.completedBy = null;
      }
    }
    if (dto.targetQuantity !== undefined) data.targetQuantity = dto.targetQuantity;
    if (dto.unit !== undefined) data.unit = dto.unit;
    if (dto.dueTime !== undefined) data.dueTime = dto.dueTime;
    if (dto.assignedTo !== undefined) data.assignedTo = dto.assignedTo;
    if (dto.dietaryAlerts !== undefined) data.dietaryAlerts = dto.dietaryAlerts;
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;

    const updated = await this.prisma.kitchenTask.update({
      where: { id: taskId },
      data,
    });

    // Auto-update parent plan status if all tasks are complete
    if (dto.status === 'completed') {
      const remainingPending = await this.prisma.kitchenTask.count({
        where: {
          planId,
          tenantId,
          status: { in: ['pending', 'in_progress', 'blocked'] },
        },
      });

      if (remainingPending === 0) {
        await this.prisma.kitchenProductionPlan.update({
          where: { id: planId },
          data: { status: 'completed' },
        });
      } else {
        await this.prisma.kitchenProductionPlan.update({
          where: { id: planId, status: { in: ['draft', 'scheduled'] } },
          data: { status: 'in_progress' },
        });
      }
    } else if (dto.status === 'in_progress') {
      await this.prisma.kitchenProductionPlan.update({
        where: { id: planId, status: { in: ['draft', 'scheduled'] } },
        data: { status: 'in_progress' },
      });
    }

    return this.mapTask(updated);
  }

  async deleteTask(
    tenantId: string,
    planId: string,
    taskId: string,
    user?: { id?: string; displayName?: string },
  ): Promise<{ success: boolean }> {
    const existing = await this.prisma.kitchenTask.findFirst({
      where: { id: taskId, planId, tenantId },
    });

    if (!existing) {
      throw new NotFoundException(`Kitchen task ${taskId} not found`);
    }

    await this.prisma.kitchenTask.delete({
      where: { id: taskId },
    });

    this.auditLogService.record({
      scope: 'tenant',
      outcome: 'allowed',
      action: 'kitchen_task_deleted',
      actorType: 'tenant_user',
      tenantId,
      metadata: { planId, title: existing.title },
    });

    return { success: true };
  }

  async recordConsumption(
    tenantId: string,
    planId: string,
    dto: RecordKitchenConsumptionRequest,
    user?: { id?: string; displayName?: string },
  ): Promise<{ movementId: string; newStock: number }> {
    const plan = await this.prisma.kitchenProductionPlan.findFirst({
      where: { id: planId, tenantId },
    });

    if (!plan) {
      throw new NotFoundException(`Kitchen production plan ${planId} not found`);
    }

    const item = await this.prisma.inventoryItem.findFirst({
      where: { id: dto.inventoryItemId, tenantId },
    });

    if (!item) {
      throw new NotFoundException(`Inventory item ${dto.inventoryItemId} not found`);
    }

    const currentQty = Number(item.currentStock ?? 0);
    const deductQty = dto.quantity;

    if (currentQty < deductQty) {
      throw new BadRequestException(
        `Insufficient inventory. Available: ${currentQty} ${item.unit}, requested to consume: ${deductQty} ${item.unit}`,
      );
    }

    const newStock = currentQty - deductQty;
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prefix = `SM-${yearMonth}-`;

    const count = await this.prisma.stockMovement.count({
      where: { tenantId, movementNumber: { startsWith: prefix } },
    });
    const movementNumber = `${prefix}${String(count + 1).padStart(4, '0')}`;

    const unitCost = Number(item.unitCost ?? 0);
    const totalCost = Math.round(unitCost * deductQty * 100) / 100;

    const result = await this.prisma.$transaction(async (tx) => {
      const movement = await tx.stockMovement.create({
        data: {
          tenantId,
          movementNumber,
          inventoryItemId: item.id,
          type: 'kitchen_consumption',
          quantity: deductQty,
          signedQuantity: -deductQty,
          quantityBefore: currentQty,
          quantityAfter: newStock,
          unitCost,
          totalCost,
          referenceType: 'kitchen_production_plan',
          referenceId: plan.planNumber,
          reason: dto.notes || `Production plan ${plan.planNumber} consumption`,
          recordedBy: user?.displayName || user?.id || 'Kitchen Staff',
        },
      });

      await tx.inventoryItem.update({
        where: { id: item.id },
        data: { currentStock: newStock },
      });

      return movement;
    });

    this.auditLogService.record({
      scope: 'tenant',
      outcome: 'allowed',
      action: 'kitchen_consumption_recorded',
      actorType: 'tenant_user',
      tenantId,
      metadata: {
        planNumber: plan.planNumber,
        itemSku: item.sku,
        itemName: item.name,
        quantityDeducted: String(deductQty),
        remainingStock: String(newStock),
      },
    });

    return { movementId: result.id, newStock };
  }
}
