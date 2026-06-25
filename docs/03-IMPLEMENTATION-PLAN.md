# Implementation Plan
## EventForge — Zoho Backstage / Events Clone

> **Version:** 1.0 · **Date:** 2026-06-25
> **Companion docs:** `01-PRD.md` · `02-DESIGN.md`

---

## 1. Stack Recap (the decision, in one block)

```
Monorepo (pnpm + Turborepo)
├── apps
│   ├── web        → Next.js 15 (App Router)  — marketing site + event sites + admin console
│   ├── api        → NestJS 11 (Fastify)      — core REST API, OpenAPI
│   └── workers    → NestJS + BullMQ          — email, badges, exports, workflow runtime
├── packages
│   ├── db         → Prisma schema + migrations + seed
│   ├── api-sdk    → generated typed client (from OpenAPI)
│   ├── ui         → shared shadcn/ui components
│   ├── config     → eslint, tsconfig, tailwind preset
│   └── domain     → shared Zod schemas / types
└── infra          → Terraform (Supabase, Redis, DNS), GitHub Actions, docker-compose
```

**Why this stack** (short version — full rationale in PRD §11 / Design Doc §3):
- **NestJS** for the API: ~70% faster than Next.js API routes for API workloads, first-class modules
  (= bounded contexts), DI, microservices-ready, excellent background-job support. This is the
  industry-consensus choice for a production, scalable, complex-domain backend.
- **Next.js 15** for everything user-facing: SSR/ISR for SEO-critical public event sites, RSC for a
  fast admin console.
- **Supabase** as the managed cloud: Postgres + Auth + Realtime + Storage + Edge Functions, with RLS
  enforcing hard tenant isolation. We keep business logic in NestJS, not in Postgres.

---

## 2. Guiding Engineering Principles

1. **Schema-first** — Prisma schema is the contract; DTOs derive from it; SDK derives from OpenAPI.
2. **Bounded contexts** — one NestJS module ↔ one DB schema ↔ one feature area. No cross-imports of
   internals; communicate via a typed internal event bus.
3. **Vertical slices** — ship a thin end-to-end slice first (DB → API → UI), then deepen.
4. **Tests are not optional** — every PR must keep coverage ≥80% on `core` modules and pass the
   tenant-isolation harness.
5. **Expand/contract migrations** — never a breaking DB change in a single deploy.
6. **Observability from day one** — trace ids, structured logs, metrics wired before first feature.

---

## 3. Phase Plan (Roadmap)

Each phase ends with a **demoable, deployable increment** and a definition-of-done (DoD).

### Phase 0 — Foundations (Week 1–2)
**Goal:** runnable monorepo, CI, auth, one hello-world end-to-end.

- [ ] pnpm + Turborepo monorepo; shared ESLint/Prettier/TS configs.
- [ ] `apps/web` (Next.js 15), `apps/api` (NestJS 11 + Fastify), `apps/workers`.
- [ ] `packages/db`: Prisma + Supabase local CLI; first schema (`iam`).
- [ ] Supabase project (dev), Auth (email + Google OAuth), JWT in RS256.
- [ ] NestJS: Supabase JWT guard, `TenantGuard`, `RolesGuard`, global Zod pipe, OpenAPI at `/docs`.
- [ ] Next.js: auth via `@supabase/ssr`, middleware-protected `/console`, TanStack Query setup.
- [ ] CI: GitHub Actions — install → lint → typecheck → test → build → preview deploy.
- [ ] OTel + pino logging; trace id propagation; Sentry for FE.
- [ ] **DoD:** user signs up, lands on `/console`, sees their org; `GET /v1/me` works; CI green.

### Phase 1 — Event Core + Public Site (Week 3–5) — *MVP backbone*
**Goal:** organizer creates an event and publishes a public site; attendee can view it.

- [ ] `events` schema + NestJS module (CRUD, publish lifecycle, locales).
- [ ] Event **website builder** v1: section blocks (hero, agenda placeholder, speakers, FAQ, CTA),
  per-locale content, theme vars, SEO meta.
- [ ] Next.js public route `/e/[slug]` (SSR + ISR on publish), custom domain mapping (`event_domains`).
- [ ] Roles & invites (owner/admin/organizer/staff/viewer), audit log writes.
- [ ] **DoD:** publish a bilingual event site on a custom sub-domain; RBAC enforced; OpenAPI current.

### Phase 2 — Registration & Ticketing (Week 6–8)
**Goal:** attendee registers and pays; organizer sees orders.

- [ ] `tickets` schema; ticket types, quantities, sale windows, addons.
- [ ] **Registration form builder** (per ticket type, conditional fields, file upload to Storage).
- [ ] Order flow: cart → Stripe Checkout (3-DS) → webhook (Edge Function verifies) → idempotent
  order finalize → tickets + QR secret generated.
- [ ] Promo codes (flat/%), capacity enforcement, waitlist with auto-promote.
- [ ] E-ticket: PDF + Apple/Google Wallet pass (worker).
- [ ] Refunds (full/partial) + transfers + cancellations.
- [ ] Tenant-isolation harness extended to all new endpoints.
- [ ] **DoD:** end-to-end paid registration with 3-DS on staging; refund works; tickets unique & scannable.

### Phase 3 — Agenda, Speakers, Exhibitors (Week 9–10)
**Goal:** rich agenda + people.

- [ ] `agenda` schema: tracks, rooms, sessions, session types, RSVP, capacity.
- [ ] Speaker portal (self-edit, assets, assignments), exhibitor booths + lead capture schema.
- [ ] `.ics` export, calendar sync, conflict detection for attendees.
- [ ] **DoD:** full multi-track agenda published; speakers self-manage; RSVP enforces capacity.

### Phase 4 — On-site: Check-in, Kiosk, Badges (Week 11–13) — *the signature module*
**Goal:** staff check-in attendees live; badges print on demand.

- [ ] `onsite` schema; `check_ins` with `UNIQUE(ticket_id)`; HMAC QR verification.
- [ ] **Organizer app (Expo)**: scan, search, manual check-in, reprint badge, live counts.
- [ ] **Kiosk PWA**: self check-in, walk-in registration (paid via Stripe), offline queue.
- [ ] **Badge designer** (WYSIWYG) → `@react-pdf/renderer` worker → print queue (ESC/POS + ZPL).
- [ ] **Print Bridge** agent (local WebSocket) for browser-driven USB printers.
- [ ] **Session check-in** with atomic capacity enforcement.
- [ ] Realtime broadcast of check-ins → dashboard.
- [ ] k6 load test: **10k concurrent check-ins** in 10 min.
- [ ] **DoD:** full dry-run event: register → scan → badge prints → session check-in → live dashboard.

### Phase 5 — Attendee Engagement (Week 14–16)
**Goal:** attendee app with live features.

- [ ] `engage` schema; attendee profiles, interests, visibility.
- [ ] Attendee **PWA/Expo app**: My Agenda, join virtual session, reminders.
- [ ] Live **polls, Q&A, chat, reactions** over Supabase Realtime (policy-gated channels).
- [ ] Push notifications (Expo + FCM/APNs).
- [ ] **v1.1 hooks**: matchmaking, 1:1 video networking, gamification (feature-flagged).
- [ ] **DoD:** live poll + Q&A during a session with 500 simulated clients stable.

### Phase 6 — Marketing, Email & Workflows (Week 17–19)
**Goal:** organizers run campaigns and automations.

- [ ] `marketing` schema; templates (MJML), campaigns, audiences (segment builder).
- [ ] **Workflow runtime**: declarative triggers/steps; Redis Streams subscriber → BullMQ jobs.
- [ ] Transactional email (confirmations, tickets, receipts) via Resend; custom sending domain onboarding.
- [ | Deliverability: DKIM/SPF/DMARC checks, suppression list, RFC 8058 unsubscribe.
- [ ] Email analytics (delivered/open/click/bounce) ingested from Resend webhooks.
- [ ] **DoD:** abandoned-cart workflow fires correctly across 3 tenant events.

### Phase 7 — Analytics & Integrations (Week 20–22)
**Goal:** insights + ecosystem.

- [ ] `analytics` rollups (cron + Realtime increment); real-time dashboard.
- [ ] Funnels, revenue, attendance; export CSV/XLSX; scheduled reports.
- [ ] Auto post-event report (PDF via worker).
- [ ] **Integrations:** CRM (HubSpot/Salesforce/Zoho CRM) sync, Zoom/Teams/Vimeo for sessions,
  `.ics`/Google/Outlook, outgoing webhooks, public REST API (OAuth2 + API keys).
- [ ] Rate limiting (per-tenant) + API quotas.
- [ ] **DoD:** revenue + funnel dashboards live; Zoom session join works; CRM sync round-trips.

### Phase 8 — Billing, Compliance, Hardening (Week 23–25)
**Goal:** sell it & ship to production.

- [ ] `billing`: plans, seats, metered usage, Stripe Customer Portal, invoicing, dunning.
- [ ] Super-admin console (platform operator).
- [ ] GDPR: consent records, data export, right-to-erasure, DPA flow.
- [ ] SSO/SAML (enterprise) — if v1 scope; otherwise v1.1.
- [ ] Security: SAST/DAST in CI, pentest, SBOM, secrets rotation.
- [ ] Performance: query audit, N+1 elimination, cache layer; meet SLOs.
- [ ] Runbooks, on-call, status page, backup restore drill.
- [ ] **DoD:** SOC2-readiness checklist complete; load + security gates green; launch checklist signed.

### Phase 9 — v1.1+ (post-launch, prioritized)
- Gamification & AI matchmaking · 1:1 video networking · SSO/SAML · Data residency (EU/US) ·
  Marketplace/split payments · Native app store shells · Advanced AB testing on event pages.

---

## 4. Team & Estimation (indicative, for a focused squad)

| Role | Count | Notes |
|---|---|---|
| Tech lead / architect | 1 | Owns NestJS + infra |
| Backend engineers | 2 | NestJS modules, workers, integrations |
| Frontend engineers | 2 | Next.js console + event sites + builder |
| Mobile/full-stack | 1 | Expo apps + kiosk PWA |
| Designer (UX/UI) | 1 | Shared, part-time after Phase 1 |
| QA / SDET | 1 | Test infra, load/security, isolation harness |

**Calendar estimate:** ~25–26 weeks to a hardened v1.0 with a 6-person squad; compressible with more
parallelism on independent modules (e.g., engage & marketing can overlap).

---

## 5. Definition of Ready / Definition of Done

**DoR:** ticket has acceptance criteria, OpenAPI/DTO changes called out, DB migrations drafted,
tests listed, and a labeled Figma/design link (if UI).

**DoD (every ticket):**
1. Code reviewed by a second engineer.
2. Unit + integration tests added; coverage gate green.
3. Tenant-isolation harness passes for new endpoints.
4. OpenAPI updated; SDK regenerated if contract changed.
5. Migration is expand/contract; reversible script noted.
6. Structured logs + metrics added; no PII in logs.
7. Docs (this repo's `/docs` or OpenAPI) updated.
8. Feature-flagged if risky; deployed to staging; smoke-tested.

---

## 6. Risk Register & Mitigations

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | Check-in surge overload | Med | High | Stateless API, idempotent writes, k6 load gates, PgBouncer pooling |
| R2 | Multi-tenant data leak | Low | Critical | RLS everywhere + automated dual-tenant probe harness |
| R3 | Badge printer fragmentation | Med | Med | Print queue + ESC/POS & ZPL drivers; certified hardware list |
| R4 | Realtime fan-out at scale | Med | Med | Supabase Realtime + Redis Pub/Sub fallback plan |
| R5 | Stripe webhook duplication | Low | High | Idempotency keys + reconciling worker |
| R6 | Scope creep ("exact clone") | High | High | Phased plan, v1.1 parking lot, ruthless MVP slicing |
| R7 | Deliverability issues | Med | Med | DKIM/SPF/DMARC at onboarding, suppression list, fallback provider |
| R8 | Key person dependency | Med | Med | Pairing, ADRs, module ownership rotation |

---

## 7. Milestones (external-facing)

| Milestone | Week | Demo theme |
|---|---|---|
| **M0 — Hello World** | 2 | Auth + console shell |
| **M1 — Publish an Event** | 5 | Bilingual event site on custom domain |
| **M2 — First Registration** | 8 | Paid ticket with 3-DS + refund |
| **M3 — Full Agenda** | 10 | Multi-track agenda + speaker portal |
| **M4 — Live On-site** | 13 | Scan → check-in → badge print (full dry run) |
| **M5 — Engaged Attendee** | 16 | Live polls/Q&A in session |
| **M6 — Marketed** | 19 | Workflow emails fire correctly |
| **M7 — Insights & Ecosystem** | 22 | Dashboards + Zoom + CRM |
| **M8 — GA / Launch** | 25 | Hardened, billed, SOC2-ready |

---

## 8. Repo & Tooling Conventions

- **Branching:** trunk-based; short-lived branches; PR + CI; feature flags for in-flight work.
- **Commits:** Conventional Commits (`feat(tickets): …`); auto-changelog.
- **ADRs:** `docs/adr/NNNN-title.md` for every significant decision (e.g., "ADR-0001 NestJS over
  Next API routes").
- **Feature flags:** LaunchDarkly (or self-hosted Unleash) gated per tenant.
- **Monorepo cache:** Turborepo remote cache (Vercel) for CI speed.
- **DB:** Prisma migrations in PR; CI runs them against an ephemeral Postgres; Supabase branch per preview.

---

## 9. Sample Sprint Cadence (Phase 2 illustration)

Two-week sprints; every sprint ships a demoable slice.

- **Sprint 1:** ticket types CRUD + form builder (no pay) → organizer creates tickets; test form.
- **Sprint 2:** Stripe Checkout + webhook + idempotent finalize → first paid registration on staging.
- **Sprint 3:** promo codes + waitlist + refunds → full commercial close.

---

## 10. Open Decisions to Lock in Kickoff

1. Hosting: **Fly.io vs AWS ECS Fargate** for NestJS (cost vs ops preference)?
2. Observability vendor: Grafana Cloud vs Datadog (budget)?
3. SSO/SAML in v1 (enterprise GTM impact)?
4. Email: Resend primary — confirm; arrange Postmark fallback?
5. Mobile strategy: ship Expo PWA first, defer native stores — confirmed?
6. Single global Supabase project vs per-region for residency — v1 vs v1.1?

---

## 11. Next Immediate Actions (Week 1)

1. Create the monorepo scaffold (see `04-SCAFFOLD.md`) and push to GitHub.
2. Stand up Supabase dev project + local CLI; commit `packages/db` baseline Prisma schema.
3. Bootstrap `apps/api` (NestJS) with JWT guard, Zod pipe, OpenAPI; bootstrap `apps/web` (Next.js)
   with Supabase auth + `/console` shell.
4. Wire CI (install/lint/typecheck/test/build/preview).
5. Write **ADR-0001** (NestJS decision) and **ADR-0002** (multi-tenancy via RLS).
6. Open Phase 0 tickets; kick off.
