/**
 * EventBusService — typed in-process pub/sub for cross-module events
 * (e.g. orders emits `order.completed`, marketing listens to fire workflows).
 *
 * In production this is backed by Redis Streams (so workers also receive).
 * The interface here is intentionally simple and Redis-agnostic so unit
 * tests don't need a broker.
 */
import { Injectable, Logger } from '@nestjs/common';

export type DomainEventName =
  | 'organization.created'
  | 'member.invited'
  | 'member.role_changed'
  | 'event.created'
  | 'event.published'
  | 'event.unpublished'
  | 'ticket_type.created'
  | 'order.created'
  | 'order.completed'
  | 'order.refunded'
  | 'ticket.issued'
  | 'check_in.created'
  | 'session.rsvp'
  | 'poll.vote';

export interface DomainEvent<T = unknown> {
  name: DomainEventName;
  tenantId: string;
  payload: T;
  occurredAt: string;
  traceId?: string;
}

type Handler<T> = (event: DomainEvent<T>) => void | Promise<void>;

@Injectable()
export class EventBusService {
  private readonly logger = new Logger('EventBus');
  private readonly handlers = new Map<DomainEventName, Set<Handler<unknown>>>();

  on<T>(name: DomainEventName, handler: Handler<T>): () => void {
    let set = this.handlers.get(name);
    if (!set) {
      set = new Set();
      this.handlers.set(name, set);
    }
    set.add(handler as Handler<unknown>);
    return () => set!.delete(handler as Handler<unknown>);
  }

  async emit<T>(event: DomainEvent<T>): Promise<void> {
    const set = this.handlers.get(event.name);
    if (!set || set.size === 0) return;
    await Promise.all(
      [...set].map(async (h) => {
        try {
          await h(event);
        } catch (err) {
          this.logger.error(
            `Handler for ${event.name} failed: ${(err as Error).message}`,
          );
        }
      }),
    );
  }
}
