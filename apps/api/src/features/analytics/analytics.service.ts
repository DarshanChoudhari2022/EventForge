import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import type { TenantContext } from '../../common/request-context.js';

@Injectable()
export class AnalyticsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async realtime(ctx: TenantContext, eventId: string) {
    await this.ensureEventInTenant(ctx, eventId);

    const [registrations, revenue, checkIns, tickets] = await Promise.all([
      this.prisma.client.order.count({
        where: { eventId, status: 'completed' },
      }),
      this.prisma.client.order.aggregate({
        where: { eventId, status: 'completed' },
        _sum: { totalCents: true },
      }),
      this.prisma.client.checkIn.count({ where: { eventId } }),
      this.prisma.client.ticket.groupBy({
        by: ['status'],
        where: { eventId },
        _count: { status: true },
      }),
    ]);

    const hourly = await this.prisma.client.eventMetricHourly.findMany({
      where: { eventId },
      orderBy: { hourBucket: 'asc' },
      take: 72,
    });

    return {
      eventId,
      registrations,
      revenueCents: Number(revenue._sum.totalCents ?? 0),
      checkIns,
      ticketsByStatus: Object.fromEntries(
        tickets.map((t) => [t.status, t._count.status]),
      ),
      hourly: hourly.map((h) => ({
        bucket: h.hourBucket.toISOString(),
        registrations: h.registrations,
        revenueCents: Number(h.revenueCents),
        checkIns: h.checkIns,
      })),
    };
  }

  async recordEvent(
    ctx: TenantContext,
    eventId: string,
    metric: {
      registrations?: number;
      revenueCents?: bigint;
      checkIns?: number;
      refundsCents?: bigint;
    },
  ) {
    await this.ensureEventInTenant(ctx, eventId);
    const hourBucket = this.floorHour(new Date());
    return this.prisma.client.eventMetricHourly.upsert({
      where: { eventId_hourBucket: { eventId, hourBucket } },
      create: {
        eventId,
        hourBucket,
        registrations: metric.registrations ?? 0,
        revenueCents: metric.revenueCents ?? 0n,
        checkIns: metric.checkIns ?? 0,
        refundsCents: metric.refundsCents ?? 0n,
      },
      update: {
        registrations: { increment: metric.registrations ?? 0 },
        revenueCents: { increment: metric.revenueCents ?? 0n },
        checkIns: { increment: metric.checkIns ?? 0 },
        refundsCents: { increment: metric.refundsCents ?? 0n },
      },
    });
  }

  private floorHour(date: Date): Date {
    const d = new Date(date);
    d.setMinutes(0, 0, 0);
    return d;
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
