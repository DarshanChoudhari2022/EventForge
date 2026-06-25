/**
 * LoggerService — thin wrapper over pino that adds structured fields
 * (tenant, actor, traceId) and is safe to use as the NestJS app logger.
 *
 * In production, logs are JSON to stdout. In dev, pretty-printed.
 */
import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import pino, { type Logger } from 'pino';

@Injectable()
export class LoggerService implements NestLoggerService {
  private readonly logger: Logger;

  constructor() {
    const isProd = process.env.NODE_ENV === 'production';
    this.logger = pino({
      level: process.env.LOG_LEVEL ?? (isProd ? 'info' : 'debug'),
      base: { service: 'eventforge-api' },
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          '*.password',
          '*.token',
          '*.jwt',
          '*.secret',
        ],
        censor: '[REDACTED]',
      },
      transport: isProd
        ? undefined
        : {
            target: 'pino-pretty',
            options: { colorize: true, translateTime: 'HH:MM:ss' },
          },
    });
  }

  private with(context?: string): Logger {
    return context ? this.logger.child({ context }) : this.logger;
  }

  log(message: any, context?: string): void {
    this.with(context).info({ msg: String(message) });
  }
  error(message: any, trace?: string, context?: string): void {
    this.with(context).error({ msg: String(message), trace });
  }
  warn(message: any, context?: string): void {
    this.with(context).warn({ msg: String(message) });
  }
  debug(message: any, context?: string): void {
    this.with(context).debug({ msg: String(message) });
  }
  verbose(message: any, context?: string): void {
    this.with(context).trace({ msg: String(message) });
  }
  fatal(message: any, context?: string): void {
    this.with(context).fatal({ msg: String(message) });
  }

  /** Structured log with arbitrary fields. Prefer this in services. */
  child(bindings: Record<string, unknown>): Logger {
    return this.logger.child(bindings);
  }
}
