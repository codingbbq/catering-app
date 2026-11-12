import type {
  CreateQuotationRequest,
  CreateQuotationRevisionRequest,
  Quotation,
  QuotationLineItem,
  QuotationListItem,
  QuotationListResponse,
  QuotationListStats,
  QuotationRevision,
  QuotationSearchParams,
  QuotationStatus,
  RevisionStatus,
  SendQuotationRequest,
  UpdateDraftRevisionRequest,
  UpdateQuotationRequest,
} from '@catering/shared-types';
import { calculateQuotationTotals } from '@catering/shared-types';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditLogService } from '../tenancy/audit-log.service.js';

@Injectable()
export class QuotationsService {
  private readonly logger = new Logger(QuotationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  private mapLineItem(item: {
    id: string;
    revisionId: string;
    name: string;
    description: string | null;
    category: string | null;
    quantity: Prisma.Decimal | number;
    unit: string;
    unitPrice: Prisma.Decimal | number;
    totalPrice: Prisma.Decimal | number;
    unitCost: Prisma.Decimal | number | null;
    totalCost: Prisma.Decimal | number | null;
    sortOrder: number;
  }): QuotationLineItem {
    return {
      id: item.id,
      revisionId: item.revisionId,
      name: item.name,
      description: item.description,
      category: item.category ?? 'Food & Beverage',
      quantity: Number(item.quantity),
      unit: item.unit,
      unitPrice: Number(item.unitPrice),
      totalPrice: Number(item.totalPrice),
      unitCost: item.unitCost != null ? Number(item.unitCost) : null,
      totalCost: item.totalCost != null ? Number(item.totalCost) : null,
      sortOrder: item.sortOrder,
    };
  }

  private mapRevision(rev: {
    id: string;
    quotationId: string;
    revisionNumber: number;
    status: string;
    menuId: string | null;
    menu?: { name: string } | null;
    costSheetId: string | null;
    costSheet?: { name: string } | null;
    guestCount: number | null;
    pricePerPerson: Prisma.Decimal | number | null;
    subtotal: Prisma.Decimal | number;
    taxPercent: Prisma.Decimal | number;
    taxAmount: Prisma.Decimal | number;
    discountAmount: Prisma.Decimal | number;
    totalAmount: Prisma.Decimal | number;
    estimatedCost: Prisma.Decimal | number | null;
    estimatedMarginPercent: Prisma.Decimal | number | null;
    notes: string | null;
    changeSummary: string | null;
    createdByUserId: string | null;
    items?: Array<{
      id: string;
      revisionId: string;
      name: string;
      description: string | null;
      category: string | null;
      quantity: Prisma.Decimal | number;
      unit: string;
      unitPrice: Prisma.Decimal | number;
      totalPrice: Prisma.Decimal | number;
      unitCost: Prisma.Decimal | number | null;
      totalCost: Prisma.Decimal | number | null;
      sortOrder: number;
    }>;
    createdAt: Date;
    updatedAt: Date;
  }): QuotationRevision {
    return {
      id: rev.id,
      quotationId: rev.quotationId,
      revisionNumber: rev.revisionNumber,
      status: rev.status as RevisionStatus,
      menuId: rev.menuId,
      menuName: rev.menu?.name ?? null,
      costSheetId: rev.costSheetId,
      costSheetName: rev.costSheet?.name ?? null,
      guestCount: rev.guestCount,
      pricePerPerson: rev.pricePerPerson != null ? Number(rev.pricePerPerson) : null,
      subtotal: Number(rev.subtotal),
      taxPercent: Number(rev.taxPercent),
      taxAmount: Number(rev.taxAmount),
      discountAmount: Number(rev.discountAmount),
      totalAmount: Number(rev.totalAmount),
      estimatedCost: rev.estimatedCost != null ? Number(rev.estimatedCost) : null,
      estimatedMarginPercent:
        rev.estimatedMarginPercent != null ? Number(rev.estimatedMarginPercent) : null,
      notes: rev.notes,
      changeSummary: rev.changeSummary,
      createdByUserId: rev.createdByUserId,
      items: (rev.items ?? []).map((it) => this.mapLineItem(it)),
      createdAt: rev.createdAt.toISOString(),
      updatedAt: rev.updatedAt.toISOString(),
    };
  }

  private mapQuotation(q: {
    id: string;
    tenantId: string;
    enquiryId: string;
    quotationNumber: string;
    title: string;
    status: string;
    currentRevisionNumber: number;
    validUntil: Date | null;
    notes: string | null;
    terms: string | null;
    enquiry?: {
      id: string;
      title: string;
      customer: {
        id: string;
        name: string;
        email: string | null;
        phone: string | null;
      };
    };
    revisions?: any[];
    createdAt: Date;
    updatedAt: Date;
  }): Quotation {
    const revisions: QuotationRevision[] = (q.revisions ?? [])
      .map((r: any) => this.mapRevision(r))
      .sort((a, b) => b.revisionNumber - a.revisionNumber);

    const currentRevision =
      revisions.find((r) => r.revisionNumber === q.currentRevisionNumber) ??
      revisions[0] ??
      null;

    return {
      id: q.id,
      tenantId: q.tenantId,
      enquiryId: q.enquiryId,
      enquiryTitle: q.enquiry?.title,
      customerId: q.enquiry?.customer.id,
      customerName: q.enquiry?.customer.name,
      customerEmail: q.enquiry?.customer.email,
      customerPhone: q.enquiry?.customer.phone,
      quotationNumber: q.quotationNumber,
      title: q.title,
      status: q.status as QuotationStatus,
      currentRevisionNumber: q.currentRevisionNumber,
      validUntil: q.validUntil ? q.validUntil.toISOString() : null,
      notes: q.notes,
      terms: q.terms,
      currentRevision,
      revisions,
      createdAt: q.createdAt.toISOString(),
      updatedAt: q.updatedAt.toISOString(),
    };
  }

  private async generateQuotationNumber(tenantId: string): Promise<string> {
    const date = new Date();
    const yearMonth = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
    const count = await this.prisma.quotation.count({
      where: { tenantId },
    });
    const seq = String(count + 1).padStart(4, '0');
    return `QT-${yearMonth}-${seq}`;
  }

  private async getTenantCurrency(tenantId: string): Promise<string> {
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: { currencyCode: true },
    });
    return settings?.currencyCode ?? 'USD';
  }

  async listQuotations(
    tenantId: string,
    params?: QuotationSearchParams,
  ): Promise<QuotationListResponse> {
    const where: Prisma.QuotationWhereInput = { tenantId };

    if (params?.status && params.status !== 'all') {
      where.status = params.status;
    }

    if (params?.enquiryId) {
      where.enquiryId = params.enquiryId;
    }

    if (params?.customerId) {
      where.enquiry = { customerId: params.customerId };
    }

    if (params?.search) {
      where.OR = [
        { quotationNumber: { contains: params.search, mode: 'insensitive' } },
        { title: { contains: params.search, mode: 'insensitive' } },
        { enquiry: { title: { contains: params.search, mode: 'insensitive' } } },
        {
          enquiry: {
            customer: { name: { contains: params.search, mode: 'insensitive' } },
          },
        },
      ];
    }

    const [quotations, total, allTenantQuotations] = await Promise.all([
      this.prisma.quotation.findMany({
        where,
        include: {
          enquiry: {
            select: {
              id: true,
              title: true,
              customer: { select: { id: true, name: true } },
            },
          },
          revisions: {
            select: {
              id: true,
              revisionNumber: true,
              totalAmount: true,
              guestCount: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.quotation.count({ where }),
      this.prisma.quotation.findMany({
        where: { tenantId },
        select: {
          status: true,
          currentRevisionNumber: true,
          revisions: {
            select: {
              revisionNumber: true,
              totalAmount: true,
            },
          },
        },
      }),
    ]);

    const items: QuotationListItem[] = quotations.map((q) => {
      const currentRev =
        q.revisions.find((r) => r.revisionNumber === q.currentRevisionNumber) ??
        q.revisions[0];

      return {
        id: q.id,
        quotationNumber: q.quotationNumber,
        title: q.title,
        status: q.status as QuotationStatus,
        enquiryId: q.enquiryId,
        enquiryTitle: q.enquiry.title,
        customerId: q.enquiry.customer.id,
        customerName: q.enquiry.customer.name,
        currentRevisionNumber: q.currentRevisionNumber,
        totalRevisions: q.revisions.length,
        totalAmount: currentRev ? Number(currentRev.totalAmount) : 0,
        guestCount: currentRev?.guestCount ?? null,
        validUntil: q.validUntil ? q.validUntil.toISOString() : null,
        createdAt: q.createdAt.toISOString(),
        updatedAt: q.updatedAt.toISOString(),
      };
    });

    // Calculate aggregated pipeline stats
    let totalValue = 0;
    let acceptedCount = 0;
    let acceptedValue = 0;
    let pendingCount = 0;
    let pendingValue = 0;

    for (const q of allTenantQuotations) {
      const activeRev =
        q.revisions.find((r) => r.revisionNumber === q.currentRevisionNumber) ??
        q.revisions[0];
      const amount = activeRev ? Number(activeRev.totalAmount) : 0;
      totalValue += amount;

      if (q.status === 'accepted') {
        acceptedCount += 1;
        acceptedValue += amount;
      } else if (q.status === 'draft' || q.status === 'sent') {
        pendingCount += 1;
        pendingValue += amount;
      }
    }

    const stats: QuotationListStats = {
      totalQuotations: allTenantQuotations.length,
      totalValue: Math.round(totalValue * 100) / 100,
      acceptedCount,
      acceptedValue: Math.round(acceptedValue * 100) / 100,
      pendingCount,
      pendingValue: Math.round(pendingValue * 100) / 100,
    };

    return { items, stats, total };
  }

  async getQuotationById(tenantId: string, quotationId: string): Promise<Quotation> {
    const quotation = await this.prisma.quotation.findFirst({
      where: { id: quotationId, tenantId },
      include: {
        enquiry: {
          select: {
            id: true,
            title: true,
            customer: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        revisions: {
          include: {
            menu: { select: { name: true } },
            costSheet: { select: { name: true } },
            items: {
              orderBy: { sortOrder: 'asc' },
            },
          },
          orderBy: { revisionNumber: 'desc' },
        },
      },
    });

    if (!quotation) {
      throw new NotFoundException(`Quotation ${quotationId} not found`);
    }

    return this.mapQuotation(quotation);
  }

  async createQuotation(
    tenantId: string,
    userId: string,
    dto: CreateQuotationRequest,
  ): Promise<Quotation> {
    // 1. Verify enquiry exists and belongs to this tenant
    const enquiry = await this.prisma.enquiry.findFirst({
      where: { id: dto.enquiryId, tenantId },
      include: { customer: true },
    });

    if (!enquiry) {
      throw new NotFoundException(`Enquiry ${dto.enquiryId} not found`);
    }

    // 2. Generate quotation number
    const quotationNumber = await this.generateQuotationNumber(tenantId);

    // 3. Calculate deterministic totals for Revision 1
    const totals = calculateQuotationTotals({
      items: dto.items,
      discountAmount: dto.discountAmount,
      taxPercent: dto.taxPercent,
      guestCount: dto.guestCount,
      pricePerPerson: dto.pricePerPerson,
    });

    // 4. Create Quotation and Revision 1 in transaction
    const quotation = await this.prisma.quotation.create({
      data: {
        tenantId,
        enquiryId: dto.enquiryId,
        quotationNumber,
        title: dto.title.trim(),
        status: 'draft',
        currentRevisionNumber: 1,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
        notes: dto.notes?.trim() || null,
        terms: dto.terms?.trim() || null,
        revisions: {
          create: {
            revisionNumber: 1,
            status: 'draft',
            menuId: dto.menuId || null,
            costSheetId: dto.costSheetId || null,
            guestCount: dto.guestCount || null,
            pricePerPerson: totals.pricePerPerson,
            subtotal: totals.subtotal,
            taxPercent: totals.taxPercent,
            taxAmount: totals.taxAmount,
            discountAmount: totals.discountAmount,
            totalAmount: totals.totalAmount,
            estimatedCost: totals.estimatedCost,
            estimatedMarginPercent: totals.estimatedMarginPercent,
            notes: dto.notes?.trim() || null,
            changeSummary: dto.changeSummary?.trim() || 'Initial quotation prepared',
            createdByUserId: userId,
            items: {
              create: dto.items.map((it, idx) => ({
                name: it.name.trim(),
                description: it.description?.trim() || null,
                category: it.category?.trim() || 'Food & Beverage',
                quantity: it.quantity,
                unit: it.unit?.trim() || 'guest',
                unitPrice: it.unitPrice,
                totalPrice: Math.round(Number(it.quantity) * Number(it.unitPrice) * 100) / 100,
                unitCost: it.unitCost != null ? Number(it.unitCost) : null,
                totalCost:
                  it.unitCost != null
                    ? Math.round(Number(it.quantity) * Number(it.unitCost) * 100) / 100
                    : null,
                sortOrder: it.sortOrder ?? idx,
              })),
            },
          },
        },
      },
      include: {
        enquiry: {
          select: {
            id: true,
            title: true,
            customer: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        revisions: {
          include: {
            menu: { select: { name: true } },
            costSheet: { select: { name: true } },
            items: {
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
    });

    // 5. Update enquiry status from 'new' to 'qualified' if applicable & record activity
    if (enquiry.status === 'new') {
      await this.prisma.enquiry.update({
        where: { id: enquiry.id },
        data: { status: 'qualified' },
      });
    }

    const currency = await this.getTenantCurrency(tenantId);
    await this.prisma.enquiryActivity.create({
      data: {
        enquiryId: enquiry.id,
        type: 'status_change',
        content: `Quotation ${quotationNumber} created (Rev 1) with total amount ${currency} ${totals.totalAmount.toFixed(2)}.`,
        authorId: userId,
      },
    });

    this.auditLogService.record({
      scope: 'tenant',
      tenantId,
      actorType: userId ? 'tenant_user' : 'system',
      action: 'quotation.created',
      outcome: 'allowed',
      metadata: {
        quotationId: quotation.id,
        quotationNumber,
        enquiryId: dto.enquiryId,
        totalAmount: String(totals.totalAmount),
      },
    });

    return this.mapQuotation(quotation);
  }

  async updateQuotation(
    tenantId: string,
    userId: string,
    quotationId: string,
    dto: UpdateQuotationRequest,
  ): Promise<Quotation> {
    const existing = await this.prisma.quotation.findFirst({
      where: { id: quotationId, tenantId },
    });

    if (!existing) {
      throw new NotFoundException(`Quotation ${quotationId} not found`);
    }

    const data: Prisma.QuotationUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title.trim();
    if (dto.validUntil !== undefined) {
      data.validUntil = dto.validUntil ? new Date(dto.validUntil) : null;
    }
    if (dto.notes !== undefined) data.notes = dto.notes?.trim() || null;
    if (dto.terms !== undefined) data.terms = dto.terms?.trim() || null;

    await this.prisma.quotation.update({
      where: { id: quotationId },
      data,
    });

    this.auditLogService.record({
      scope: 'tenant',
      tenantId,
      actorType: userId ? 'tenant_user' : 'system',
      action: 'quotation.updated',
      outcome: 'allowed',
      metadata: { quotationId },
    });

    return this.getQuotationById(tenantId, quotationId);
  }

  async createRevision(
    tenantId: string,
    userId: string,
    quotationId: string,
    dto: CreateQuotationRevisionRequest,
  ): Promise<Quotation> {
    const quotation = await this.prisma.quotation.findFirst({
      where: { id: quotationId, tenantId },
      include: {
        revisions: {
          orderBy: { revisionNumber: 'desc' },
        },
      },
    });

    if (!quotation) {
      throw new NotFoundException(`Quotation ${quotationId} not found`);
    }

    if (quotation.status === 'accepted') {
      throw new BadRequestException(
        'Cannot create a revision for an already accepted quotation. Reopen or cancel the acceptance first.',
      );
    }

    const nextRevNum = quotation.revisions.length > 0
      ? Math.max(...quotation.revisions.map((r) => r.revisionNumber)) + 1
      : 1;

    // Calculate totals for new revision
    const totals = calculateQuotationTotals({
      items: dto.items,
      discountAmount: dto.discountAmount,
      taxPercent: dto.taxPercent,
      guestCount: dto.guestCount,
      pricePerPerson: dto.pricePerPerson,
    });

    // Mark previous draft revisions as superseded to preserve historical integrity
    await this.prisma.quotationRevision.updateMany({
      where: {
        quotationId,
        status: 'draft',
      },
      data: { status: 'superseded' },
    });

    // Create the new revision
    await this.prisma.quotationRevision.create({
      data: {
        quotationId,
        revisionNumber: nextRevNum,
        status: 'draft',
        menuId: dto.menuId || null,
        costSheetId: dto.costSheetId || null,
        guestCount: dto.guestCount || null,
        pricePerPerson: totals.pricePerPerson,
        subtotal: totals.subtotal,
        taxPercent: totals.taxPercent,
        taxAmount: totals.taxAmount,
        discountAmount: totals.discountAmount,
        totalAmount: totals.totalAmount,
        estimatedCost: totals.estimatedCost,
        estimatedMarginPercent: totals.estimatedMarginPercent,
        notes: dto.notes?.trim() || null,
        changeSummary: dto.changeSummary.trim(),
        createdByUserId: userId,
        items: {
          create: dto.items.map((it, idx) => ({
            name: it.name.trim(),
            description: it.description?.trim() || null,
            category: it.category?.trim() || 'Food & Beverage',
            quantity: it.quantity,
            unit: it.unit?.trim() || 'guest',
            unitPrice: it.unitPrice,
            totalPrice: Math.round(Number(it.quantity) * Number(it.unitPrice) * 100) / 100,
            unitCost: it.unitCost != null ? Number(it.unitCost) : null,
            totalCost:
              it.unitCost != null
                ? Math.round(Number(it.quantity) * Number(it.unitCost) * 100) / 100
                : null,
            sortOrder: it.sortOrder ?? idx,
          })),
        },
      },
    });

    // Update quotation's current revision pointer and set status back to draft if it was sent/expired
    await this.prisma.quotation.update({
      where: { id: quotationId },
      data: {
        currentRevisionNumber: nextRevNum,
        status: quotation.status === 'sent' || quotation.status === 'expired' ? 'draft' : quotation.status,
      },
    });

    // Record activity on the parent enquiry
    const currency = await this.getTenantCurrency(tenantId);
    await this.prisma.enquiryActivity.create({
      data: {
        enquiryId: quotation.enquiryId,
        type: 'note',
        content: `Quotation ${quotation.quotationNumber} updated: Revision ${nextRevNum} created. "${dto.changeSummary.trim()}" (Total: ${currency} ${totals.totalAmount.toFixed(2)})`,
        authorId: userId,
      },
    });

    this.auditLogService.record({
      scope: 'tenant',
      tenantId,
      actorType: userId ? 'tenant_user' : 'system',
      action: 'quotation.revision_created',
      outcome: 'allowed',
      metadata: {
        quotationId,
        revisionNumber: String(nextRevNum),
        totalAmount: String(totals.totalAmount),
      },
    });

    return this.getQuotationById(tenantId, quotationId);
  }

  async updateDraftRevision(
    tenantId: string,
    userId: string,
    quotationId: string,
    revisionId: string,
    dto: UpdateDraftRevisionRequest,
  ): Promise<Quotation> {
    const quotation = await this.prisma.quotation.findFirst({
      where: { id: quotationId, tenantId },
    });

    if (!quotation) {
      throw new NotFoundException(`Quotation ${quotationId} not found`);
    }

    const revision = await this.prisma.quotationRevision.findFirst({
      where: { id: revisionId, quotationId },
    });

    if (!revision) {
      throw new NotFoundException(`Revision ${revisionId} not found`);
    }

    if (revision.status !== 'draft') {
      throw new BadRequestException(
        `Cannot edit revision in '${revision.status}' status. Create a new revision to preserve historical accountability.`,
      );
    }

    const totals = calculateQuotationTotals({
      items: dto.items,
      discountAmount: dto.discountAmount,
      taxPercent: dto.taxPercent,
      guestCount: dto.guestCount,
      pricePerPerson: dto.pricePerPerson,
    });

    // Replace line items
    await this.prisma.quotationLineItem.deleteMany({
      where: { revisionId },
    });

    await this.prisma.quotationRevision.update({
      where: { id: revisionId },
      data: {
        menuId: dto.menuId || null,
        costSheetId: dto.costSheetId || null,
        guestCount: dto.guestCount || null,
        pricePerPerson: totals.pricePerPerson,
        subtotal: totals.subtotal,
        taxPercent: totals.taxPercent,
        taxAmount: totals.taxAmount,
        discountAmount: totals.discountAmount,
        totalAmount: totals.totalAmount,
        estimatedCost: totals.estimatedCost,
        estimatedMarginPercent: totals.estimatedMarginPercent,
        notes: dto.notes !== undefined ? dto.notes?.trim() || null : revision.notes,
        changeSummary:
          dto.changeSummary !== undefined ? dto.changeSummary?.trim() || null : revision.changeSummary,
        items: {
          create: dto.items.map((it, idx) => ({
            name: it.name.trim(),
            description: it.description?.trim() || null,
            category: it.category?.trim() || 'Food & Beverage',
            quantity: it.quantity,
            unit: it.unit?.trim() || 'guest',
            unitPrice: it.unitPrice,
            totalPrice: Math.round(Number(it.quantity) * Number(it.unitPrice) * 100) / 100,
            unitCost: it.unitCost != null ? Number(it.unitCost) : null,
            totalCost:
              it.unitCost != null
                ? Math.round(Number(it.quantity) * Number(it.unitCost) * 100) / 100
                : null,
            sortOrder: it.sortOrder ?? idx,
          })),
        },
      },
    });

    this.auditLogService.record({
      scope: 'tenant',
      tenantId,
      actorType: userId ? 'tenant_user' : 'system',
      action: 'quotation.draft_revision_updated',
      outcome: 'allowed',
      metadata: { quotationId, revisionId },
    });

    return this.getQuotationById(tenantId, quotationId);
  }

  async sendQuotation(
    tenantId: string,
    userId: string,
    quotationId: string,
    dto?: SendQuotationRequest,
  ): Promise<Quotation> {
    const quotation = await this.prisma.quotation.findFirst({
      where: { id: quotationId, tenantId },
      include: {
        enquiry: { include: { customer: true } },
        revisions: true,
      },
    });

    if (!quotation) {
      throw new NotFoundException(`Quotation ${quotationId} not found`);
    }

    if (quotation.status === 'accepted') {
      throw new BadRequestException('Cannot send an already accepted quotation.');
    }

    // Determine target revision
    const targetRev = dto?.revisionId
      ? quotation.revisions.find((r) => r.id === dto.revisionId)
      : quotation.revisions.find((r) => r.revisionNumber === quotation.currentRevisionNumber) ??
        quotation.revisions[0];

    if (!targetRev) {
      throw new NotFoundException('Revision to send was not found');
    }

    // Update revision to sent
    await this.prisma.quotationRevision.update({
      where: { id: targetRev.id },
      data: { status: 'sent' },
    });

    // Update quotation status
    await this.prisma.quotation.update({
      where: { id: quotationId },
      data: {
        status: 'sent',
        currentRevisionNumber: targetRev.revisionNumber,
      },
    });

    // Update enquiry status to proposal_sent if it's currently new or qualified
    if (quotation.enquiry.status === 'new' || quotation.enquiry.status === 'qualified') {
      await this.prisma.enquiry.update({
        where: { id: quotation.enquiryId },
        data: { status: 'proposal_sent' },
      });
    }

    const recipient = dto?.recipientEmail || quotation.enquiry.customer.email || 'Customer';
    const currency = await this.getTenantCurrency(tenantId);
    await this.prisma.enquiryActivity.create({
      data: {
        enquiryId: quotation.enquiryId,
        type: 'email',
        content: `Quotation ${quotation.quotationNumber} (Rev ${targetRev.revisionNumber}) sent to ${recipient}. Total: ${currency} ${Number(targetRev.totalAmount).toFixed(2)}. ${dto?.sendNotes ? `Notes: ${dto.sendNotes}` : ''}`.trim(),
        authorId: userId,
      },
    });

    this.auditLogService.record({
      scope: 'tenant',
      tenantId,
      actorType: userId ? 'tenant_user' : 'system',
      action: 'quotation.sent',
      outcome: 'allowed',
      metadata: {
        quotationId,
        quotationNumber: quotation.quotationNumber,
        revisionNumber: String(targetRev.revisionNumber),
        recipient,
      },
    });

    return this.getQuotationById(tenantId, quotationId);
  }

  async acceptQuotation(
    tenantId: string,
    userId: string,
    quotationId: string,
    revisionId?: string,
  ): Promise<Quotation> {
    const quotation = await this.prisma.quotation.findFirst({
      where: { id: quotationId, tenantId },
      include: {
        revisions: true,
      },
    });

    if (!quotation) {
      throw new NotFoundException(`Quotation ${quotationId} not found`);
    }

    const targetRev = revisionId
      ? quotation.revisions.find((r) => r.id === revisionId)
      : quotation.revisions.find((r) => r.revisionNumber === quotation.currentRevisionNumber) ??
        quotation.revisions[0];

    if (!targetRev) {
      throw new NotFoundException('Revision not found');
    }

    // Accept target revision
    await this.prisma.quotationRevision.update({
      where: { id: targetRev.id },
      data: { status: 'accepted' },
    });

    // Mark other revisions as superseded
    await this.prisma.quotationRevision.updateMany({
      where: {
        quotationId,
        id: { not: targetRev.id },
        status: { in: ['draft', 'sent'] },
      },
      data: { status: 'superseded' },
    });

    // Update quotation status
    await this.prisma.quotation.update({
      where: { id: quotationId },
      data: {
        status: 'accepted',
        currentRevisionNumber: targetRev.revisionNumber,
      },
    });

    // Update enquiry status to converted
    await this.prisma.enquiry.update({
      where: { id: quotation.enquiryId },
      data: {
        status: 'converted',
        nextAction: 'Convert accepted quotation into booking confirmation',
      },
    });

    const currency = await this.getTenantCurrency(tenantId);
    await this.prisma.enquiryActivity.create({
      data: {
        enquiryId: quotation.enquiryId,
        type: 'status_change',
        content: `Quotation ${quotation.quotationNumber} (Rev ${targetRev.revisionNumber}) accepted by customer (${currency} ${Number(targetRev.totalAmount).toFixed(2)}). Ready for booking conversion.`,
        authorId: userId,
      },
    });

    this.auditLogService.record({
      scope: 'tenant',
      tenantId,
      actorType: userId ? 'tenant_user' : 'system',
      action: 'quotation.accepted',
      outcome: 'allowed',
      metadata: {
        quotationId,
        quotationNumber: quotation.quotationNumber,
        revisionNumber: String(targetRev.revisionNumber),
      },
    });

    return this.getQuotationById(tenantId, quotationId);
  }

  async rejectQuotation(
    tenantId: string,
    userId: string,
    quotationId: string,
    reason?: string,
  ): Promise<Quotation> {
    const quotation = await this.prisma.quotation.findFirst({
      where: { id: quotationId, tenantId },
      include: { revisions: true },
    });

    if (!quotation) {
      throw new NotFoundException(`Quotation ${quotationId} not found`);
    }

    if (quotation.status === 'accepted') {
      throw new BadRequestException('Cannot reject an already accepted quotation.');
    }

    // Mark current revision as rejected
    await this.prisma.quotationRevision.updateMany({
      where: {
        quotationId,
        status: { in: ['draft', 'sent'] },
      },
      data: { status: 'rejected' },
    });

    await this.prisma.quotation.update({
      where: { id: quotationId },
      data: { status: 'rejected' },
    });

    await this.prisma.enquiryActivity.create({
      data: {
        enquiryId: quotation.enquiryId,
        type: 'status_change',
        content: `Quotation ${quotation.quotationNumber} rejected. ${reason ? `Reason: ${reason}` : ''}`.trim(),
        authorId: userId,
      },
    });

    this.auditLogService.record({
      scope: 'tenant',
      tenantId,
      actorType: userId ? 'tenant_user' : 'system',
      action: 'quotation.rejected',
      outcome: 'allowed',
      metadata: {
        quotationId,
        quotationNumber: quotation.quotationNumber,
        reason: reason || '',
      },
    });

    return this.getQuotationById(tenantId, quotationId);
  }
}
