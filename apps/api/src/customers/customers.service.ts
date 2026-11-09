import type {
  CreateContactRequest,
  CreateCustomerRequest,
  CustomerContact,
  CustomerDetail,
  CustomerItem,
  UpdateContactRequest,
  UpdateCustomerRequest,
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
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  // --- Customer CRUD ---

  async listCustomers(
    tenantId: string,
    search?: string,
    isActive?: boolean,
  ): Promise<{ data: CustomerItem[]; total: number }> {
    const where: Prisma.CustomerWhereInput = { tenantId };

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ];
    }

    const [customers, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        include: { _count: { select: { contacts: true } } },
        orderBy: { name: 'asc' },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      data: customers.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        isActive: c.isActive,
        contactCount: c._count.contacts,
        createdAt: c.createdAt.toISOString(),
      })),
      total,
    };
  }

  async getCustomer(tenantId: string, customerId: string): Promise<CustomerDetail> {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
      include: {
        contacts: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] },
        _count: { select: { contacts: true } },
      },
    });

    if (!customer) throw new NotFoundException('Customer not found.');

    return this.toDetail(customer);
  }

  async createCustomer(
    tenantId: string,
    dto: CreateCustomerRequest,
    actorUserId: string,
  ): Promise<CustomerDetail> {
    await this.checkDuplicateName(tenantId, dto.name);

    const customer = await this.prisma.customer.create({
      data: {
        tenantId,
        name: dto.name,
        email: dto.email ?? null,
        phone: dto.phone ?? null,
        address: dto.address ?? null,
        notes: dto.notes ?? null,
      },
      include: {
        contacts: true,
        _count: { select: { contacts: true } },
      },
    });

    this.auditLogService.record({
      scope: 'tenant',
      outcome: 'allowed',
      action: 'customer.create',
      actorType: 'tenant_user',
      tenantId,
      metadata: { actorUserId, customerId: customer.id },
    });

    this.logger.log(`Customer created: ${customer.name} in tenant ${tenantId}`);

    return this.toDetail(customer);
  }

  async updateCustomer(
    tenantId: string,
    customerId: string,
    dto: UpdateCustomerRequest,
    actorUserId: string,
  ): Promise<CustomerDetail> {
    const existing = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
    });

    if (!existing) throw new NotFoundException('Customer not found.');

    if (dto.name && dto.name !== existing.name) {
      await this.checkDuplicateName(tenantId, dto.name, customerId);
    }

    const data: Prisma.CustomerUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.email !== undefined) data.email = dto.email ?? null;
    if (dto.phone !== undefined) data.phone = dto.phone ?? null;
    if (dto.address !== undefined) data.address = dto.address ?? null;
    if (dto.notes !== undefined) data.notes = dto.notes ?? null;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    await this.prisma.customer.update({
      where: { id: customerId },
      data,
    });

    this.auditLogService.record({
      scope: 'tenant',
      outcome: 'allowed',
      action: 'customer.update',
      actorType: 'tenant_user',
      tenantId,
      metadata: { actorUserId, customerId, changes: JSON.stringify(dto) },
    });

    return this.getCustomer(tenantId, customerId);
  }

  // --- Contacts ---

  async addContact(
    tenantId: string,
    customerId: string,
    dto: CreateContactRequest,
    actorUserId: string,
  ): Promise<CustomerContact> {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
    });

    if (!customer) throw new NotFoundException('Customer not found.');

    if (dto.isPrimary) {
      await this.prisma.customerContact.updateMany({
        where: { customerId },
        data: { isPrimary: false },
      });
    }

    const contact = await this.prisma.customerContact.create({
      data: {
        customerId,
        name: dto.name,
        email: dto.email ?? null,
        phone: dto.phone ?? null,
        role: dto.role ?? null,
        isPrimary: dto.isPrimary ?? false,
      },
    });

    this.auditLogService.record({
      scope: 'tenant',
      outcome: 'allowed',
      action: 'customer.contact.add',
      actorType: 'tenant_user',
      tenantId,
      metadata: { actorUserId, customerId, contactId: contact.id },
    });

    return {
      id: contact.id,
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      role: contact.role,
      isPrimary: contact.isPrimary,
      createdAt: contact.createdAt.toISOString(),
      updatedAt: contact.updatedAt.toISOString(),
    };
  }

  async updateContact(
    tenantId: string,
    customerId: string,
    contactId: string,
    dto: UpdateContactRequest,
    actorUserId: string,
  ): Promise<CustomerContact> {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
    });

    if (!customer) throw new NotFoundException('Customer not found.');

    const existing = await this.prisma.customerContact.findFirst({
      where: { id: contactId, customerId },
    });

    if (!existing) throw new NotFoundException('Contact not found.');

    if (dto.isPrimary) {
      await this.prisma.customerContact.updateMany({
        where: { customerId, id: { not: contactId } },
        data: { isPrimary: false },
      });
    }

    const data: Prisma.CustomerContactUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.email !== undefined) data.email = dto.email ?? null;
    if (dto.phone !== undefined) data.phone = dto.phone ?? null;
    if (dto.role !== undefined) data.role = dto.role ?? null;
    if (dto.isPrimary !== undefined) data.isPrimary = dto.isPrimary;

    const updated = await this.prisma.customerContact.update({
      where: { id: contactId },
      data,
    });

    this.auditLogService.record({
      scope: 'tenant',
      outcome: 'allowed',
      action: 'customer.contact.update',
      actorType: 'tenant_user',
      tenantId,
      metadata: { actorUserId, customerId, contactId },
    });

    return {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      phone: updated.phone,
      role: updated.role,
      isPrimary: updated.isPrimary,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  // --- Helpers ---

  private async checkDuplicateName(
    tenantId: string,
    name: string,
    excludeId?: string,
  ): Promise<void> {
    const where: Prisma.CustomerWhereInput = {
      tenantId,
      name: { equals: name, mode: 'insensitive' },
    };
    if (excludeId) where.id = { not: excludeId };

    const duplicate = await this.prisma.customer.findFirst({ where });
    if (duplicate) {
      throw new BadRequestException('A customer with this name already exists.');
    }
  }

  private toDetail(
    customer: {
      id: string;
      name: string;
      email: string | null;
      phone: string | null;
      address: string | null;
      notes: string | null;
      isActive: boolean;
      createdAt: Date;
      updatedAt: Date;
      contacts: Array<{
        id: string;
        name: string;
        email: string | null;
        phone: string | null;
        role: string | null;
        isPrimary: boolean;
        createdAt: Date;
        updatedAt: Date;
      }>;
      _count: { contacts: number };
    },
  ): CustomerDetail {
    return {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      notes: customer.notes,
      isActive: customer.isActive,
      contactCount: customer._count.contacts,
      contacts: customer.contacts.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        role: c.role,
        isPrimary: c.isPrimary,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      })),
      createdAt: customer.createdAt.toISOString(),
      updatedAt: customer.updatedAt.toISOString(),
    };
  }
}
