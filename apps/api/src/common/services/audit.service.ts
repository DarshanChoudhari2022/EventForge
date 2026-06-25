/**
 * AuditService — appends to the immutable audit_log table.
 * Every mutating controller action calls .record(...) inside its transaction.
 */
import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import type { TenantContext } from '../request-context.js';

export interface AuditInput {
  ctx: Pick<TenantContext, 'organizationId' | 'user' | 'requestId'>;
  action: string; // e.g. "event.create"
  target?: string; // e.g. "Event:<uuid>"
  meta?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async record(input: AuditInput): Promise<void> {
    await this.prisma.client.auditLog.create({
      data: {
        organizationId: input.ctx.organizationId,
        actorId: input.ctx.user?.id ?? null,
        action: input.action,
        target: input.target ?? null,
        meta: {
          ...(input.meta ?? {}),
          traceId: input.ctx.requestId || undefined,
        },
      },
    });
  }
}
