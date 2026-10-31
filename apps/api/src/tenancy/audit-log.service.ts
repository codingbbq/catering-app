import type { AuditLogOutcome, AuditLogScope } from '@catering/shared-types';
import { Injectable, Logger } from '@nestjs/common';

export type AuditEvent = {
  scope: AuditLogScope;
  outcome: AuditLogOutcome;
  action: string;
  actorType: string;
  tenantId?: string | undefined;
  reason?: string | undefined;
  metadata?: Record<string, string> | undefined;
};

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  record(event: AuditEvent) {
    const message = JSON.stringify(event);

    this.logger.log(message);

    return event;
  }
}
