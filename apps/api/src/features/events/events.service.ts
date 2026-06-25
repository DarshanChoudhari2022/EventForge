import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { AuditService } from '../../common/services/audit.service.js';
import { Prisma } from '@eventforge/db';
import type { TenantContext } from '../../common/request-context.js';
import type {
  Event as EventType,
  CreateEvent,
  UpdateEvent,
  UpsertEventLocale,
  BuilderDoc,
} from '@eventforge/domain';

@Injectable()
export class EventsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async create(ctx: TenantContext, input: CreateEvent): Promise<EventType> {
    const event = await this.prisma.client.event.create({
      data: {
        organizationId: ctx.organizationId,
        name: input.name,
        type: input.type,
        startsAt: input.startsAt ? new Date(input.startsAt) : null,
        endsAt: input.endsAt ? new Date(input.endsAt) : null,
        timezone: input.timezone ?? 'UTC',
        currency: input.currency ?? 'usd',
        localeDefault: input.localeDefault ?? 'en',
        venue: (input.venue ?? null) as Prisma.InputJsonValue,
        settings: (input.settings ?? null) as Prisma.InputJsonValue,
      },
    });

    await this.audit.record({
      ctx,
      action: 'event.create',
      target: `Event:${event.id}`,
      meta: { name: event.name },
    });

    return event as unknown as EventType;
  }

  async findAll(ctx: TenantContext, opts: { page: number; pageSize: number }) {
    const [items, total] = await Promise.all([
      this.prisma.client.event.findMany({
        where: { organizationId: ctx.organizationId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        skip: (opts.page - 1) * opts.pageSize,
        take: opts.pageSize,
      }),
      this.prisma.client.event.count({
        where: { organizationId: ctx.organizationId, deletedAt: null },
      }),
    ]);
    return { items, total, page: opts.page, pageSize: opts.pageSize };
  }

  async findById(ctx: TenantContext, id: string): Promise<EventType> {
    const event = await this.prisma.client.event.findFirst({
      where: {
        id,
        organizationId: ctx.organizationId,
        deletedAt: null,
      },
      include: { locales: true, pages: true, ticketTypes: true },
    });
    if (!event) {
      throw new NotFoundException('Event not found');
    }
    return event as unknown as EventType;
  }

  async update(
    ctx: TenantContext,
    id: string,
    input: UpdateEvent,
  ): Promise<EventType> {
    await this.findById(ctx, id);
    const event = await this.prisma.client.event.update({
      where: { id },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.type && { type: input.type }),
        ...(input.startsAt !== undefined && {
          startsAt: input.startsAt ? new Date(input.startsAt) : null,
        }),
        ...(input.endsAt !== undefined && {
          endsAt: input.endsAt ? new Date(input.endsAt) : null,
        }),
        ...(input.timezone && { timezone: input.timezone }),
        ...(input.currency && { currency: input.currency }),
        ...(input.localeDefault && { localeDefault: input.localeDefault }),
        ...(input.venue !== undefined && { venue: input.venue as Prisma.InputJsonValue }),
        ...(input.settings !== undefined && { settings: input.settings as Prisma.InputJsonValue }),
      },
    });

    await this.audit.record({
      ctx,
      action: 'event.update',
      target: `Event:${id}`,
      meta: input,
    });

    return event as unknown as EventType;
  }

  async publish(ctx: TenantContext, id: string): Promise<EventType> {
    const event = await this.findById(ctx, id);
    if (event.status === 'live' || event.status === 'completed') {
      throw new BadRequestException('Event is already published or live');
    }

    // Snapshot published pages
    const pages = await this.prisma.client.eventPage.findMany({
      where: { eventId: id },
    });
    for (const page of pages) {
      await this.prisma.client.eventPage.update({
        where: { id: page.id },
        data: {
          publishedDoc: (page.builderDoc ?? Prisma.JsonNull) as Prisma.InputJsonValue,
          version: { increment: 1 },
        },
      });
    }

    const updated = await this.prisma.client.event.update({
      where: { id },
      data: { status: 'published', publishedAt: new Date() },
    });

    await this.audit.record({
      ctx,
      action: 'event.publish',
      target: `Event:${id}`,
    });

    return updated as unknown as EventType;
  }

  async upsertLocale(
    ctx: TenantContext,
    eventId: string,
    input: UpsertEventLocale,
  ) {
    await this.findById(ctx, eventId);
    return this.prisma.client.eventLocale.upsert({
      where: { eventId_locale: { eventId, locale: input.locale } },
      create: {
        eventId,
        locale: input.locale,
        title: input.title ?? null,
        summary: input.summary ?? null,
        content: (input.content ?? null) as Prisma.InputJsonValue,
        seo: (input.seo ?? null) as Prisma.InputJsonValue,
      },
      update: {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.summary !== undefined && { summary: input.summary }),
        ...(input.content !== undefined && { content: input.content as Prisma.InputJsonValue }),
        ...(input.seo !== undefined && { seo: input.seo as Prisma.InputJsonValue }),
      },
    });
  }

  async savePage(
    ctx: TenantContext,
    eventId: string,
    slug: string,
    builderDoc: BuilderDoc,
  ) {
    await this.findById(ctx, eventId);
    return this.prisma.client.eventPage.upsert({
      where: { eventId_slug: { eventId, slug } },
      create: {
        eventId,
        slug,
        builderDoc: builderDoc as Prisma.InputJsonValue,
        publishedDoc: Prisma.JsonNull,
        version: 1,
      },
      update: {
        builderDoc: builderDoc as Prisma.InputJsonValue,
        version: { increment: 1 },
      },
    });
  }

  async remove(ctx: TenantContext, id: string): Promise<{ deleted: boolean }> {
    await this.findById(ctx, id);
    await this.prisma.client.event.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'archived' },
    });

    await this.audit.record({
      ctx,
      action: 'event.delete',
      target: `Event:${id}`,
    });

    return { deleted: true };
  }
}
