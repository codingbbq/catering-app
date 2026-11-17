import type {
  AuthenticatedPlatformContext,
  PlatformCommunicationConfigDto,
  PlatformCommunicationUsageSummary,
  TenantCommunicationQuotaDto,
  TenantQuotaOverviewItem,
  TestGatewayConnectionResponse,
} from '@catering/shared-types';
import {
  testGatewayConnectionSchema,
  updatePlatformCommunicationConfigSchema,
  updateTenantQuotaSchema,
} from '@catering/shared-types';
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AccessScope } from '../tenancy/access-scope.decorator.js';
import { AuditLogService } from '../tenancy/audit-log.service.js';
import { CurrentRequestContext } from '../tenancy/request-context.decorator.js';
import { GatewayRouterService } from './gateway-router.service.js';
import { QuotaMeteringService } from './quota-metering.service.js';

function maskKey(key: string | null | undefined, prefixLen = 4, suffixLen = 3): string | null {
  if (!key) return null;
  if (key.length <= prefixLen + suffixLen) return '***';
  return `${key.slice(0, prefixLen)}***${key.slice(-suffixLen)}`;
}

@Controller('platform/communications')
@AccessScope('platform')
export class PlatformCommunicationsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly gatewayRouter: GatewayRouterService,
    private readonly quotaMeteringService: QuotaMeteringService,
  ) {}

  private async getOrCreateConfig(): Promise<PlatformCommunicationConfigDto> {
    let config = await this.prisma.platformCommunicationConfig.findUnique({
      where: { id: 'default' },
    });

    if (!config) {
      config = await this.prisma.platformCommunicationConfig.create({
        data: {
          id: 'default',
          mode: 'mock',
        },
      });
    }

    const isEmailConfigured = Boolean(config.resendApiKey);
    const isSmsConfigured = Boolean(config.twilioAccountSid && config.twilioAuthToken && config.twilioPhoneNumber);
    const isWhatsappConfigured = Boolean(
      config.twilioAccountSid && config.twilioAuthToken && config.twilioWhatsappNumber,
    );

    return {
      id: config.id,
      mode: config.mode as 'mock' | 'live',
      resendApiKeyMasked: maskKey(config.resendApiKey, 3, 3),
      resendFromEmail: config.resendFromEmail,
      resendFromName: config.resendFromName,
      twilioAccountSidMasked: maskKey(config.twilioAccountSid, 4, 3),
      twilioAuthTokenMasked: maskKey(config.twilioAuthToken, 3, 3),
      twilioPhoneNumber: config.twilioPhoneNumber,
      twilioWhatsappNumber: config.twilioWhatsappNumber,
      isEmailConfigured,
      isSmsConfigured,
      isWhatsappConfigured,
      updatedAt: config.updatedAt.toISOString(),
    };
  }

  @Get('config')
  async getConfig(): Promise<PlatformCommunicationConfigDto> {
    return this.getOrCreateConfig();
  }

  @Patch('config')
  async updateConfig(
    @Body() body: unknown,
    @CurrentRequestContext() ctx: AuthenticatedPlatformContext,
  ): Promise<PlatformCommunicationConfigDto> {
    const dto = updatePlatformCommunicationConfigSchema.parse(body);

    const updateData: any = {};
    if (dto.mode !== undefined) updateData.mode = dto.mode;
    if (dto.resendApiKey !== undefined) updateData.resendApiKey = dto.resendApiKey.trim() || null;
    if (dto.resendFromEmail !== undefined) updateData.resendFromEmail = dto.resendFromEmail.trim() || null;
    if (dto.resendFromName !== undefined) updateData.resendFromName = dto.resendFromName.trim() || null;
    if (dto.twilioAccountSid !== undefined) updateData.twilioAccountSid = dto.twilioAccountSid.trim() || null;
    if (dto.twilioAuthToken !== undefined) updateData.twilioAuthToken = dto.twilioAuthToken.trim() || null;
    if (dto.twilioPhoneNumber !== undefined) updateData.twilioPhoneNumber = dto.twilioPhoneNumber.trim() || null;
    if (dto.twilioWhatsappNumber !== undefined) updateData.twilioWhatsappNumber = dto.twilioWhatsappNumber.trim() || null;

    await this.prisma.platformCommunicationConfig.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        mode: dto.mode || 'mock',
        ...updateData,
      },
      update: updateData,
    });

    this.auditLogService.record({
      scope: 'platform',
      actorType: 'platform_user',
      action: 'platform.communication_config.updated',
      outcome: 'allowed',
      metadata: {
        updatedBy: ctx.userId,
        mode: dto.mode ? String(dto.mode) : 'mock',
      },
    });

    return this.getOrCreateConfig();
  }

  @Post('test-connection')
  async testConnection(
    @Body() body: unknown,
  ): Promise<TestGatewayConnectionResponse> {
    const dto = testGatewayConnectionSchema.parse(body);
    const result = await this.gatewayRouter.testConnection(dto.gateway, dto.testRecipient);
    return {
      success: result.success,
      gateway: result.gateway,
      message: result.message,
      details: result.details,
    };
  }

  @Get('quotas')
  async getAllQuotas(): Promise<TenantQuotaOverviewItem[]> {
    return this.quotaMeteringService.getAllTenantQuotas();
  }

  @Patch('quotas/:tenantId')
  async updateTenantQuota(
    @Param('tenantId') tenantId: string,
    @Body() body: unknown,
    @CurrentRequestContext() ctx: AuthenticatedPlatformContext,
  ): Promise<TenantCommunicationQuotaDto> {
    const dto = updateTenantQuotaSchema.parse(body);
    const result = await this.quotaMeteringService.updateTenantQuota(tenantId, dto);

    this.auditLogService.record({
      scope: 'platform',
      actorType: 'platform_user',
      action: 'platform.tenant_quota.updated',
      outcome: 'allowed',
      metadata: {
        updatedBy: ctx.userId,
        tenantId,
        emailLimit: String(result.emailLimit),
        smsLimit: String(result.smsLimit),
        whatsappLimit: String(result.whatsappLimit),
      },
    });

    return result;
  }

  @Get('usage-summary')
  async getUsageSummary(): Promise<PlatformCommunicationUsageSummary> {
    return this.quotaMeteringService.getPlatformUsageSummary();
  }
}
