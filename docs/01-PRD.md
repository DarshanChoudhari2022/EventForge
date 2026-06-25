# Product Requirements Document (PRD)
## EventForge — A Zoho Backstage / Zoho Events Clone

> **Codename:** EventForge
> **Document version:** 1.0 · **Date:** 2026-06-25
> **Status:** Draft for review

---

## 1. Executive Summary

EventForge is a production-grade, multi-tenant SaaS event management platform that replicates the
feature surface of **Zoho Backstage** (Zoho's enterprise event product, often marketed under the
"Zoho Events" umbrella). It lets organizers plan, promote, run, and analyze **in-person, virtual, and
hybrid events** end-to-end: from a branded multi-language event site, through registration &
ticketing, on-site check-in with on-demand badge printing, attendee engagement apps, email-marketing
automation, all the way to post-event analytics.

The platform is built on a scalable, industry-standard stack: **Next.js 15 (App Router)** for the
web frontend and public event sites, **NestJS 11** for the core API (chosen for its speed,
microservices readiness, and modular DI — see §11), and **Supabase** (Postgres + Auth + Realtime +
Storage) as the managed cloud data layer.

---

## 2. Goals & Non-Goals

### 2.1 Goals
1. **Feature parity** with the core Zoho Backstage modules (see §4).
2. **Multi-tenant from day one** — row-level isolation per organization, with a hardened RLS policy set.
3. **Production quality** — ≥80% test coverage on critical paths, CI/CD, observability, ≤300 ms p95
   API latency for read endpoints under load.
4. **Scalable to 10k concurrent attendees** per event (check-in surge, live updates) without
   re-architecture.
5. **White-label / custom domains** for each event's public site.

### 2.2 Non-Goals (v1)
- Native live-streaming infrastructure (we integrate a provider — Vimeo/Zoom — rather than building an MCU).
- Hardware (badge printers, kiosks) — we integrate via standard drivers/protocols.
- A consumer mobile app store launch in v1 (PWA + Expo first; native shells later).
- Built-in accounting / ERP beyond payment capture & basic refunds.

---

## 3. Target Users & Personas

| Persona | Description | Primary needs |
|---|---|---|
| **Organizer / Admin** | Event manager inside a tenant org | Full control: create events, ticketing, agenda, staff, analytics |
| **Staff / Check-in crew** | On-site personnel with the organizer app | Fast QR check-in, badge printing, session check-in, walk-in registration |
| **Speaker** | Session presenter | Manage profile, upload slides, answer Q&A, see their schedule |
| **Attendee** | Ticket holder (in-person/virtual) | Register, pay, build agenda, network, join sessions, give feedback |
| **Exhibitor / Sponsor** | Booth owner | Lead capture, branded booth page, scans analytics |

---

## 4. Functional Requirements — Feature Modules

Each module is a bounded context (NestJS module / Postgres schema). Listed as
**MVP** (must ship for v1.0) or **v1.1+** (next iterations).

### 4.1 Accounts & Tenancy (`iam`)
- Sign up / sign in (email + password, magic link, Google/Microsoft/Apple OAuth).
- Organization (tenant) creation, invites, role-based access (Owner, Admin, Organizer, Staff, Viewer).
- SSO (SAML 2.0) for enterprise tenants — **v1.1**.
- User profile, avatar, notification preferences.

### 4.2 Events (`events`)
- Create event: in-person / virtual / hybrid, single or multi-day, multi-track, recurring.
- Branded **event website builder**: drag-and-drop sections (hero, speakers, agenda, sponsors, FAQ,
  venue map, CTA), **multi-language** (i18n) with per-locale content, custom CSS, SEO meta, custom
  domain + SSL.
- Event status lifecycle: Draft → Published → Live → Completed → Archived.
- Venues & rooms, capacity management, virtual-stream links per session.
- Tax & currency settings per event.

### 4.3 Registration & Ticketing (`tickets`)
- Ticket types: Free, Paid, Donation, Group, Add-ons, Hidden (for promo codes).
- Tiers, quantity caps, sale windows, early-bird schedules.
- **Custom registration form builder** (text, choice, file upload, conditional fields, per-ticket-type).
- Promo codes (flat/percentage), discount rules, access codes.
- Order flow: cart → checkout → payment → e-ticket (PDF + Apple/Google Wallet pass).
- Refunds, cancellations, transfers, waitlist with auto-promotion.
- Multi-currency, tax (VAT/GST) handling, invoicing.

### 4.4 Payments (`payments`)
- Gateway integrations: **Stripe** (primary), PayPal, Razorpay (regional) — **v1.1**.
- 3-D Secure / SCA, idempotent charge capture, webhooks with signature verification.
- Marketplace/split payments for multi-organizer events — **v1.2**.
- Reconciliation reports.

### 4.5 Agenda & Sessions (`agenda`)
- Multi-track schedule, sessions with start/end, room, capacity, track color.
- Session types: keynote, workshop, panel, break, networking.
- Session-level registration (RSVP), capacity enforcement.
- Speaker management: profiles, headshots, social links, session assignment.
- Agenda import/export (.ics, Excel).
- Conflict detection for attendees.

### 4.6 Speakers & Exhibitors (`people`)
- Speaker portal (self-edit profile, upload assets, see assignments).
- Exhibitor/sponsor booths: virtual booth page, lead-retrieval, branding, resources.

### 4.7 On-site Operations (`onsite`) — *the Zoho signature module*
- **Check-in Kiosk mode**: self-service tablet UI, QR/lookup check-in, walk-in registration.
- **On-demand badge printing**: WYSIWYG badge designer (QR, name, photo, fields, sponsor strip),
  thermal-printer support (ESC/POS, Zebra ZPL), browser-based + server queue.
- **Session check-in**: per-session scanning with capacity + attendance analytics.
- Staff/organizer mobile app (Expo): scan, search, manual check-in, re-print badge, real-time counts.
- Hardware-agnostic: works with any USB/Bluetooth scanner and supported printers.

### 4.8 Attendee Engagement (`engage`)
- **Attendee app** (PWA + Expo): personalized agenda, live session links, in-app messaging,
  1:1 video networking, matchmaking, meeting scheduling.
- **Live features**: polls, Q&A, live chat, reactions/emojis (Realtime).
- **Gamification**: points, leaderboards, challenges, badges (virtual).
- **Networking**: AI matchmaking based on profile/interests; sponsored 1:1 meetings.
- Announcements/push notifications.

### 4.9 Marketing & Email (`marketing`)
- Email campaign builder: drag-and-drop, dynamic tokens, attendee segmentation.
- **Workflow automation**: trigger-based emails (registration, check-in, no-show, post-event,
  abandoned cart), scheduled sends.
- Transactional emails (confirmation, ticket, receipt, reminders).
- Resend / Postmark / Amazon SES as the deliverability layer; per-tenant custom sending domains.
- Analytics: open/click/bounce, unsubscribe handling (CAN-SPAM/GDPR).

### 4.10 Analytics & Reporting (`analytics`)
- Real-time dashboard: registrations, revenue, check-ins, session attendance, geo.
- Funnel (visit → register → pay → attend).
- Custom reports, export (CSV/XLSX), scheduled emails.
- Post-event report auto-generation.
- Privacy-first analytics (no third-party cookies by default); GA4 integration optional.

### 4.11 Integrations (`integrations`)
- CRM: HubSpot, Salesforce, Zoho CRM — bidirectional attendee sync.
- Calendars (.ics, Google, Outlook).
- Web conferencing: Zoom, Teams, Vimeo OTT/Live for virtual sessions.
- Webhooks (outgoing) + REST API (with API keys / OAuth2) for third parties.
- Zapier / Make connectors via our public API.

### 4.12 Admin & Billing (`billing`) — *SaaS side*
- Subscription plans (Free / Starter / Pro / Enterprise), seat & event quotas, metered overage.
- Usage metering (registrations, emails sent, storage).
- Invoicing, tax, dunning.
- Super-admin console for platform operators.

### 4.13 Security, Compliance & Data (`compliance`)
- GDPR: consent capture, data export, right-to-erasure, DPA-ready.
- PCI-DSS scope minimized via Stripe (no raw PAN touching our servers).
- Audit log of all sensitive actions.
- Data residency options (EU/US) — **v1.1**.

---

## 5. User Stories (representative sampling)

- *US-01* As an Organizer, I create a hybrid conference with a branded site in EN/FR, publish a
  call-for-speakers, and sell 3 ticket tiers with an early-bird window.
- *US-02* As an Attendee, I register, pay by card (3-DS), receive a QR ticket + Wallet pass, and add
  sessions to "My Agenda."
- *US-03* As Staff, I open the Kiosk on a tablet; a walk-up attendee self-registers, pays cash, and a
  badge prints instantly.
- *US-04* As an Organizer, I configure a workflow: when an attendee checks in, send a "welcome"
  push + email; when they miss 2 sessions, send a re-engagement email.
- *US-05* As an Attendee in the app, I join a virtual session, vote in a live poll, and book a 1:1
  networking meeting via matchmaking.
- *US-06* As a Sponsor, I scan attendee badges at my booth and export leads to my CRM.

---

## 6. Functional Requirements Summary Table

| ID | Module | Key Capability | MVP |
|----|--------|---------------|-----|
| F-01 | iam | Auth, orgs, RBAC | ✅ |
| F-02 | events | Event CRUD + website builder | ✅ |
| F-03 | events | Multi-language / custom domain | ✅ |
| F-04 | tickets | Registration + ticket types + forms | ✅ |
| F-05 | tickets | Promo codes, waitlist, refunds | ✅ |
| F-06 | payments | Stripe checkout + 3-DS | ✅ |
| F-07 | agenda | Tracks, sessions, speakers | ✅ |
| F-08 | onsite | Check-in (manual + QR) | ✅ |
| F-09 | onsite | Kiosk self check-in | ✅ |
| F-10 | onsite | On-demand badge printing | ✅ |
| F-11 | onsite | Session check-in | ✅ |
| F-12 | engage | Attendee app (PWA): agenda, links | ✅ |
| F-13 | engage | Live polls, Q&A, chat (Realtime) | ✅ |
| F-14 | engage | Gamification & matchmaking | v1.1 |
| F-15 | engage | 1:1 video networking | v1.1 |
| F-16 | marketing | Transactional + campaign email | ✅ |
| F-17 | marketing | Workflow automation | ✅ |
| F-18 | analytics | Realtime dashboards + exports | ✅ |
| F-19 | integrations | CRM, Zoom/Teams, webhooks, API | ✅ (core) / v1.1 |
| F-20 | billing | Plans, usage, invoicing | ✅ |
| F-21 | compliance | GDPR export/erasure, audit log | ✅ |

---

## 7. Non-Functional Requirements

| Category | Target |
|---|---|
| **Performance** | p95 < 300 ms read, < 800 ms write; check-in scan < 500 ms end-to-end |
| **Scalability** | 10k concurrent attendees/event; horizontal scale of stateless API; Supabase read replicas |
| **Availability** | 99.9% (tier-dependent); multi-AZ |
| **Security** | OWASP ASVS L2; SAST/DAST in CI; secrets in a vault; RLS on every table |
| **Data** | Encrypted at rest (AES-256) & in transit (TLS 1.2+); daily backups, PITR |
| **Accessibility** | WCAG 2.2 AA on all public surfaces |
| **i18n / l10n** | UI in ≥6 languages at launch; RTL-ready |
| **Browser support** | Evergreen Chrome/Firefox/Safari/Edge; PWA installable |
| **Observability** | Distributed tracing, structured logs, metrics, SLO dashboards |
| **Maintainability** | ≥80% unit coverage on core modules; lint-clean; typed end-to-end |

---

## 8. Success Metrics

- **Acquisition:** Active tenants, events created/month.
- **Activation:** Time-to-first-event-published < 30 min for a new organizer.
- **Engagement:** Avg. check-in rate per event; app MAU; emails delivered.
- **Performance:** SLO compliance (latency, uptime); error budget burn rate.
- **Revenue:** MRR, net revenue retention, payments processed.

---

## 9. Assumptions & Dependencies

- Stripe account available for the platform; tax handled via Stripe Tax initially.
- A transactional email provider (Resend recommended) provisioned.
- Hosting: Supabase (managed Postgres) + Vercel (frontend) + Fly.io / Render / AWS ECS for NestJS.
- PDF/wallet-pass generation via serverless functions or a worker.

---

## 10. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Check-in surge load spikes | High | Stateless API + idempotent writes + connection pooling; load tests |
| Badge-printer fragmentation | Medium | Abstract via a print queue + ESC/POS & ZPL drivers; certified hardware list |
| Realtime scaling (polls/chat) | Medium | Supabase Realtime + fallback; cap broadcast rate |
| Multi-tenant data leak | Critical | Mandatory RLS, automated policy tests, tenant-id in JWT |
| Payment fraud / chargebacks | Medium | Stripe Radar, 3-DS, velocity checks |

---

## 11. Backend Technology Decision (NestJS vs Next.js API routes vs Supabase)

**Decision: NestJS for the core API, Supabase for data/Auth/Realtime/Storage, Next.js for the frontend + BFF.**

Rationale (informed by 2025–2026 industry consensus):

| Criterion | Next.js API routes | **NestJS** ✅ | Supabase RPC only |
|---|---|---|---|
| API-only request throughput | Carries React/edge overhead; ~70% slower than NestJS for pure API work | **Fastest for API workloads** | Fast, but logic in SQL is hard to test/maintain |
| Architecture & scaling | Route handlers; weak for complex domains | **Modular DI, modules = bounded contexts, microservices-ready** | SQL-bound; poor domain modeling |
| Background jobs / cron / queues | Limited, bolt-on | **First-class (BullMQ, @nestjs/schedule)** | None native |
| Type safety across client/server | Manual | **Monorepo + shared DTOs** | Manual |
| Long-running / event-driven | Poor fit | **Excellent (CQRS, Kafka/RabbitMQ, workers)** | Poor |
| Team scaling / onboarding | Ad hoc | **Convention-driven, opinionated** | Mixed |

**Why not Next.js API routes alone:** Community and benchmarks agree API routes are fine for MVPs but
struggle with composability, complex domains, background work, and microservices — exactly what an
event platform needs (check-in surges, email workflows, real-time, integrations).

**Why not Supabase RPC for all logic:** Supabase is superb for data, Auth, Realtime, and Storage and
will *own* those concerns. Pushing business logic into Postgres functions couples domain rules to the
DB (hard to unit-test, deploy, and evolve). We use RPC **only** for hot, set-based operations and
authorization helpers.

**Result:** a clean three-way split — NestJS = domain/API, Supabase = managed data plane, Next.js =
rendering + thin BFF. See the Design Doc for the contract between them.

---

## 12. Out of Scope (this PRD)
- Detailed UX wireframes (Design Doc / Figma).
- Pixel-perfect cloning of Zoho's proprietary UI assets.
- Native iOS/Android App Store releases (PWA + Expo first).
- Building proprietary video streaming infrastructure.

---

## 13. Glossary

- **Tenant** — an Organization; the unit of isolation.
- **Event site** — the public, branded, multi-language website for a single event.
- **Kiosk** — self-service check-in tablet UI.
- **RLS** — Postgres Row-Level Security.
- **BFF** — Backend-for-Frontend.

---

### Appendix A — Source references (Zoho Backstage feature research)
- https://www.zoho.com/backstage/
- https://www.zoho.com/backstage/event-management-software/top-features.html
- https://www.zoho.com/backstage/event-email-marketing.html
- https://help.zoho.com/portal/en/kb/backstage/badge-printing/articles/kiosk
- https://apps.apple.com/ca/app/zoho-backstage-for-organizers/id1446883164

### Appendix B — Source references (backend stack decision)
- https://tech-insider.org/nestjs-vs-nextjs-2026/
- https://www.contentful.com/blog/nestjs-vs-nextjs/
- https://www.spec-india.com/blog/nestjs-vs-nextjs
