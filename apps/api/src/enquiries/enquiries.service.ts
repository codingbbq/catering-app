import type {
  ActivityType,
  CreateEnquiryActivityRequest,
  CreateEnquiryRequest,
  EnquiryActivityItem,
  EnquiryDetail,
  EnquiryItem,
  EnquiryListResponse,
  EnquiryStatus,
  ServiceType,
  UpdateEnquiryRequest,
} from '@catering/shared-types';
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
export class EnquiriesService {
  private readonly logger = new Logger(EnquiriesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async listEnquiries(
    tenantId: string,
    filters?: {
      search?: string | undefined;
      status?: EnquiryStatus | undefined;
      customerId?: string | undefined;
      serviceType?: ServiceType | undefined;
    },
  ): Promise<EnquiryListResponse> {
    const where: Prisma.EnquiryWhereInput = { tenantId };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.customerId) {
      where.customerId = filters.customerId;
    }

    if (filters?.serviceType) {
      where.serviceType = filters.serviceType;
    }

    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { customer: { name: { contains: filters.search, mode: 'insensitive' } } },
        { eventType: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [enquiries, total] = await Promise.all([
      this.prisma.enquiry.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true } },
          assignedTo: { select: { id: true, displayName: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.enquiry.count({ where }),
    ]);

    const data: EnquiryItem[] = enquiries.map((e) => ({
      id: e.id,
      customerId: e.customerId,
      customerName: e.customer.name,
      title: e.title,
      status: e.status as EnquiryStatus,
      serviceType: e.serviceType as ServiceType,
      eventDate: e.eventDate ? e.eventDate.toISOString() : null,
      guestCount: e.guestCount,
      estimatedBudget: e.estimatedBudget ? Number(e.estimatedBudget) : null,
      assignedToId: e.assignedToId,
      assignedToName: e.assignedTo?.displayName ?? null,
      nextAction: e.nextAction,
      nextActionDate: e.nextActionDate ? e.nextActionDate.toISOString() : null,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
    }));

    return { data, total };
  }

  async createEnquiry(
    tenantId: string,
    dto: CreateEnquiryRequest,
    userId?: string,
    authorName?: string,
  ): Promise<EnquiryDetail> {
    // 1. Verify customer exists in tenant
    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, tenantId },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found for this tenant.');
    }

    // 2. Verify assigned user if provided
    if (dto.assignedToId) {
      const assigned = await this.prisma.tenantUser.findFirst({
        where: { id: dto.assignedToId, tenantId },
      });
      if (!assigned) {
        throw new BadRequestException('Assigned user not found in this tenant.');
      }
    }

    const enquiry = await this.prisma.enquiry.create({
      data: {
        tenantId,
        customerId: dto.customerId,
        title: dto.title,
        serviceType: dto.serviceType,
        status: 'new',
        eventDate: dto.eventDate ? new Date(dto.eventDate) : null,
        guestCount: dto.guestCount ?? null,
        eventType: dto.eventType ?? null,
        venue: dto.venue ?? null,
        estimatedBudget: dto.estimatedBudget !== undefined ? dto.estimatedBudget : null,
        notes: dto.notes ?? null,
        assignedToId: dto.assignedToId ?? null,
        nextAction: dto.nextAction ?? null,
        nextActionDate: dto.nextActionDate ? new Date(dto.nextActionDate) : null,
        activities: {
          create: {
            type: 'status_change',
            content: 'Enquiry created with status: New',
            authorId: userId ?? null,
            authorName: authorName ?? null,
          },
        },
      },
      include: {
        customer: true,
        assignedTo: { select: { id: true, displayName: true } },
        activities: { orderBy: { createdAt: 'desc' } },
      },
    });

    this.auditLogService.record({
      scope: 'tenant',
      tenantId,
      action: 'enquiry.created',
      actorType: 'tenant_user',
      outcome: 'allowed',
      metadata: { enquiryId: enquiry.id, customerId: enquiry.customerId, title: enquiry.title },
    });

    return this.mapToDetail(enquiry);
  }

  async getEnquiry(tenantId: string, enquiryId: string): Promise<EnquiryDetail> {
    const enquiry = await this.prisma.enquiry.findFirst({
      where: { id: enquiryId, tenantId },
      include: {
        customer: true,
        assignedTo: { select: { id: true, displayName: true } },
        activities: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!enquiry) {
      throw new NotFoundException('Enquiry not found.');
    }

    return this.mapToDetail(enquiry);
  }

  async updateEnquiry(
    tenantId: string,
    enquiryId: string,
    dto: UpdateEnquiryRequest,
    userId?: string,
    authorName?: string,
  ): Promise<EnquiryDetail> {
    const existing = await this.prisma.enquiry.findFirst({
      where: { id: enquiryId, tenantId },
    });

    if (!existing) {
      throw new NotFoundException('Enquiry not found.');
    }

    if (dto.assignedToId) {
      const assigned = await this.prisma.tenantUser.findFirst({
        where: { id: dto.assignedToId, tenantId },
      });
      if (!assigned) {
        throw new BadRequestException('Assigned user not found in this tenant.');
      }
    }

    const activitiesToCreate: Prisma.EnquiryActivityCreateWithoutEnquiryInput[] = [];

    // Track status change activity
    if (dto.status && dto.status !== existing.status) {
      const reasonText = dto.lostReason ? ` (Reason: ${dto.lostReason})` : '';
      activitiesToCreate.push({
        type: 'status_change',
        content: `Status changed from ${existing.status} to ${dto.status}${reasonText}`,
        authorId: userId ?? null,
        authorName: authorName ?? null,
      });
    }

    const updated = await this.prisma.enquiry.update({
      where: { id: enquiryId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.serviceType !== undefined && { serviceType: dto.serviceType }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.eventDate !== undefined && {
          eventDate: dto.eventDate ? new Date(dto.eventDate) : null,
        }),
        ...(dto.guestCount !== undefined && { guestCount: dto.guestCount }),
        ...(dto.eventType !== undefined && { eventType: dto.eventType }),
        ...(dto.venue !== undefined && { venue: dto.venue }),
        ...(dto.estimatedBudget !== undefined && { estimatedBudget: dto.estimatedBudget }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.assignedToId !== undefined && { assignedToId: dto.assignedToId }),
        ...(dto.nextAction !== undefined && { nextAction: dto.nextAction }),
        ...(dto.nextActionDate !== undefined && {
          nextActionDate: dto.nextActionDate ? new Date(dto.nextActionDate) : null,
        }),
        ...(dto.lostReason !== undefined && { lostReason: dto.lostReason }),
        ...(activitiesToCreate.length > 0 && {
          activities: {
            create: activitiesToCreate,
          },
        }),
      },
      include: {
        customer: true,
        assignedTo: { select: { id: true, displayName: true } },
        activities: { orderBy: { createdAt: 'desc' } },
      },
    });

    this.auditLogService.record({
      scope: 'tenant',
      tenantId,
      action: 'enquiry.updated',
      actorType: 'tenant_user',
      outcome: 'allowed',
      metadata: { enquiryId },
    });

    return this.mapToDetail(updated);
  }

  async qualifyEnquiry(
    tenantId: string,
    enquiryId: string,
    userId?: string,
    authorName?: string,
  ): Promise<EnquiryDetail> {
    const existing = await this.prisma.enquiry.findFirst({
      where: { id: enquiryId, tenantId },
    });

    if (!existing) {
      throw new NotFoundException('Enquiry not found.');
    }

    if (existing.status === 'cancelled' || existing.status === 'lost') {
      throw new BadRequestException(`Cannot qualify an enquiry that is ${existing.status}.`);
    }

    const updated = await this.prisma.enquiry.update({
      where: { id: enquiryId },
      data: {
        status: 'qualified',
        activities: {
          create: {
            type: 'status_change',
            content: 'Enquiry marked as Qualified for quotation',
            authorId: userId ?? null,
            authorName: authorName ?? null,
          },
        },
      },
      include: {
        customer: true,
        assignedTo: { select: { id: true, displayName: true } },
        activities: { orderBy: { createdAt: 'desc' } },
      },
    });

    this.auditLogService.record({
      scope: 'tenant',
      tenantId,
      action: 'enquiry.qualified',
      actorType: 'tenant_user',
      outcome: 'allowed',
      metadata: { enquiryId },
    });

    return this.mapToDetail(updated);
  }

  async addActivity(
    tenantId: string,
    enquiryId: string,
    dto: CreateEnquiryActivityRequest,
    userId?: string,
    authorName?: string,
  ): Promise<EnquiryActivityItem> {
    const enquiry = await this.prisma.enquiry.findFirst({
      where: { id: enquiryId, tenantId },
    });

    if (!enquiry) {
      throw new NotFoundException('Enquiry not found.');
    }

    const activity = await this.prisma.enquiryActivity.create({
      data: {
        enquiryId,
        type: dto.type,
        content: dto.content,
        authorId: userId ?? null,
        authorName: authorName ?? null,
      },
    });

    return {
      id: activity.id,
      enquiryId: activity.enquiryId,
      type: activity.type as ActivityType,
      content: activity.content,
      authorId: activity.authorId,
      authorName: activity.authorName,
      createdAt: activity.createdAt.toISOString(),
    };
  }

  private mapToDetail(enquiry: {
    id: string;
    customerId: string;
    title: string;
    status: string;
    serviceType: string;
    eventDate: Date | null;
    guestCount: number | null;
    eventType: string | null;
    venue: string | null;
    estimatedBudget: Prisma.Decimal | null;
    notes: string | null;
    nextAction: string | null;
    nextActionDate: Date | null;
    lostReason: string | null;
    assignedToId: string | null;
    createdAt: Date;
    updatedAt: Date;
    customer: { id: string; name: string; email: string | null; phone: string | null };
    assignedTo: { id: string; displayName: string } | null;
    activities: {
      id: string;
      enquiryId: string;
      type: string;
      content: string;
      authorId: string | null;
      authorName: string | null;
      createdAt: Date;
    }[];
  }): EnquiryDetail {
    return {
      id: enquiry.id,
      customerId: enquiry.customerId,
      customerName: enquiry.customer.name,
      customerEmail: enquiry.customer.email,
      customerPhone: enquiry.customer.phone,
      title: enquiry.title,
      status: enquiry.status as EnquiryStatus,
      serviceType: enquiry.serviceType as ServiceType,
      eventDate: enquiry.eventDate ? enquiry.eventDate.toISOString() : null,
      guestCount: enquiry.guestCount,
      eventType: enquiry.eventType,
      venue: enquiry.venue,
      estimatedBudget: enquiry.estimatedBudget ? Number(enquiry.estimatedBudget) : null,
      notes: enquiry.notes,
      lostReason: enquiry.lostReason,
      assignedToId: enquiry.assignedToId,
      assignedToName: enquiry.assignedTo?.displayName ?? null,
      nextAction: enquiry.nextAction,
      nextActionDate: enquiry.nextActionDate ? enquiry.nextActionDate.toISOString() : null,
      createdAt: enquiry.createdAt.toISOString(),
      updatedAt: enquiry.updatedAt.toISOString(),
      activities: enquiry.activities.map((a) => ({
        id: a.id,
        enquiryId: a.enquiryId,
        type: a.type as ActivityType,
        content: a.content,
        authorId: a.authorId,
        authorName: a.authorName,
        createdAt: a.createdAt.toISOString(),
      })),
    };
  }
}
