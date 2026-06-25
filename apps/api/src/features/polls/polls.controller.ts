import { Controller,
  Get,
  Post,
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
import { CreatePollSchema, CreateQaMessageSchema } from '@eventforge/domain';
import { PollsService } from './polls.service.js';

const VoteBodySchema = z.object({
  attendeeId: z.string().uuid(),
  optionId: z.string().min(1),
});

@ApiTags('polls')
@ApiBearerAuth('supabase-jwt')
@UseGuards(AuthGuard, TenantGuard, RolesGuard)
@Controller('sessions/:sessionId/polls')
export class PollsController {
  constructor(@Inject(PollsService) private readonly pollsService: PollsService) {}

  @Post()
  @Roles('organizer')
  @ApiOperation({ summary: 'Create poll' })
  async create(
    @CurrentTenant() ctx: TenantContext,
    @Param('sessionId') sessionId: string,
    @Body(new ZodValidationPipe(CreatePollSchema))
    body: z.infer<typeof CreatePollSchema>,
  ) {
    return this.pollsService.createPoll(ctx, sessionId, body);
  }

  @Get()
  @Roles('viewer')
  @ApiOperation({ summary: 'List polls' })
  async list(
    @CurrentTenant() ctx: TenantContext,
    @Param('sessionId') sessionId: string,
  ) {
    return this.pollsService.listPolls(ctx, sessionId);
  }

  @Post(':id/votes')
  @Roles('viewer')
  @ApiOperation({ summary: 'Cast vote' })
  async vote(
    @CurrentTenant() ctx: TenantContext,
    @Param('id') pollId: string,
    @Body(new ZodValidationPipe(VoteBodySchema))
    body: z.infer<typeof VoteBodySchema>,
  ) {
    return this.pollsService.vote(ctx, pollId, body.attendeeId, body.optionId);
  }

  @Post('questions')
  @Roles('viewer')
  @ApiOperation({ summary: 'Post Q&A question' })
  async postQuestion(
    @CurrentTenant() ctx: TenantContext,
    @Param('sessionId') sessionId: string,
    @Body(new ZodValidationPipe(CreateQaMessageSchema))
    body: z.infer<typeof CreateQaMessageSchema>,
  ) {
    // attendeeId would come from a token in real app; using a body field for simplicity
    return this.pollsService.postQuestion(ctx, sessionId, body.isAnonymous ? '' : 'anon', body);
  }

  @Get('questions')
  @Roles('viewer')
  @ApiOperation({ summary: 'List Q&A questions' })
  async listQuestions(
    @CurrentTenant() ctx: TenantContext,
    @Param('sessionId') sessionId: string,
  ) {
    return this.pollsService.listQuestions(ctx, sessionId);
  }
}
