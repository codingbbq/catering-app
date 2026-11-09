import type { AuthenticatedTenantContext } from '@catering/shared-types';
import {
  createContactRequestSchema,
  createCustomerRequestSchema,
  customerSearchParamsSchema,
  updateContactRequestSchema,
  updateCustomerRequestSchema,
} from '@catering/shared-types';
import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { AccessScope } from '../tenancy/access-scope.decorator.js';
import { CurrentRequestContext } from '../tenancy/request-context.decorator.js';
import { CustomersService } from './customers.service.js';

@Controller('customers')
@AccessScope('tenant')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  private getTenantContext(ctx: unknown): AuthenticatedTenantContext {
    const tenantCtx = ctx as AuthenticatedTenantContext;
    if (tenantCtx.scope !== 'tenant' || !tenantCtx.tenantId) {
      throw new Error('Invalid tenant context');
    }
    return tenantCtx;
  }

  @Get()
  async list(
    @CurrentRequestContext() ctx: unknown,
    @Query('search') search?: string,
    @Query('isActive') isActiveParam?: string,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    const parsed = customerSearchParamsSchema.parse({ search, isActive: isActiveParam });
    const isActive = parsed.isActive === 'true' ? true : parsed.isActive === 'false' ? false : undefined;
    return this.customersService.listCustomers(tenantCtx.tenantId, parsed.search, isActive);
  }

  @Post()
  async create(@CurrentRequestContext() ctx: unknown, @Body() body: unknown) {
    const tenantCtx = this.getTenantContext(ctx);
    const dto = createCustomerRequestSchema.parse(body);
    return this.customersService.createCustomer(tenantCtx.tenantId, dto, tenantCtx.userId);
  }

  @Get(':customerId')
  async getOne(@CurrentRequestContext() ctx: unknown, @Param('customerId') customerId: string) {
    const tenantCtx = this.getTenantContext(ctx);
    return this.customersService.getCustomer(tenantCtx.tenantId, customerId);
  }

  @Patch(':customerId')
  async update(
    @CurrentRequestContext() ctx: unknown,
    @Param('customerId') customerId: string,
    @Body() body: unknown,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    const dto = updateCustomerRequestSchema.parse(body);
    return this.customersService.updateCustomer(tenantCtx.tenantId, customerId, dto, tenantCtx.userId);
  }

  @Post(':customerId/contacts')
  async addContact(
    @CurrentRequestContext() ctx: unknown,
    @Param('customerId') customerId: string,
    @Body() body: unknown,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    const dto = createContactRequestSchema.parse(body);
    return this.customersService.addContact(tenantCtx.tenantId, customerId, dto, tenantCtx.userId);
  }

  @Patch(':customerId/contacts/:contactId')
  async updateContact(
    @CurrentRequestContext() ctx: unknown,
    @Param('customerId') customerId: string,
    @Param('contactId') contactId: string,
    @Body() body: unknown,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    const dto = updateContactRequestSchema.parse(body);
    return this.customersService.updateContact(
      tenantCtx.tenantId,
      customerId,
      contactId,
      dto,
      tenantCtx.userId,
    );
  }
}
