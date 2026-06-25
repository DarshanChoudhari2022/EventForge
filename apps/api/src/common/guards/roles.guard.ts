/**
 * RolesGuard — enforces a minimum role on routes decorated with @Roles(...).
 *
 * Uses the hierarchy in request-context.ts: if @Roles('organizer') is set,
 * owner/admin/organizer all pass, but staff/viewer get a 403.
 */
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import { TENANT_CONTEXT_KEY } from '../constants.js';
import { hasMinRole, type OrgRole } from '../request-context.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required =
      this.reflector.getAllAndOverride<OrgRole[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (required.length === 0) return true;

    const req = context.switchToHttp().getRequest<FastifyRequest>();
    const ctx = (req as unknown as Record<symbol, unknown>)[
      TENANT_CONTEXT_KEY
    ] as { role: OrgRole | null; isSuperAdmin: boolean } | undefined;

    if (ctx?.isSuperAdmin) return true;

    const role = ctx?.role ?? null;
    const ok = required.some((r) => hasMinRole(role, r));
    if (!ok) {
      throw new ForbiddenException(
        `Requires role ${required.join(' or ')} (you are: ${role ?? 'none'})`,
      );
    }
    return true;
  }
}
