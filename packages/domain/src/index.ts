/**
 * @eventforge/domain — Shared domain schemas & types.
 *
 * Single source of truth for request/response DTOs (Zod schemas) shared
 * between the NestJS API and the Next.js web app. These derive from the
 * Prisma schema (packages/db) but stay framework-agnostic so both sides
 * validate against the same contract.
 *
 * Convention: each resource exposes
 *   - `<Resource>Schema`      → Zod object (the wire shape)
 *   - `<Resource>`            → inferred TS type
 *   - `Create<Resource>Schema` / `Update<Resource>Schema` for mutations
 */

import { z } from 'zod';

// ─────────────────────────────────────────────────────────────
//  Primitive helpers
// ─────────────────────────────────────────────────────────────

export const uuidSchema = z.string().uuid();
export const cuidSchema = z.string().regex(/^[a-z0-9-]+$/);
export const slugSchema = z
  .string()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'lowercase kebab-case slug');
export const isoDateSchema = z.string().datetime();
export const localeSchema = z.string().min(2).max(8);
export const moneyCentsSchema = z.bigint().nonnegative();
export const emailSchema = z.string().email();

/** A localized string value (object keyed by locale code). */
export const localizedStringSchema = z.record(z.string(), z.string());

/** A localized arbitrary JSON value (content blocks, etc.). */
export const localizedJsonSchema = z.record(z.string(), z.unknown());

// ─────────────────────────────────────────────────────────────
//  IAM
// ─────────────────────────────────────────────────────────────

export const OrgRoleSchema = z.enum(['owner', 'admin', 'organizer', 'staff', 'viewer']);
export type OrgRole = z.infer<typeof OrgRoleSchema>;

export const OrganizationSchema = z.object({
  id: uuidSchema,
  name: z.string().min(1).max(120),
  slug: slugSchema,
  defaultCurrency: z.string().default('usd'),
  defaultLocale: localeSchema.default('en'),
  brand: z.unknown().nullable(),
  plan: z.string().default('free'),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
  deletedAt: isoDateSchema.nullable(),
});
export type Organization = z.infer<typeof OrganizationSchema>;

export const CreateOrganizationSchema = z.object({
  name: z.string().min(1).max(120),
  slug: slugSchema,
  defaultCurrency: z.string().default('usd'),
  defaultLocale: localeSchema.default('en'),
  brand: z.unknown().optional(),
});
export type CreateOrganization = z.infer<typeof CreateOrganizationSchema>;

export const OrganizationMemberSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  userId: uuidSchema,
  role: OrgRoleSchema,
  status: z.string(),
  joinedAt: isoDateSchema.nullable(),
});
export type OrganizationMember = z.infer<typeof OrganizationMemberSchema>;

export const InviteMemberSchema = z.object({
  email: emailSchema,
  role: OrgRoleSchema.default('viewer'),
});
export type InviteMember = z.infer<typeof InviteMemberSchema>;

export const AcceptInviteSchema = z.object({
  token: z.string().min(1),
});
export type AcceptInvite = z.infer<typeof AcceptInviteSchema>;

// ─────────────────────────────────────────────────────────────
//  Events
// ─────────────────────────────────────────────────────────────

export const EventTypeSchema = z.enum(['in_person', 'virtual', 'hybrid']);
export const EventStatusSchema = z.enum([
  'draft',
  'published',
  'live',
  'completed',
  'archived',
]);

export const EventSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  name: z.string().min(1).max(200),
  type: EventTypeSchema,
  status: EventStatusSchema,
  startsAt: isoDateSchema.nullable(),
  endsAt: isoDateSchema.nullable(),
  timezone: z.string().default('UTC'),
  currency: z.string().default('usd'),
  localeDefault: localeSchema.default('en'),
  venue: z.unknown().nullable(),
  settings: z.unknown().nullable(),
  publishedAt: isoDateSchema.nullable(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
  deletedAt: isoDateSchema.nullable(),
});
export type Event = z.infer<typeof EventSchema>;

export const CreateEventSchema = z.object({
  name: z.string().min(1).max(200),
  type: EventTypeSchema.default('in_person'),
  startsAt: isoDateSchema.nullable(),
  endsAt: isoDateSchema.nullable(),
  timezone: z.string().default('UTC'),
  currency: z.string().default('usd'),
  localeDefault: localeSchema.default('en'),
  venue: z.unknown().optional(),
  settings: z.unknown().optional(),
});
export type CreateEvent = z.infer<typeof CreateEventSchema>;

export const UpdateEventSchema = CreateEventSchema.partial();
export type UpdateEvent = z.infer<typeof UpdateEventSchema>;

export const EventLocaleSchema = z.object({
  id: uuidSchema,
  eventId: uuidSchema,
  locale: localeSchema,
  title: z.string().nullable(),
  summary: z.string().nullable(),
  content: z.unknown().nullable(),
  seo: z.unknown().nullable(),
});
export type EventLocale = z.infer<typeof EventLocaleSchema>;

export const UpsertEventLocaleSchema = z.object({
  locale: localeSchema,
  title: z.string().max(200).nullable().optional(),
  summary: z.string().max(600).nullable().optional(),
  content: z.unknown().optional(),
  seo: z.unknown().optional(),
});
export type UpsertEventLocale = z.infer<typeof UpsertEventLocaleSchema>;

// ── Website builder v1 block model ──
export const PageBlockTypeSchema = z.enum([
  'hero',
  'agenda',
  'speakers',
  'sponsors',
  'faq',
  'venue',
  'cta',
  'embed',
  'richtext',
]);

export const PageBlockSchema = z.object({
  id: z.string(),
  type: PageBlockTypeSchema,
  props: z.record(z.string(), z.unknown()).default({}),
});
export type PageBlock = z.infer<typeof PageBlockSchema>;

export const BuilderDocSchema = z.object({
  version: z.number().int().default(1),
  blocks: z.array(PageBlockSchema),
  theme: z
    .record(z.string(), z.string())
    .default({ primaryColor: '#3b82f6' }),
});
export type BuilderDoc = z.infer<typeof BuilderDocSchema>;

export const EventPageSchema = z.object({
  id: uuidSchema,
  eventId: uuidSchema,
  slug: slugSchema,
  builderDoc: BuilderDocSchema,
  publishedDoc: BuilderDocSchema.nullable(),
  version: z.number().int(),
});
export type EventPage = z.infer<typeof EventPageSchema>;

// ─────────────────────────────────────────────────────────────
//  Tickets / Orders
// ─────────────────────────────────────────────────────────────

export const TicketKindSchema = z.enum([
  'free',
  'paid',
  'donation',
  'addon',
  'group',
  'hidden',
]);

export const TicketTypeSchema = z.object({
  id: uuidSchema,
  eventId: uuidSchema,
  name: z.string(),
  kind: TicketKindSchema,
  priceCents: moneyCentsSchema,
  currency: z.string().default('usd'),
  quantityTotal: z.number().int(),
  quantitySold: z.number().int(),
  saleStartsAt: isoDateSchema.nullable(),
  saleEndsAt: isoDateSchema.nullable(),
  visibility: z.string().default('public'),
  description: z.string().nullable(),
  minPerOrder: z.number().int().default(1),
  maxPerOrder: z.number().int().default(10),
  sort: z.number().int().default(0),
});
export type TicketType = z.infer<typeof TicketTypeSchema>;

export const CreateTicketTypeSchema = z.object({
  name: z.string().min(1).max(120),
  kind: TicketKindSchema.default('paid'),
  priceCents: z.number().int().nonnegative().default(0),
  currency: z.string().default('usd'),
  quantityTotal: z.number().int().nonnegative().default(0),
  saleStartsAt: isoDateSchema.nullable().optional(),
  saleEndsAt: isoDateSchema.nullable().optional(),
  visibility: z.string().default('public'),
  description: z.string().max(2000).optional(),
  minPerOrder: z.number().int().min(1).default(1),
  maxPerOrder: z.number().int().min(1).default(10),
  sort: z.number().int().default(0),
});
export type CreateTicketType = z.infer<typeof CreateTicketTypeSchema>;

export const OrderStatusSchema = z.enum([
  'pending',
  'completed',
  'refunded',
  'cancelled',
  'failed',
]);

export const OrderItemInputSchema = z.object({
  ticketTypeId: uuidSchema,
  qty: z.number().int().min(1),
  attendeeData: z.record(z.string(), z.unknown()).optional(),
});
export type OrderItemInput = z.infer<typeof OrderItemInputSchema>;

export const CreateOrderSchema = z.object({
  eventId: uuidSchema,
  items: z.array(OrderItemInputSchema).min(1),
  promoCode: z.string().optional(),
  idempotencyKey: z.string().min(8).max(64),
  buyerEmail: emailSchema.optional(),
});
export type CreateOrder = z.infer<typeof CreateOrderSchema>;

export const OrderSchema = z.object({
  id: uuidSchema,
  eventId: uuidSchema,
  organizationId: uuidSchema,
  buyerId: uuidSchema.nullable(),
  status: OrderStatusSchema,
  subtotalCents: moneyCentsSchema,
  feesCents: moneyCentsSchema,
  taxCents: moneyCentsSchema,
  discountCents: moneyCentsSchema,
  totalCents: moneyCentsSchema,
  currency: z.string(),
  stripeCheckoutSessionId: z.string().nullable(),
  stripeClientSecret: z.string().nullable(),
  createdAt: isoDateSchema,
});
export type Order = z.infer<typeof OrderSchema>;

export const RefundOrderSchema = z.object({
  amountCents: z.number().int().nonnegative().optional(), // omit for full refund
  reason: z.string().max(500).optional(),
});
export type RefundOrder = z.infer<typeof RefundOrderSchema>;

export const TicketSchema = z.object({
  id: uuidSchema,
  code: z.string(),
  status: z.enum(['valid', 'checked_in', 'refunded', 'cancelled']),
  ticketTypeId: uuidSchema,
  attendeeData: z.unknown().nullable(),
  checkedInAt: isoDateSchema.nullable(),
  badgePrintedAt: isoDateSchema.nullable(),
});
export type Ticket = z.infer<typeof TicketSchema>;

// ─────────────────────────────────────────────────────────────
//  Agenda
// ─────────────────────────────────────────────────────────────

export const SessionTypeSchema = z.enum([
  'keynote',
  'talk',
  'workshop',
  'panel',
  'break',
  'networking',
]);

export const SessionSchema = z.object({
  id: uuidSchema,
  eventId: uuidSchema,
  trackId: uuidSchema.nullable(),
  roomId: uuidSchema.nullable(),
  title: localizedJsonSchema,
  description: localizedJsonSchema.nullable(),
  startsAt: isoDateSchema,
  endsAt: isoDateSchema,
  type: SessionTypeSchema,
  capacity: z.number().int().nullable(),
  requiresRsvp: z.boolean(),
  streamUrl: z.string().nullable(),
  streamProvider: z.string().nullable(),
  sort: z.number().int(),
});
export type Session = z.infer<typeof SessionSchema>;

export const CreateSessionSchema = z.object({
  trackId: uuidSchema.nullable().optional(),
  roomId: uuidSchema.nullable().optional(),
  title: localizedJsonSchema,
  description: localizedJsonSchema.optional(),
  startsAt: isoDateSchema,
  endsAt: isoDateSchema,
  type: SessionTypeSchema.default('talk'),
  capacity: z.number().int().nullable().optional(),
  requiresRsvp: z.boolean().default(false),
  streamUrl: z.string().url().nullable().optional(),
  streamProvider: z.string().optional(),
  sort: z.number().int().default(0),
});
export type CreateSession = z.infer<typeof CreateSessionSchema>;

export const RsvpStatusSchema = z.enum(['going', 'waitlist', 'checked_in', 'cancelled']);

export const SpeakerSchema = z.object({
  id: uuidSchema,
  eventId: uuidSchema,
  name: z.string(),
  title: z.string().nullable(),
  company: z.string().nullable(),
  bio: localizedJsonSchema.nullable(),
  photoUrl: z.string().nullable(),
  social: z.unknown().nullable(),
  status: z.string(),
});
export type Speaker = z.infer<typeof SpeakerSchema>;

// ─────────────────────────────────────────────────────────────
//  Onsite
// ─────────────────────────────────────────────────────────────

export const CheckInChannelSchema = z.enum([
  'kiosk',
  'organizer_app',
  'staff_manual',
  'walk_in',
]);
export const CheckInMethodSchema = z.enum(['qr', 'lookup', 'walk_in']);

export const CreateCheckInSchema = z.object({
  eventId: uuidSchema,
  ticketCode: z.string().optional(), // for qr / lookup
  sessionId: uuidSchema.nullable().optional(), // session-level check-in
  channel: CheckInChannelSchema.default('organizer_app'),
  method: CheckInMethodSchema.default('qr'),
  location: z.string().optional(),
  idempotencyKey: z.string().min(8).max(64),
});
export type CreateCheckIn = z.infer<typeof CreateCheckInSchema>;

export const CheckInSchema = z.object({
  id: uuidSchema,
  eventId: uuidSchema,
  ticketId: uuidSchema.nullable(),
  attendeeId: uuidSchema.nullable(),
  channel: CheckInChannelSchema,
  method: CheckInMethodSchema,
  at: isoDateSchema,
});
export type CheckIn = z.infer<typeof CheckInSchema>;

// ─────────────────────────────────────────────────────────────
//  Engage
// ─────────────────────────────────────────────────────────────

export const PollStatusSchema = z.enum(['draft', 'live', 'closed']);

export const PollSchema = z.object({
  id: uuidSchema,
  sessionId: uuidSchema,
  question: localizedJsonSchema,
  options: z.array(z.object({ id: z.string(), text: z.string() })),
  status: PollStatusSchema,
  multiSelect: z.boolean(),
});
export type Poll = z.infer<typeof PollSchema>;

export const CreatePollSchema = z.object({
  question: localizedJsonSchema,
  options: z.array(z.object({ id: z.string(), text: z.string() })).min(2),
  multiSelect: z.boolean().default(false),
});
export type CreatePoll = z.infer<typeof CreatePollSchema>;

export const CastVoteSchema = z.object({
  optionId: z.string().min(1),
});
export type CastVote = z.infer<typeof CastVoteSchema>;

export const QaMessageSchema = z.object({
  id: uuidSchema,
  sessionId: uuidSchema,
  text: z.string(),
  votes: z.number().int(),
  isAnonymous: z.boolean(),
  createdAt: isoDateSchema,
});
export type QaMessage = z.infer<typeof QaMessageSchema>;

export const CreateQaMessageSchema = z.object({
  text: z.string().min(1).max(1000),
  isAnonymous: z.boolean().default(false),
});
export type CreateQaMessage = z.infer<typeof CreateQaMessageSchema>;

// ─────────────────────────────────────────────────────────────
//  Marketing
// ─────────────────────────────────────────────────────────────

export const CampaignStatusSchema = z.enum([
  'draft',
  'scheduled',
  'sending',
  'sent',
  'cancelled',
]);

export const CampaignSchema = z.object({
  id: uuidSchema,
  eventId: uuidSchema,
  name: z.string(),
  subject: localizedJsonSchema,
  status: CampaignStatusSchema,
  scheduledAt: isoDateSchema.nullable(),
  sentAt: isoDateSchema.nullable(),
  recipientCount: z.number().int(),
  openCount: z.number().int(),
  clickCount: z.number().int(),
  bounceCount: z.number().int(),
});
export type Campaign = z.infer<typeof CampaignSchema>;

export const CreateCampaignSchema = z.object({
  name: z.string().min(1).max(200),
  subject: localizedJsonSchema,
  bodyHtml: z.string().min(1),
  bodyMjml: z.string().optional(),
  audience: z.unknown().optional(),
  scheduledAt: isoDateSchema.optional(),
});
export type CreateCampaign = z.infer<typeof CreateCampaignSchema>;

// ─────────────────────────────────────────────────────────────
//  Analytics
// ─────────────────────────────────────────────────────────────

export const EventMetricsSchema = z.object({
  eventId: uuidSchema,
  registrations: z.number().int(),
  revenueCents: moneyCentsSchema,
  checkIns: z.number().int(),
  cancellations: z.number().int(),
  refundsCents: moneyCentsSchema,
  pageViews: z.number().int(),
  series: z.array(
    z.object({
      bucket: isoDateSchema,
      registrations: z.number().int(),
      revenueCents: moneyCentsSchema,
      checkIns: z.number().int(),
    }),
  ),
});
export type EventMetrics = z.infer<typeof EventMetricsSchema>;

// ─────────────────────────────────────────────────────────────
//  Billing
// ─────────────────────────────────────────────────────────────

export const SubscriptionStatusSchema = z.enum([
  'active',
  'past_due',
  'canceled',
  'trialing',
]);

export const SubscriptionSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  plan: z.string(),
  status: SubscriptionStatusSchema,
  seats: z.number().int(),
  currentPeriodEndsAt: isoDateSchema,
});
export type Subscription = z.infer<typeof SubscriptionSchema>;

export const InvoiceStatusSchema = z.enum([
  'draft',
  'open',
  'paid',
  'void',
  'uncollectible',
]);

export const InvoiceSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  totalCents: moneyCentsSchema,
  status: InvoiceStatusSchema,
  pdfUrl: z.string().url().nullable(),
  createdAt: isoDateSchema,
});
export type Invoice = z.infer<typeof InvoiceSchema>;

export const UsageRecordSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  metric: z.string(),
  quantity: z.number().int(),
  bucket: isoDateSchema,
});
export type UsageRecord = z.infer<typeof UsageRecordSchema>;

// ─────────────────────────────────────────────────────────────
//  Pagination
// ─────────────────────────────────────────────────────────────

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

export function paginated<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    items: z.array(item),
    total: z.number().int(),
    page: z.number().int(),
    pageSize: z.number().int(),
  });
}

// ─────────────────────────────────────────────────────────────
//  Error envelope (RFC 9457 application/problem+json)
// ─────────────────────────────────────────────────────────────

export const ProblemDetailsSchema = z.object({
  type: z.string().default('about:blank'),
  title: z.string(),
  status: z.number().int(),
  detail: z.string().optional(),
  instance: z.string().optional(),
  traceId: z.string().optional(),
  errors: z
    .array(z.object({ field: z.string(), message: z.string() }))
    .optional(),
});
export type ProblemDetails = z.infer<typeof ProblemDetailsSchema>;
