/**
 * PrismaService — wraps the singleton Prisma client and hooks lifecycle hooks
 * to disconnect on shutdown. Re-exports `prisma` from @eventforge/db so the
 * whole monorepo uses one connection pool.
 */
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { prisma, type PrismaClient } from '@eventforge/db';

@Injectable()
export class PrismaService implements OnModuleDestroy {
  private readonly logger = new Logger('Prisma');

  /** The raw client. Inject this as `PrismaService` then read `.client`. */
  readonly client: PrismaClient = prisma;

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect().catch((e) => {
      this.logger.error('Error disconnecting Prisma', e);
    });
  }
}
