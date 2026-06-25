/**
 * @CurrentTenant() param decorator — yields the resolved TenantContext.
 *
 * Requires TenantGuard to have run. Throws 500 if used on a route that
 * forgot to mount the guard (catches a class of tenant-leak bugs in dev).
 */
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TENANT_CONTEXT_KEY } from '../constants.js';
import type { TenantContext } from '../request-context.js';

export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TenantContext => {
    const req = ctx.switchToHttp().getRequest();
    const ctxValue = req[TENANT_CONTEXT_KEY] as TenantContext | undefined;
    if (!ctxValue) {
      throw new Error(
        'TenantContext missing — did you forget @UseGuards(AuthGuard, TenantGuard)?',
      );
    }
    return ctxValue;
  },
);
