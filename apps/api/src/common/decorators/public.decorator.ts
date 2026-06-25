/**
 * @Public() — marks a route as not requiring authentication.
 * AuthGuard skips JWT verification when this metadata is set.
 */
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'eventforge.isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
