import { Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards, Inject } from '@nestjs/common';;
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { z } from 'zod';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import type { TenantContext } from '../../common/request-context.js';
import { CreateSessionSchema } from '@eventforge/domain';
import { SessionsService } from './sessions.service.js';

const SpeakerBodySchema = z.object({
  name: z.string().min(1),
  title: z.string().optional(),
  company: z.string().optional(),
  bio: z.record(z.string(), z.string()).optional(),
  photoUrl: z.string().url().optional(),
  social: z.record(z.string(), z.string()).optional(),
  email: z.string().email().optional(),
});

const AssignSpeakerBodySchema = z.object({
  speakerId: z.string().uuid(),
  role: z.string().default('speaker'),
});

@ApiTags('sessions')
@ApiBearerAuth('supabase-jwt')
@UseGuards(AuthGuard, TenantGuard, RolesGuard)
@Controller('events/:eventId/sessions')
export class SessionsController {
  constructor(@Inject(SessionsService) private readonly sessionsService: SessionsService) {}

  @Post()
  @Roles('organizer')
  @ApiOperation({ summary: 'Create session' })
  async create(
    @CurrentTenant() ctx: TenantContext,
    @Param('eventId') eventId: string,
    @Body(new ZodValidationPipe(CreateSessionSchema))
    body: z.infer<typeof CreateSessionSchema>,
  ) {
    return this.sessionsService.create(ctx, eventId, body);
  }

  @Get()
  @Roles('viewer')
  @ApiOperation({ summary: 'List sessions' })
  async findByEvent(
    @CurrentTenant() ctx: TenantContext,
    @Param('eventId') eventId: string,
  ) {
    return this.sessionsService.findByEvent(ctx, eventId);
  }

  @Patch(':id')
  @Roles('organizer')
  @ApiOperation({ summary: 'Update session' })
  async update(
    @CurrentTenant() ctx: TenantContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(CreateSessionSchema.partial()))
    body: z.infer<typeof CreateSessionSchema>,
  ) {
    return this.sessionsService.update(ctx, id, body);
  }

  @Delete(':id')
  @Roles('organizer')
  @ApiOperation({ summary: 'Delete session' })
  async remove(@CurrentTenant() ctx: TenantContext, @Param('id') id: string) {
    return this.sessionsService.remove(ctx, id);
  }

  @Post('speakers')
  @Roles('organizer')
  @ApiOperation({ summary: 'Create speaker' })
  async createSpeaker(
    @CurrentTenant() ctx: TenantContext,
    @Param('eventId') eventId: string,
    @Body(new ZodValidationPipe(SpeakerBodySchema))
    body: z.infer<typeof SpeakerBodySchema>,
  ) {
    return this.sessionsService.createSpeaker(ctx, eventId, body);
  }

  @Post(':id/speakers')
  @Roles('organizer')
  @ApiOperation({ summary: 'Assign speaker to session' })
  async assignSpeaker(
    @CurrentTenant() ctx: TenantContext,
    @Param('id') sessionId: string,
    @Body(new ZodValidationPipe(AssignSpeakerBodySchema))
    body: z.infer<typeof AssignSpeakerBodySchema>,
  ) {
    return this.sessionsService.assignSpeaker(ctx, sessionId, body.speakerId, body.role);
  }

  @Post(':id/rsvp')
  @Roles('viewer')
  @ApiOperation({ summary: 'RSVP to session' })
  async rsvp(
    @CurrentTenant() ctx: TenantContext,
    @Param('id') sessionId: string,
    @Body(new ZodValidationPipe(z.object({ attendeeId: z.string().uuid() })))
    body: { attendeeId: string },
  ) {
    return this.sessionsService.rsvp(ctx, sessionId, body.attendeeId);
  }
}
