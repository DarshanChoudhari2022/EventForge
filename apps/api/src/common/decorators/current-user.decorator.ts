/**
 * @CurrentUser() param decorator — yields the authenticated AuthUser or null.
 */
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AUTH_USER_KEY } from '../constants.js';
import type { AuthUser } from '../request-context.js';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser | null => {
    const req = ctx.switchToHttp().getRequest();
    return (req[AUTH_USER_KEY] as AuthUser | undefined) ?? null;
  },
);
