/**
 * SchedulerService — setInterval-based cron for dev. Production uses BullMQ.
 */
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';

export interface CronJob {
  name: string;
  intervalMs: number;
  handler: () => void | Promise<void>;
}

@Injectable()
export class SchedulerService implements OnModuleDestroy {
  private readonly logger = new Logger('Scheduler');
  private readonly timers = new Map<string, NodeJS.Timeout>();

  register(job: CronJob): void {
    if (this.timers.has(job.name)) {
      this.logger.warn(`Cron job "${job.name}" already registered; replacing.`);
      clearInterval(this.timers.get(job.name)!);
    }
    const timer = setInterval(() => {
      Promise.resolve(job.handler()).catch((e) =>
        this.logger.error(`Cron "${job.name}" failed: ${(e as Error).message}`),
      );
    }, job.intervalMs);
    timer.unref?.();
    this.timers.set(job.name, timer);
    this.logger.log(`Registered cron "${job.name}" every ${job.intervalMs}ms`);
  }

  onModuleDestroy(): void {
    for (const t of this.timers.values()) clearInterval(t);
    this.timers.clear();
  }
}
