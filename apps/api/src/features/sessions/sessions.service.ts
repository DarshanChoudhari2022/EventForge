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
import type { CreateSession } from '@eventforge/domain';

@Injectable()
export class SessionsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async create(
    ctx: TenantContext,
    eventId: string,
    input: CreateSession,
  ) {
    await this.ensureEventInTenant(ctx, eventId);
    const session = await this.prisma.client.session.create({
      data: {
        eventId,
        trackId: input.trackId ?? null,
        roomId: input.roomId ?? null,
        title: input.title as Prisma.InputJsonValue,
        description: (input.description ?? null) as Prisma.InputJsonValue,
        startsAt: new Date(input.startsAt),
        endsAt: new Date(input.endsAt),
        type: input.type,
        capacity: input.capacity ?? null,
        requiresRsvp: input.requiresRsvp,
        streamUrl: input.streamUrl ?? null,
        streamProvider: input.streamProvider ?? null,
        sort: input.sort,
      },
    });

    await this.audit.record({
      ctx,
      action: 'session.create',
      target: `Session:${session.id}`,
      meta: { eventId, title: session.title },
    });

    return session;
  }

  async findByEvent(ctx: TenantContext, eventId: string) {
    await this.ensureEventInTenant(ctx, eventId);
    return this.prisma.client.session.findMany({
      where: { eventId },
      include: { track: true, room: true, speakers: { include: { speaker: true } } },
      orderBy: { startsAt: 'asc' },
    });
  }

  async findById(ctx: TenantContext, id: string) {
    const session = await this.prisma.client.session.findFirst({
      where: { id },
      include: {
        event: true,
        track: true,
        room: true,
        speakers: { include: { speaker: true } },
      },
    });
    if (!session || session.event.organizationId !== ctx.organizationId) {
      throw new NotFoundException('Session not found');
    }
    return session;
  }

  async update(
    ctx: TenantContext,
    id: string,
    input: Partial<CreateSession>,
  ) {
    const session = await this.findById(ctx, id);
    const updated = await this.prisma.client.session.update({
      where: { id },
      data: {
        ...(input.trackId && { trackId: input.trackId }),
        ...(input.roomId && { roomId: input.roomId }),
        ...(input.title && { title: input.title as Prisma.InputJsonValue }),
        ...(input.description !== undefined && {
          description: (input.description === null
            ? Prisma.JsonNull
            : input.description) as Prisma.InputJsonValue,
        }),
        ...(input.startsAt && { startsAt: new Date(input.startsAt) }),
        ...(input.endsAt && { endsAt: new Date(input.endsAt) }),
        ...(input.type && { type: input.type }),
        ...(input.capacity !== undefined && { capacity: input.capacity }),
        ...(input.requiresRsvp !== undefined && { requiresRsvp: input.requiresRsvp }),
        ...(input.streamUrl !== undefined && { streamUrl: input.streamUrl }),
        ...(input.streamProvider !== undefined && {
          streamProvider: input.streamProvider,
        }),
        ...(input.sort !== undefined && { sort: input.sort }),
      },
    });

    await this.audit.record({
      ctx,
      action: 'session.update',
      target: `Session:${id}`,
      meta: input,
    });

    return updated;
  }

  async remove(ctx: TenantContext, id: string) {
    await this.findById(ctx, id);
    await this.prisma.client.session.delete({ where: { id } });

    await this.audit.record({
      ctx,
      action: 'session.delete',
      target: `Session:${id}`,
    });

    return { deleted: true };
  }

  async createSpeaker(
    ctx: TenantContext,
    eventId: string,
    input: {
      name: string;
      title?: string;
      company?: string;
      bio?: Record<string, string>;
      photoUrl?: string;
      social?: Record<string, string>;
      email?: string;
    },
  ) {
    await this.ensureEventInTenant(ctx, eventId);
    const speaker = await this.prisma.client.speaker.create({
      data: {
        eventId,
        name: input.name,
        title: input.title ?? null,
        company: input.company ?? null,
        bio: (input.bio ?? null) as Prisma.InputJsonValue,
        photoUrl: input.photoUrl ?? null,
        social: (input.social ?? null) as Prisma.InputJsonValue,
        email: input.email ?? null,
        portalToken: `spk_${crypto.randomUUID()}`,
      },
    });

    await this.audit.record({
      ctx,
      action: 'speaker.create',
      target: `Speaker:${speaker.id}`,
      meta: { eventId, name: speaker.name },
    });

    return speaker;
  }

  async assignSpeaker(
    ctx: TenantContext,
    sessionId: string,
    speakerId: string,
    role: string,
  ) {
    await this.findById(ctx, sessionId);
    const assignment = await this.prisma.client.sessionSpeaker.create({
      data: { sessionId, speakerId, role },
    });

    await this.audit.record({
      ctx,
      action: 'session.assign_speaker',
      target: `Session:${sessionId}`,
      meta: { speakerId, role },
    });

    return assignment;
  }

  async rsvp(ctx: TenantContext, sessionId: string, attendeeId: string) {
    const session = await this.findById(ctx, sessionId);
    if (session.requiresRsvp && session.capacity) {
      const count = await this.prisma.client.sessionRsvp.count({
        where: { sessionId, status: { in: ['going', 'checked_in'] } },
      });
      if (count >= session.capacity) {
        throw new ConflictException('Session is at capacity');
      }
    }

    const rsvp = await this.prisma.client.sessionRsvp.upsert({
      where: { sessionId_attendeeId: { sessionId, attendeeId } },
      create: { sessionId, attendeeId, status: 'going' },
      update: { status: 'going' },
    });

    await this.audit.record({
      ctx,
      action: 'session.rsvp',
      target: `Session:${sessionId}`,
      meta: { attendeeId },
    });

    return rsvp;
  }

  private async ensureEventInTenant(ctx: TenantContext, eventId: string) {
    const event = await this.prisma.client.event.findFirst({
      where: { id: eventId, organizationId: ctx.organizationId, deletedAt: null },
    });
    if (!event) {
      throw new NotFoundException('Event not found');
    }
  }
}
