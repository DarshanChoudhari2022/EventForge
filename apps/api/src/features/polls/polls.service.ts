import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { AuditService } from '../../common/services/audit.service.js';
import { Prisma } from '@eventforge/db';
import type { TenantContext } from '../../common/request-context.js';
import type { CreatePoll, CreateQaMessage } from '@eventforge/domain';

@Injectable()
export class PollsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async createPoll(ctx: TenantContext, sessionId: string, input: CreatePoll) {
    await this.ensureSessionInTenant(ctx, sessionId);
    const poll = await this.prisma.client.poll.create({
      data: {
        sessionId,
        question: input.question as Prisma.InputJsonValue,
        options: input.options as Prisma.InputJsonValue,
        multiSelect: input.multiSelect,
      },
    });

    await this.audit.record({
      ctx,
      action: 'poll.create',
      target: `Poll:${poll.id}`,
      meta: { sessionId },
    });

    return poll;
  }

  async listPolls(ctx: TenantContext, sessionId: string) {
    await this.ensureSessionInTenant(ctx, sessionId);
    return this.prisma.client.poll.findMany({
      where: { sessionId },
      include: { votes: true },
    });
  }

  async vote(ctx: TenantContext, pollId: string, attendeeId: string, optionId: string) {
    const poll = await this.prisma.client.poll.findFirst({
      where: { id: pollId },
      include: { session: { include: { event: true } } },
    });
    if (!poll || poll.session.event.organizationId !== ctx.organizationId) {
      throw new NotFoundException('Poll not found');
    }
    if (poll.status !== 'live') {
      throw new ConflictException('Poll is not live');
    }

    try {
      const vote = await this.prisma.client.pollVote.create({
        data: { pollId, attendeeId, optionId },
      });
      return vote;
    } catch (err) {
      if ((err as { code?: string }).code === 'P2002') {
        throw new ConflictException('Already voted');
      }
      throw err;
    }
  }

  async postQuestion(
    ctx: TenantContext,
    sessionId: string,
    attendeeId: string,
    input: CreateQaMessage,
  ) {
    await this.ensureSessionInTenant(ctx, sessionId);
    const question = await this.prisma.client.qaMessage.create({
      data: {
        sessionId,
        attendeeId,
        text: input.text,
        isAnonymous: input.isAnonymous,
      },
    });

    await this.audit.record({
      ctx,
      action: 'qa.create',
      target: `QaMessage:${question.id}`,
      meta: { sessionId },
    });

    return question;
  }

  async listQuestions(ctx: TenantContext, sessionId: string) {
    await this.ensureSessionInTenant(ctx, sessionId);
    return this.prisma.client.qaMessage.findMany({
      where: { sessionId },
      orderBy: { votes: 'desc' },
    });
  }

  private async ensureSessionInTenant(ctx: TenantContext, sessionId: string) {
    const session = await this.prisma.client.session.findFirst({
      where: { id: sessionId },
      include: { event: true },
    });
    if (!session || session.event.organizationId !== ctx.organizationId) {
      throw new NotFoundException('Session not found');
    }
  }
}
