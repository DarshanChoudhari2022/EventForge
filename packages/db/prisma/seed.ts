/**
 * EventForge — Database seed script.
 *
 * Creates a demo organization + owner membership, a bilingual event with
 * ticket types, a track, sessions and speakers, so every app (web/api/
 * workers) has a realistic dataset to render against during local dev.
 *
 * Usage:
 *   pnpm db:seed
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001';

async function main() {
  console.log('🌱 Seeding database…');

  // ── Demo Organization ──
  const org = await prisma.organization.upsert({
    where: { slug: 'demo-org' },
    update: {},
    create: {
      name: 'Demo Organization',
      slug: 'demo-org',
      defaultCurrency: 'usd',
      defaultLocale: 'en',
      brand: { primaryColor: '#3b82f6', logoUrl: null },
      plan: 'pro',
    },
  });
  console.log(`  ✅ Organization: ${org.name} (${org.id})`);

  // ── Demo User (mirrors Supabase auth.users) ──
  const user = await prisma.user.upsert({
    where: { id: DEMO_USER_ID },
    update: {},
    create: {
      id: DEMO_USER_ID,
      email: 'demo@eventforge.app',
      displayName: 'Demo User',
      avatarUrl: null,
    },
  });
  console.log(`  ✅ User: ${user.email} (${user.id})`);

  // ── Owner membership ──
  await prisma.organizationMember.upsert({
    where: { organizationId_userId: { organizationId: org.id, userId: user.id } },
    update: {},
    create: {
      organizationId: org.id,
      userId: user.id,
      role: 'owner',
      status: 'active',
      joinedAt: new Date(),
    },
  });
  console.log(`  ✅ Membership: owner`);

  // ── Demo Event ──
  const event = await prisma.event.create({
    data: {
      organizationId: org.id,
      name: 'Demo Event 2026',
      type: 'hybrid',
      status: 'draft',
      startsAt: new Date('2026-09-15T09:00:00Z'),
      endsAt: new Date('2026-09-17T18:00:00Z'),
      timezone: 'America/New_York',
      currency: 'usd',
      localeDefault: 'en',
      venue: {
        name: 'Grand Convention Center',
        address: { city: 'New York', country: 'USA' },
      },
      settings: { checkIn: { badgeAutoPrint: false } },
    },
  });
  console.log(`  ✅ Event: ${event.name} (${event.id})`);

  // ── Event locales (bilingual EN/FR) ──
  await prisma.eventLocale.createMany({
    data: [
      {
        eventId: event.id,
        locale: 'en',
        title: 'Demo Event 2026',
        summary: 'The flagship demo conference for EventForge.',
        content: {
          sections: [
            { type: 'hero', title: 'Demo Event 2026', subtitle: 'Build. Ship. Celebrate.' },
            { type: 'cta', label: 'Register now', href: '#register' },
          ],
        },
        seo: { title: 'Demo Event 2026', description: 'The flagship demo conference.' },
      },
      {
        eventId: event.id,
        locale: 'fr',
        title: 'Démo Événement 2026',
        summary: "La conférence démonstration phare d'EventForge.",
        content: {
          sections: [
            { type: 'hero', title: 'Démo Événement 2026', subtitle: 'Construire. Livrer. Célébrer.' },
            { type: 'cta', label: "S'inscrire", href: '#register' },
          ],
        },
        seo: { title: 'Démo Événement 2026' },
      },
    ],
  });
  console.log(`  ✅ Locales: en, fr`);

  // ── Ticket types ──
  const [general, vip, student] = await Promise.all([
    prisma.ticketType.create({
      data: {
        eventId: event.id,
        name: 'General Admission',
        kind: 'paid',
        priceCents: 19900n,
        currency: 'usd',
        quantityTotal: 500,
        maxPerOrder: 10,
        sort: 0,
      },
    }),
    prisma.ticketType.create({
      data: {
        eventId: event.id,
        name: 'VIP',
        kind: 'paid',
        priceCents: 49900n,
        currency: 'usd',
        quantityTotal: 50,
        maxPerOrder: 4,
        sort: 1,
      },
    }),
    prisma.ticketType.create({
      data: {
        eventId: event.id,
        name: 'Student',
        kind: 'paid',
        priceCents: 9900n,
        currency: 'usd',
        quantityTotal: 100,
        maxPerOrder: 1,
        sort: 2,
      },
    }),
  ]);
  console.log(`  ✅ Ticket types: ${general.name}, ${vip.name}, ${student.name}`);

  // ── Track + Session + Speaker ──
  const track = await prisma.track.create({
    data: { eventId: event.id, name: 'Main Track', color: '#2563eb', sort: 0 },
  });

  const speaker = await prisma.speaker.create({
    data: {
      eventId: event.id,
      name: 'Ada Lovelace',
      title: 'Chief Computing Officer',
      company: 'Analytical Engines Inc.',
      bio: { en: 'Pioneer of computing.', fr: 'Pionnière du calcul.' },
      status: 'confirmed',
    },
  });

  const session = await prisma.session.create({
    data: {
      eventId: event.id,
      trackId: track.id,
      title: { en: 'The Future of Events', fr: "L'avenir des événements" },
      description: { en: 'A keynote on the future of event tech.' },
      startsAt: new Date('2026-09-15T10:00:00Z'),
      endsAt: new Date('2026-09-15T11:00:00Z'),
      type: 'keynote',
      capacity: 500,
      requiresRsvp: false,
      sort: 0,
    },
  });
  await prisma.sessionSpeaker.create({
    data: { sessionId: session.id, speakerId: speaker.id, role: 'speaker' },
  });
  console.log(`  ✅ Track + Session + Speaker`);

  // ── Promo code ──
  await prisma.promoCode.create({
    data: {
      eventId: event.id,
      code: 'EARLYBIRD',
      kind: 'percent',
      value: 20,
      maxUses: 100,
      validFrom: new Date('2026-06-01T00:00:00Z'),
      validTo: new Date('2026-08-01T00:00:00Z'),
    },
  });
  console.log(`  ✅ Promo code: EARLYBIRD`);

  // ── Badge template ──
  await prisma.badgeTemplate.create({
    data: {
      eventId: event.id,
      name: 'Standard Badge',
      paperSize: 'cr80',
      isDefault: true,
      layout: {
        elements: [
          { type: 'qr', x: 10, y: 10, size: 80 },
          { type: 'text', field: 'attendeeName', x: 100, y: 30, fontSize: 18 },
          { type: 'text', field: 'ticketName', x: 100, y: 55, fontSize: 12 },
        ],
      },
    },
  });
  console.log(`  ✅ Badge template`);

  console.log('\n🎉 Seed complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
