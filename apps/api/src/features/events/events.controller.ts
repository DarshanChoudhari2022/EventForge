import { Controller,
  Get,
  Post,
  Patch,
  Delete,
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
import {
  CreateEventSchema,
  UpdateEventSchema,
  UpsertEventLocaleSchema,
  BuilderDocSchema,
  PaginationQuerySchema,
} from '@eventforge/domain';
import { EventsService } from './events.service.js';

const PageBodySchema = z.object({
  slug: z.string().min(1).max(80),
  builderDoc: BuilderDocSchema,
});

@ApiTags('events')
@ApiBearerAuth('supabase-jwt')
@UseGuards(AuthGuard, TenantGuard, RolesGuard)
@Controller('events')
export class EventsController {
  constructor(@Inject(EventsService) private readonly eventsService: EventsService) {}

  @Post()
  @Roles('organizer')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new event' })
  async create(
    @CurrentTenant() ctx: TenantContext,
    @Body(new ZodValidationPipe(CreateEventSchema))
    body: z.infer<typeof CreateEventSchema>,
  ) {
    return this.eventsService.create(ctx, body);
  }

  @Get()
  @Roles('viewer')
  @ApiOperation({ summary: 'List organization events' })
  async findAll(
    @CurrentTenant() ctx: TenantContext,
    @Query(new ZodValidationPipe(PaginationQuerySchema))
    query: z.infer<typeof PaginationQuerySchema>,
  ) {
    return this.eventsService.findAll(ctx, query);
  }

  @Get(':id')
  @Roles('viewer')
  @ApiOperation({ summary: 'Get event details' })
  async findOne(
    @CurrentTenant() ctx: TenantContext,
    @Param('id') id: string,
  ) {
    return this.eventsService.findById(ctx, id);
  }

  @Patch(':id')
  @Roles('organizer')
  @ApiOperation({ summary: 'Update event' })
  async update(
    @CurrentTenant() ctx: TenantContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateEventSchema))
    body: z.infer<typeof UpdateEventSchema>,
  ) {
    return this.eventsService.update(ctx, id, body);
  }

  @Post(':id/publish')
  @Roles('organizer')
  @ApiOperation({ summary: 'Publish event' })
  async publish(@CurrentTenant() ctx: TenantContext, @Param('id') id: string) {
    return this.eventsService.publish(ctx, id);
  }

  @Post(':id/locales')
  @Roles('organizer')
  @ApiOperation({ summary: 'Upsert event locale content' })
  async upsertLocale(
    @CurrentTenant() ctx: TenantContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpsertEventLocaleSchema))
    body: z.infer<typeof UpsertEventLocaleSchema>,
  ) {
    return this.eventsService.upsertLocale(ctx, id, body);
  }

  @Post(':id/pages')
  @Roles('organizer')
  @ApiOperation({ summary: 'Save event page builder document' })
  async savePage(
    @CurrentTenant() ctx: TenantContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(PageBodySchema))
    body: z.infer<typeof PageBodySchema>,
  ) {
    return this.eventsService.savePage(ctx, id, body.slug, body.builderDoc);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Archive event' })
  async remove(@CurrentTenant() ctx: TenantContext, @Param('id') id: string) {
    return this.eventsService.remove(ctx, id);
  }
}
