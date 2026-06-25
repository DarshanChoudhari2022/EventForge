import {
  Injectable,
  Inject,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { AuditService } from '../../common/services/audit.service.js';
import type { TenantContext, AuthUser } from '../../common/request-context.js';
import type { Organization as OrganizationType } from '@eventforge/domain';

export interface CreateOrganizationInput {
  name: string;
  slug: string;
  defaultCurrency?: string;
  defaultLocale?: string;
}

@Injectable()
export class OrganizationsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async create(
    user: AuthUser,
    input: CreateOrganizationInput,
    requestId: string,
  ): Promise<OrganizationType> {
    const existing = await this.prisma.client.organization.findUnique({
      where: { slug: input.slug },
    });
    if (existing) {
      throw new ConflictException('Organization slug already taken');
    }

    const org = await this.prisma.client.organization.create({
      data: {
        name: input.name,
        slug: input.slug,
        defaultCurrency: input.defaultCurrency ?? 'usd',
        defaultLocale: input.defaultLocale ?? 'en',
        members: {
          create: {
            userId: user.id,
            role: 'owner',
            status: 'active',
            joinedAt: new Date(),
          },
        },
        subscriptions: {
          create: {
            plan: 'free',
            status: 'active',
            currentPeriodEndsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
            seats: 1,
          },
        },
      },
    });

    await this.audit.record({
      ctx: { organizationId: org.id, user, requestId },
      action: 'organization.create',
      target: `Organization:${org.id}`,
      meta: { slug: org.slug },
    });

    return org as unknown as OrganizationType;
  }

  async findById(id: string): Promise<OrganizationType> {
    const org = await this.prisma.client.organization.findUnique({
      where: { id },
    });
    if (!org || org.deletedAt) {
      throw new NotFoundException('Organization not found');
    }
    return org as unknown as OrganizationType;
  }

  async update(
    ctx: TenantContext,
    id: string,
    input: Partial<CreateOrganizationInput>,
  ): Promise<OrganizationType> {
    this.ensureSameOrg(ctx, id);
    const org = await this.prisma.client.organization.update({
      where: { id },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.slug && { slug: input.slug }),
        ...(input.defaultCurrency && { defaultCurrency: input.defaultCurrency }),
        ...(input.defaultLocale && { defaultLocale: input.defaultLocale }),
      },
    });

    await this.audit.record({
      ctx,
      action: 'organization.update',
      target: `Organization:${id}`,
      meta: input,
    });

    return org as unknown as OrganizationType;
  }

  private ensureSameOrg(ctx: TenantContext, orgId: string): void {
    if (ctx.organizationId !== orgId) {
      throw new NotFoundException('Organization not found');
    }
  }
}
