import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateInvoiceFromBookingRequest,
  CreateInvoiceRequest,
  InvoiceDetail,
  InvoiceFilterParams,
  InvoiceListItem,
  InvoiceListResponse,
  InvoicePaymentMethod,
  InvoiceStats,
  InvoiceStatus,
  RecordInvoicePaymentRequest,
  UpdateInvoiceRequest,
  VoidInvoiceRequest,
} from '@catering/shared-types';
import { calculateInvoiceTotals } from '@catering/shared-types';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditLogService } from '../tenancy/audit-log.service.js';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  private async generateInvoiceNumber(tenantId: string): Promise<string> {
    const date = new Date();
    const yearMonth = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
    const count = await this.prisma.invoice.count({
      where: { tenantId },
    });
    return `INV-${yearMonth}-${String(count + 1).padStart(4, '0')}`;
  }

  private async getTenantCurrency(tenantId: string): Promise<string> {
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: { currencyCode: true },
    });
    return settings?.currencyCode || 'INR';
  }

  private isInvoiceOverdue(invoice: {
    status: string;
    dueDate: Date;
    balanceDue: any;
  }): boolean {
    if (invoice.status === 'void' || invoice.status === 'paid') return false;
    if (Number(invoice.balanceDue) <= 0) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(invoice.dueDate);
    due.setHours(0, 0, 0, 0);
    return due < today;
  }

  private mapInvoiceListItem(inv: any): InvoiceListItem {
    const isOverdue = this.isInvoiceOverdue(inv);
    return {
      id: inv.id,
      tenantId: inv.tenantId,
      invoiceNumber: inv.invoiceNumber,
      status: inv.status as InvoiceStatus,
      customerId: inv.customerId,
      customerName: inv.customer?.name ?? 'Unknown Customer',
      customerEmail: inv.customer?.email ?? null,
      customerPhone: inv.customer?.phone ?? null,
      bookingId: inv.bookingId ?? null,
      bookingNumber: inv.booking?.bookingNumber ?? null,
      title: inv.title,
      issueDate: inv.issueDate.toISOString(),
      dueDate: inv.dueDate.toISOString(),
      currency: inv.currency,
      subtotal: Number(inv.subtotal),
      taxRate: Number(inv.taxRate),
      taxAmount: Number(inv.taxAmount),
      discountAmount: Number(inv.discountAmount),
      totalAmount: Number(inv.totalAmount),
      paidAmount: Number(inv.paidAmount),
      balanceDue: Number(inv.balanceDue),
      isOverdue,
      issuedAt: inv.issuedAt?.toISOString() ?? null,
      voidedAt: inv.voidedAt?.toISOString() ?? null,
      createdAt: inv.createdAt.toISOString(),
      updatedAt: inv.updatedAt.toISOString(),
    };
  }

  private mapInvoiceDetail(inv: any): InvoiceDetail {
    const isOverdue = this.isInvoiceOverdue(inv);
    return {
      id: inv.id,
      tenantId: inv.tenantId,
      invoiceNumber: inv.invoiceNumber,
      status: inv.status as InvoiceStatus,
      customerId: inv.customerId,
      customer: {
        id: inv.customer.id,
        name: inv.customer.name,
        email: inv.customer.email ?? null,
        phone: inv.customer.phone ?? null,
        company: (inv.customer as any).company ?? null,
        address: inv.customer.address ?? null,
      },
      bookingId: inv.bookingId ?? null,
      booking: inv.booking
        ? {
            id: inv.booking.id,
            bookingNumber: inv.booking.bookingNumber,
            title: inv.booking.title,
            eventDate: inv.booking.eventDate.toISOString(),
          }
        : null,
      title: inv.title,
      issueDate: inv.issueDate.toISOString(),
      dueDate: inv.dueDate.toISOString(),
      currency: inv.currency,
      subtotal: Number(inv.subtotal),
      taxRate: Number(inv.taxRate),
      taxAmount: Number(inv.taxAmount),
      discountAmount: Number(inv.discountAmount),
      totalAmount: Number(inv.totalAmount),
      paidAmount: Number(inv.paidAmount),
      balanceDue: Number(inv.balanceDue),
      isOverdue,
      notes: inv.notes ?? null,
      terms: inv.terms ?? null,
      issuedAt: inv.issuedAt?.toISOString() ?? null,
      voidedAt: inv.voidedAt?.toISOString() ?? null,
      voidReason: inv.voidReason ?? null,
      lineItems: (inv.lineItems || []).map((item: any) => ({
        id: item.id,
        invoiceId: item.invoiceId,
        description: item.description,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        totalAmount: Number(item.totalAmount),
        notes: item.notes ?? null,
        sortOrder: item.sortOrder ?? 0,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      })),
      payments: (inv.payments || []).map((p: any) => ({
        id: p.id,
        tenantId: p.tenantId,
        invoiceId: p.invoiceId,
        amount: Number(p.amount),
        paymentDate: p.paymentDate.toISOString(),
        paymentMethod: p.paymentMethod as InvoicePaymentMethod,
        reference: p.reference ?? null,
        notes: p.notes ?? null,
        recordedBy: p.recordedBy ?? null,
        createdAt: p.createdAt.toISOString(),
      })),
      createdAt: inv.createdAt.toISOString(),
      updatedAt: inv.updatedAt.toISOString(),
    };
  }

  async listInvoices(
    tenantId: string,
    params?: InvoiceFilterParams,
  ): Promise<InvoiceListResponse> {
    const where: any = { tenantId };

    if (params?.customerId) {
      where.customerId = params.customerId;
    }

    if (params?.bookingId) {
      where.bookingId = params.bookingId;
    }

    if (params?.fromDate || params?.toDate) {
      where.issueDate = {};
      if (params.fromDate) where.issueDate.gte = new Date(params.fromDate);
      if (params.toDate) where.issueDate.lte = new Date(params.toDate);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (params?.status && params.status !== 'all') {
      if (params.status === 'overdue') {
        where.status = { in: ['issued', 'partially_paid'] };
        where.balanceDue = { gt: 0 };
        where.dueDate = { lt: today };
      } else {
        where.status = params.status;
      }
    }

    if (params?.search && params.search.trim()) {
      const q = params.search.trim();
      where.OR = [
        { invoiceNumber: { contains: q, mode: 'insensitive' } },
        { title: { contains: q, mode: 'insensitive' } },
        { customer: { name: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const page = params?.page || 1;
    const limit = params?.limit || 20;
    const skip = (page - 1) * limit;

    const [rawInvoices, totalCount, allTenantInvoices] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, email: true, phone: true } },
          booking: { select: { id: true, bookingNumber: true, title: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.findMany({
        where: { tenantId },
        select: {
          status: true,
          totalAmount: true,
          paidAmount: true,
          balanceDue: true,
          dueDate: true,
        },
      }),
    ]);

    const stats: InvoiceStats = {
      totalInvoiced: 0,
      totalPaid: 0,
      totalOutstanding: 0,
      draftCount: 0,
      issuedCount: 0,
      partiallyPaidCount: 0,
      paidCount: 0,
      voidCount: 0,
      overdueCount: 0,
    };

    for (const inv of allTenantInvoices) {
      const tot = Number(inv.totalAmount);
      const paid = Number(inv.paidAmount);
      const bal = Number(inv.balanceDue);

      if (inv.status === 'draft') stats.draftCount++;
      else if (inv.status === 'issued') stats.issuedCount++;
      else if (inv.status === 'partially_paid') stats.partiallyPaidCount++;
      else if (inv.status === 'paid') stats.paidCount++;
      else if (inv.status === 'void') stats.voidCount++;

      if (inv.status !== 'void') {
        stats.totalInvoiced += tot;
        stats.totalPaid += paid;
        if (inv.status === 'issued' || inv.status === 'partially_paid') {
          stats.totalOutstanding += bal;
        }

        const due = new Date(inv.dueDate);
        due.setHours(0, 0, 0, 0);
        if (bal > 0 && due < today && inv.status !== 'draft') {
          stats.overdueCount++;
        }
      }
    }

    stats.totalInvoiced = Math.round(stats.totalInvoiced * 100) / 100;
    stats.totalPaid = Math.round(stats.totalPaid * 100) / 100;
    stats.totalOutstanding = Math.round(stats.totalOutstanding * 100) / 100;

    return {
      items: rawInvoices.map((inv) => this.mapInvoiceListItem(inv)),
      stats,
      total: totalCount,
    };
  }

  async getInvoice(tenantId: string, invoiceId: string): Promise<InvoiceDetail> {
    const inv = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
      include: {
        customer: true,
        booking: {
          select: {
            id: true,
            bookingNumber: true,
            title: true,
            eventDate: true,
          },
        },
        lineItems: { orderBy: { sortOrder: 'asc' } },
        payments: { orderBy: { paymentDate: 'desc' } },
      },
    });

    if (!inv) {
      throw new NotFoundException(`Invoice ${invoiceId} not found`);
    }

    return this.mapInvoiceDetail(inv);
  }

  async createInvoice(
    tenantId: string,
    userId: string | undefined,
    dto: CreateInvoiceRequest,
  ): Promise<InvoiceDetail> {
    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, tenantId },
    });
    if (!customer) {
      throw new BadRequestException(`Customer ${dto.customerId} not found`);
    }

    if (dto.bookingId) {
      const booking = await this.prisma.booking.findFirst({
        where: { id: dto.bookingId, tenantId },
      });
      if (!booking) {
        throw new BadRequestException(`Booking ${dto.bookingId} not found`);
      }
    }

    const tenantCurrency = await this.getTenantCurrency(tenantId);
    const currency = dto.currency || tenantCurrency;

    const taxRate = dto.taxRate ?? 0;
    const discountAmount = dto.discountAmount ?? 0;
    const totals = calculateInvoiceTotals(dto.lineItems, taxRate, discountAmount);

    const invoiceNumber = await this.generateInvoiceNumber(tenantId);

    const invoice = await this.prisma.$transaction(async (tx) => {
      const created = await tx.invoice.create({
        data: {
          tenantId,
          invoiceNumber,
          status: 'draft',
          customerId: dto.customerId,
          bookingId: dto.bookingId ?? null,
          title: dto.title.trim(),
          issueDate: new Date(dto.issueDate),
          dueDate: new Date(dto.dueDate),
          currency,
          subtotal: totals.subtotal,
          taxRate,
          taxAmount: totals.taxAmount,
          discountAmount: totals.discountAmount,
          totalAmount: totals.totalAmount,
          paidAmount: 0,
          balanceDue: totals.totalAmount,
          notes: dto.notes?.trim() || null,
          terms: dto.terms?.trim() || null,
          lineItems: {
            create: dto.lineItems.map((item, index) => {
              const itemTotal = Math.round(item.quantity * item.unitPrice * 100) / 100;
              return {
                description: item.description.trim(),
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalAmount: itemTotal,
                notes: item.notes?.trim() || null,
                sortOrder: item.sortOrder ?? index,
              };
            }),
          },
        },
        include: {
          customer: true,
          booking: {
            select: {
              id: true,
              bookingNumber: true,
              title: true,
              eventDate: true,
            },
          },
          lineItems: { orderBy: { sortOrder: 'asc' } },
          payments: true,
        },
      });

      return created;
    });

    this.auditLogService.record({
      scope: 'tenant',
      tenantId,
      actorType: userId ? 'tenant_user' : 'system',
      action: 'invoice.created',
      outcome: 'allowed',
      metadata: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        customerId: invoice.customerId,
        totalAmount: String(Number(invoice.totalAmount)),
        currency: invoice.currency,
      },
    });

    return this.mapInvoiceDetail(invoice);
  }

  async createInvoiceFromBooking(
    tenantId: string,
    userId: string | undefined,
    dto: CreateInvoiceFromBookingRequest,
  ): Promise<InvoiceDetail> {
    const booking = await this.prisma.booking.findFirst({
      where: { id: dto.bookingId, tenantId },
      include: {
        customer: true,
        quotation: {
          include: {
            revisions: {
              where: { status: 'accepted' },
              include: { items: { orderBy: { sortOrder: 'asc' } } },
              take: 1,
            },
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException(`Booking ${dto.bookingId} not found`);
    }

    const tenantCurrency = await this.getTenantCurrency(tenantId);
    const currency = booking.currency || tenantCurrency;

    const acceptedRevision = booking.quotation?.revisions?.[0];
    let lineItems: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      notes: string | null;
      sortOrder: number;
    }> = [];

    if (acceptedRevision && acceptedRevision.items && acceptedRevision.items.length > 0) {
      lineItems = acceptedRevision.items.map((li: any, idx: number) => ({
        description: li.description,
        quantity: Number(li.quantity),
        unitPrice: Number(li.unitPrice),
        notes: li.notes ?? null,
        sortOrder: li.sortOrder ?? idx,
      }));
    } else {
      lineItems = [
        {
          description: `Catering Services — ${booking.title}`,
          quantity: 1,
          unitPrice: Number(booking.totalAmount),
          notes: `Generated from booking ${booking.bookingNumber}`,
          sortOrder: 0,
        },
      ];
    }

    const issueDate = dto.issueDate ? new Date(dto.issueDate) : new Date();
    const dueDate = dto.dueDate
      ? new Date(dto.dueDate)
      : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    const taxRate = dto.taxRate ?? 0;
    const discountAmount = dto.discountAmount ?? 0;
    const totals = calculateInvoiceTotals(lineItems, taxRate, discountAmount);
    const invoiceNumber = await this.generateInvoiceNumber(tenantId);

    const invoice = await this.prisma.$transaction(async (tx) => {
      const created = await tx.invoice.create({
        data: {
          tenantId,
          invoiceNumber,
          status: 'draft',
          customerId: booking.customerId,
          bookingId: booking.id,
          title: `Invoice for ${booking.title}`,
          issueDate,
          dueDate,
          currency,
          subtotal: totals.subtotal,
          taxRate,
          taxAmount: totals.taxAmount,
          discountAmount: totals.discountAmount,
          totalAmount: totals.totalAmount,
          paidAmount: 0,
          balanceDue: totals.totalAmount,
          notes: dto.notes?.trim() || `Reference Booking ${booking.bookingNumber}`,
          terms: dto.terms?.trim() || 'Payment due within 14 days of issue.',
          lineItems: {
            create: lineItems.map((item, index) => {
              const itemTotal = Math.round(item.quantity * item.unitPrice * 100) / 100;
              return {
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalAmount: itemTotal,
                notes: item.notes,
                sortOrder: item.sortOrder ?? index,
              };
            }),
          },
        },
        include: {
          customer: true,
          booking: {
            select: {
              id: true,
              bookingNumber: true,
              title: true,
              eventDate: true,
            },
          },
          lineItems: { orderBy: { sortOrder: 'asc' } },
          payments: true,
        },
      });

      if (booking.enquiryId) {
        await tx.enquiryActivity.create({
          data: {
            enquiryId: booking.enquiryId,
            type: 'status_change',
            content: `Invoice ${invoiceNumber} drafted from Booking ${booking.bookingNumber} (${currency} ${totals.totalAmount.toFixed(2)}).`,
            authorId: userId ?? null,
          },
        });
      }

      return created;
    });

    this.auditLogService.record({
      scope: 'tenant',
      tenantId,
      actorType: userId ? 'tenant_user' : 'system',
      action: 'invoice.created_from_booking',
      outcome: 'allowed',
      metadata: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        bookingId: booking.id,
        totalAmount: String(Number(invoice.totalAmount)),
        currency,
      },
    });

    return this.mapInvoiceDetail(invoice);
  }

  async updateInvoice(
    tenantId: string,
    userId: string | undefined,
    invoiceId: string,
    dto: UpdateInvoiceRequest,
  ): Promise<InvoiceDetail> {
    const existing = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
      include: { lineItems: true },
    });

    if (!existing) {
      throw new NotFoundException(`Invoice ${invoiceId} not found`);
    }

    if (existing.status !== 'draft') {
      throw new BadRequestException('Only draft invoices can be edited');
    }

    if (dto.customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: dto.customerId, tenantId },
      });
      if (!customer) {
        throw new BadRequestException(`Customer ${dto.customerId} not found`);
      }
    }

    const itemsToCalculate = dto.lineItems
      ? dto.lineItems
      : existing.lineItems.map((li) => ({
          quantity: Number(li.quantity),
          unitPrice: Number(li.unitPrice),
        }));

    const taxRate = dto.taxRate !== undefined ? dto.taxRate : Number(existing.taxRate);
    const discountAmount =
      dto.discountAmount !== undefined ? dto.discountAmount : Number(existing.discountAmount);
    const totals = calculateInvoiceTotals(itemsToCalculate, taxRate, discountAmount);

    const updateData: any = {
      taxRate,
      discountAmount: totals.discountAmount,
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      totalAmount: totals.totalAmount,
      balanceDue: Math.max(0, totals.totalAmount - Number(existing.paidAmount)),
    };

    if (dto.title !== undefined) updateData.title = dto.title.trim();
    if (dto.customerId !== undefined) updateData.customerId = dto.customerId;
    if (dto.issueDate) updateData.issueDate = new Date(dto.issueDate);
    if (dto.dueDate) updateData.dueDate = new Date(dto.dueDate);
    if (dto.currency) updateData.currency = dto.currency;
    if (dto.notes !== undefined) updateData.notes = dto.notes?.trim() || null;
    if (dto.terms !== undefined) updateData.terms = dto.terms?.trim() || null;

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.lineItems) {
        await tx.invoiceLineItem.deleteMany({
          where: { invoiceId },
        });

        await tx.invoiceLineItem.createMany({
          data: dto.lineItems.map((item, index) => {
            const itemTotal = Math.round(item.quantity * item.unitPrice * 100) / 100;
            return {
              invoiceId,
              description: item.description.trim(),
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalAmount: itemTotal,
              notes: item.notes?.trim() || null,
              sortOrder: item.sortOrder ?? index,
            };
          }),
        });
      }

      return tx.invoice.update({
        where: { id: invoiceId },
        data: updateData,
        include: {
          customer: true,
          booking: {
            select: {
              id: true,
              bookingNumber: true,
              title: true,
              eventDate: true,
            },
          },
          lineItems: { orderBy: { sortOrder: 'asc' } },
          payments: { orderBy: { paymentDate: 'desc' } },
        },
      });
    });

    this.auditLogService.record({
      scope: 'tenant',
      tenantId,
      actorType: userId ? 'tenant_user' : 'system',
      action: 'invoice.updated',
      outcome: 'allowed',
      metadata: {
        invoiceId,
        invoiceNumber: updated.invoiceNumber,
      },
    });

    return this.mapInvoiceDetail(updated);
  }

  async issueInvoice(
    tenantId: string,
    userId: string | undefined,
    invoiceId: string,
  ): Promise<InvoiceDetail> {
    const existing = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
      include: { booking: true },
    });

    if (!existing) {
      throw new NotFoundException(`Invoice ${invoiceId} not found`);
    }

    if (existing.status !== 'draft') {
      throw new BadRequestException(
        `Cannot issue invoice in "${existing.status}" status. Only draft invoices can be issued.`,
      );
    }

    const issued = await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: 'issued',
        issuedAt: new Date(),
      },
      include: {
        customer: true,
        booking: {
          select: {
            id: true,
            bookingNumber: true,
            title: true,
            eventDate: true,
          },
        },
        lineItems: { orderBy: { sortOrder: 'asc' } },
        payments: { orderBy: { paymentDate: 'desc' } },
      },
    });

    if (existing.booking?.enquiryId) {
      await this.prisma.enquiryActivity.create({
        data: {
          enquiryId: existing.booking.enquiryId,
          type: 'status_change',
          content: `Invoice ${existing.invoiceNumber} issued for ${existing.currency} ${Number(existing.totalAmount).toFixed(2)}.`,
          authorId: userId ?? null,
        },
      });
    }

    this.auditLogService.record({
      scope: 'tenant',
      tenantId,
      actorType: userId ? 'tenant_user' : 'system',
      action: 'invoice.issued',
      outcome: 'allowed',
      metadata: {
        invoiceId,
        invoiceNumber: issued.invoiceNumber,
        totalAmount: String(Number(issued.totalAmount)),
      },
    });

    return this.mapInvoiceDetail(issued);
  }

  async recordPayment(
    tenantId: string,
    userId: string | undefined,
    invoiceId: string,
    dto: RecordInvoicePaymentRequest,
  ): Promise<InvoiceDetail> {
    const existing = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
      include: { booking: true },
    });

    if (!existing) {
      throw new NotFoundException(`Invoice ${invoiceId} not found`);
    }

    if (existing.status === 'void') {
      throw new BadRequestException('Cannot record payment on a voided invoice');
    }

    const currentPaid = Number(existing.paidAmount);
    const total = Number(existing.totalAmount);
    const newPaid = Math.round((currentPaid + dto.amount) * 100) / 100;
    const newBalanceDue = Math.max(0, Math.round((total - newPaid) * 100) / 100);

    let nextStatus: InvoiceStatus = existing.status as InvoiceStatus;
    if (newBalanceDue <= 0) {
      nextStatus = 'paid';
    } else {
      nextStatus = 'partially_paid';
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.invoicePayment.create({
        data: {
          tenantId,
          invoiceId,
          amount: dto.amount,
          paymentDate: new Date(dto.paymentDate),
          paymentMethod: dto.paymentMethod,
          reference: dto.reference?.trim() || null,
          notes: dto.notes?.trim() || null,
          recordedBy: userId ?? 'system',
        },
      });

      // Also create Payment and PaymentAllocation for FN002 Payments tracking if supported
      if (tx.payment && tx.paymentAllocation) {
        const count = await tx.payment.count({ where: { tenantId } });
        const date = new Date();
        const yearMonth = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
        const payNum = `PAY-${yearMonth}-${String(count + 1).padStart(4, '0')}`;

        const createdPayment = await tx.payment.create({
          data: {
            tenantId,
            paymentNumber: payNum,
            customerId: existing.customerId,
            amount: dto.amount,
            currency: existing.currency,
            paymentDate: new Date(dto.paymentDate),
            paymentMethod: dto.paymentMethod as any,
            status: 'allocated',
            reference: dto.reference?.trim() || null,
            notes: dto.notes?.trim() || `Recorded directly for ${existing.invoiceNumber}`,
            recordedBy: userId ?? 'system',
            allocatedAmount: dto.amount,
            unallocatedAmount: 0,
          },
        });

        await tx.paymentAllocation.create({
          data: {
            tenantId,
            paymentId: createdPayment.id,
            invoiceId,
            amount: dto.amount,
            notes: dto.notes?.trim() || null,
          },
        });
      }

      const inv = await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          paidAmount: newPaid,
          balanceDue: newBalanceDue,
          status: nextStatus,
          issuedAt: existing.issuedAt ?? new Date(),
        },
        include: {
          customer: true,
          booking: {
            select: {
              id: true,
              bookingNumber: true,
              title: true,
              eventDate: true,
            },
          },
          lineItems: { orderBy: { sortOrder: 'asc' } },
          payments: { orderBy: { paymentDate: 'desc' } },
        },
      });

      if (existing.booking?.enquiryId) {
        await tx.enquiryActivity.create({
          data: {
            enquiryId: existing.booking.enquiryId,
            type: 'status_change',
            content: `Payment of ${existing.currency} ${dto.amount.toFixed(2)} recorded on Invoice ${existing.invoiceNumber}. Remaining balance: ${existing.currency} ${newBalanceDue.toFixed(2)}.`,
            authorId: userId ?? null,
          },
        });
      }

      return inv;
    });

    this.auditLogService.record({
      scope: 'tenant',
      tenantId,
      actorType: userId ? 'tenant_user' : 'system',
      action: 'invoice.payment_recorded',
      outcome: 'allowed',
      metadata: {
        invoiceId,
        invoiceNumber: updated.invoiceNumber,
        paymentAmount: String(dto.amount),
        paidAmount: String(Number(updated.paidAmount)),
        balanceDue: String(Number(updated.balanceDue)),
        status: updated.status,
      },
    });

    return this.mapInvoiceDetail(updated);
  }

  async voidInvoice(
    tenantId: string,
    userId: string | undefined,
    invoiceId: string,
    dto: VoidInvoiceRequest,
  ): Promise<InvoiceDetail> {
    const existing = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
      include: { booking: true },
    });

    if (!existing) {
      throw new NotFoundException(`Invoice ${invoiceId} not found`);
    }

    if (existing.status === 'void') {
      throw new BadRequestException('Invoice is already voided');
    }

    if (Number(existing.paidAmount) > 0) {
      throw new BadRequestException(
        'Cannot void an invoice with recorded payments. Please delete or adjust payments first.',
      );
    }

    const voided = await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: 'void',
        voidedAt: new Date(),
        voidReason: dto.voidReason.trim(),
      },
      include: {
        customer: true,
        booking: {
          select: {
            id: true,
            bookingNumber: true,
            title: true,
            eventDate: true,
          },
        },
        lineItems: { orderBy: { sortOrder: 'asc' } },
        payments: { orderBy: { paymentDate: 'desc' } },
      },
    });

    if (existing.booking?.enquiryId) {
      await this.prisma.enquiryActivity.create({
        data: {
          enquiryId: existing.booking.enquiryId,
          type: 'status_change',
          content: `Invoice ${existing.invoiceNumber} voided. Reason: "${dto.voidReason.trim()}".`,
          authorId: userId ?? null,
        },
      });
    }

    this.auditLogService.record({
      scope: 'tenant',
      tenantId,
      actorType: userId ? 'tenant_user' : 'system',
      action: 'invoice.voided',
      outcome: 'allowed',
      metadata: {
        invoiceId,
        invoiceNumber: voided.invoiceNumber,
        voidReason: dto.voidReason,
      },
    });

    return this.mapInvoiceDetail(voided);
  }

  async deleteDraftInvoice(
    tenantId: string,
    userId: string | undefined,
    invoiceId: string,
  ): Promise<{ success: boolean }> {
    const existing = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
    });

    if (!existing) {
      throw new NotFoundException(`Invoice ${invoiceId} not found`);
    }

    if (existing.status !== 'draft') {
      throw new BadRequestException(
        `Cannot delete invoice in "${existing.status}" status. Only draft invoices can be deleted.`,
      );
    }

    await this.prisma.invoice.delete({
      where: { id: invoiceId },
    });

    this.auditLogService.record({
      scope: 'tenant',
      tenantId,
      actorType: userId ? 'tenant_user' : 'system',
      action: 'invoice.deleted',
      outcome: 'allowed',
      metadata: {
        invoiceId,
        invoiceNumber: existing.invoiceNumber,
      },
    });

    return { success: true };
  }
}
