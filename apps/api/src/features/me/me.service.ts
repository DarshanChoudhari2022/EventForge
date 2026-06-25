import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { SupabaseService } from '../../infrastructure/supabase/supabase.service.js';
import type { AuthUser } from '../../common/request-context.js';

@Injectable()
export class MeService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(SupabaseService) private readonly supabase: SupabaseService,
  ) {}

  async getProfile(user: AuthUser) {
    const dbUser = await this.prisma.client.user.upsert({
      where: { id: user.id },
      update: { lastSignInAt: new Date() },
      create: {
        id: user.id,
        email: user.email,
        displayName: user.displayName ?? null,
      },
    });

    const memberships = await this.prisma.client.organizationMember.findMany({
      where: { userId: user.id },
      include: { organization: true },
    });

    return {
      id: dbUser.id,
      email: dbUser.email,
      displayName: dbUser.displayName,
      avatarUrl: dbUser.avatarUrl,
      organizations: memberships.map((m) => ({
        id: m.organization.id,
        name: m.organization.name,
        slug: m.organization.slug,
        role: m.role,
        status: m.status,
        plan: m.organization.plan,
      })),
    };
  }
}
