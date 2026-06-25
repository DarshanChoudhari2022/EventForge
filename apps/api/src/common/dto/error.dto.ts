/**
 * Idempotency-key helper — used by orders, check-ins, refunds.
 * Stored as a unique column to make retries safe.
 */
import { createHash, randomBytes } from 'node:crypto';

export function generateIdempotencyKey(prefix = 'ef'): string {
  const rand = randomBytes(16).toString('hex');
  return `${prefix}_${rand}`;
}

/** Stable hash for things like API-key hashing. */
export function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

/** Human+scan friendly ticket code: EF-AB12CD-34 (8 base62 chars + check). */
export function generateTicketCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars
  const bytes = randomBytes(8);
  let out = '';
  for (let i = 0; i < 8; i++) {
    out += alphabet[bytes[i]! % alphabet.length];
  }
  return `EF-${out.slice(0, 4)}${out.slice(4)}`;
}

/** HMAC-based QR secret — verified at check-in without a DB round-trip. */
export function generateQrSecret(secret: string, ticketId: string): string {
  return createHash('sha256')
    .update(`${secret}:${ticketId}`)
    .update(randomBytes(8))
    .digest('hex');
}

/** Deterministic HMAC over a payload — for verifying a scanned QR offline. */
export function signTicket(
  signingSecret: string,
  ticketId: string,
  code: string,
): string {
  return createHash('sha256')
    .update(signingSecret)
    .update(':')
    .update(ticketId)
    .update(':')
    .update(code)
    .digest('hex');
}
