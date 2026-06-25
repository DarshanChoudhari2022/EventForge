/**
 * Symbols used to stash per-request data on the Fastify reply/request.
 */
export const TENANT_CONTEXT_KEY = Symbol('eventforge.tenantContext');
export const AUTH_USER_KEY = Symbol('eventforge.authUser');
