import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { AuditService } from '../../common/services/audit.service.js';
import type { TenantContext } from '../../common/request-context.js';
import type { CreateOrder } from '@eventforge/domain';
import Stripe from 'stripe';

@Injectable()
export class OrdersService {
  private stripe: Stripe | null = null;

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {
    const secretKey = this.config.get<string>('stripeSecretKey');
    if (secretKey) {
      this.stripe = new Stripe(secretKey, { apiVersion: '2024-06-20' });
    }
  }

  async createCheckout(ctx: TenantContext, input: CreateOrder) {
    const event = await this.prisma.client.event.findFirst({
      where: { id: input.eventId, organizationId: ctx.organizationId, deletedAt: null },
    });
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // Validate items and compute totals
    let subtotalCents = 0;
    const items: Array<{
      ticketTypeId: string;
      qty: number;
      unitPriceCents: bigint;
      attendeeData?: Record<string, unknown>;
    }> = [];

    for (const item of input.items) {
      const ticketType = await this.prisma.client.ticketType.findFirst({
        where: { id: item.ticketTypeId, eventId: input.eventId, deletedAt: null },
      });
      if (!ticketType) {
        throw new NotFoundException(`Ticket type ${item.ticketTypeId} not found`);
      }
      if (ticketType.quantityTotal > 0 &&
          ticketType.quantitySold + item.qty > ticketType.quantityTotal) {
        throw new ConflictException(`Not enough inventory for ${ticketType.name}`);
      }
      items.push({
        ticketTypeId: ticketType.id,
        qty: item.qty,
        unitPriceCents: ticketType.priceCents,
        attendeeData: item.attendeeData,
      });
      subtotalCents += Number(ticketType.priceCents) * item.qty;
    }

    const totalCents = subtotalCents;

    // Create pending order
    const order = await this.prisma.client.order.create({
      data: {
        organizationId: ctx.organizationId,
        eventId: input.eventId,
        buyerId: ctx.user?.id ?? null,
        status: 'pending',
        subtotalCents: BigInt(subtotalCents),
        feesCents: 0n,
        taxCents: 0n,
        discountCents: 0n,
        totalCents: BigInt(totalCents),
        currency: event.currency,
        idempotencyKey: input.idempotencyKey,
      },
      include: { items: true },
    });

    // Create order items
    for (const item of items) {
      await this.prisma.client.orderItem.create({
        data: {
          orderId: order.id,
          ticketTypeId: item.ticketTypeId,
          qty: item.qty,
          unitPriceCents: item.unitPriceCents,
        },
      });
    }

    // If free, complete immediately
    if (totalCents === 0) {
      return this.finalizeOrder(ctx, order.id);
    }

    // Otherwise create Stripe Checkout session
    if (!this.stripe) {
      throw new BadRequestException('Payments are not configured');
    }

    const session = await this.stripe.checkout.sessions.create(
      {
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: items.map((item) => ({
          price_data: {
            currency: event.currency,
            product_data: { name: `Ticket` },
            unit_amount: Number(item.unitPriceCents),
          },
          quantity: item.qty,
        })),
        metadata: { orderId: order.id, organizationId: ctx.organizationId },
        success_url: `${this.config.get('corsOrigins')}/orders/${order.id}/success`,
        cancel_url: `${this.config.get('corsOrigins')}/orders/${order.id}/cancel`,
      },
      { idempotencyKey: input.idempotencyKey },
    );

    await this.prisma.client.order.update({
      where: { id: order.id },
      data: { stripeCheckoutSessionId: session.id },
    });

    return {
      orderId: order.id,
      status: 'pending_payment',
      checkoutUrl: session.url,
    };
  }

  async finalizeOrder(ctx: TenantContext, orderId: string) {
    const order = await this.prisma.client.order.findFirst({
      where: { id: orderId, organizationId: ctx.organizationId },
      include: { items: { include: { ticketType: true } }, event: true },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (order.status === 'completed') {
      return order;
    }

    // Generate tickets
    for (const item of order.items) {
      for (let i = 0; i < item.qty; i++) {
        const code = this.generateTicketCode();
        await this.prisma.client.ticket.create({
          data: {
            orderItemId: item.id,
            ticketTypeId: item.ticketTypeId,
            orderId: order.id,
            eventId: order.eventId,
            organizationId: order.organizationId,
            code,
            qrSecret: this.generateQrSecret(code),
          },
        });
      }
      await this.prisma.client.ticketType.update({
        where: { id: item.ticketTypeId },
        data: { quantitySold: { increment: item.qty } },
      });
    }

    const updated = await this.prisma.client.order.update({
      where: { id: orderId },
      data: { status: 'completed' },
      include: { tickets: true, items: true },
    });

    await this.audit.record({
      ctx,
      action: 'order.complete',
      target: `Order:${orderId}`,
      meta: { totalCents: Number(order.totalCents) },
    });

    return updated;
  }

  async handleStripeWebhook(signature: string, rawBody: Buffer) {
    const secret = this.config.get<string>('stripeWebhookSecret');
    if (!this.stripe || !secret) {
      throw new BadRequestException('Stripe not configured');
    }

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, secret);
    } catch (err) {
      throw new BadRequestException('Invalid webhook signature');
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.orderId;
      if (!orderId) return { received: true };

      const order = await this.prisma.client.order.findUnique({
        where: { id: orderId },
      });
      if (!order || order.status === 'completed') return { received: true };

      await this.prisma.client.order.update({
        where: { id: orderId },
        data: { stripePaymentIntentId: session.payment_intent as string },
      });

      await this.finalizeOrder(
        {
          organizationId: order.organizationId,
          user: null,
          role: null,
          isSuperAdmin: false,
          requestId: `stripe_${event.id}`,
        },
        orderId,
      );
    }

    return { received: true };
  }

  async refund(ctx: TenantContext, orderId: string, amountCents?: number) {
    const order = await this.prisma.client.order.findFirst({
      where: { id: orderId, organizationId: ctx.organizationId },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (order.status !== 'completed') {
      throw new BadRequestException('Only completed orders can be refunded');
    }

    const refundAmount = amountCents ?? Number(order.totalCents);
    if (refundAmount > Number(order.totalCents)) {
      throw new BadRequestException('Refund amount exceeds order total');
    }

    if (this.stripe && order.stripePaymentIntentId) {
      await this.stripe.refunds.create({
        payment_intent: order.stripePaymentIntentId,
        amount: refundAmount,
      });
    }

    const updated = await this.prisma.client.order.update({
      where: { id: orderId },
      data: {
        status: refundAmount === Number(order.totalCents) ? 'refunded' : 'completed',
        refundAmountCents: BigInt(refundAmount),
        refundedAt: new Date(),
      },
    });

    await this.prisma.client.ticket.updateMany({
      where: { orderId },
      data: { status: 'refunded', refundedAt: new Date() },
    });

    await this.audit.record({
      ctx,
      action: 'order.refund',
      target: `Order:${orderId}`,
      meta: { amountCents: refundAmount },
    });

    return updated;
  }

  private generateTicketCode(): string {
    return `TKT-${Math.random().toString(36).slice(2, 8).toUpperCase()}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
  }

  private generateQrSecret(code: string): string {
    return `sig_${Buffer.from(code + (process.env.SUPABASE_JWT_SECRET?.slice(0, 16) ?? 'secret')).toString('base64url')}`;
  }
}
