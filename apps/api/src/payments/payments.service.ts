import type {
  CreatePaymentAllocationsRequest,
  CreatePaymentRequest,
  PaymentDetail,
  PaymentFilterParams,
  PaymentListItem,
  PaymentMethod,
  PaymentStats,
  PaymentStatus,
  VoidPaymentRequest,
} from '@catering/shared-types';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditLogService } from '../tenancy/audit-log.service.js';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  private round2(num: number): number {
    return Math.round((num + Number.EPSILON) * 100) / 100;
  }

  private async generatePaymentNumber(tenantId: string): Promise<string> {
    const date = new Date();
    const yearMonth = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
    const count = await this.prisma.payment.count({
      where: { tenantId },
    });
    return `PAY-${yearMonth}-${String(count + 1).padStart(4, '0')}`;
  }

  private async getTenantCurrency(tenantId: string): Promise<string> {
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: { currencyCode: true },
    });
    return settings?.currencyCode || 'INR';
  }

  private mapPaymentListItem(payment: any): PaymentListItem {
    return {
      id: payment.id,
      tenantId: payment.tenantId,
      paymentNumber: payment.paymentNumber,
      customerId: payment.customerId,
      customerName: payment.customer?.name ?? 'Unknown Customer',
      customerEmail: payment.customer?.email ?? null,
      amount: Number(payment.amount),
      currency: payment.currency,
      paymentDate: payment.paymentDate instanceof Date
        ? payment.paymentDate.toISOString().slice(0, 10)
        : String(payment.paymentDate).slice(0, 10),
      paymentMethod: payment.paymentMethod as PaymentMethod,
      status: payment.status as PaymentStatus,
      reference: payment.reference,
      notes: payment.notes,
      allocatedAmount: Number(payment.allocatedAmount),
      unallocatedAmount: Number(payment.unallocatedAmount),
      allocationCount: payment._count?.allocations ?? payment.allocations?.length ?? 0,
      voidedAt: payment.voidedAt ? payment.voidedAt.toISOString() : null,
      voidReason: payment.voidReason,
      createdAt: payment.createdAt.toISOString(),
    };
  }

  private mapPaymentDetail(payment: any): PaymentDetail {
    return {
      id: payment.id,
      tenantId: payment.tenantId,
      paymentNumber: payment.paymentNumber,
      customerId: payment.customerId,
      customerName: payment.customer?.name ?? 'Unknown Customer',
      customerEmail: payment.customer?.email ?? null,
      customerPhone: payment.customer?.phone ?? null,
      amount: Number(payment.amount),
      currency: payment.currency,
      paymentDate: payment.paymentDate instanceof Date
        ? payment.paymentDate.toISOString().slice(0, 10)
        : String(payment.paymentDate).slice(0, 10),
      paymentMethod: payment.paymentMethod as PaymentMethod,
      status: payment.status as PaymentStatus,
      reference: payment.reference,
      notes: payment.notes,
      recordedBy: payment.recordedBy,
      allocatedAmount: Number(payment.allocatedAmount),
      unallocatedAmount: Number(payment.unallocatedAmount),
      voidedAt: payment.voidedAt ? payment.voidedAt.toISOString() : null,
      voidReason: payment.voidReason,
      allocations: (payment.allocations || []).map((alloc: any) => ({
        id: alloc.id,
        tenantId: alloc.tenantId,
        paymentId: alloc.paymentId,
        invoiceId: alloc.invoiceId,
        invoiceNumber: alloc.invoice?.invoiceNumber,
        invoiceTitle: alloc.invoice?.title,
        invoiceTotal: alloc.invoice ? Number(alloc.invoice.totalAmount) : undefined,
        invoiceBalanceDue: alloc.invoice ? Number(alloc.invoice.balanceDue) : undefined,
        amount: Number(alloc.amount),
        notes: alloc.notes,
        createdAt: alloc.createdAt.toISOString(),
      })),
      createdAt: payment.createdAt.toISOString(),
      updatedAt: payment.updatedAt.toISOString(),
    };
  }

  async listPayments(
    tenantId: string,
    params: PaymentFilterParams,
  ): Promise<{
    items: PaymentListItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? Math.min(params.limit, 100) : 20;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (params.status && params.status !== 'all') {
      where.status = params.status;
    }

    if (params.customerId) {
      where.customerId = params.customerId;
    }

    if (params.paymentMethod) {
      where.paymentMethod = params.paymentMethod;
    }

    if (params.fromDate || params.toDate) {
      where.paymentDate = {};
      if (params.fromDate) {
        where.paymentDate.gte = new Date(params.fromDate);
      }
      if (params.toDate) {
        const to = new Date(params.toDate);
        to.setHours(23, 59, 59, 999);
        where.paymentDate.lte = to;
      }
    }

    if (params.search && params.search.trim()) {
      const q = params.search.trim();
      where.OR = [
        { paymentNumber: { contains: q, mode: 'insensitive' } },
        { reference: { contains: q, mode: 'insensitive' } },
        { notes: { contains: q, mode: 'insensitive' } },
        { customer: { name: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [total, payments] = await Promise.all([
      this.prisma.payment.count({ where }),
      this.prisma.payment.findMany({
        where,
        include: {
          customer: { select: { name: true, email: true } },
          _count: { select: { allocations: true } },
        },
        orderBy: [{ paymentDate: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
    ]);

    return {
      items: payments.map((p) => this.mapPaymentListItem(p)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getPaymentStats(tenantId: string): Promise<PaymentStats> {
    const currency = await this.getTenantCurrency(tenantId);

    const [activePayments, unallocatedCount, totalCount] = await Promise.all([
      this.prisma.payment.findMany({
        where: { tenantId, status: { not: 'void' } },
        select: {
          amount: true,
          allocatedAmount: true,
          unallocatedAmount: true,
        },
      }),
      this.prisma.payment.count({
        where: {
          tenantId,
          status: { in: ['unallocated', 'partially_allocated'] },
        },
      }),
      this.prisma.payment.count({
        where: { tenantId },
      }),
    ]);

    let totalReceived = 0;
    let totalAllocated = 0;
    let totalUnallocated = 0;

    for (const p of activePayments) {
      totalReceived += Number(p.amount);
      totalAllocated += Number(p.allocatedAmount);
      totalUnallocated += Number(p.unallocatedAmount);
    }

    return {
      totalReceived: this.round2(totalReceived),
      totalAllocated: this.round2(totalAllocated),
      totalUnallocated: this.round2(totalUnallocated),
      totalPayments: totalCount,
      unallocatedPaymentsCount: unallocatedCount,
      currency,
    };
  }

  async getPayment(tenantId: string, id: string): Promise<PaymentDetail> {
    const payment = await this.prisma.payment.findFirst({
      where: { id, tenantId },
      include: {
        customer: true,
        allocations: {
          include: {
            invoice: {
              select: {
                id: true,
                invoiceNumber: true,
                title: true,
                totalAmount: true,
                balanceDue: true,
                status: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException(`Payment ${id} not found`);
    }

    return this.mapPaymentDetail(payment);
  }

  async createPayment(
    tenantId: string,
    userId: string | undefined,
    dto: CreatePaymentRequest,
  ): Promise<PaymentDetail> {
    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, tenantId },
    });

    if (!customer) {
      throw new NotFoundException(`Customer ${dto.customerId} not found`);
    }

    const tenantCurrency = await this.getTenantCurrency(tenantId);
    const currency = (dto.currency || tenantCurrency).toUpperCase();

    const paymentAmount = this.round2(dto.amount);
    if (paymentAmount <= 0) {
      throw new BadRequestException('Payment amount must be greater than 0');
    }

    // Validate allocations if any provided
    const requestedAllocations = dto.allocations || [];
    let initialAllocated = 0;

    if (requestedAllocations.length > 0) {
      for (const item of requestedAllocations) {
        const itemAmount = this.round2(item.amount);
        if (itemAmount <= 0) {
          throw new BadRequestException('Allocation amount must be greater than 0');
        }
        initialAllocated = this.round2(initialAllocated + itemAmount);

        const invoice = await this.prisma.invoice.findFirst({
          where: { id: item.invoiceId, tenantId },
        });

        if (!invoice) {
          throw new NotFoundException(`Invoice ${item.invoiceId} not found`);
        }
        if (invoice.customerId !== dto.customerId) {
          throw new BadRequestException(`Invoice ${invoice.invoiceNumber} belongs to another customer`);
        }
        if (invoice.status === 'draft') {
          throw new BadRequestException(`Cannot allocate payment to draft invoice ${invoice.invoiceNumber}. Please issue it first.`);
        }
        if (invoice.status === 'void') {
          throw new BadRequestException(`Cannot allocate payment to void invoice ${invoice.invoiceNumber}`);
        }
        if (itemAmount > Number(invoice.balanceDue)) {
          throw new BadRequestException(
            `Allocation of ${itemAmount} exceeds outstanding balance of ${invoice.balanceDue} for invoice ${invoice.invoiceNumber}`,
          );
        }
      }

      if (initialAllocated > paymentAmount) {
        throw new BadRequestException(
          `Total allocated amount (${initialAllocated}) cannot exceed payment amount (${paymentAmount})`,
        );
      }
    }

    const unallocatedAmount = this.round2(paymentAmount - initialAllocated);
    let status: PaymentStatus = 'unallocated';
    if (initialAllocated > 0 && unallocatedAmount === 0) {
      status = 'allocated';
    } else if (initialAllocated > 0) {
      status = 'partially_allocated';
    }

    const paymentNumber = await this.generatePaymentNumber(tenantId);

    const payment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.payment.create({
        data: {
          tenantId,
          paymentNumber,
          customerId: dto.customerId,
          amount: paymentAmount,
          currency,
          paymentDate: new Date(dto.paymentDate),
          paymentMethod: dto.paymentMethod,
          status,
          reference: dto.reference?.trim() || null,
          notes: dto.notes?.trim() || null,
          recordedBy: userId ?? 'system',
          allocatedAmount: initialAllocated,
          unallocatedAmount,
        },
      });

      for (const item of requestedAllocations) {
        const allocAmount = this.round2(item.amount);
        await tx.paymentAllocation.create({
          data: {
            tenantId,
            paymentId: created.id,
            invoiceId: item.invoiceId,
            amount: allocAmount,
            notes: item.notes?.trim() || null,
          },
        });

        // Update target invoice
        const currentInv = await tx.invoice.findUniqueOrThrow({
          where: { id: item.invoiceId },
        });

        const newPaid = this.round2(Number(currentInv.paidAmount) + allocAmount);
        const newBalance = Math.max(0, this.round2(Number(currentInv.totalAmount) - newPaid));
        const newInvStatus = newBalance <= 0 ? 'paid' : 'partially_paid';

        await tx.invoice.update({
          where: { id: item.invoiceId },
          data: {
            paidAmount: newPaid,
            balanceDue: newBalance,
            status: newInvStatus,
          },
        });

        // Also record corresponding InvoicePayment for backwards compatibility
        await tx.invoicePayment.create({
          data: {
            tenantId,
            invoiceId: item.invoiceId,
            amount: allocAmount,
            paymentDate: new Date(dto.paymentDate),
            paymentMethod: dto.paymentMethod,
            reference: dto.reference?.trim() || paymentNumber,
            notes: item.notes?.trim() || `Allocated from ${paymentNumber}`,
            recordedBy: userId ?? 'system',
          },
        });
      }

      return tx.payment.findUniqueOrThrow({
        where: { id: created.id },
        include: {
          customer: true,
          allocations: {
            include: {
              invoice: {
                select: {
                  id: true,
                  invoiceNumber: true,
                  title: true,
                  totalAmount: true,
                  balanceDue: true,
                  status: true,
                },
              },
            },
          },
        },
      });
    });

    this.auditLogService.record({
      scope: 'tenant',
      outcome: 'allowed',
      action: 'payment.created',
      actorType: 'tenant_user',
      tenantId,
      metadata: {
        paymentId: payment.id,
        paymentNumber: payment.paymentNumber,
        amount: String(paymentAmount),
        currency,
        allocatedAmount: String(initialAllocated),
        status,
        userId: userId ?? 'system',
      },
    });

    return this.mapPaymentDetail(payment);
  }

  async allocatePayment(
    tenantId: string,
    userId: string | undefined,
    paymentId: string,
    dto: CreatePaymentAllocationsRequest,
  ): Promise<PaymentDetail> {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, tenantId },
      include: { allocations: true },
    });

    if (!payment) {
      throw new NotFoundException(`Payment ${paymentId} not found`);
    }

    if (payment.status === 'void') {
      throw new BadRequestException('Cannot allocate funds from a voided payment');
    }

    const currentUnallocated = Number(payment.unallocatedAmount);
    let newAllocatingTotal = 0;

    for (const alloc of dto.allocations) {
      const amount = this.round2(alloc.amount);
      if (amount <= 0) {
        throw new BadRequestException('Allocation amount must be greater than 0');
      }
      newAllocatingTotal = this.round2(newAllocatingTotal + amount);

      const invoice = await this.prisma.invoice.findFirst({
        where: { id: alloc.invoiceId, tenantId },
      });

      if (!invoice) {
        throw new NotFoundException(`Invoice ${alloc.invoiceId} not found`);
      }
      if (invoice.customerId !== payment.customerId) {
        throw new BadRequestException(`Invoice ${invoice.invoiceNumber} does not belong to the payment customer`);
      }
      if (invoice.status === 'draft') {
        throw new BadRequestException(`Cannot allocate to draft invoice ${invoice.invoiceNumber}`);
      }
      if (invoice.status === 'void') {
        throw new BadRequestException(`Cannot allocate to voided invoice ${invoice.invoiceNumber}`);
      }
      if (amount > Number(invoice.balanceDue)) {
        throw new BadRequestException(
          `Allocation amount (${amount}) exceeds invoice ${invoice.invoiceNumber} balance due (${invoice.balanceDue})`,
        );
      }
    }

    if (newAllocatingTotal > currentUnallocated) {
      throw new BadRequestException(
        `Total allocation (${newAllocatingTotal}) exceeds unallocated payment amount (${currentUnallocated})`,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      for (const item of dto.allocations) {
        const itemAmount = this.round2(item.amount);

        await tx.paymentAllocation.create({
          data: {
            tenantId,
            paymentId,
            invoiceId: item.invoiceId,
            amount: itemAmount,
            notes: item.notes?.trim() || null,
          },
        });

        const inv = await tx.invoice.findUniqueOrThrow({
          where: { id: item.invoiceId },
        });

        const newPaid = this.round2(Number(inv.paidAmount) + itemAmount);
        const newBalance = Math.max(0, this.round2(Number(inv.totalAmount) - newPaid));
        const newInvStatus = newBalance <= 0 ? 'paid' : 'partially_paid';

        await tx.invoice.update({
          where: { id: item.invoiceId },
          data: {
            paidAmount: newPaid,
            balanceDue: newBalance,
            status: newInvStatus,
          },
        });

        await tx.invoicePayment.create({
          data: {
            tenantId,
            invoiceId: item.invoiceId,
            amount: itemAmount,
            paymentDate: payment.paymentDate,
            paymentMethod: payment.paymentMethod,
            reference: payment.reference || payment.paymentNumber,
            notes: item.notes?.trim() || `Allocated from ${payment.paymentNumber}`,
            recordedBy: userId ?? 'system',
          },
        });
      }

      const totalAllocated = this.round2(Number(payment.allocatedAmount) + newAllocatingTotal);
      const remainingUnallocated = Math.max(0, this.round2(Number(payment.amount) - totalAllocated));
      let nextStatus: PaymentStatus = 'partially_allocated';
      if (remainingUnallocated <= 0) {
        nextStatus = 'allocated';
      }

      await tx.payment.update({
        where: { id: paymentId },
        data: {
          allocatedAmount: totalAllocated,
          unallocatedAmount: remainingUnallocated,
          status: nextStatus,
        },
      });

      return tx.payment.findUniqueOrThrow({
        where: { id: paymentId },
        include: {
          customer: true,
          allocations: {
            include: {
              invoice: {
                select: {
                  id: true,
                  invoiceNumber: true,
                  title: true,
                  totalAmount: true,
                  balanceDue: true,
                  status: true,
                },
              },
            },
          },
        },
      });
    });

    this.auditLogService.record({
      scope: 'tenant',
      outcome: 'allowed',
      action: 'payment.allocated',
      actorType: 'tenant_user',
      tenantId,
      metadata: {
        paymentId,
        allocatedAmount: String(newAllocatingTotal),
        totalAllocated: String(Number(updated.allocatedAmount)),
        remainingUnallocated: String(Number(updated.unallocatedAmount)),
        userId: userId ?? 'system',
      },
    });

    return this.mapPaymentDetail(updated);
  }

  async deallocatePayment(
    tenantId: string,
    userId: string | undefined,
    paymentId: string,
    allocationId: string,
  ): Promise<PaymentDetail> {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, tenantId },
      include: { allocations: true },
    });

    if (!payment) {
      throw new NotFoundException(`Payment ${paymentId} not found`);
    }

    if (payment.status === 'void') {
      throw new BadRequestException('Cannot modify allocations of a voided payment');
    }

    const allocation = await this.prisma.paymentAllocation.findFirst({
      where: { id: allocationId, paymentId, tenantId },
    });

    if (!allocation) {
      throw new NotFoundException(`Allocation ${allocationId} not found on this payment`);
    }

    const allocAmount = Number(allocation.amount);

    const updated = await this.prisma.$transaction(async (tx) => {
      // Delete the allocation
      await tx.paymentAllocation.delete({
        where: { id: allocationId },
      });

      // Update invoice balances
      const inv = await tx.invoice.findUnique({
        where: { id: allocation.invoiceId },
      });

      if (inv) {
        const newPaid = Math.max(0, this.round2(Number(inv.paidAmount) - allocAmount));
        const newBalance = Math.min(Number(inv.totalAmount), this.round2(Number(inv.totalAmount) - newPaid));
        let nextInvStatus = inv.status;
        if (inv.status !== 'void') {
          if (newPaid <= 0) {
            nextInvStatus = 'issued';
          } else if (newBalance <= 0) {
            nextInvStatus = 'paid';
          } else {
            nextInvStatus = 'partially_paid';
          }
        }

        await tx.invoice.update({
          where: { id: allocation.invoiceId },
          data: {
            paidAmount: newPaid,
            balanceDue: newBalance,
            status: nextInvStatus,
          },
        });
      }

      // Update payment
      const newAllocated = Math.max(0, this.round2(Number(payment.allocatedAmount) - allocAmount));
      const newUnallocated = this.round2(Number(payment.amount) - newAllocated);
      const nextStatus: PaymentStatus = newAllocated === 0 ? 'unallocated' : 'partially_allocated';

      await tx.payment.update({
        where: { id: paymentId },
        data: {
          allocatedAmount: newAllocated,
          unallocatedAmount: newUnallocated,
          status: nextStatus,
        },
      });

      return tx.payment.findUniqueOrThrow({
        where: { id: paymentId },
        include: {
          customer: true,
          allocations: {
            include: {
              invoice: {
                select: {
                  id: true,
                  invoiceNumber: true,
                  title: true,
                  totalAmount: true,
                  balanceDue: true,
                  status: true,
                },
              },
            },
          },
        },
      });
    });

    this.auditLogService.record({
      scope: 'tenant',
      outcome: 'allowed',
      action: 'payment.deallocated',
      actorType: 'tenant_user',
      tenantId,
      metadata: {
        paymentId,
        allocationId,
        reversedAmount: String(allocAmount),
        userId: userId ?? 'system',
      },
    });

    return this.mapPaymentDetail(updated);
  }

  async voidPayment(
    tenantId: string,
    userId: string | undefined,
    paymentId: string,
    dto: VoidPaymentRequest,
  ): Promise<PaymentDetail> {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, tenantId },
      include: { allocations: true },
    });

    if (!payment) {
      throw new NotFoundException(`Payment ${paymentId} not found`);
    }

    if (payment.status === 'void') {
      throw new BadRequestException('Payment is already voided');
    }

    const updated = await this.prisma.$transaction(async (tx: any) => {
      // Reverse each allocation on affected invoices
      for (const alloc of payment.allocations) {
        const allocAmount = Number(alloc.amount);
        const inv = await tx.invoice.findUnique({
          where: { id: alloc.invoiceId },
        });

        if (inv) {
          const newPaid = Math.max(0, this.round2(Number(inv.paidAmount) - allocAmount));
          const newBalance = Math.min(Number(inv.totalAmount), this.round2(Number(inv.totalAmount) - newPaid));
          let nextInvStatus = inv.status;
          if (inv.status !== 'void') {
            if (newPaid <= 0) {
              nextInvStatus = 'issued';
            } else if (newBalance <= 0) {
              nextInvStatus = 'paid';
            } else {
              nextInvStatus = 'partially_paid';
            }
          }

          await tx.invoice.update({
            where: { id: alloc.invoiceId },
            data: {
              paidAmount: newPaid,
              balanceDue: newBalance,
              status: nextInvStatus,
            },
          });
        }
      }

      // Delete allocations for voided payment
      await tx.paymentAllocation.deleteMany({
        where: { paymentId },
      });

      // Update payment to void
      return tx.payment.update({
        where: { id: paymentId },
        data: {
          status: 'void',
          allocatedAmount: 0,
          unallocatedAmount: 0,
          voidedAt: new Date(),
          voidReason: dto.voidReason.trim(),
        },
        include: {
          customer: true,
          allocations: true,
        },
      });
    });

    this.auditLogService.record({
      scope: 'tenant',
      outcome: 'allowed',
      action: 'payment.voided',
      actorType: 'tenant_user',
      tenantId,
      reason: dto.voidReason,
      metadata: {
        paymentId,
        previousAllocated: String(Number(payment.allocatedAmount)),
        userId: userId ?? 'system',
      },
    });

    return this.mapPaymentDetail(updated);
  }
}
