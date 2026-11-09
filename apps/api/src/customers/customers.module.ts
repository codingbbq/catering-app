import { Module } from '@nestjs/common';
import { TenancyModule } from '../tenancy/tenancy.module.js';
import { CustomersController } from './customers.controller.js';
import { CustomersService } from './customers.service.js';

@Module({
  imports: [TenancyModule],
  controllers: [CustomersController],
  providers: [CustomersService],
})
export class CustomersModule {}
