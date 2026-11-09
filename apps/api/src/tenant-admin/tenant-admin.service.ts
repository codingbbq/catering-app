import type {
  AuthenticatedTenantContext,
  CreateInvitationRequest,
  InvitationItem,
  TenantProfile,
  TenantRole,
  TenantUserItem,
  UpdateTenantProfile,
} from '@catering/shared-types';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditLogService } from '../tenancy/audit-log.service.js';
import { generateInvitationToken } from '../auth/token.utils.js';

const ADMIN_ROLES: ReadonlySet<TenantRole> = new Set(['owner', 'admin']);
const INVITATION_EXPIRY_HOURS = 72;

@Injectable()
export class TenantAdminService {
  private readonly logger = new Logger(TenantAdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  // --- Tenant profile ---

  async getProfile(tenantId: string): Promise<TenantProfile> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { settings: true },
    });

    if (!tenant) throw new NotFoundException('Tenant not found.');

    return {
      id: tenant.id,
      slug: tenant.slug,
      displayName: tenant.displayName,
      status: tenant.status,
      settings: tenant.settings
        ? {
            tenantId: tenant.settings.tenantId,
            timezone: tenant.settings.timezone,
            currencyCode: tenant.settings.currencyCode,
            locale: tenant.settings.locale,
          }
        : null,
      createdAt: tenant.createdAt.toISOString(),
      updatedAt: tenant.updatedAt.toISOString(),
    };
  }

  async updateProfile(
    tenantId: string,
    dto: UpdateTenantProfile,
    actor: AuthenticatedTenantContext,
  ): Promise<TenantProfile> {
    this.requireAdmin(actor);

    const data: Record<string, unknown> = {};
    if (dto.displayName) data.displayName = dto.displayName;

    const tenant = await this.prisma.tenant.update({
      where: { id: tenantId },
      data,
      include: { settings: true },
    });

    if (dto.settings) {
      const settingsData: Record<string, string> = {};
      if (dto.settings.timezone) settingsData.timezone = dto.settings.timezone;
      if (dto.settings.currencyCode) settingsData.currencyCode = dto.settings.currencyCode;
      if (dto.settings.locale) settingsData.locale = dto.settings.locale;

      if (Object.keys(settingsData).length > 0) {
        await this.prisma.tenantSettings.upsert({
          where: { tenantId },
          create: { tenantId, ...settingsData },
          update: settingsData,
        });
      }
    }

    this.auditLogService.record({
      scope: 'tenant',
      outcome: 'allowed',
      action: 'tenant.profile.update',
      actorType: 'tenant_user',
      tenantId,
      metadata: { userId: actor.userId, changes: JSON.stringify(dto) },
    });

    return this.getProfile(tenantId);
  }

  // --- User list ---

  async listUsers(tenantId: string): Promise<{ data: TenantUserItem[]; total: number }> {
    const [users, total] = await Promise.all([
      this.prisma.tenantUser.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.tenantUser.count({ where: { tenantId } }),
    ]);

    return {
      data: users.map((u) => ({
        id: u.id,
        email: u.email,
        displayName: u.displayName,
        role: u.role,
        isActive: u.isActive,
        createdAt: u.createdAt.toISOString(),
      })),
      total,
    };
  }

  // --- Update user role ---

  async updateUserRole(
    tenantId: string,
    targetUserId: string,
    newRole: TenantRole,
    actor: AuthenticatedTenantContext,
  ): Promise<TenantUserItem> {
    this.requireAdmin(actor);

    const target = await this.prisma.tenantUser.findFirst({
      where: { id: targetUserId, tenantId },
    });

    if (!target) throw new NotFoundException('User not found in this tenant.');

    if (target.role === 'owner' && actor.role !== 'owner') {
      throw new ForbiddenException('Only an owner can change another owner\'s role.');
    }

    if (newRole === 'owner' && actor.role !== 'owner') {
      throw new ForbiddenException('Only an owner can promote to owner.');
    }

    if (ADMIN_ROLES.has(target.role) && !ADMIN_ROLES.has(newRole)) {
      await this.ensureNotLastAdmin(tenantId, targetUserId);
    }

    const updated = await this.prisma.tenantUser.update({
      where: { id: targetUserId },
      data: { role: newRole },
    });

    this.auditLogService.record({
      scope: 'tenant',
      outcome: 'allowed',
      action: 'tenant.user.role_change',
      actorType: 'tenant_user',
      tenantId,
      metadata: { actorUserId: actor.userId, targetUserId, oldRole: target.role, newRole },
    });

    return {
      id: updated.id,
      email: updated.email,
      displayName: updated.displayName,
      role: updated.role,
      isActive: updated.isActive,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  // --- Deactivate user ---

  async deactivateUser(
    tenantId: string,
    targetUserId: string,
    actor: AuthenticatedTenantContext,
  ): Promise<TenantUserItem> {
    this.requireAdmin(actor);

    if (targetUserId === actor.userId) {
      throw new BadRequestException('You cannot deactivate yourself.');
    }

    const target = await this.prisma.tenantUser.findFirst({
      where: { id: targetUserId, tenantId },
    });

    if (!target) throw new NotFoundException('User not found in this tenant.');

    if (target.role === 'owner' && actor.role !== 'owner') {
      throw new ForbiddenException('Only an owner can deactivate another owner.');
    }

    await this.ensureNotLastAdmin(tenantId, targetUserId);

    const updated = await this.prisma.tenantUser.update({
      where: { id: targetUserId },
      data: { isActive: false },
    });

    // Revoke sessions
    await this.prisma.session.deleteMany({
      where: { tenantUserId: targetUserId },
    });

    this.auditLogService.record({
      scope: 'tenant',
      outcome: 'allowed',
      action: 'tenant.user.deactivate',
      actorType: 'tenant_user',
      tenantId,
      metadata: { actorUserId: actor.userId, targetUserId },
    });

    return {
      id: updated.id,
      email: updated.email,
      displayName: updated.displayName,
      role: updated.role,
      isActive: updated.isActive,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  // --- Invitations ---

  async createInvitation(
    tenantId: string,
    dto: CreateInvitationRequest,
    actor: AuthenticatedTenantContext,
  ): Promise<InvitationItem> {
    this.requireAdmin(actor);

    if (dto.role === 'owner' && actor.role !== 'owner') {
      throw new ForbiddenException('Only an owner can invite as owner.');
    }

    // Check if user already exists in this tenant
    const existingUser = await this.prisma.tenantUser.findUnique({
      where: { email_tenantId: { email: dto.email, tenantId } },
    });

    if (existingUser) {
      throw new BadRequestException('A user with this email already exists in the tenant.');
    }

    // Check for pending invitation
    const existingInvitation = await this.prisma.userInvitation.findFirst({
      where: { email: dto.email, tenantId, status: 'pending' },
    });

    if (existingInvitation) {
      throw new BadRequestException('A pending invitation already exists for this email.');
    }

    const token = generateInvitationToken();
    const expiresAt = new Date(Date.now() + INVITATION_EXPIRY_HOURS * 60 * 60 * 1000);

    const invitation = await this.prisma.userInvitation.create({
      data: {
        email: dto.email,
        token,
        tenantId,
        role: dto.role,
        invitedBy: actor.userId,
        expiresAt,
      },
    });

    this.logger.log(`Invitation created: ${dto.email} as ${dto.role} on tenant ${tenantId}`);

    this.auditLogService.record({
      scope: 'tenant',
      outcome: 'allowed',
      action: 'tenant.invitation.create',
      actorType: 'tenant_user',
      tenantId,
      metadata: { actorUserId: actor.userId, email: dto.email, role: dto.role },
    });

    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expiresAt.toISOString(),
      createdAt: invitation.createdAt.toISOString(),
    };
  }

  async listInvitations(tenantId: string): Promise<{ data: InvitationItem[]; total: number }> {
    const [invitations, total] = await Promise.all([
      this.prisma.userInvitation.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.userInvitation.count({ where: { tenantId } }),
    ]);

    return {
      data: invitations.map((inv) => ({
        id: inv.id,
        email: inv.email,
        role: inv.role,
        status: inv.status,
        expiresAt: inv.expiresAt.toISOString(),
        createdAt: inv.createdAt.toISOString(),
      })),
      total,
    };
  }

  // --- Helpers ---

  private requireAdmin(actor: AuthenticatedTenantContext): void {
    if (!ADMIN_ROLES.has(actor.role)) {
      throw new ForbiddenException('Only tenant owners and admins can perform this action.');
    }
  }

  private async ensureNotLastAdmin(tenantId: string, excludeUserId: string): Promise<void> {
    const adminCount = await this.prisma.tenantUser.count({
      where: {
        tenantId,
        isActive: true,
        role: { in: ['owner', 'admin'] },
        id: { not: excludeUserId },
      },
    });

    if (adminCount === 0) {
      throw new BadRequestException(
        'Cannot remove the last active admin. Promote another user first.',
      );
    }
  }
}
