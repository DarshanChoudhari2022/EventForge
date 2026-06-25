/**
 * TenantGuard — resolves the organization (tenant) for this request and
 * builds the TenantContext that downstream services read via @CurrentTenant().
 *
 * Resolution order:
 *   1. `x-org-id` header (the console always sends the active org id).
 *   2. `org` query param (used by some public endpoints).
 *   3. Derived from the resource path by the controller (handled per-route;
 *      this guard just establishes the org scope from headers).
 *
 * It also enforces that an authenticated user is a member of the org (unless
 * the route is @Public()). This is the second line of defense on top of RLS.
 */
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { AUTH_USER_KEY, TENANT_CONTEXT_KEY } from '../constants.js';
import type {
  AuthUser,
  OrgRole,
  TenantContext,
} from '../request-context.js';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<FastifyRequest>();
    const user = (req as unknown as Record<symbol, unknown>)[
      AUTH_USER_KEY
    ] as AuthUser | undefined;

    // Read tenant selection from header or query.
    const orgIdHeader = (req.headers['x-org-id'] as string | undefined) ?? '';
    const orgIdQuery = (
      (req.query as Record<string, unknown> | undefined)?.org as
        | string
        | undefined
    )?.trim();
    const orgId = (orgIdHeader || orgIdQuery || '').trim();

    const requestId = (req.id as string | undefined) ?? '';

    if (!orgId) {
      // No tenant selection. Anonymous routes can still proceed with a null
      // context; authenticated routes will fail later when a controller
      // asks for the org.
      (req as unknown as Record<symbol, unknown>)[TENANT_CONTEXT_KEY] = {
        organizationId: '',
        user: user ?? null,
        role: null,
        isSuperAdmin: false,
        requestId,
      } satisfies TenantContext;
      return true;
    }

    // Validate UUID shape cheaply before hitting the DB.
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orgId)) {
      throw new NotFoundException('Organization not found');
    }

    // If the user is authenticated, load their membership in parallel with
    // the org existence check.
    const [orgExists, membership] = await Promise.all([
      this.prisma.client.organization.findUnique({
        where: { id: orgId },
        select: { id: true, deletedAt: true },
      }),
      user
        ? this.prisma.client.organizationMember.findUnique({
            where: {
              organizationId_userId: {
                organizationId: orgId,
                userId: user.id,
              },
            },
          })
        : Promise.resolve(null),
    ]);

    if (!orgExists || orgExists.deletedAt) {
      throw new NotFoundException('Organization not found');
    }

    let role: OrgRole | null = null;
    if (membership) {
      if (membership.status !== 'active') {
        throw new ForbiddenException('Your membership is not active');
      }
      role = membership.role as OrgRole;
    } else if (user) {
      // Authenticated user with no membership in this org.
      throw new ForbiddenException(
        'You are not a member of this organization',
      );
    }

    const ctx: TenantContext = {
      organizationId: orgId,
      user: user ?? null,
      role,
      isSuperAdmin: false,
      requestId,
    };
    (req as unknown as Record<symbol, unknown>)[TENANT_CONTEXT_KEY] = ctx;
    return true;
  }
}
