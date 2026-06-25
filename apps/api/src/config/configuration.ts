/**
 * Strongly-typed environment configuration.
 *
 * NestJS ConfigService is parameterized with this shape so `config.getOrThrow`
 * is type-safe. Everything sensitive comes from env; sensible dev defaults
 * are provided only for non-secrets.
 */

import { z } from 'zod';

const ConfigSchema = z.object({
  nodeEnv: z.enum(['development', 'test', 'production']).default('development'),
  port: z.coerce.number().int().positive().default(4000),
  prefix: z.string().default('v1'),

  // Supabase
  supabaseUrl: z.string().url(),
  supabaseAnonKey: z.string().min(1),
  supabaseServiceRoleKey: z.string().min(1),
  supabaseJwtSecret: z.string().min(1),

  // Database (Prisma reads DATABASE_URL directly, but keep for healthcheck)
  databaseUrl: z.string().default(''),

  // Redis
  redisUrl: z.string().optional(),

  // CORS
  corsOrigins: z.string().default('http://localhost:3000'),

  // Stripe
  stripeSecretKey: z.string().optional(),
  stripeWebhookSecret: z.string().optional(),

  // Email
  resendApiKey: z.string().optional(),
  emailFrom: z.string().default('EventForge <noreply@eventforge.app>'),

  // JWT issuer claim validation
  jwtIssuer: z.string().default('eventforge'),

  // OpenAPI
  openapiPublicBaseUrl: z
    .string()
    .default('http://localhost:4000'),
});

export type AllConfig = z.infer<typeof ConfigSchema>;

/**
 * Loader used by ConfigModule (`load: [() => configuration]`).
 * Parses process.env through the Zod schema and returns a flat object.
 */
export function configuration(): AllConfig {
  const parsed = ConfigSchema.safeParse({
    nodeEnv: process.env.NODE_ENV,
    port: process.env.PORT ?? process.env.API_PORT,
    prefix: 'v1',
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    supabaseJwtSecret: process.env.SUPABASE_JWT_SECRET,
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    corsOrigins: process.env.CORS_ORIGINS,
    stripeSecretKey: process.env.STRIPE_SECRET_KEY,
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    resendApiKey: process.env.RESEND_API_KEY,
    emailFrom: process.env.EMAIL_FROM,
    jwtIssuer: process.env.JWT_ISSUER,
    openapiPublicBaseUrl: process.env.OPENAPI_PUBLIC_BASE_URL,
  });

  if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error(
      '❌ Invalid API configuration:',
      JSON.stringify(parsed.error.flatten().fieldErrors, null, 2),
    );
    throw new Error('Invalid API configuration — see errors above.');
  }

  return parsed.data;
}

/**
 * Nested form, used internally when registering with ConfigModule.forRoot
 * under `load`. Keys map to: `config.get('api.port')`, `config.get('supabase.url')`.
 */
export function nestedConfiguration() {
  const c = configuration();
  return {
    env: c.nodeEnv,
    api: { port: c.port, prefix: c.prefix, corsOrigins: c.corsOrigins },
    supabase: {
      url: c.supabaseUrl,
      anonKey: c.supabaseAnonKey,
      serviceRoleKey: c.supabaseServiceRoleKey,
      jwtSecret: c.supabaseJwtSecret,
    },
    database: { url: c.databaseUrl },
    redis: { url: c.redisUrl },
    stripe: {
      secretKey: c.stripeSecretKey,
      webhookSecret: c.stripeWebhookSecret,
    },
    email: { from: c.emailFrom, resendApiKey: c.resendApiKey },
    jwt: { issuer: c.jwtIssuer },
    openapi: { publicBaseUrl: c.openapiPublicBaseUrl },
  };
}
