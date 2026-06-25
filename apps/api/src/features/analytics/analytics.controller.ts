import { Controller, Get, Param, UseGuards, Inject } from '@nestjs/common';;
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator.js';
import type { TenantContext } from '../../common/request-context.js';
import { AnalyticsService } from './analytics.service.js';

@ApiTags('analytics')
@ApiBearerAuth('supabase-jwt')
@UseGuards(AuthGuard, TenantGuard, RolesGuard)
@Controller('analytics/events/:eventId')
export class AnalyticsController {
  constructor(@Inject(AnalyticsService) private readonly analyticsService: AnalyticsService) {}

  @Get('realtime')
  @Roles('viewer')
  @ApiOperation({ summary: 'Realtime event analytics' })
  async realtime(
    @CurrentTenant() ctx: TenantContext,
    @Param('eventId') eventId: string,
  ) {
    return this.analyticsService.realtime(ctx, eventId);
  }
}
