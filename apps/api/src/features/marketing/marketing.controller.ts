import { Controller, Get, Post, Body, Param, UseGuards, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { z } from 'zod';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import type { TenantContext } from '../../common/request-context.js';
import { CreateCampaignSchema } from '@eventforge/domain';
import { MarketingService } from './marketing.service.js';

@ApiTags('marketing')
@ApiBearerAuth('supabase-jwt')
@UseGuards(AuthGuard, TenantGuard, RolesGuard)
@Controller('events/:eventId/marketing')
export class MarketingController {
  constructor(@Inject(MarketingService) private readonly marketingService: MarketingService) {}

  @Post('campaigns')
  @Roles('organizer')
  @ApiOperation({ summary: 'Create campaign' })
  async create(
    @CurrentTenant() ctx: TenantContext,
    @Param('eventId') eventId: string,
    @Body(new ZodValidationPipe(CreateCampaignSchema))
    body: z.infer<typeof CreateCampaignSchema>,
  ) {
    return this.marketingService.createCampaign(ctx, eventId, body);
  }

  @Get('campaigns')
  @Roles('organizer')
  @ApiOperation({ summary: 'List campaigns' })
  async list(
    @CurrentTenant() ctx: TenantContext,
    @Param('eventId') eventId: string,
  ) {
    return this.marketingService.listCampaigns(ctx, eventId);
  }
}
