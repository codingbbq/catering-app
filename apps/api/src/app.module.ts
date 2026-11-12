import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { CustomersModule } from './customers/customers.module.js';
import { EnquiriesModule } from './enquiries/enquiries.module.js';
import { CatalogueModule } from './catalogue/catalogue.module.js';
import { MenusModule } from './menus/menus.module.js';
import { CostingModule } from './costing/costing.module.js';
import { QuotationsModule } from './quotations/quotations.module.js';
import { BookingsModule } from './bookings/bookings.module.js';
import { CommunicationsModule } from './communications/communications.module.js';
import { PlatformTenantsModule } from './platform-tenants/platform-tenants.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { TenancyModule } from './tenancy/tenancy.module.js';
import { TenantAdminModule } from './tenant-admin/tenant-admin.module.js';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    TenancyModule,
    PlatformTenantsModule,
    TenantAdminModule,
    CustomersModule,
    EnquiriesModule,
    CatalogueModule,
    MenusModule,
    CostingModule,
    QuotationsModule,
    BookingsModule,
    CommunicationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
