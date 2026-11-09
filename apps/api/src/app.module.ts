import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { PlatformTenantsModule } from './platform-tenants/platform-tenants.module.js';
import { TenantAdminModule } from './tenant-admin/tenant-admin.module.js';
import { CustomersModule } from './customers/customers.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { TenancyModule } from './tenancy/tenancy.module.js';

@Module({
  imports: [PrismaModule, AuthModule, TenancyModule, PlatformTenantsModule, TenantAdminModule, CustomersModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
