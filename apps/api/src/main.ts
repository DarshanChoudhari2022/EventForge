/**
 * EventForge API — bootstrap entrypoint.
 *
 * Boots a NestJS 11 app on Fastify 5, mounts the global validation pipe,
 * Swagger UI at /docs, structured request logging, trace-id propagation,
 * and CORS. The whole platform is tenant-scoped: every request is
 * authenticated by a Supabase JWT and resolved to an organization by
 * TenantGuard.
 *
 * Run:  pnpm --filter @eventforge/api dev
 */

import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module.js';
import { LoggerService } from './infrastructure/logger/logger.service.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { type AllConfig } from './config/configuration.js';

async function bootstrap() {
  const adapter = new FastifyAdapter({
    trustProxy: true,
    logger: false, // we use pino-http manually
    genReqId: () =>
      `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
  });

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    adapter,
    { bufferLogs: true },
  );

  app.useLogger(app.get(LoggerService));
  app.flushLogs();

  const config = app.get(ConfigService<AllConfig, true>);
  const port = config.getOrThrow<number>('port');
  const prefix = config.get<string>('prefix', 'v1');
  app.setGlobalPrefix(prefix);

  const corsOrigins = config.get<string>('corsOrigins', 'http://localhost:3000');
  app.enableCors({
    origin: corsOrigins.split(',').map((o) => o.trim()),
    credentials: true,
  });

  app.useGlobalFilters(new HttpExceptionFilter());

  app.enableShutdownHooks();

  // OpenAPI document at /docs
  const builder = new DocumentBuilder()
    .setTitle('EventForge API')
    .setDescription(
      'Multi-tenant event management platform. All resources are scoped to the authenticated organization (tenant).',
    )
    .setVersion('0.1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'supabase-jwt',
    )
    .addTag('auth', 'Identity & session')
    .addTag('me', 'Current user profile & orgs')
    .addTag('organizations', 'Tenancy & membership')
    .addTag('members', 'Org members & invites')
    .addTag('events', 'Events & locales')
    .addTag('tickets', 'Ticket types & inventory')
    .addTag('orders', 'Registration, checkout, refunds')
    .addTag('sessions', 'Agenda sessions & RSVP')
    .addTag('checkins', 'On-site check-in & badges')
    .addTag('polls', 'Live polls & Q&A')
    .addTag('analytics', 'Rollups & dashboards')
    .build();
  const document = SwaggerModule.createDocument(app, builder);
  SwaggerModule.setup('docs', app, document);

  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(
    `🚀 EventForge API ready on http://0.0.0.0:${port}/${prefix} · docs at /docs`,
  );
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal during bootstrap', err);
  process.exit(1);
});
