import type {
  CreateTenantRequest,
  TenantDetail,
  TenantLifecycleAction,
  TenantListResponse,
  TenantSettings,
  TenantStatus,
  UpdateTenantRequest,
} from '@catering/shared-types';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditLogService } from '../tenancy/audit-log.service.js';

const VALID_TRANSITIONS: Record<TenantStatus, TenantStatus[]> = {
  onboarding: ['active', 'archived'],
  active: ['suspended', 'archived'],
  suspended: ['active', 'archived'],
  archived: [],
};

const ACTION_TO_STATUS: Record<TenantLifecycleAction, TenantStatus> = {
  activate: 'active',
  suspend: 'suspended',
  archive: 'archived',
};

const TENANT_INCLUDE = {
  settings: true,
  _count: { select: { users: true } },
} as const satisfies Prisma.TenantInclude;

type TenantWithDetails = Prisma.TenantGetPayload<{ include: typeof TENANT_INCLUDE }>;

function mapSettings(s: TenantWithDetails['settings']): TenantSettings | null {
  if (!s) return null;
  return {
    tenantId: s.tenantId,
    timezone: s.timezone,
    currencyCode: s.currencyCode,
    locale: s.locale,
  };
}

function toTenantDetail(t: TenantWithDetails): TenantDetail {
  return {
    id: t.id,
    slug: t.slug,
    displayName: t.displayName,
    status: t.status,
    settings: mapSettings(t.settings),
    userCount: t._count.users,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

@Injectable()
export class PlatformTenantsService {
  private readonly logger = new Logger(PlatformTenantsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async listTenants(): Promise<TenantListResponse> {
    const tenants = await this.prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { users: true } } },
    });

    return {
      data: tenants.map((t) => ({
        id: t.id,
        slug: t.slug,
        displayName: t.displayName,
        status: t.status,
        createdAt: t.createdAt.toISOString(),
        userCount: t._count.users,
      })),
      total: tenants.length,
    };
  }

  async getTenant(tenantId: string): Promise<TenantDetail> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: TENANT_INCLUDE,
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found.');
    }

    return toTenantDetail(tenant);
  }

  async createTenant(dto: CreateTenantRequest, actorId: string): Promise<TenantDetail> {
    const existing = await this.prisma.tenant.findUnique({
      where: { slug: dto.slug },
    });

    if (existing) {
      throw new ConflictException(`Tenant slug "${dto.slug}" is already taken.`);
    }

    const settingsCreate = dto.settings
      ? {
          settings: {
            create: {
              timezone: dto.settings.timezone ?? 'UTC',
              currencyCode: dto.settings.currencyCode ?? 'USD',
              locale: dto.settings.locale ?? 'en',
            },
          },
        }
      : {};

    const tenant = await this.prisma.tenant.create({
      data: {
        slug: dto.slug,
        displayName: dto.displayName,
        status: 'onboarding',
        ...settingsCreate,
      },
      include: TENANT_INCLUDE,
    });

    this.auditLogService.record({
      scope: 'platform',
      outcome: 'allowed',
      action: 'tenant.create',
      actorType: 'platform_user',
      tenantId: tenant.id,
      metadata: { actorId, slug: dto.slug },
    });

    this.logger.log(`Tenant created: ${tenant.slug} (${tenant.id}) by ${actorId}`);

    return toTenantDetail(tenant);
  }

  async updateTenant(tenantId: string, dto: UpdateTenantRequest, actorId: string): Promise<TenantDetail> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found.');
    }

    const data: Prisma.TenantUpdateInput = {};
    if (dto.displayName !== undefined) {
      data.displayName = dto.displayName;
    }
    if (dto.settings) {
      const updateFields: Prisma.TenantSettingsUpdateWithoutTenantInput = {};
      if (dto.settings.timezone !== undefined) updateFields.timezone = dto.settings.timezone;
      if (dto.settings.currencyCode !== undefined) updateFields.currencyCode = dto.settings.currencyCode;
      if (dto.settings.locale !== undefined) updateFields.locale = dto.settings.locale;

      data.settings = {
        upsert: {
          create: {
            timezone: dto.settings.timezone ?? 'UTC',
            currencyCode: dto.settings.currencyCode ?? 'USD',
            locale: dto.settings.locale ?? 'en',
          },
          update: updateFields,
        },
      };
    }

    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data,
      include: TENANT_INCLUDE,
    });

    this.auditLogService.record({
      scope: 'platform',
      outcome: 'allowed',
      action: 'tenant.update',
      actorType: 'platform_user',
      tenantId,
      metadata: { actorId },
    });

    this.logger.log(`Tenant updated: ${updated.slug} by ${actorId}`);

    return toTenantDetail(updated);
  }

  async performLifecycleAction(
    tenantId: string,
    action: TenantLifecycleAction,
    actorId: string,
  ): Promise<TenantDetail> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found.');
    }

    const targetStatus = ACTION_TO_STATUS[action];
    const allowed = VALID_TRANSITIONS[tenant.status];

    if (!allowed?.includes(targetStatus)) {
      throw new BadRequestException(
        `Cannot ${action} a tenant with status "${tenant.status}".`,
      );
    }

    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { status: targetStatus },
      include: TENANT_INCLUDE,
    });

    // If suspending, revoke all tenant user sessions
    if (action === 'suspend') {
      const deleted = await this.prisma.session.deleteMany({
        where: { tenantId },
      });
      this.logger.log(`Revoked ${deleted.count} sessions for suspended tenant ${tenant.slug}`);
    }

    this.auditLogService.record({
      scope: 'platform',
      outcome: 'allowed',
      action: `tenant.${action}`,
      actorType: 'platform_user',
      tenantId,
      metadata: {
        actorId,
        previousStatus: tenant.status,
        newStatus: targetStatus,
      },
    });

    this.logger.log(`Tenant ${action}d: ${tenant.slug} (${tenant.status} -> ${targetStatus}) by ${actorId}`);

    return toTenantDetail(updated);
  }
}
