-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "default_currency" TEXT NOT NULL DEFAULT 'usd',
    "default_locale" TEXT NOT NULL DEFAULT 'en',
    "brand" JSONB,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "billing_customer_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_members" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'viewer',
    "status" TEXT NOT NULL DEFAULT 'active',
    "invited_at" TIMESTAMP(3),
    "joined_at" TIMESTAMP(3),

    CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_invites" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'viewer',
    "invited_by" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "key_prefix" TEXT NOT NULL,
    "scopes" TEXT[],
    "last_used_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "actor_id" UUID,
    "action" TEXT NOT NULL,
    "target" TEXT,
    "meta" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "display_name" TEXT,
    "avatar_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_sign_in_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "plan" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "seats" INTEGER NOT NULL DEFAULT 1,
    "current_period_ends_at" TIMESTAMP(3) NOT NULL,
    "stripe_subscription_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_records" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "metric" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "bucket" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "stripe_invoice_id" TEXT,
    "total_cents" BIGINT NOT NULL,
    "status" TEXT NOT NULL,
    "pdf_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'in_person',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "locale_default" TEXT NOT NULL DEFAULT 'en',
    "parent_event_id" UUID,
    "venue" JSONB,
    "settings" JSONB,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_locales" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "locale" TEXT NOT NULL,
    "title" TEXT,
    "summary" TEXT,
    "content" JSONB,
    "seo" JSONB,

    CONSTRAINT "event_locales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_domains" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "domain" TEXT NOT NULL,
    "ssl_status" TEXT NOT NULL DEFAULT 'pending',

    CONSTRAINT "event_domains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_pages" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "builder_doc" JSONB NOT NULL,
    "published_doc" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "event_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "venues" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "address" JSONB,
    "capacity" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "venues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" UUID NOT NULL,
    "venue_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER,
    "virtual_url" TEXT,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tracks" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#3b82f6',
    "sort" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "tracks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_templates" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "mjml" TEXT NOT NULL,
    "variables" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "printers" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "driver" TEXT NOT NULL DEFAULT 'pdf',
    "connection" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "printers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_types" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'paid',
    "price_cents" BIGINT NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "quantity_total" INTEGER NOT NULL DEFAULT 0,
    "quantity_sold" INTEGER NOT NULL DEFAULT 0,
    "sale_starts_at" TIMESTAMP(3),
    "sale_ends_at" TIMESTAMP(3),
    "visibility" TEXT NOT NULL DEFAULT 'public',
    "description" TEXT,
    "min_per_order" INTEGER NOT NULL DEFAULT 1,
    "max_per_order" INTEGER NOT NULL DEFAULT 10,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "ticket_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registration_form_fields" (
    "id" UUID NOT NULL,
    "ticket_type_id" UUID NOT NULL,
    "label" JSONB NOT NULL,
    "type" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "options" JSONB,
    "conditional" JSONB,
    "sort" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "registration_form_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "buyer_id" UUID,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "subtotal_cents" BIGINT NOT NULL DEFAULT 0,
    "fees_cents" BIGINT NOT NULL DEFAULT 0,
    "tax_cents" BIGINT NOT NULL DEFAULT 0,
    "discount_cents" BIGINT NOT NULL DEFAULT 0,
    "total_cents" BIGINT NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "promo_code_id" UUID,
    "idempotency_key" TEXT,
    "stripe_payment_intent_id" TEXT,
    "stripe_checkout_session_id" TEXT,
    "refunded_at" TIMESTAMP(3),
    "refund_amount_cents" BIGINT DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "ticket_type_id" UUID NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "unit_price_cents" BIGINT NOT NULL,
    "attendee_id" UUID,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets" (
    "id" UUID NOT NULL,
    "order_item_id" UUID NOT NULL,
    "ticket_type_id" UUID NOT NULL,
    "attendee_id" UUID,
    "order_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'valid',
    "code" TEXT NOT NULL,
    "qr_secret" TEXT NOT NULL,
    "attendee_data" JSONB,
    "checked_in_at" TIMESTAMP(3),
    "checked_in_by" UUID,
    "badge_printed_at" TIMESTAMP(3),
    "refunded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promo_codes" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "value" DECIMAL(10,2) NOT NULL,
    "max_uses" INTEGER NOT NULL DEFAULT 0,
    "uses" INTEGER NOT NULL DEFAULT 0,
    "valid_from" TIMESTAMP(3),
    "valid_to" TIMESTAMP(3),
    "applies_to_all" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promo_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waitlist_entries" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "ticket_type_id" UUID NOT NULL,
    "attendee_id" UUID,
    "email" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "promoted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "waitlist_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "track_id" UUID,
    "room_id" UUID,
    "title" JSONB NOT NULL,
    "description" JSONB,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'talk',
    "capacity" INTEGER,
    "requires_rsvp" BOOLEAN NOT NULL DEFAULT false,
    "stream_url" TEXT,
    "stream_provider" TEXT,
    "external_id" TEXT,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "speakers" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "user_id" UUID,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "company" TEXT,
    "bio" JSONB,
    "photo_url" TEXT,
    "social" JSONB,
    "email" TEXT,
    "status" TEXT NOT NULL DEFAULT 'invited',
    "portal_token" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "speakers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_speakers" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "speaker_id" UUID NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'speaker',

    CONSTRAINT "session_speakers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_rsvps" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "attendee_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'going',
    "checked_in_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_rsvps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exhibitors" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "tier" TEXT NOT NULL DEFAULT 'standard',
    "description" TEXT,
    "logo_url" TEXT,
    "booth_number" TEXT,
    "contact_email" TEXT,
    "website" TEXT,
    "brand_color" TEXT,
    "leads_captured" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exhibitors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_captures" (
    "id" UUID NOT NULL,
    "exhibitor_id" UUID NOT NULL,
    "attendee_id" UUID NOT NULL,
    "ticket_code" TEXT NOT NULL,
    "notes" TEXT,
    "meta" JSONB,
    "captured_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_captures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "check_ins" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "ticket_id" UUID,
    "attendee_id" UUID,
    "session_id" UUID,
    "channel" TEXT NOT NULL DEFAULT 'organizer_app',
    "method" TEXT NOT NULL DEFAULT 'qr',
    "location" TEXT,
    "staff_id" UUID,
    "meta" JSONB,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "check_ins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "badge_templates" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "layout" JSONB NOT NULL,
    "paper_size" TEXT NOT NULL DEFAULT 'A4',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "badge_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "badge_print_jobs" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "ticket_id" UUID,
    "template_id" UUID NOT NULL,
    "printer_id" UUID,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "payload" JSONB,
    "pdf_url" TEXT,
    "error" TEXT,
    "queued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "printed_at" TIMESTAMP(3),

    CONSTRAINT "badge_print_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendee_profiles" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "user_id" UUID,
    "ticket_id" UUID,
    "display_name" TEXT NOT NULL,
    "photo_url" TEXT,
    "title" TEXT,
    "company" TEXT,
    "interests" TEXT[],
    "visibility" TEXT NOT NULL DEFAULT 'public',
    "bio" TEXT,
    "social" JSONB,
    "points" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendee_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meetings" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "a_attendee_id" UUID NOT NULL,
    "b_attendee_id" UUID NOT NULL,
    "slot" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "room_url" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meetings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "polls" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "question" JSONB NOT NULL,
    "options" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "multi_select" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "closed_at" TIMESTAMP(3),

    CONSTRAINT "polls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "poll_votes" (
    "id" UUID NOT NULL,
    "poll_id" UUID NOT NULL,
    "attendee_id" UUID NOT NULL,
    "option_id" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "poll_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qa_messages" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "attendee_id" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'visible',
    "votes" INTEGER NOT NULL DEFAULT 0,
    "is_anonymous" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "qa_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" UUID NOT NULL,
    "channel_id" UUID NOT NULL,
    "attendee_id" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'message',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gamification_ledger" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "attendee_id" UUID NOT NULL,
    "points" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "meta" JSONB,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gamification_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "subject" JSONB NOT NULL,
    "body_html" TEXT NOT NULL,
    "body_mjml" TEXT,
    "audience" JSONB,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "scheduled_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "recipient_count" INTEGER NOT NULL DEFAULT 0,
    "open_count" INTEGER NOT NULL DEFAULT 0,
    "click_count" INTEGER NOT NULL DEFAULT 0,
    "bounce_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_definitions" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "trigger" JSONB NOT NULL,
    "steps" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_runs" (
    "id" UUID NOT NULL,
    "definition_id" UUID NOT NULL,
    "attendee_id" UUID,
    "order_id" UUID,
    "current_step" INTEGER NOT NULL DEFAULT 0,
    "state" JSONB,
    "status" TEXT NOT NULL DEFAULT 'running',
    "next_run_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "workflow_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_events" (
    "id" UUID NOT NULL,
    "message_id" TEXT NOT NULL,
    "organization_id" UUID NOT NULL,
    "event" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "meta" JSONB,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_metrics_hourly" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "hour_bucket" TIMESTAMP(3) NOT NULL,
    "registrations" INTEGER NOT NULL DEFAULT 0,
    "revenue_cents" BIGINT NOT NULL DEFAULT 0,
    "check_ins" INTEGER NOT NULL DEFAULT 0,
    "cancellations" INTEGER NOT NULL DEFAULT 0,
    "refunds_cents" BIGINT NOT NULL DEFAULT 0,
    "page_views" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "event_metrics_hourly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_PromoCodeToTicketType" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_PromoCodeToTicketType_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE INDEX "organization_members_organization_id_idx" ON "organization_members"("organization_id");

-- CreateIndex
CREATE INDEX "organization_members_user_id_idx" ON "organization_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "organization_members_organization_id_user_id_key" ON "organization_members"("organization_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "organization_invites_token_key" ON "organization_invites"("token");

-- CreateIndex
CREATE INDEX "organization_invites_organization_id_idx" ON "organization_invites"("organization_id");

-- CreateIndex
CREATE INDEX "organization_invites_token_idx" ON "organization_invites"("token");

-- CreateIndex
CREATE INDEX "api_keys_organization_id_idx" ON "api_keys"("organization_id");

-- CreateIndex
CREATE INDEX "api_keys_key_prefix_idx" ON "api_keys"("key_prefix");

-- CreateIndex
CREATE INDEX "audit_log_organization_id_created_at_idx" ON "audit_log"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_log_actor_id_idx" ON "audit_log"("actor_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "subscriptions_organization_id_idx" ON "subscriptions"("organization_id");

-- CreateIndex
CREATE INDEX "usage_records_organization_id_metric_bucket_idx" ON "usage_records"("organization_id", "metric", "bucket");

-- CreateIndex
CREATE INDEX "invoices_organization_id_idx" ON "invoices"("organization_id");

-- CreateIndex
CREATE INDEX "events_organization_id_idx" ON "events"("organization_id");

-- CreateIndex
CREATE INDEX "events_organization_id_status_idx" ON "events"("organization_id", "status");

-- CreateIndex
CREATE INDEX "event_locales_event_id_idx" ON "event_locales"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_locales_event_id_locale_key" ON "event_locales"("event_id", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "event_domains_domain_key" ON "event_domains"("domain");

-- CreateIndex
CREATE INDEX "event_domains_event_id_idx" ON "event_domains"("event_id");

-- CreateIndex
CREATE INDEX "event_pages_event_id_idx" ON "event_pages"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_pages_event_id_slug_key" ON "event_pages"("event_id", "slug");

-- CreateIndex
CREATE INDEX "venues_event_id_idx" ON "venues"("event_id");

-- CreateIndex
CREATE INDEX "rooms_venue_id_idx" ON "rooms"("venue_id");

-- CreateIndex
CREATE INDEX "tracks_event_id_idx" ON "tracks"("event_id");

-- CreateIndex
CREATE INDEX "email_templates_organization_id_idx" ON "email_templates"("organization_id");

-- CreateIndex
CREATE INDEX "printers_organization_id_idx" ON "printers"("organization_id");

-- CreateIndex
CREATE INDEX "ticket_types_event_id_idx" ON "ticket_types"("event_id");

-- CreateIndex
CREATE INDEX "registration_form_fields_ticket_type_id_idx" ON "registration_form_fields"("ticket_type_id");

-- CreateIndex
CREATE INDEX "orders_organization_id_idx" ON "orders"("organization_id");

-- CreateIndex
CREATE INDEX "orders_event_id_idx" ON "orders"("event_id");

-- CreateIndex
CREATE INDEX "orders_buyer_id_idx" ON "orders"("buyer_id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_idempotency_key_key" ON "orders"("idempotency_key");

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");

-- CreateIndex
CREATE INDEX "order_items_ticket_type_id_idx" ON "order_items"("ticket_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_code_key" ON "tickets"("code");

-- CreateIndex
CREATE INDEX "tickets_ticket_type_id_idx" ON "tickets"("ticket_type_id");

-- CreateIndex
CREATE INDEX "tickets_event_id_idx" ON "tickets"("event_id");

-- CreateIndex
CREATE INDEX "tickets_organization_id_idx" ON "tickets"("organization_id");

-- CreateIndex
CREATE INDEX "tickets_qr_secret_idx" ON "tickets"("qr_secret");

-- CreateIndex
CREATE INDEX "promo_codes_event_id_idx" ON "promo_codes"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "promo_codes_event_id_code_key" ON "promo_codes"("event_id", "code");

-- CreateIndex
CREATE INDEX "waitlist_entries_event_id_ticket_type_id_idx" ON "waitlist_entries"("event_id", "ticket_type_id");

-- CreateIndex
CREATE INDEX "sessions_event_id_idx" ON "sessions"("event_id");

-- CreateIndex
CREATE INDEX "sessions_track_id_idx" ON "sessions"("track_id");

-- CreateIndex
CREATE INDEX "sessions_room_id_idx" ON "sessions"("room_id");

-- CreateIndex
CREATE INDEX "sessions_starts_at_idx" ON "sessions"("starts_at");

-- CreateIndex
CREATE INDEX "speakers_event_id_idx" ON "speakers"("event_id");

-- CreateIndex
CREATE INDEX "session_speakers_speaker_id_idx" ON "session_speakers"("speaker_id");

-- CreateIndex
CREATE UNIQUE INDEX "session_speakers_session_id_speaker_id_key" ON "session_speakers"("session_id", "speaker_id");

-- CreateIndex
CREATE INDEX "session_rsvps_session_id_idx" ON "session_rsvps"("session_id");

-- CreateIndex
CREATE UNIQUE INDEX "session_rsvps_session_id_attendee_id_key" ON "session_rsvps"("session_id", "attendee_id");

-- CreateIndex
CREATE INDEX "exhibitors_event_id_idx" ON "exhibitors"("event_id");

-- CreateIndex
CREATE INDEX "lead_captures_exhibitor_id_idx" ON "lead_captures"("exhibitor_id");

-- CreateIndex
CREATE INDEX "lead_captures_attendee_id_idx" ON "lead_captures"("attendee_id");

-- CreateIndex
CREATE UNIQUE INDEX "check_ins_ticket_id_key" ON "check_ins"("ticket_id");

-- CreateIndex
CREATE INDEX "check_ins_event_id_at_idx" ON "check_ins"("event_id", "at");

-- CreateIndex
CREATE INDEX "check_ins_session_id_idx" ON "check_ins"("session_id");

-- CreateIndex
CREATE INDEX "check_ins_ticket_id_idx" ON "check_ins"("ticket_id");

-- CreateIndex
CREATE INDEX "badge_templates_event_id_idx" ON "badge_templates"("event_id");

-- CreateIndex
CREATE INDEX "badge_print_jobs_event_id_idx" ON "badge_print_jobs"("event_id");

-- CreateIndex
CREATE INDEX "badge_print_jobs_status_idx" ON "badge_print_jobs"("status");

-- CreateIndex
CREATE INDEX "attendee_profiles_event_id_idx" ON "attendee_profiles"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "attendee_profiles_event_id_user_id_key" ON "attendee_profiles"("event_id", "user_id");

-- CreateIndex
CREATE INDEX "meetings_event_id_idx" ON "meetings"("event_id");

-- CreateIndex
CREATE INDEX "meetings_a_attendee_id_idx" ON "meetings"("a_attendee_id");

-- CreateIndex
CREATE INDEX "meetings_b_attendee_id_idx" ON "meetings"("b_attendee_id");

-- CreateIndex
CREATE INDEX "polls_session_id_idx" ON "polls"("session_id");

-- CreateIndex
CREATE INDEX "poll_votes_poll_id_idx" ON "poll_votes"("poll_id");

-- CreateIndex
CREATE UNIQUE INDEX "poll_votes_poll_id_attendee_id_key" ON "poll_votes"("poll_id", "attendee_id");

-- CreateIndex
CREATE INDEX "qa_messages_session_id_idx" ON "qa_messages"("session_id");

-- CreateIndex
CREATE INDEX "chat_messages_channel_id_created_at_idx" ON "chat_messages"("channel_id", "created_at");

-- CreateIndex
CREATE INDEX "gamification_ledger_event_id_attendee_id_idx" ON "gamification_ledger"("event_id", "attendee_id");

-- CreateIndex
CREATE INDEX "campaigns_event_id_idx" ON "campaigns"("event_id");

-- CreateIndex
CREATE INDEX "workflow_definitions_event_id_idx" ON "workflow_definitions"("event_id");

-- CreateIndex
CREATE INDEX "workflow_runs_definition_id_idx" ON "workflow_runs"("definition_id");

-- CreateIndex
CREATE INDEX "workflow_runs_status_idx" ON "workflow_runs"("status");

-- CreateIndex
CREATE INDEX "workflow_runs_next_run_at_idx" ON "workflow_runs"("next_run_at");

-- CreateIndex
CREATE INDEX "email_events_message_id_idx" ON "email_events"("message_id");

-- CreateIndex
CREATE INDEX "email_events_organization_id_event_at_idx" ON "email_events"("organization_id", "event", "at");

-- CreateIndex
CREATE INDEX "event_metrics_hourly_event_id_hour_bucket_idx" ON "event_metrics_hourly"("event_id", "hour_bucket");

-- CreateIndex
CREATE UNIQUE INDEX "event_metrics_hourly_event_id_hour_bucket_key" ON "event_metrics_hourly"("event_id", "hour_bucket");

-- CreateIndex
CREATE INDEX "_PromoCodeToTicketType_B_index" ON "_PromoCodeToTicketType"("B");

