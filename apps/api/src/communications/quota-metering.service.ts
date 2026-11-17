import type {
  PlatformCommunicationUsageSummary,
  TenantCommunicationQuotaDto,
  TenantQuotaOverviewItem,
  UpdateTenantQuotaRequest,
} from '@catering/shared-types';
import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class QuotaMeteringService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateTenantQuota(tenantId: string): Promise<TenantCommunicationQuotaDto> {
    const now = new Date();
    let quota = await this.prisma.tenantCommunicationQuota.findUnique({
      where: { tenantId },
    });

    if (!quota) {
      const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      quota = await this.prisma.tenantCommunicationQuota.create({
        data: {
          tenantId,
          periodStart: now,
          periodEnd,
          emailLimit: 1000,
          emailUsed: 0,
          smsLimit: 100,
          smsUsed: 0,
          whatsappLimit: 200,
          whatsappUsed: 0,
          allowOverage: false,
          overageRateEmail: 0.01,
          overageRateSms: 0.03,
          overageRateWhatsapp: 0.05,
        },
      });
    } else if (now > quota.periodEnd) {
      // Period rollover: reset usage and set new 30-day window
      const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      quota = await this.prisma.tenantCommunicationQuota.update({
        where: { tenantId },
        data: {
          periodStart: now,
          periodEnd,
          emailUsed: 0,
          smsUsed: 0,
          whatsappUsed: 0,
        },
      });
    }

    return {
      id: quota.id,
      tenantId: quota.tenantId,
      periodStart: quota.periodStart.toISOString(),
      periodEnd: quota.periodEnd.toISOString(),
      emailLimit: quota.emailLimit,
      emailUsed: quota.emailUsed,
      smsLimit: quota.smsLimit,
      smsUsed: quota.smsUsed,
      whatsappLimit: quota.whatsappLimit,
      whatsappUsed: quota.whatsappUsed,
      allowOverage: quota.allowOverage,
      overageRateEmail: Number(quota.overageRateEmail),
      overageRateSms: Number(quota.overageRateSms),
      overageRateWhatsapp: Number(quota.overageRateWhatsapp),
      updatedAt: quota.updatedAt.toISOString(),
    };
  }

  async checkAndReserveQuota(
    tenantId: string,
    channel: 'email' | 'sms' | 'whatsapp' | 'internal_note',
  ): Promise<{ isOverage: boolean }> {
    if (channel === 'internal_note') {
      return { isOverage: false };
    }

    const quota = await this.getOrCreateTenantQuota(tenantId);

    let isOverage = false;
    let updateField: 'emailUsed' | 'smsUsed' | 'whatsappUsed';
    let currentUsed: number;
    let limit: number;

    if (channel === 'email') {
      updateField = 'emailUsed';
      currentUsed = quota.emailUsed;
      limit = quota.emailLimit;
    } else if (channel === 'sms') {
      updateField = 'smsUsed';
      currentUsed = quota.smsUsed;
      limit = quota.smsLimit;
    } else {
      updateField = 'whatsappUsed';
      currentUsed = quota.whatsappUsed;
      limit = quota.whatsappLimit;
    }

    if (currentUsed >= limit) {
      if (!quota.allowOverage) {
        throw new BadRequestException(
          `Monthly ${channel.toUpperCase()} messaging quota reached (${currentUsed}/${limit}). Please contact your administrator or upgrade your subscription plan.`,
        );
      }
      isOverage = true;
    }

    // Atomically increment quota
    await this.prisma.tenantCommunicationQuota.update({
      where: { tenantId },
      data: {
        [updateField]: { increment: 1 },
      },
    });

    return { isOverage };
  }

  async rollbackQuota(
    tenantId: string,
    channel: 'email' | 'sms' | 'whatsapp' | 'internal_note',
  ): Promise<void> {
    if (channel === 'internal_note') return;

    const updateField: 'emailUsed' | 'smsUsed' | 'whatsappUsed' =
      channel === 'email'
        ? 'emailUsed'
        : channel === 'sms'
        ? 'smsUsed'
        : 'whatsappUsed';

    try {
      await this.prisma.tenantCommunicationQuota.update({
        where: { tenantId },
        data: {
          [updateField]: { decrement: 1 },
        },
      });
    } catch {
      // Non-blocking rollback
    }
  }

  async recordUsageLedger(
    tenantId: string,
    communicationLogId: string | undefined,
    channel: 'email' | 'sms' | 'whatsapp' | 'internal_note',
    isOverage: boolean,
  ): Promise<void> {
    const quota = await this.prisma.tenantCommunicationQuota.findUnique({
      where: { tenantId },
    });

    let unitCost = 0;
    if (isOverage && quota) {
      if (channel === 'email') unitCost = Number(quota.overageRateEmail);
      else if (channel === 'sms') unitCost = Number(quota.overageRateSms);
      else if (channel === 'whatsapp') unitCost = Number(quota.overageRateWhatsapp);
    }

    await this.prisma.communicationUsageLedger.create({
      data: {
        tenantId,
        communicationLogId: communicationLogId || null,
        channel,
        units: 1,
        isOverage,
        unitCost,
      },
    });
  }

  async updateTenantQuota(
    tenantId: string,
    dto: UpdateTenantQuotaRequest,
  ): Promise<TenantCommunicationQuotaDto> {
    await this.getOrCreateTenantQuota(tenantId); // ensure row exists

    const data: any = {};
    if (dto.emailLimit !== undefined) data.emailLimit = dto.emailLimit;
    if (dto.smsLimit !== undefined) data.smsLimit = dto.smsLimit;
    if (dto.whatsappLimit !== undefined) data.whatsappLimit = dto.whatsappLimit;
    if (dto.allowOverage !== undefined) data.allowOverage = dto.allowOverage;
    if (dto.overageRateEmail !== undefined) data.overageRateEmail = dto.overageRateEmail;
    if (dto.overageRateSms !== undefined) data.overageRateSms = dto.overageRateSms;
    if (dto.overageRateWhatsapp !== undefined) data.overageRateWhatsapp = dto.overageRateWhatsapp;

    const updated = await this.prisma.tenantCommunicationQuota.update({
      where: { tenantId },
      data,
    });

    return {
      id: updated.id,
      tenantId: updated.tenantId,
      periodStart: updated.periodStart.toISOString(),
      periodEnd: updated.periodEnd.toISOString(),
      emailLimit: updated.emailLimit,
      emailUsed: updated.emailUsed,
      smsLimit: updated.smsLimit,
      smsUsed: updated.smsUsed,
      whatsappLimit: updated.whatsappLimit,
      whatsappUsed: updated.whatsappUsed,
      allowOverage: updated.allowOverage,
      overageRateEmail: Number(updated.overageRateEmail),
      overageRateSms: Number(updated.overageRateSms),
      overageRateWhatsapp: Number(updated.overageRateWhatsapp),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async getAllTenantQuotas(): Promise<TenantQuotaOverviewItem[]> {
    const tenants = await this.prisma.tenant.findMany({
      include: {
        communicationQuota: true,
      },
      orderBy: { displayName: 'asc' },
    });

    const results: TenantQuotaOverviewItem[] = [];

    for (const t of tenants) {
      let quotaDto: TenantCommunicationQuotaDto;
      if (t.communicationQuota) {
        quotaDto = {
          id: t.communicationQuota.id,
          tenantId: t.id,
          periodStart: t.communicationQuota.periodStart.toISOString(),
          periodEnd: t.communicationQuota.periodEnd.toISOString(),
          emailLimit: t.communicationQuota.emailLimit,
          emailUsed: t.communicationQuota.emailUsed,
          smsLimit: t.communicationQuota.smsLimit,
          smsUsed: t.communicationQuota.smsUsed,
          whatsappLimit: t.communicationQuota.whatsappLimit,
          whatsappUsed: t.communicationQuota.whatsappUsed,
          allowOverage: t.communicationQuota.allowOverage,
          overageRateEmail: Number(t.communicationQuota.overageRateEmail),
          overageRateSms: Number(t.communicationQuota.overageRateSms),
          overageRateWhatsapp: Number(t.communicationQuota.overageRateWhatsapp),
          updatedAt: t.communicationQuota.updatedAt.toISOString(),
        };
      } else {
        quotaDto = await this.getOrCreateTenantQuota(t.id);
      }

      results.push({
        tenantId: t.id,
        tenantSlug: t.slug,
        tenantName: t.displayName,
        quota: quotaDto,
      });
    }

    return results;
  }

  async getPlatformUsageSummary(): Promise<PlatformCommunicationUsageSummary> {
    const [ledgers, activeTenantsCount] = await Promise.all([
      this.prisma.communicationUsageLedger.findMany({
        select: {
          channel: true,
          units: true,
          unitCost: true,
        },
      }),
      this.prisma.tenant.count({
        where: { status: 'active' },
      }),
    ]);

    let totalEmailsSent = 0;
    let totalSmsSent = 0;
    let totalWhatsappSent = 0;
    let totalCostEstimate = 0;

    for (const l of ledgers) {
      if (l.channel === 'email') totalEmailsSent += l.units;
      else if (l.channel === 'sms') totalSmsSent += l.units;
      else if (l.channel === 'whatsapp') totalWhatsappSent += l.units;

      totalCostEstimate += Number(l.unitCost);
    }

    return {
      totalEmailsSent,
      totalSmsSent,
      totalWhatsappSent,
      totalCostEstimate,
      totalTenantsActive: activeTenantsCount,
    };
  }
}
