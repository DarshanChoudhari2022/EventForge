# Design Document
## EventForge — Zoho Backstage / Events Clone

> **Version:** 1.0 · **Date:** 2026-06-25 · **Companion to:** `01-PRD.md`

---

## 1. System Overview

EventForge is a multi-tenant SaaS platform delivered as **four independently deployable surfaces**
over a shared Supabase data plane:

```
                         ┌──────────────────────────────────────────────┐
   Public web ─────────▶ │  Next.js 15 (App Router)                      │
   (marketing, event     │  • Landing/console BFF                        │──┐
   sites, attendee PWA)  │  • Server components, ISR, edge cache         │  │
                         └──────────────────────────────────────────────┘  │
                                                                          │ JWT (RS256)
                         ┌──────────────────────────────────────────────┐  │ + Supabase
   Admin console ──────▶ │  Next.js console (same app, /console route)   │  │ access token
                         └──────────────────────────────────────────────┘  │
                                                                          │
   Mobile (Expo) ───────▶┐                                                │
   Kiosk (PWA, tablet)   ├─── all talk REST/JSON + Realtime WebSocket ───▶│
   Organizer app (Expo) ─┘                                                │
                                                                          ▼
                         ┌──────────────────────────────────────────────┐
                         │  NestJS 11 Core API  (REST + tRPC-like DTOs)  │
                         │  • Modules = bounded contexts                 │
                         │  • CQRS-lite (command/query buses)            │
                         │  • BullMQ workers (email, badges, exports)    │
                         │  • Webhooks out, integrations in              │
                         └───────────────┬──────────────────────────────┘
                                         │  Prisma (with Supabase driver)
                                         ▼
                         ┌──────────────────────────────────────────────┐
                         │  Supabase  (managed cloud)                    │
                         │  Postgres 16  ·  Auth  ·  Realtime (pg-broadcast) │
                         │  Storage  ·  Edge Functions (hot RPC)  ·  RLS │
                         └──────────────────────────────────────────────┘
                                         │
   Stripe · Resend · Zoom/Tencent · Redis (Upstash) · S3-compatible · OTel
```

### Design principles
1. **Bounded contexts = NestJS modules = Postgres schemas.** One-to-one mapping keeps cognitive load low.
2. **Stateless API + idempotency keys** on every write that isn't idempotent by nature (payments, check-in).
3. **Supabase owns state; NestJS owns logic.** Never put business rules in Postgres; only authorization + hot set operations.
4. **Realtime via Postgres LISTEN/NOTIFY** through Supabase Realtime — no second source of truth.
5. **Convention over configuration** (NestCLI modules, Zod-dto, Prisma schema-first).

---

## 2. High-Level Architecture (C4 — Container Level)

| Container | Tech | Responsibility | Scaling |
|---|---|---|---|
| **Web (marketing + event sites + console)** | Next.js 15 (App Router), React 19, TS, Tailwind, shadcn/ui | SSR/ISR rendering, BFF for console, SEO for public sites | Vercel (autoscale) |
| **Core API** | NestJS 11, Fastify adapter, Zod, Prisma | Domain logic, REST + OpenAPI, authz, orchestration | Fly.io / ECS Fargate (HPA) |
| **Workers** | NestJS + BullMQ on Redis (Upstash) | Email sends, badge rendering, PDF/wallet generation, exports, reminders, webhook fan-out | Separate process group |
| **Mobile/Kiosk/Organizer** | Expo (React Native) + PWA for kiosk | Field use, scanning, self check-in | Static distribution |
| **Data plane** | Supabase Postgres 16 | System of record | Read replicas + PgBouncer pool |
| **Cache / queue** | Upstash Redis | BullMQ, rate-limit, hot lookups | Managed |
| **Object storage** | Supabase Storage (S3) | Assets, uploads, badge PDFs, exports | Managed |
| **Edge functions** | Supabase Edge (Deno) | Webhook verifiers, Stripe signature check, geo routing | Managed |
| **Observability** | OpenTelemetry → Grafana Cloud / Datadog | Traces, metrics, logs | SaaS |
| **Search** (optional) | Meilisearch / Postgres FTS | Speaker/attendee/session search | Add-on |

---

## 3. Technology Stack (definitive)

### 3.1 Frontend
| Concern | Choice | Why |
|---|---|---|
| Framework | **Next.js 15** (App Router) | SSR/ISR for SEO-critical event sites, RSC for console perf |
| UI | React 19, TypeScript 5.x | Industry standard, talent availability |
| Styling | Tailwind CSS 4 + shadcn/ui + Radix | Fast, accessible, consistent |
| State/data | TanStack Query v5 + Zustand | Server cache + lightweight client state |
| Forms | React Hook Form + Zod | Type-safe forms matching DTOs |
| i18n | next-intl | Multi-language event sites + console |
| Rich content | Tiptap (event page builder, emails) | Collaborative, extensible |
| Charts | Recharts / Visx | Analytics dashboards |
| PWA | next-pwa + Serwist | Installable attendee/kiosk app |
| Testing | Vitest, Playwright, Testing Library | Unit/E2E |

### 3.2 Backend
| Concern | Choice | Why |
|---|---|---|
| Framework | **NestJS 11** + Fastify | ~70% faster than Next API routes for API work; DI; modular |
| Validation | Zod + `nestjs-zod` | Shared DTOs with frontend (monorepo) |
| ORM | **Prisma 5** (Supabase dialect) | Schema-first, type-safe, migrations |
| Queue/jobs | BullMQ + `@nestjs/bullmq` | Email, badges, exports, reminders |
| Auth | `@nestjs/passport` + Supabase JWT verification | RS256, JWKS caching |
| Docs | `@nestjs/swagger` + OpenAPI 3.1 | Auto client SDK generation |
| Rate limit | `@nestjs/throttler` + Redis store | Per-tenant quotas |
| PDF | `@react-pdf/renderer` / Puppeteer cluster | Tickets, badges, invoices |
| Testing | Jest, supertest, Testcontainers (Postgres) | Module/E2E |

### 3.3 Cloud / Data
| Concern | Choice | Why |
|---|---|--- tenants isolated via RLS; Auth/Realtime/Storage built in |
| Auth | Supabase Auth (GoTrue) | Email, magic link, OAuth, SAML add-on |
| Realtime | Supabase Realtime (Postgres changes) | Polls, chat, check-in counts — no extra infra |
| Storage | Supabase Storage | S3-compatible, signed URLs, transforms |
| Cache/queue | Upstash Redis | Serverless Redis, global |
| Payments | Stripe (Stripe Checkout + PaymentIntent) | PCI scope minimized |
| Email | Resend (+ Postmark fallback) | Deliverability + DX |
| Video | Zoom OAuth API + Vimeo Live | Virtual/hybrid sessions |
| Hosting — FE | Vercel | Edge + ISR |
| Hosting — API | Fly.io (multi-region) or AWS ECS Fargate | Horizontal scale, multi-region |
| CI/CD | GitHub Actions + Turborepo | Monorepo pipeline caching |
| IaC | Terraform (Supabase, Cloudflare, DNS) | Reproducible infra |

---

## 4. Multi-Tenancy Model

**Strategy: shared DB + shared schema + Row-Level Security (RLS), tenant = Organization.**

- Every domain table has `organization_id uuid NOT NULL REFERENCES organizations(id)`.
- JWT issued by Supabase Auth contains a custom claim `org_id` + `org_role` (set via a trigger on
  `auth.users` → `organization_members`).
- RLS policies compare `auth.jwt() ->> 'org_id'` to `organization_id`.
- Super-admins get a `is_platform_admin` claim bypassing RLS via a separate policy set.
- Cross-tenant queries are physically impossible at the DB layer — verified by an automated
  test suite that tries every endpoint with two tenants.

```sql
-- Example RLS policy (illustrative)
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY org_isolation ON events
  FOR ALL
  USING (organization_id = (auth.jwt() ->> 'org_id')::uuid)
  WITH CHECK (organization_id = (auth.jwt() ->> 'org_id')::uuid);
```

**Tenant context flow:** Supabase JWT → NestJS `TenantGuard` → request-scoped DI → Prisma extends
every query with `organization_id`. Belts-and-suspenders: RLS is the hard boundary.

---

## 5. Database Schema (core, simplified)

Schemas map 1:1 to NestJS modules. UUID PKs everywhere; `created_at/updated_at` via triggers; soft
delete with `deleted_at` where relevant.

### 5.1 `iam` schema
```sql
-- users live in auth.users (Supabase)
organizations(
  id uuid pk, name text, slug text unique, default_currency text,
  default_locale text, brand jsonb, billing_customer_id text,
  plan text, created_at timestamptz, deleted_at timestamptz)
organization_members(
  id uuid pk, organization_id uuid fk, user_id uuid fk auth.users,
  role text check (role in ('owner','admin','organizer','staff','viewer')),
  status text, invited_at timestamptz, joined_at timestamptz)
organization_invites(...) api_keys(...) audit_log(id, org_id, actor_id, action, target, meta jsonb, at)
```

### 5.2 `events` schema
```sql
events(
  id uuid pk, organization_id uuid fk, name text, type text check(.. in('in_person','virtual','hybrid')),
  status text check(.. in('draft','published','live','completed','archived')),
  starts_at timestamptz, ends_at timestamptz, timezone text,
  currency text, locale_default text, parent_event_id uuid null,   -- recurring
  venue jsonb, settings jsonb, deleted_at timestamptz)
event_locales(event_id, locale, title, summary, content jsonb, seo jsonb)     -- i18n
event_domains(id, event_id, domain text unique, ssl_status text)              -- custom domain
event_pages(id, event_id, slug, builder_doc jsonb, published_doc jsonb, version int)
venues(id, event_id, name, address jsonb, capacity int)
rooms(id, venue_id, name, capacity int, virtual_url text null)
tracks(id, event_id, name, color text, sort int)
```

### 5.3 `tickets` schema
```sql
ticket_types(
  id uuid pk, event_id uuid fk, name text, kind text check(.. in('free','paid','donation','addon','group','hidden')),
  price_cents bigint, currency text, quantity_total int, quantity_sold int,
  sale_starts_at timestamptz, sale_ends_at timestamptz, visibility text, sort int)
registration_form_fields(
  id uuid pk, ticket_type_id uuid fk, label jsonb, type text, required bool,
  options jsonb, conditional jsonb, sort int)
orders(
  id uuid pk, organization_id uuid fk, event_id uuid fk, buyer_id uuid fk auth.users,
  status text check(.. in('pending','completed','refunded','cancelled')),
  subtotal_cents bigint, fees_cents bigint, tax_cents bigint, total_cents bigint,
  currency text, promo_code_id uuid null, idempotency_key text, created_at)
order_items(id uuid pk, order_id, ticket_type_id, qty int, unit_price_cents bigint, attendee_id uuid null)
tickets(id uuid pk, order_item_id, ticket_type_id, attendee_id, status text,
        code text unique,   -- human+scan-friendly
        qr_secret text,     -- HMAC for QR verification
        checked_in_at timestamptz null, checked_in_by uuid null,
        badge_printed_at timestamptz null, refunded_at timestamptz null)
promo_codes(id, event_id, code text, kind text, value numeric, max_uses int, uses int,
            valid_from, valid_to, ticket_type_ids uuid[])
waitlist_entries(id, event_id, ticket_type_id, attendee_id, position int, promoted_at)
```

### 5.4 `agenda` schema
```sql
sessions(
  id uuid pk, event_id, track_id null, room_id null, title jsonb, description jsonb,
  starts_at timestamptz, ends_at timestamptz, type text, capacity int null,
  requires_rsvp bool, stream_url text null, stream_provider text null, sort int)
session_speakers(session_id, speaker_id, role text)
session_rsvps(session_id, attendee_id, status text, checked_in_at timestamptz null)
speakers(id, event_id, name, title, bio jsonb, photo_url, social jsonb, user_id uuid null)
```

### 5.5 `onsite` schema
```sql
check_ins(
  id uuid pk, event_id, ticket_id null, attendee_id null, channel text
    check(.. in('kiosk','organizer_app','staff_manual','walk_in')),
  method text check(.. in('qr','lookup','walk_in')), location text, at timestamptz,
  staff_id uuid null, UNIQUE(ticket_id))      -- one check-in per ticket
badge_templates(id, event_id, name, layout jsonb, paper_size text)
badge_print_jobs(id, event_id, ticket_id, template_id, status text, printer_id, payload jsonb, at)
printers(id, organization_id, name, driver text check(.. in('escpos','zpl','pdf')), connection jsonb)
```

### 5.6 `engage` schema
```sql
attendee_profiles(id, event_id, user_id, display_name, photo_url, interests text[], visibility text)
meetings(id, event_id, a_attendee_id, b_attendee_id, slot timestamptz, status text, room_url text)
polls(id, session_id, question jsonb, options jsonb, status text)
poll_votes(id, poll_id, attendee_id, option_id, at)
qa_messages(id, session_id, attendee_id, text, status text, votes int, at)
chat_messages(id, channel_id, attendee_id, text, at)   -- broadcast over Realtime
gamification_ledger(id, event_id, attendee_id, points int, reason text, at)
```

### 5.7 `marketing` schema
```sql
campaigns(id, event_id, name, subject jsonb, body_html text, audience jsonb, status text)
workflow_definitions(id, event_id, trigger jsonb, steps jsonb, status text)
workflow_runs(id, definition_id, attendee_id, current_step int, state jsonb, status text)
email_events(id, message_id, event text, at, meta jsonb)   -- delivered/open/click/bounce
templates(id, organization_id, name, mjml text, variables jsonb)
```

### 5.8 `analytics` schema
```sql
event_metrics_hourly(event_id, hour_bucket, registrations int, revenue_cents bigint, check_ins int, …)
-- materialized/rollup table refreshed by cron + Realtime increment
audit_log(…)  -- see iam
```

### 5.9 `billing` schema
```sql
subscriptions(id, organization_id, plan text, status text, seats int, current_period_ends_at)
usage_records(id, organization_id, metric text, qty int, bucket timestamptz)
invoices(id, organization_id, stripe_invoice_id, total_cents, status, pdf_url)
```

### 5.10 Indexing & performance highlights
- Composite `(organization_id, event_id)` on hot tables; BRIN on time series.
- `tickets.qr_secret` hashed index for scan lookup.
- Partition `email_events`, `chat_messages`, `audit_log` by month for scale.
- Read replicas for analytics dashboards (Supabase pooled replica DSN).

---

## 6. API Design

### 6.1 Style
- **REST/JSON** as the default (predictable, cacheable, well-tooled).
- **OpenAPI 3.1** auto-generated from Zod DTOs; SDK emitted to `packages/api-sdk` (typed client).
- Versioned: `/v1/...`. Deprecation via header + 2-version sunset window.
- Idempotency: `Idempotency-Key` header required on POSTs that pay or check in.
- Errors: RFC 9457 `application/problem+json`.

### 6.2 Resource map (excerpt)
```
POST   /v1/events
GET    /v1/events/{id}
POST   /v1/events/{id}/publish
GET    /v1/events/{id}/registration-form
POST   /v1/orders                  (idempotent: checkout)
POST   /v1/orders/{id}/refund
GET    /v1/tickets/{code}          (scan lookup, by staff)
POST   /v1/events/{id}/check-ins   (idempotent)
POST   /v1/sessions/{id}/rsvp
GET    /v1/events/{id}/agenda
POST   /v1/badge-templates/{id}/print-jobs
GET    /v1/analytics/events/{id}/realtime
POST   /v1/webhooks/out            (tenant-configured)
```

### 6.3 AuthN/Z
- **AuthN:** Supabase JWT (RS256). API verifies via cached JWKS fetch.
- **AuthZ layers:**
  1. **Tenant** — org_id from JWT → RLS (hard boundary).
  2. **Role** — NestJS `RolesGuard` (owner/admin/organizer/staff/viewer).
  3. **Resource** — policies (e.g., staff can check in but not refund).
- Public, anonymous endpoints (event-site registration) use a **per-event signed capability**
  (`event:publish:read`) — no JWT, scoped to that event only.

### 6.4 Example: check-in flow
```
1. Scanner (organizer app) reads QR → GET /v1/tickets/{code} (signed capability)
2. API: verify ticket belongs to event, not refunded, not checked-in
3. INSERT check_ins (UNIQUE on ticket_id) → 200 OK with attendee + badge data
4. Postgres trigger → Realtime broadcast "check_in" → dashboards update live
5. If badge auto-print on: enqueue BullMQ badge job → printer queue
```

---

## 7. Realtime Design

- **Source of truth:** Postgres. **Transport:** Supabase Realtime (Postgres Changes + Broadcast).
- Channels are **per-event, policy-gated**: `eq(event_id, …)` + RLS ensures a tenant only sees its own.
- **Patterns:**
  - Check-in counts, session attendance → broadcast on INSERT to `check_ins`.
  - Live polls → broadcast on `poll_votes`.
  - Q&A/chat → broadcast inserts on `qa_messages` / `chat_messages`.
- **Back-pressure:** client subscribes to a *rollup topic* (1 Hz) for counts, full stream only for
  chat. For >1k concurrent, switch chat to a Redis Pub/Sub fan-out worker.

---

## 8. Event Website Builder

- **Model:** each `event_page` stores a Tiptap/Lexical **JSON document** (blocks: hero, schedule,
  speakers, sponsors, FAQ, CTA, embed). `published_doc` is the immutable published snapshot.
- **Rendering:** Next.js ISR page at `/e/[slug]/*`; versioned by `updated_at`; revalidate on publish.
- **Custom domains:** wildcard TLS via Cloudflare/Sni; `event_domains` table maps host → event.
- **i18n:** one builder doc **per locale**; URL strategy `/e/{slug}/{locale}/...`.
- **Theming:** per-event CSS variables + brand kit; custom CSS allowed for Pro plans.

---

## 9. Check-in & Badge Printing

- **Kiosk** = installable PWA (offline-first via service worker), full-screen, device-locked.
- **QR** carries ticket code + HMAC (qr_secret); scanner computes HMAC to reject fakes offline.
- **Print pipeline:**
  - Renderer (worker) turns `badge_template.layout` + attendee → PDF/PNG via `@react-pdf/renderer`.
  - **Print queue** (BullMQ) routes to a registered printer; drivers: ESC/POS (thermal) and ZPL (Zebra).
  - For browser printing: a small **Print Bridge** agent (Electron/PWA) on the kiosk exposes a local
    WebSocket the API pushes jobs to — no network printer required.
- **Session check-in:** same pipeline, keyed on `session_rsvps`, with capacity enforcement (atomic
  `UPDATE … WHERE count < capacity`).

---

## 10. Payments

- Stripe **PaymentIntent** flow; checkout via Stripe-hosted or embedded Payment Element.
- **3-D Secure / SCA** mandatory for EU cards (Stripe handles routing).
- **Webhook:** Supabase Edge Function verifies signature → enqueues `payment.succeeded` job →
  idempotent order finalization (writes tickets, fires emails, broadcasts Realtime).
- **Tax:** Stripe Tax initially; own tax engine in v1.2.
- **Refunds:** partial/full via Dashboard → `POST /v1/orders/{id}/refund` → Stripe refund →
  ticket status flip + email.

---

## 11. Email Marketing & Workflows

- **Provider:** Resend (primary) with Postmark fallback; per-tenant verified sending domain.
- **Transactional vs marketing** split: transactional via API directly; marketing through campaign queue.
- **Workflows** = declarative JSON (trigger + steps). Runtime: a NestJS service subscribed to domain
  events via Redis Streams; steps enqueue BullMQ jobs with delay/branch logic.
- **Deliverability:** DKIM/SPF/DMARC enforced at onboarding; suppression list per tenant; bounce →
  auto-suppress.
- **Compliance:** one-click unsubscribe (RFC 8058), geographic consent fields, audit-tracked sends.

---

## 12. Security

| Area | Control |
|---|---|
| AuthN | Supabase JWT (RS256), short-lived access + rotating refresh; MFA for staff |
| AuthZ | RLS (tenant) + RBAC (role) + ABAC (resource policies); deny-by-default |
| Secrets | Doppler/AWS Secrets Manager; never in repo; rotated |
| Transport | TLS 1.2+ everywhere; HSTS; mTLS on internal services (prod) |
| Input | Zod validation at controller boundary; parameterized queries (Prisma) |
| Output | CSP, COOP/COEP, X-Content-Type-Options; signed URLs for storage |
| Rate limit | Per-IP + per-tenant token bucket in Redis |
| Secrets/PII | Field-level encryption for sensitive PII (passport, etc.); pseudonymized analytics |
| Auditing | Append-only `audit_log`; immutable for 12 months |
| Dependency security | Dependabot + Snyk; SBOM; `pnpm audit` in CI |
| App sec testing | SAST (Semgrep), DAST (ZAP) in CI; annual pentest |
| Incident | Runbooks; on-call; breach-notification playbook (GDPR 72h) |

---

## 13. Observability

- **Tracing:** OpenTelemetry SDK in NestJS + Next.js → OTLP collector → Grafana Cloud/Datadog.
  Trace context propagated through BullMQ jobs and Realtime.
- **Metrics:** RED (rate/error/duration) per route; business metrics (registrations/min, check-ins/min).
- **Logs:** structured JSON (pino), tenant + request id correlation.
- **SLOs:** p95 read < 300 ms, p95 check-in < 500 ms, 99.9% uptime; error budget policy.
- **Alerting:** burn-rate alerts; PagerDuty integration.

---

## 14. Testing Strategy

| Layer | Tool | Coverage gate |
|---|---|---|
| Unit | Vitest (FE) / Jest (BE) | ≥80% on core modules |
| Integration | Testcontainers + real Postgres | All repositories, RLS tests |
| Contract | OpenAPI schema tests; Pact for integrations | 100% public endpoints |
| E2E | Playwright (web), Detox (mobile) | Critical journeys |
| Load | k6 | 10k concurrent check-in test pre-release |
| Security | ZAP baseline, Semgrep, dependency scan | Zero high+ in CI |
| Tenant isolation | Custom harness: dual-tenant, cross-access probes | 100% endpoints |

---

## 15. Deployment & Environments

| Env | Purpose | Data |
|---|---|---|
| `local` | Dev | Docker compose (Postgres, Redis, minio) + Supabase CLI |
| `preview` | Per-PR ephemeral | Seeded; ephemeral Supabase branch |
| `staging` | Release candidate | Prod-like, anonymized data |
| `prod` | Live | Multi-region; blue-green for API |

- **CI:** GitHub Actions → Turborepo cache → build/test/scan → preview deploy → e2e → manual approval → prod.
- **DB migrations:** Prisma migrate, reviewed in PR; expand/contract pattern; never destructive in-place.
- **Backups:** Supabase daily + PITR; quarterly restore drill.

---

## 16. Scalability Plan

- Stateless NestJS behind a load balancer; HPA on CPU + custom (requests/sec).
- PgBouncer transaction pooling; Supabone read replicas for analytics.
- Hot path (scan lookup) served from Postgres index + optional Redis cache with short TTL.
- Queue everything slow (email, PDF, exports, webhooks) → workers scale independently.
- Realtime sharding plan beyond 10k/event: Redis Pub/Sub worker + regional Supabase projects.

---

## 17. Open Questions (for product/eng review)

1. Build vs buy for matchmaking (engine vs Algorithmia-style vendor)?
2. Badge-printer hardware certified list — partner program?
3. SSO/SAML in v1 or v1.1 (impacts enterprise GTM)?
4. Single Supabase project vs per-region projects for data residency?

---

## 18. Glossary
RLS · BFF · CQRS · HPA · PITR · SCA · SBOM · ABAC — see PRD §13 + add here as needed.
