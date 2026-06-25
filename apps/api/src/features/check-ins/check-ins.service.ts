import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { AuditService } from '../../common/services/audit.service.js';
import type { TenantContext } from '../../common/request-context.js';
import type { CreateCheckIn } from '@eventforge/domain';

@Injectable()
export class CheckInsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async checkIn(ctx: TenantContext, input: CreateCheckIn) {
    await this.ensureEventInTenant(ctx, input.eventId);

    let ticket = null;
    if (input.ticketCode) {
      ticket = await this.prisma.client.ticket.findUnique({
        where: { code: input.ticketCode },
        include: { ticketType: true },
      });
      if (!ticket || ticket.eventId !== input.eventId) {
        throw new NotFoundException('Ticket not found');
      }
      if (ticket.status === 'refunded' || ticket.status === 'cancelled') {
        throw new BadRequestException('Ticket is not valid');
      }
    }

    try {
      const checkIn = await this.prisma.client.checkIn.create({
        data: {
          eventId: input.eventId,
          ticketId: ticket?.id ?? null,
          attendeeId: ticket?.attendeeId ?? null,
          sessionId: input.sessionId ?? null,
          channel: input.channel,
          method: input.method,
          location: input.location ?? null,
          staffId: ctx.user?.id ?? null,
        },
      });

      if (ticket) {
        await this.prisma.client.ticket.update({
          where: { id: ticket.id },
          data: { status: 'checked_in', checkedInAt: new Date(), checkedInBy: ctx.user?.id ?? null },
        });
      }

      await this.audit.record({
        ctx,
        action: 'check_in.create',
        target: `CheckIn:${checkIn.id}`,
        meta: { ticketCode: input.ticketCode, sessionId: input.sessionId },
      });

      return checkIn;
    } catch (err) {
      if ((err as { code?: string }).code === 'P2002') {
        throw new ConflictException('Ticket already checked in');
      }
      throw err;
    }
  }

  async getTicket(ctx: TenantContext, code: string) {
    const ticket = await this.prisma.client.ticket.findUnique({
      where: { code },
      include: { ticketType: true, order: true },
    });
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }
    await this.ensureEventInTenant(ctx, ticket.eventId);
    return ticket;
  }

  async list(ctx: TenantContext, eventId: string) {
    await this.ensureEventInTenant(ctx, eventId);
    return this.prisma.client.checkIn.findMany({
      where: { eventId },
      include: { ticket: true },
      orderBy: { at: 'desc' },
    });
  }

  async stats(ctx: TenantContext, eventId: string) {
    await this.ensureEventInTenant(ctx, eventId);
    const [totalTickets, checkedIn, sessionCheckIns] = await Promise.all([
      this.prisma.client.ticket.count({ where: { eventId, status: { not: 'refunded' } } }),
      this.prisma.client.ticket.count({ where: { eventId, status: 'checked_in' } }),
      this.prisma.client.checkIn.count({ where: { eventId } }),
    ]);
    return { eventId, totalTickets, checkedIn, sessionCheckIns };
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
