/**
 * EventForge — Prisma client singleton.
 *
 * Import this in NestJS services, Next.js API routes, and workers.
 * In dev/test, hot-reload creates extra clients — this deduplicates.
 */

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
