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
import type { CreateTicketType } from '@eventforge/domain';

@Injectable()
export class TicketsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async create(
    ctx: TenantContext,
    eventId: string,
    input: CreateTicketType,
  ) {
    await this.ensureEventInTenant(ctx, eventId);
    const ticketType = await this.prisma.client.ticketType.create({
      data: {
        eventId,
        name: input.name,
        kind: input.kind,
        priceCents: BigInt(input.priceCents),
        currency: input.currency,
        quantityTotal: input.quantityTotal,
        quantitySold: 0,
        saleStartsAt: input.saleStartsAt ? new Date(input.saleStartsAt) : null,
        saleEndsAt: input.saleEndsAt ? new Date(input.saleEndsAt) : null,
        visibility: input.visibility,
        description: input.description ?? null,
        minPerOrder: input.minPerOrder,
        maxPerOrder: input.maxPerOrder,
        sort: input.sort,
      },
    });

    await this.audit.record({
      ctx,
      action: 'ticket_type.create',
      target: `TicketType:${ticketType.id}`,
      meta: { eventId, name: ticketType.name },
    });

    return ticketType;
  }

  async findByEvent(ctx: TenantContext, eventId: string) {
    await this.ensureEventInTenant(ctx, eventId);
    return this.prisma.client.ticketType.findMany({
      where: { eventId, deletedAt: null },
      orderBy: { sort: 'asc' },
      include: { formFields: true },
    });
  }

  async findById(ctx: TenantContext, id: string) {
    const ticket = await this.prisma.client.ticketType.findFirst({
      where: { id, deletedAt: null },
      include: { event: true, formFields: true },
    });
    if (!ticket || ticket.event.organizationId !== ctx.organizationId) {
      throw new NotFoundException('Ticket type not found');
    }
    return ticket;
  }

  async update(
    ctx: TenantContext,
    id: string,
    input: Partial<CreateTicketType>,
  ) {
    const ticket = await this.findById(ctx, id);
    const updated = await this.prisma.client.ticketType.update({
      where: { id },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.kind && { kind: input.kind }),
        ...(input.priceCents !== undefined && {
          priceCents: BigInt(input.priceCents),
        }),
        ...(input.currency && { currency: input.currency }),
        ...(input.quantityTotal !== undefined && {
          quantityTotal: input.quantityTotal,
        }),
        ...(input.saleStartsAt !== undefined && {
          saleStartsAt: input.saleStartsAt ? new Date(input.saleStartsAt) : null,
        }),
        ...(input.saleEndsAt !== undefined && {
          saleEndsAt: input.saleEndsAt ? new Date(input.saleEndsAt) : null,
        }),
        ...(input.visibility && { visibility: input.visibility }),
        ...(input.description !== undefined && {
          description: input.description ?? null,
        }),
        ...(input.minPerOrder !== undefined && { minPerOrder: input.minPerOrder }),
        ...(input.maxPerOrder !== undefined && { maxPerOrder: input.maxPerOrder }),
        ...(input.sort !== undefined && { sort: input.sort }),
      },
    });

    await this.audit.record({
      ctx,
      action: 'ticket_type.update',
      target: `TicketType:${id}`,
      meta: input,
    });

    return updated;
  }

  async remove(ctx: TenantContext, id: string) {
    await this.findById(ctx, id);
    await this.prisma.client.ticketType.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.audit.record({
      ctx,
      action: 'ticket_type.delete',
      target: `TicketType:${id}`,
    });

    return { deleted: true };
  }

  async createPromoCode(
    ctx: TenantContext,
    eventId: string,
    input: {
      code: string;
      kind: 'flat' | 'percent';
      value: number;
      maxUses?: number;
      validFrom?: string;
      validTo?: string;
      ticketTypeIds?: string[];
    },
  ) {
    await this.ensureEventInTenant(ctx, eventId);

    const data: Prisma.PromoCodeCreateInput = {
      event: { connect: { id: eventId } },
      code: input.code.toUpperCase(),
      kind: input.kind,
      value: input.value,
      maxUses: input.maxUses ?? 0,
      validFrom: input.validFrom ? new Date(input.validFrom) : null,
      validTo: input.validTo ? new Date(input.validTo) : null,
    };

    if (input.ticketTypeIds?.length) {
      data.ticketTypes = { connect: input.ticketTypeIds.map((id) => ({ id })) };
    }

    const promo = await this.prisma.client.promoCode.create({ data });

    await this.audit.record({
      ctx,
      action: 'promo_code.create',
      target: `PromoCode:${promo.id}`,
      meta: { eventId, code: promo.code },
    });

    return promo;
  }

  async listPromoCodes(ctx: TenantContext, eventId: string) {
    await this.ensureEventInTenant(ctx, eventId);
    return this.prisma.client.promoCode.findMany({
      where: { eventId },
      include: { ticketTypes: true },
    });
  }

  private async ensureEventInTenant(
    ctx: TenantContext,
    eventId: string,
  ): Promise<void> {
    const event = await this.prisma.client.event.findFirst({
      where: { id: eventId, organizationId: ctx.organizationId, deletedAt: null },
    });
    if (!event) {
      throw new NotFoundException('Event not found');
    }
  }
}
