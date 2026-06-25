import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { AuditService } from '../../common/services/audit.service.js';
import type { TenantContext } from '../../common/request-context.js';
import { hasMinRole, type OrgRole } from '../../common/request-context.js';

export interface InviteInput {
  email: string;
  role: OrgRole;
}

export interface UpdateRoleInput {
  role: OrgRole;
}

@Injectable()
export class MembersService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async list(ctx: TenantContext) {
    return this.prisma.client.organizationMember.findMany({
      where: { organizationId: ctx.organizationId },
      include: { organization: { select: { id: true, name: true } } },
    });
  }

  async invite(ctx: TenantContext, input: InviteInput) {
    this.ensureCanManage(ctx, input.role);

    const existing = await this.prisma.client.organizationMember.findFirst({
      where: { organizationId: ctx.organizationId, user: { email: input.email } },
    });
    if (existing) {
      throw new ConflictException('User is already a member of this organization');
    }

    const token = `invite_${crypto.randomUUID()}`;
    const invite = await this.prisma.client.organizationInvite.create({
      data: {
        organizationId: ctx.organizationId,
        email: input.email,
        role: input.role,
        invitedBy: ctx.user?.id ?? '',
        token,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      },
    });

    await this.audit.record({
      ctx,
      action: 'member.invite',
      target: `OrganizationInvite:${invite.id}`,
      meta: { email: input.email, role: input.role },
    });

    return invite;
  }

  async updateRole(
    ctx: TenantContext,
    memberId: string,
    input: UpdateRoleInput,
  ) {
    this.ensureCanManage(ctx, input.role);

    const member = await this.prisma.client.organizationMember.findUnique({
      where: { id: memberId },
    });
    if (!member || member.organizationId !== ctx.organizationId) {
      throw new NotFoundException('Member not found');
    }

    const updated = await this.prisma.client.organizationMember.update({
      where: { id: memberId },
      data: { role: input.role as string },
    });

    await this.audit.record({
      ctx,
      action: 'member.role_change',
      target: `OrganizationMember:${memberId}`,
      meta: { oldRole: member.role, newRole: input.role },
    });

    return updated;
  }

  async remove(ctx: TenantContext, memberId: string) {
    const member = await this.prisma.client.organizationMember.findUnique({
      where: { id: memberId },
    });
    if (!member || member.organizationId !== ctx.organizationId) {
      throw new NotFoundException('Member not found');
    }

    this.ensureCanManage(ctx, member.role as OrgRole);

    await this.prisma.client.organizationMember.delete({
      where: { id: memberId },
    });

    await this.audit.record({
      ctx,
      action: 'member.remove',
      target: `OrganizationMember:${memberId}`,
      meta: { role: member.role },
    });

    return { deleted: true };
  }

  private ensureCanManage(ctx: TenantContext, targetRole: OrgRole): void {
    const actorRole = ctx.role;
    if (!actorRole || !hasMinRole(actorRole, 'admin')) {
      throw new ForbiddenException('Only admins can manage members');
    }
    if (!hasMinRole(actorRole, targetRole)) {
      throw new ForbiddenException('Cannot assign a role higher than your own');
    }
  }
}
