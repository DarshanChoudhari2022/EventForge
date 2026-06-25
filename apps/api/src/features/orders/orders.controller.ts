import { Controller,
  Post,
  Get,
  Body,
  Param,
  Headers,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus, Inject } from '@nestjs/common';;
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { z } from 'zod';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { Public } from '../../common/decorators/public.decorator.js';
import type { TenantContext } from '../../common/request-context.js';
import { CreateOrderSchema } from '@eventforge/domain';
import { OrdersService } from './orders.service.js';

const RefundBodySchema = z.object({
  amountCents: z.number().int().nonnegative().optional(),
});

@ApiTags('orders')
@ApiBearerAuth('supabase-jwt')
@UseGuards(AuthGuard, TenantGuard, RolesGuard)
@Controller('orders')
export class OrdersController {
  constructor(@Inject(OrdersService) private readonly ordersService: OrdersService) {}

  @Post()
  @Roles('viewer')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create checkout session' })
  async create(
    @CurrentTenant() ctx: TenantContext,
    @Body(new ZodValidationPipe(CreateOrderSchema))
    body: z.infer<typeof CreateOrderSchema>,
  ) {
    return this.ordersService.createCheckout(ctx, body);
  }

  @Post(':id/refund')
  @Roles('admin')
  @ApiOperation({ summary: 'Refund order' })
  async refund(
    @CurrentTenant() ctx: TenantContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(RefundBodySchema))
    body: z.infer<typeof RefundBodySchema>,
  ) {
    return this.ordersService.refund(ctx, id, body.amountCents);
  }

  @Public()
  @Post('webhooks/stripe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stripe webhook' })
  async stripeWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: { raw?: { body?: Buffer } },
  ) {
    const rawBody = req.raw?.body ?? Buffer.alloc(0);
    return this.ordersService.handleStripeWebhook(signature, rawBody);
  }
}
