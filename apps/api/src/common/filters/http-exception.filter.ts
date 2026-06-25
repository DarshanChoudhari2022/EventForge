/**
 * Global exception filter — normalizes every error to RFC 9457 problem+json.
 *
 *   {
 *     "type": "https://eventforge.app/errors/forbidden",
 *     "title": "Forbidden",
 *     "status": 403,
 *     "detail": "Your role (viewer) cannot perform event.create",
 *     "instance": "/v1/events",
 *     "traceId": "req_abc123"
 *   }
 *
 * Unknown errors are logged with the traceId and returned as a 500 with a
 * generic detail (no stack leakage).
 */
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';

interface ProblemBody {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  traceId?: string;
  errors?: Array<{ field: string; message: string }>;
}

const STATUS_TITLE: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
};

function slugFor(status: number): string {
  const title = STATUS_TITLE[status] ?? 'Error';
  return title.toLowerCase().replace(/\s+/g, '-');
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<FastifyReply>();
    const req = ctx.getRequest<FastifyRequest>();
    const traceId = (req.id as string | undefined) ?? undefined;
    const instance = req.url;
    const base: ProblemBody = {
      type: 'about:blank',
      title: 'Internal Server Error',
      status: 500,
      instance,
      traceId,
    };

    let body: ProblemBody;
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      base.status = status;
      base.title = STATUS_TITLE[status] ?? exception.name;
      base.type = `https://eventforge.app/errors/${slugFor(status)}`;
      if (typeof payload === 'string') {
        base.detail = payload;
      } else if (payload && typeof payload === 'object') {
        const p = payload as Record<string, unknown>;
        if (typeof p.message === 'string') base.detail = p.message;
        else if (Array.isArray(p.message)) {
          base.detail = 'Validation failed';
          base.errors = (p.message as string[]).map((m) => ({
            field: '_',
            message: m,
          }));
        }
        if (typeof p.detail === 'string') base.detail = p.detail;
      }
      body = base;
    } else if (exception instanceof ZodError) {
      body = {
        ...base,
        status: 400,
        title: 'Bad Request',
        type: 'https://eventforge.app/errors/bad-request',
        detail: 'Schema validation failed',
        errors: exception.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
        })),
      };
    } else if (exception instanceof Error) {
      this.logger.error(
        `Unhandled error: ${exception.message}\n${exception.stack ?? ''}`,
        traceId,
      );
      body = {
        ...base,
        detail:
          'An unexpected error occurred. Our team has been notified via trace id.',
      };
    } else {
      this.logger.error('Unhandled non-Error thrown: %j', exception, traceId);
      body = { ...base, detail: 'An unexpected error occurred.' };
    }

    if (body.status >= 500) {
      this.logger.error(`${body.title} on ${instance}`, exception, traceId);
    } else if (body.status >= 400) {
      this.logger.warn(
        `${body.status} ${body.title} on ${instance}: ${body.detail ?? ''}`,
        traceId,
      );
    }
    res.status(body.status).send(body);
  }
}
