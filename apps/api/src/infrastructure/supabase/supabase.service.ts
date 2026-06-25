/**
 * SupabaseService — exposes two clients:
 *   - `anon`  → subject to RLS, used for user-scoped reads (rare in API).
 *   - `admin` → service-role, bypasses RLS. The API *is* the trust boundary;
 *               RLS is the safety net. All org-scoped queries still pass
 *               organizationId through Prisma (defense in depth).
 *
 * Also offers JWT verification helpers used by AuthGuard.
 */
import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createClient,
  type SupabaseClient,
} from '@supabase/supabase-js';
import type { AllConfig } from '../../config/configuration.js';

@Injectable()
export class SupabaseService implements OnModuleInit {
  readonly anon: SupabaseClient;
  /** Service-role client — bypasses RLS. Server-side only. */
  readonly admin: SupabaseClient;
  readonly jwtSecret: string;
  readonly url: string;

  constructor(@Inject(ConfigService) private readonly config: ConfigService<AllConfig, true>) {
    this.url = this.config.getOrThrow('supabaseUrl');
    const anonKey = this.config.getOrThrow('supabaseAnonKey');
    const serviceRoleKey = this.config.getOrThrow(
      'supabaseServiceRoleKey',
    );
    this.jwtSecret = this.config.getOrThrow('supabaseJwtSecret');

    this.anon = createClient(this.url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    this.admin = createClient(this.url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  onModuleInit(): void {
    /* clients created eagerly */
  }
}
