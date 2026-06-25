import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import type { TenantContext } from '../../common/request-context.js';

@Injectable()
export class BillingService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getSubscription(ctx: TenantContext) {
    const sub = await this.prisma.client.subscription.findFirst({
      where: { organizationId: ctx.organizationId, status: 'active' },
      orderBy: { createdAt: 'desc' },
    });

    // Return a default free plan if none found
    if (!sub) {
      return {
        id: 'free-plan',
        organizationId: ctx.organizationId,
        plan: 'free',
        status: 'active',
        seats: 1,
        currentPeriodEndsAt: new Date(
          new Date().setFullYear(new Date().getFullYear() + 1),
        ),
      };
    }
    return sub;
  }

  async listInvoices(ctx: TenantContext) {
    return this.prisma.client.invoice.findMany({
      where: { organizationId: ctx.organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listUsage(ctx: TenantContext) {
    return this.prisma.client.usageRecord.findMany({
      where: { organizationId: ctx.organizationId },
      orderBy: { bucket: 'desc' },
      take: 100,
    });
  }
}
