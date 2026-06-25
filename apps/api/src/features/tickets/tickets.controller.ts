import { Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
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
import type { TenantContext } from '../../common/request-context.js';
import { CreateTicketTypeSchema } from '@eventforge/domain';
import { TicketsService } from './tickets.service.js';

const PromoCodeBodySchema = z.object({
  code: z.string().min(1).max(50),
  kind: z.enum(['flat', 'percent']),
  value: z.number().nonnegative(),
  maxUses: z.number().int().nonnegative().optional(),
  validFrom: z.string().datetime().optional(),
  validTo: z.string().datetime().optional(),
  ticketTypeIds: z.array(z.string().uuid()).optional(),
});

@ApiTags('tickets')
@ApiBearerAuth('supabase-jwt')
@UseGuards(AuthGuard, TenantGuard, RolesGuard)
@Controller('events/:eventId/tickets')
export class TicketsController {
  constructor(@Inject(TicketsService) private readonly ticketsService: TicketsService) {}

  @Post()
  @Roles('organizer')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create ticket type' })
  async create(
    @CurrentTenant() ctx: TenantContext,
    @Param('eventId') eventId: string,
    @Body(new ZodValidationPipe(CreateTicketTypeSchema))
    body: z.infer<typeof CreateTicketTypeSchema>,
  ) {
    return this.ticketsService.create(ctx, eventId, body);
  }

  @Get()
  @Roles('viewer')
  @ApiOperation({ summary: 'List ticket types for event' })
  async findByEvent(
    @CurrentTenant() ctx: TenantContext,
    @Param('eventId') eventId: string,
  ) {
    return this.ticketsService.findByEvent(ctx, eventId);
  }

  @Patch(':id')
  @Roles('organizer')
  @ApiOperation({ summary: 'Update ticket type' })
  async update(
    @CurrentTenant() ctx: TenantContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(CreateTicketTypeSchema.partial()))
    body: z.infer<typeof CreateTicketTypeSchema>,
  ) {
    return this.ticketsService.update(ctx, id, body);
  }

  @Delete(':id')
  @Roles('organizer')
  @ApiOperation({ summary: 'Delete ticket type' })
  async remove(@CurrentTenant() ctx: TenantContext, @Param('id') id: string) {
    return this.ticketsService.remove(ctx, id);
  }

  @Post('promo-codes')
  @Roles('organizer')
  @ApiOperation({ summary: 'Create promo code' })
  async createPromo(
    @CurrentTenant() ctx: TenantContext,
    @Param('eventId') eventId: string,
    @Body(new ZodValidationPipe(PromoCodeBodySchema))
    body: z.infer<typeof PromoCodeBodySchema>,
  ) {
    return this.ticketsService.createPromoCode(ctx, eventId, body);
  }

  @Get('promo-codes')
  @Roles('viewer')
  @ApiOperation({ summary: 'List promo codes' })
  async listPromos(
    @CurrentTenant() ctx: TenantContext,
    @Param('eventId') eventId: string,
  ) {
    return this.ticketsService.listPromoCodes(ctx, eventId);
  }
}
