/**
 * Pagination helpers used by every list endpoint.
 */
import type { Prisma } from '@eventforge/db';

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** Build a Prisma pagination `take/skip` from page + pageSize. */
export function toPrismaPage(
  page: number,
  pageSize: number,
): Pick<Prisma.Args<unknown, 'findMany'>, 'skip' | 'take'> {
  return { skip: (page - 1) * pageSize, take: pageSize };
}
