/**
 * @eventforge/db — Public API.
 *
 * Re-exports the generated Prisma client, its payload/types, and the
 * singleton for convenient consumption across apps and packages.
 *
 * Import as:
 *   import { prisma, Prisma, type Event, type Order } from '@eventforge/db';
 */

export { prisma } from './client';
export { Prisma } from '@prisma/client';
export type { PrismaClient } from '@prisma/client';

// Re-export all Prisma-generated model types so services/DTOs can
// reference them without a direct @prisma/client dependency.
export type {
  Organization,
  OrganizationMember,
  OrganizationInvite,
  ApiKey,
  AuditLog,
  User,
  Subscription,
  UsageRecord,
  Invoice,
  Event,
  EventLocale,
  EventDomain,
  EventPage,
  Venue,
  Room,
  Track,
  EmailTemplate,
  Printer,
  TicketType,
  RegistrationFormField,
  Order,
  OrderItem,
  Ticket,
  PromoCode,
  WaitlistEntry,
  Session,
  Speaker,
  SessionSpeaker,
  SessionRsvp,
  Exhibitor,
  LeadCapture,
  CheckIn,
  BadgeTemplate,
  BadgePrintJob,
  AttendeeProfile,
  Meeting,
  Poll,
  PollVote,
  QaMessage,
  ChatMessage,
  GamificationLedger,
  Campaign,
  WorkflowDefinition,
  WorkflowRun,
  EmailEvent,
  EventMetricHourly,
} from '@prisma/client';
