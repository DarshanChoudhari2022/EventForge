import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import type { TenantContext } from '../../common/request-context.js';
import type { CreateCampaign } from '@eventforge/domain';

@Injectable()
export class MarketingService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async createCampaign(ctx: TenantContext, eventId: string, data: CreateCampaign) {
    const event = await this.prisma.client.event.findFirst({
      where: { id: eventId, organizationId: ctx.organizationId, deletedAt: null },
    });
    if (!event) throw new NotFoundException('Event not found');

    return this.prisma.client.campaign.create({
      data: {
        eventId,
        name: data.name,
        subject: data.subject as any,
        bodyHtml: data.bodyHtml,
        bodyMjml: data.bodyMjml,
        audience: data.audience as any,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
        status: data.scheduledAt ? 'scheduled' : 'draft',
      },
    });
  }

  async listCampaigns(ctx: TenantContext, eventId: string) {
    return this.prisma.client.campaign.findMany({
      where: { eventId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
