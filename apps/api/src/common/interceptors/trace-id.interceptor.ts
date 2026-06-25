/**
 * TraceIdInterceptor — copies the Fastify request id into the `x-trace-id`
 * response header so clients can correlate logs/errors.
 */
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { Observable } from 'rxjs';

@Injectable()
export class TraceIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const res = context.switchToHttp().getResponse<FastifyReply>();
    const req = context.switchToHttp().getRequest();
    const id = (req.id as string | undefined) ?? '';
    if (id) res.header('x-trace-id', id);
    return next.handle();
  }
}
