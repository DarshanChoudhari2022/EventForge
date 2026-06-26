/**
 * Root application module — wires every feature module together.
 *
 * NestJS modules map 1:1 to bounded contexts (DB schemas). Cross-context
 * communication happens only via the typed EventBus (Postgres LISTEN/NOTIFY
 * in prod, in-process in tests).
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { configuration } from './config/configuration.js';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from './infrastructure/scheduler/schedule.module.js';
import { LoggerModule } from './infrastructure/logger/logger.module.js';
import { PrismaModule } from './infrastructure/prisma/prisma.module.js';
import { SupabaseModule } from './infrastructure/supabase/supabase.module.js';
import { EventBusModule } from './infrastructure/event-bus/event-bus.module.js';
import { CommonModule } from './common/common.module.js';
import { TraceIdInterceptor } from './common/interceptors/trace-id.interceptor.js';
import { AuthModule } from './features/auth/auth.module.js';
import { MeModule } from './features/me/me.module.js';
import { OrganizationsModule } from './features/organizations/organizations.module.js';
import { MembersModule } from './features/members/members.module.js';
import { EventsModule } from './features/events/events.module.js';
import { TicketsModule } from './features/tickets/tickets.module.js';
import { OrdersModule } from './features/orders/orders.module.js';
import { SessionsModule } from './features/sessions/sessions.module.js';
import { CheckInsModule } from './features/check-ins/check-ins.module.js';
import { PollsModule } from './features/polls/polls.module.js';
import { AnalyticsModule } from './features/analytics/analytics.module.js';
import { HealthModule } from './features/health/health.module.js';
import { MarketingModule } from './features/marketing/marketing.module.js';
import { BillingModule } from './features/billing/billing.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [configuration],
      envFilePath: ['.env', '../../.env'],
    }),
    LoggerModule,
    PrismaModule,
    SupabaseModule,
    EventBusModule,
    ScheduleModule,
    CommonModule,
    AuthModule,
    MeModule,
    OrganizationsModule,
    MembersModule,
    EventsModule,
    TicketsModule,
    OrdersModule,
    SessionsModule,
    CheckInsModule,
    PollsModule,
    AnalyticsModule,
    HealthModule,
    MarketingModule,
    BillingModule,
  ],
  providers: [{ provide: APP_INTERCEPTOR, useClass: TraceIdInterceptor }],
})
export class AppModule {}
