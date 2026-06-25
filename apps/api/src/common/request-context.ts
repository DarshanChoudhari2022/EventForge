/**
 * Per-request context — the resolved tenant + actor.
 *
 * Populated by AuthGuard (from the JWT) and TenantGuard (from the org header
 * or path). Services read it via `@CurrentTenant()` / `@CurrentUser()` param
 * decorators. Never trust raw request headers downstream.
 */

export interface AuthUser {
  id: string;
  email: string;
  /** Display name from Supabase user_metadata, if present. */
  displayName?: string;
}

export interface TenantContext {
  /** The organization id this request operates on. */
  organizationId: string;
  /** The acting user, if authenticated (anonymous for public endpoints). */
  user: AuthUser | null;
  /** The user's role within this org, if a member. */
  role: OrgRole | null;
  /** Whether the acting user is a platform super-admin. */
  isSuperAdmin: boolean;
  /** NestJS request id (for log correlation). */
  requestId: string;
}

export type OrgRole = 'owner' | 'admin' | 'organizer' | 'staff' | 'viewer';

export const ORG_ROLES: readonly OrgRole[] = [
  'owner',
  'admin',
  'organizer',
  'staff',
  'viewer',
] as const;

/** Role hierarchy rank — higher beats lower. Used by RolesGuard. */
export const ROLE_RANK: Record<OrgRole, number> = {
  owner: 5,
  admin: 4,
  organizer: 3,
  staff: 2,
  viewer: 1,
};

/** Returns true if `actual` satisfies `required` (>= in the hierarchy). */
export function hasMinRole(actual: OrgRole | null, required: OrgRole): boolean {
  if (!actual) return false;
  return ROLE_RANK[actual] >= ROLE_RANK[required];
}
