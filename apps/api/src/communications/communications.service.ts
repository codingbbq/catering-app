import type {
  CommunicationFilterParams,
  CommunicationItem,
  CommunicationListResponse,
  CommunicationStats,
  CommunicationTemplateItem,
  CreateCommunicationRequest,
} from '@catering/shared-types';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditLogService } from '../tenancy/audit-log.service.js';
import {
  CommunicationProvider,
  MockCommunicationProvider,
} from './communication-provider.js';

const DEFAULT_TEMPLATES = [
  {
    name: 'Quotation Shared Notice',
    channel: 'email' as const,
    category: 'quotation',
    subject: 'Quotation for your upcoming catering event - {{quotation_number}}',
    body: 'Dear {{customer_name}},\n\nThank you for considering us for your catering needs! We have prepared quotation {{quotation_number}} for your event on {{event_date}}.\n\nTotal Estimated Amount: {{currency}} {{amount}}\n\nPlease review the attached proposal and let us know if you would like any revisions or are ready to confirm.\n\nWarm regards,\nThe Catering Team',
    isDefault: true,
  },
  {
    name: 'Quotation Follow-Up',
    channel: 'whatsapp' as const,
    category: 'quotation',
    subject: null,
    body: 'Hello {{customer_name}}! Just checking in regarding quotation {{quotation_number}} for your event on {{event_date}}. Do you have any questions or menu changes we can assist you with?',
    isDefault: true,
  },
  {
    name: 'Booking Confirmation',
    channel: 'email' as const,
    category: 'booking',
    subject: 'Booking Confirmed - {{booking_number}} - {{event_date}}',
    body: 'Dear {{customer_name}},\n\nWe are delighted to confirm your catering booking {{booking_number}} for {{event_date}} at {{venue}}.\n\nTotal Booking Value: {{currency}} {{amount}}\n\nOur culinary and operations team has initiated event preparations. We will reach out with the final execution schedule 48 hours prior to service.\n\nThank you for choosing us!',
    isDefault: true,
  },
  {
    name: 'Booking Reminder SMS',
    channel: 'sms' as const,
    category: 'booking',
    subject: null,
    body: 'Reminder: Catering booking {{booking_number}} is confirmed for {{event_date}}. Our team will arrive at {{venue}} on schedule. Helpline: (555) 019-2831.',
    isDefault: true,
  },
  {
    name: 'Payment Due Reminder',
    channel: 'email' as const,
    category: 'payment',
    subject: 'Upcoming Payment Reminder - Booking {{booking_number}}',
    body: 'Dear {{customer_name}},\n\nThis is a friendly reminder that an advance or milestone payment is pending for your booking {{booking_number}}.\n\nPlease check your invoice or contact our accounts desk to complete the transaction.\n\nThank you for your prompt cooperation.',
    isDefault: true,
  },
];

@Injectable()
export class CommunicationsService {
  private readonly provider: CommunicationProvider;

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {
    this.provider = new MockCommunicationProvider();
  }

  private mapToItem(log: any): CommunicationItem {
    return {
      id: log.id,
      tenantId: log.tenantId,
      customerId: log.customerId,
      customer: log.customer
        ? {
            id: log.customer.id,
            name: log.customer.name,
            email: log.customer.email,
            phone: log.customer.phone,
          }
        : undefined,
      enquiryId: log.enquiryId,
      enquiry: log.enquiry
        ? {
            id: log.enquiry.id,
            title: log.enquiry.title,
          }
        : undefined,
      quotationId: log.quotationId,
      quotation: log.quotation
        ? {
            id: log.quotation.id,
            quotationNumber: log.quotation.quotationNumber,
            title: log.quotation.title,
          }
        : undefined,
      bookingId: log.bookingId,
      booking: log.booking
        ? {
            id: log.booking.id,
            bookingNumber: log.booking.bookingNumber,
            title: log.booking.title,
          }
        : undefined,
      channel: log.channel,
      direction: log.direction,
      status: log.status,
      recipient: log.recipient,
      sender: log.sender,
      subject: log.subject,
      content: log.content,
      metadata: (log.metadata as Record<string, any>) || undefined,
      provider: log.provider,
      providerMessageId: log.providerMessageId,
      errorMessage: log.errorMessage,
      retryCount: log.retryCount,
      sentAt: log.sentAt ? log.sentAt.toISOString() : undefined,
      deliveredAt: log.deliveredAt ? log.deliveredAt.toISOString() : undefined,
      createdAt: log.createdAt.toISOString(),
      updatedAt: log.updatedAt.toISOString(),
    };
  }

  async listCommunications(
    tenantId: string,
    params?: CommunicationFilterParams,
  ): Promise<CommunicationListResponse> {
    const where: any = { tenantId };

    if (params?.channel && params.channel !== 'all') {
      where.channel = params.channel;
    }

    if (params?.status && params.status !== 'all') {
      where.status = params.status;
    }

    if (params?.direction && params.direction !== 'all') {
      where.direction = params.direction;
    }

    if (params?.entityType && params.entityType !== 'all' && params.entityId) {
      if (params.entityType === 'enquiry') where.enquiryId = params.entityId;
      else if (params.entityType === 'quotation') where.quotationId = params.entityId;
      else if (params.entityType === 'booking') where.bookingId = params.entityId;
      else if (params.entityType === 'customer') where.customerId = params.entityId;
    } else if (params?.entityId) {
      where.OR = [
        { enquiryId: params.entityId },
        { quotationId: params.entityId },
        { bookingId: params.entityId },
        { customerId: params.entityId },
      ];
    }

    if (params?.search && params.search.trim()) {
      const q = params.search.trim();
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { recipient: { contains: q, mode: 'insensitive' } },
            { sender: { contains: q, mode: 'insensitive' } },
            { subject: { contains: q, mode: 'insensitive' } },
            { content: { contains: q, mode: 'insensitive' } },
            { customer: { name: { contains: q, mode: 'insensitive' } } },
            { quotation: { quotationNumber: { contains: q, mode: 'insensitive' } } },
            { booking: { bookingNumber: { contains: q, mode: 'insensitive' } } },
          ],
        },
      ];
    }

    const [items, total, stats] = await Promise.all([
      this.prisma.communicationLog.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, email: true, phone: true } },
          enquiry: { select: { id: true, title: true } },
          quotation: { select: { id: true, quotationNumber: true, title: true } },
          booking: { select: { id: true, bookingNumber: true, title: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: params?.limit ?? 50,
        skip: params?.offset ?? 0,
      }),
      this.prisma.communicationLog.count({ where }),
      this.getStats(tenantId),
    ]);

    return {
      items: items.map((i) => this.mapToItem(i)),
      stats,
      total,
    };
  }

  async getCommunicationById(tenantId: string, id: string): Promise<CommunicationItem> {
    const log = await this.prisma.communicationLog.findFirst({
      where: { id, tenantId },
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        enquiry: { select: { id: true, title: true } },
        quotation: { select: { id: true, quotationNumber: true, title: true } },
        booking: { select: { id: true, bookingNumber: true, title: true } },
      },
    });

    if (!log) {
      throw new NotFoundException(`Communication with ID ${id} not found.`);
    }

    return this.mapToItem(log);
  }

  async getStats(tenantId: string): Promise<CommunicationStats> {
    const logs = await this.prisma.communicationLog.findMany({
      where: { tenantId },
      select: {
        status: true,
        channel: true,
      },
    });

    let sent = 0;
    let delivered = 0;
    let pending = 0;
    let failed = 0;

    const byChannel = {
      email: 0,
      sms: 0,
      whatsapp: 0,
      internal_note: 0,
    };

    for (const log of logs) {
      if (log.status === 'sent') sent++;
      else if (log.status === 'delivered') delivered++;
      else if (log.status === 'pending' || log.status === 'draft') pending++;
      else if (log.status === 'failed') failed++;

      if (log.channel in byChannel) {
        byChannel[log.channel as keyof typeof byChannel]++;
      }
    }

    return {
      total: logs.length,
      sent,
      delivered,
      pending,
      failed,
      byChannel,
    };
  }

  async getTemplates(tenantId: string): Promise<CommunicationTemplateItem[]> {
    let templates = await this.prisma.communicationTemplate.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
    });

    if (templates.length === 0) {
      // Seed default templates for tenant
      await this.prisma.communicationTemplate.createMany({
        data: DEFAULT_TEMPLATES.map((t) => ({
          tenantId,
          name: t.name,
          channel: t.channel,
          category: t.category,
          subject: t.subject,
          body: t.body,
          isDefault: t.isDefault,
        })),
      });

      templates = await this.prisma.communicationTemplate.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'asc' },
      });
    }

    return templates.map((t) => ({
      id: t.id,
      tenantId: t.tenantId,
      name: t.name,
      channel: t.channel as any,
      category: t.category,
      subject: t.subject,
      body: t.body,
      isDefault: t.isDefault,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }));
  }

  async createCommunication(
    tenantId: string,
    userId: string,
    dto: CreateCommunicationRequest,
  ): Promise<CommunicationItem> {
    // 1. Verify and resolve relations
    let customerId = dto.customerId;
    let enquiryId = dto.enquiryId;
    let quotationId = dto.quotationId;
    let bookingId = dto.bookingId;

    if (customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: customerId, tenantId },
      });
      if (!customer) throw new BadRequestException('Linked customer does not exist in this tenant');
    }

    if (enquiryId) {
      const enquiry = await this.prisma.enquiry.findFirst({
        where: { id: enquiryId, tenantId },
      });
      if (!enquiry) throw new BadRequestException('Linked enquiry does not exist in this tenant');
      if (!customerId) customerId = enquiry.customerId;
    }

    if (quotationId) {
      const quotation = await this.prisma.quotation.findFirst({
        where: { id: quotationId, tenantId },
        include: { enquiry: true },
      });
      if (!quotation) throw new BadRequestException('Linked quotation does not exist in this tenant');
      if (!enquiryId) enquiryId = quotation.enquiryId;
      if (!customerId && quotation.enquiry) customerId = quotation.enquiry.customerId;
    }

    if (bookingId) {
      const booking = await this.prisma.booking.findFirst({
        where: { id: bookingId, tenantId },
      });
      if (!booking) throw new BadRequestException('Linked booking does not exist in this tenant');
      if (!customerId) customerId = booking.customerId;
      if (!quotationId && booking.quotationId) quotationId = booking.quotationId;
      if (!enquiryId && booking.enquiryId) enquiryId = booking.enquiryId;
    }

    // 2. Dispatch via provider if not a draft
    let status = dto.status || 'sent';
    let providerName = 'mock';
    let providerMessageId: string | undefined = undefined;
    let errorMessage: string | undefined = undefined;
    let sentAt: Date | undefined = undefined;
    let deliveredAt: Date | undefined = undefined;

    if (dto.isDraft) {
      status = 'draft';
    } else {
      const providerResult = await this.provider.send({
        channel: dto.channel,
        recipient: dto.recipient,
        sender: dto.sender ?? undefined,
        subject: dto.subject ?? undefined,
        content: dto.content,
        metadata: dto.metadata ?? undefined,
      });

      providerName = providerResult.provider;
      providerMessageId = providerResult.providerMessageId;
      status = providerResult.status as any;
      sentAt = providerResult.sentAt;
      deliveredAt = providerResult.deliveredAt;
      errorMessage = providerResult.errorMessage;
    }

    // 3. Persist CommunicationLog
    const logData: any = {
      tenantId,
      customerId: customerId || null,
      enquiryId: enquiryId || null,
      quotationId: quotationId || null,
      bookingId: bookingId || null,
      channel: dto.channel,
      direction: dto.direction || 'outbound',
      status: status as any,
      recipient: dto.recipient,
      sender: dto.sender || null,
      subject: dto.subject || null,
      content: dto.content,
      provider: providerName,
      retryCount: 0,
    };

    if (dto.metadata) logData.metadata = dto.metadata;
    if (providerMessageId) logData.providerMessageId = providerMessageId;
    if (errorMessage) logData.errorMessage = errorMessage;
    if (sentAt) logData.sentAt = sentAt;
    if (deliveredAt) logData.deliveredAt = deliveredAt;

    const log = await this.prisma.communicationLog.create({
      data: logData,
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        enquiry: { select: { id: true, title: true } },
        quotation: { select: { id: true, quotationNumber: true, title: true } },
        booking: { select: { id: true, bookingNumber: true, title: true } },
      },
    });

    // 4. Log enquiry activity if linked
    if (enquiryId && !dto.isDraft) {
      try {
        await this.prisma.enquiryActivity.create({
          data: {
            enquiryId,
            type: dto.channel === 'email' ? 'email' : dto.channel === 'sms' || dto.channel === 'whatsapp' ? 'call' : 'note',
            content: `[${dto.channel.toUpperCase()}] ${dto.subject ? `${dto.subject} - ` : ''}To: ${dto.recipient}. Status: ${status}`,
            authorId: userId,
          },
        });
      } catch {
        // Non-blocking for timeline activity
      }
    }

    // 5. Audit Log
    this.auditLogService.record({
      scope: 'tenant',
      tenantId,
      actorType: userId ? 'tenant_user' : 'system',
      action: 'communication.created',
      outcome: 'allowed',
      metadata: {
        communicationId: log.id,
        channel: dto.channel,
        recipient: dto.recipient,
        status,
      },
    });

    return this.mapToItem(log);
  }

  async retryCommunication(
    tenantId: string,
    userId: string,
    id: string,
  ): Promise<CommunicationItem> {
    const existing = await this.prisma.communicationLog.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new NotFoundException(`Communication with ID ${id} not found.`);
    }

    if (existing.status === 'delivered') {
      throw new BadRequestException('This communication has already been successfully delivered.');
    }

    // Attempt re-dispatch
    const providerResult = await this.provider.send({
      channel: existing.channel as any,
      recipient: existing.recipient,
      sender: existing.sender ?? undefined,
      subject: existing.subject ?? undefined,
      content: existing.content,
      metadata: (existing.metadata as Record<string, any>) ?? undefined,
    });

    const updateData: any = {
      status: providerResult.status as any,
      provider: providerResult.provider,
      providerMessageId: providerResult.providerMessageId,
      errorMessage: providerResult.errorMessage || null,
      sentAt: providerResult.sentAt,
      deliveredAt: providerResult.deliveredAt || null,
      retryCount: { increment: 1 },
    };

    const updated = await this.prisma.communicationLog.update({
      where: { id },
      data: updateData,
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        enquiry: { select: { id: true, title: true } },
        quotation: { select: { id: true, quotationNumber: true, title: true } },
        booking: { select: { id: true, bookingNumber: true, title: true } },
      },
    });

    this.auditLogService.record({
      scope: 'tenant',
      tenantId,
      actorType: userId ? 'tenant_user' : 'system',
      action: 'communication.retried',
      outcome: 'allowed',
      metadata: {
        communicationId: updated.id,
        attemptNumber: String(updated.retryCount),
        resultStatus: updated.status,
      },
    });

    return this.mapToItem(updated);
  }
}
