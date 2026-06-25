import { Controller, Get, UseGuards, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator.js';
import type { TenantContext } from '../../common/request-context.js';
import { BillingService } from './billing.service.js';

@ApiTags('billing')
@ApiBearerAuth('supabase-jwt')
@UseGuards(AuthGuard, TenantGuard, RolesGuard)
@Controller('billing')
export class BillingController {
  constructor(@Inject(BillingService) private readonly billingService: BillingService) {}

  @Get('subscription')
  @Roles('admin', 'owner')
  @ApiOperation({ summary: 'Get current subscription' })
  async getSubscription(@CurrentTenant() ctx: TenantContext) {
    return this.billingService.getSubscription(ctx);
  }

  @Get('invoices')
  @Roles('admin', 'owner')
  @ApiOperation({ summary: 'List invoices' })
  async listInvoices(@CurrentTenant() ctx: TenantContext) {
    return this.billingService.listInvoices(ctx);
  }

  @Get('usage')
  @Roles('admin', 'owner')
  @ApiOperation({ summary: 'List usage records' })
  async listUsage(@CurrentTenant() ctx: TenantContext) {
    return this.billingService.listUsage(ctx);
  }
}
