/**
 * AuthGuard — verifies the Supabase JWT (HS256, signed with JWT secret) and
 * attaches the decoded user to the request.
 *
 * Supabase JWTs carry:  sub, email, role, iss, exp, iat, aud, and
 * app_metadata / user_metadata. We trust `sub` and `email`.
 *
 * Use @Public() to bypass on routes that must be anonymous (checkout success,
 * Stripe webhook, health).
 */
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Inject,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import { SupabaseService } from '../../infrastructure/supabase/supabase.service.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { AUTH_USER_KEY } from '../constants.js';
import type { AuthUser } from '../request-context.js';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(SupabaseService) private readonly supabase: SupabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const req = context.switchToHttp().getRequest<FastifyRequest>();

    const auth = req.headers.authorization;
    const token =
      typeof auth === 'string' && auth.startsWith('Bearer ')
        ? auth.slice(7)
        : undefined;

    if (isPublic) {
      // For public routes we still attach the user if a token was provided
      // (lets public event pages show personalized state when logged in).
      if (token) await this.tryAttach(req, token).catch(() => undefined);
      return true;
    }

    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }
    await this.tryAttach(req, token);
    return true;
  }

  private async tryAttach(req: FastifyRequest, token: string): Promise<void> {
    const {
      data: { user },
      error,
    } = await this.supabase.admin.auth.getUser(token);
    if (error || !user) {
      throw new UnauthorizedException('Invalid or expired token');
    }
    const email = user.email;
    if (!email) {
      throw new UnauthorizedException('Token has no email claim');
    }
    const authUser: AuthUser = {
      id: user.id,
      email,
      displayName:
        (user.user_metadata?.full_name as string | undefined) ??
        (user.user_metadata?.name as string | undefined),
    };
    (req as unknown as Record<symbol, unknown>)[AUTH_USER_KEY] = authUser;
  }
}
