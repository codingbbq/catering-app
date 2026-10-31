import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getFoundationStatus() {
    return {
      feature: 'FND-001',
      name: 'Tenant Isolation Foundation',
      routeScopes: {
        platform: '/platform/tenancy/*',
        tenant: '/tenant/tenancy/*',
      },
      status: 'ready',
    };
  }
}
