import { Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
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
import { CreateCheckInSchema } from '@eventforge/domain';
import { CheckInsService } from './check-ins.service.js';

@ApiTags('checkins')
@ApiBearerAuth('supabase-jwt')
@UseGuards(AuthGuard, TenantGuard, RolesGuard)
@Controller('events/:eventId/check-ins')
export class CheckInsController {
  constructor(@Inject(CheckInsService) private readonly checkInsService: CheckInsService) {}

  @Post()
  @Roles('staff')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record a check-in' })
  async checkIn(
    @CurrentTenant() ctx: TenantContext,
    @Body(new ZodValidationPipe(CreateCheckInSchema))
    body: z.infer<typeof CreateCheckInSchema>,
  ) {
    return this.checkInsService.checkIn(ctx, body);
  }

  @Get('tickets/:code')
  @Roles('staff')
  @ApiOperation({ summary: 'Lookup ticket by code' })
  async getTicket(
    @CurrentTenant() ctx: TenantContext,
    @Param('code') code: string,
  ) {
    return this.checkInsService.getTicket(ctx, code);
  }

  @Get()
  @Roles('viewer')
  @ApiOperation({ summary: 'List check-ins' })
  async list(
    @CurrentTenant() ctx: TenantContext,
    @Param('eventId') eventId: string,
  ) {
    return this.checkInsService.list(ctx, eventId);
  }

  @Get('stats')
  @Roles('viewer')
  @ApiOperation({ summary: 'Check-in stats' })
  async stats(
    @CurrentTenant() ctx: TenantContext,
    @Param('eventId') eventId: string,
  ) {
    return this.checkInsService.stats(ctx, eventId);
  }
}
