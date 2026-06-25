/**
 * ScheduleModule — minimal @nestjs/schedule-free cron registry.
 *
 * Keeps the dependency surface tiny; we implement just enough to support
 * hourly analytics rollups and workflow timer ticks. In prod, replace with
 * BullMQ repeatable jobs.
 */
import { Global, Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service.js';

@Global()
@Module({
  providers: [SchedulerService],
  exports: [SchedulerService],
})
export class ScheduleModule {}
