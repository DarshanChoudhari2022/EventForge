/**
 * @Roles(...) — minimum role required for a route.
 * RolesGuard compares against the TenantContext role using the rank hierarchy.
 */
import { SetMetadata } from '@nestjs/common';
import type { OrgRole } from '../request-context.js';

export const ROLES_KEY = 'eventforge.roles';
export const Roles = (...roles: OrgRole[]) => SetMetadata(ROLES_KEY, roles);
