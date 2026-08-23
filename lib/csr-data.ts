import {
  DONATION_STATUSES,
  canNotifyDonationStatus,
  donationNotificationKey,
  legacyDonationStatusFor,
  normalizeDonationStatus,
  type DonationStatus,
} from "./donation-status";
import { isEmailAddress } from "./email/address";
import { buildDonationEmail } from "./email/donationTemplates";
import { sendGmailEmail } from "./email/gmail";

/**
 * Persistence helpers for Shoe Doctor's CSR and donations programme.
 *
 * This module intentionally uses the same raw Cloudflare D1 style as
 * `lib/data.ts`. The production migration source is `migrations/`, not the
 * generated Drizzle folder, so keep any schema changes accompanied by a D1
 * migration.
 */

export const DONATION_REQUEST_STATUSES = DONATION_STATUSES;

export const DONATION_METHODS = ["self_dropoff", "pickup_support"] as const;

export const DONATION_DRIVE_STATUSES = [
  "draft",
  "upcoming",
  "active",
  "completed",
] as const;

export const RESTORATION_STORY_CATEGORIES = [
  "sneaker_restoration",
  "donated_shoe_restoration",
  "cleaning_repair",
  "community_impact",
] as const;

export type DonationRequestStatus = DonationStatus;
export type DonationMethod = (typeof DONATION_METHODS)[number];
export type DonationDriveStatus = (typeof DONATION_DRIVE_STATUSES)[number];
export type RestorationStoryCategory =
  (typeof RESTORATION_STORY_CATEGORIES)[number];

export type DonationEmailDeliveryStatus =
  | "pending"
  | "sent"
  | "failed"
  | "skipped";

export type DonationEmailEvent = {
  id: string;
  donationId: string;
  donationReference: string;
  recipientEmail: string | null;
  emailType: DonationStatus;
  workflowStatus: DonationStatus;
  eventKey: string;
  deliveryStatus: DonationEmailDeliveryStatus;
  attemptCount: number;
  errorSummary: string | null;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DonationNotificationResult = {
  event: DonationEmailEvent | null;
  status: "sent" | "failed" | "skipped" | "already_recorded" | "pending";
  reason?: "cancellation_email_not_requested";
};

export type DonationEmailRetryResult =
  | { kind: "not_found" }
  | { kind: "not_retryable"; event: DonationEmailEvent }
  | { kind: "in_progress"; event: DonationEmailEvent }
  | { kind: "failed"; event: DonationEmailEvent }
  | { kind: "retried"; event: DonationEmailEvent; donation: DonationRequest };

export type DonationRequest = {
  id: string;
  requestId: string;
  donorName: string;
  phone: string;
  email: string | null;
  emailUpdatesConsent: boolean;
  location: string;
  numberOfPairs: number;
  shoeType: string | null;
  shoeCondition: string;
  donationMethod: DonationMethod;
  pickupAddress: string | null;
  preferredPickupDate: string | null;
  donorNotes: string | null;
  internalNotes: string | null;
  status: DonationRequestStatus;
  distributionLocation: string | null;
  distributionCampaign: string | null;
  distributionDate: string | null;
  pairsDistributed: number | null;
  impactNote: string | null;
  lastEmailEvent: DonationEmailEvent | null;
  lastEmailSentAt: string | null;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type DonationRequestInput = {
  donorName: string;
  phone: string;
  email?: string | null;
  emailUpdatesConsent: boolean;
  location: string;
  numberOfPairs: number;
  shoeType?: string | null;
  shoeCondition: string;
  donationMethod: DonationMethod;
  pickupAddress?: string | null;
  preferredPickupDate?: string | null;
  donorNotes?: string | null;
};

export type DonationRequestUpdateInput = {
  status?: DonationRequestStatus;
  /** Cancellation emails require an intentional admin choice. */
  notifyDonor?: boolean;
  internalNotes?: string | null;
  distributionLocation?: string | null;
  distributionCampaign?: string | null;
  distributionDate?: string | null;
  pairsDistributed?: number | null;
  impactNote?: string | null;
};

export type DonationRequestUpdateResult = {
  request: DonationRequest;
  statusChanged: boolean;
  notification: DonationNotificationResult | null;
};

export type DonationDrive = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  fullStory: string;
  /**
   * Stored in the existing `cover_image_id` D1 column for migration
   * compatibility. The value is now a validated image URL/path, not an ID.
   */
  coverImageUrl: string | null;
  driveDate: string;
  location: string;
  partnerOrganization: string | null;
  goalPairs: number;
  pairsCollected: number;
  pairsRestored: number;
  pairsDonated: number;
  status: DonationDriveStatus;
  isPublished: boolean;
  ctaText: string | null;
  ctaLink: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DonationDriveInput = {
  slug?: string | null;
  title: string;
  shortDescription: string;
  fullStory: string;
  coverImageUrl?: string | null;
  driveDate: string;
  location: string;
  partnerOrganization?: string | null;
  goalPairs: number;
  pairsCollected: number;
  pairsRestored: number;
  pairsDonated: number;
  status: DonationDriveStatus;
  isPublished: boolean;
  ctaText?: string | null;
  ctaLink?: string | null;
};

export type RestorationStory = {
  id: string;
  slug: string;
  title: string;
  category: RestorationStoryCategory;
  /** See `DonationDrive.coverImageUrl` for the legacy D1 column mapping. */
  beforeImageUrl: string | null;
  afterImageUrl: string | null;
  description: string;
  restorationWork: string;
  storyDate: string;
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RestorationStoryInput = {
  slug?: string | null;
  title: string;
  category: RestorationStoryCategory;
  beforeImageUrl?: string | null;
  afterImageUrl?: string | null;
  description: string;
  restorationWork: string;
  storyDate: string;
  isPublished: boolean;
};

export type CommunityUpdate = {
  id: string;
  slug: string;
  title: string;
  /** See `DonationDrive.coverImageUrl` for the legacy D1 column mapping. */
  coverImageUrl: string | null;
  galleryImageUrls: string[];
  updateDate: string;
  location: string;
  recipientOrganization: string;
  shoesDonated: number;
  story: string;
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CommunityUpdateInput = {
  slug?: string | null;
  title: string;
  coverImageUrl?: string | null;
  galleryImageUrls?: string[];
  updateDate: string;
  location: string;
  recipientOrganization: string;
  shoesDonated: number;
  story: string;
  isPublished: boolean;
};

export type DonationImpactStats = {
  totalPairsCollected: number;
  totalPairsRestored: number;
  totalPairsDonated: number;
  donationDrivesCompleted: number;
  partnerOrganizations: number;
  communitiesReached: number;
  updatedAt: string;
};

export type DonationImpactStatsInput = Omit<DonationImpactStats, "updatedAt">;

export type DonationRequestListOptions = {
  search?: string;
  status?: DonationRequestStatus;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
};

export type ContentListOptions = {
  limit?: number;
  status?: DonationDriveStatus;
};

export type CsrDashboardSummary = {
  donationRequestsReceived: number;
  upcomingDonationDrives: number;
  pairsCollected: number;
  pairsRestored: number;
  pairsDonated: number;
  publishedCommunityUpdates: number;
};

export type CsrAdminInitialData = {
  requests: DonationRequest[];
  drives: DonationDrive[];
  stories: RestorationStory[];
  updates: CommunityUpdate[];
  impactStats: DonationImpactStats;
  summary: CsrDashboardSummary;
};

export type PublicDonationPageData = {
  latestDrive: DonationDrive | null;
  donationDrives: DonationDrive[];
  restorationStories: RestorationStory[];
  communityUpdates: CommunityUpdate[];
  impactStats: DonationImpactStats;
};

type RawRow = Record<string, unknown>;

const IMPACT_STATS_ID = "default";
const MAX_LIST_LIMIT = 500;

let csrSetupPromise: Promise<void> | null = null;

async function getRawDatabase() {
  const { env } = await import("cloudflare:workers");
  if (!env.DB) {
    throw new Error("Cloudflare D1 binding `DB` is unavailable.");
  }
  return env.DB;
}

/**
 * D1 migrations are the canonical schema. This legacy runtime bootstrap is
 * retained for the original CSR tables only; new schema changes must be
 * migrated before deploying code that depends on them, otherwise a runtime
 * ALTER could make the recorded migration fail later on duplicate columns.
 */
async function initialiseCsrDatabase() {
  const db = await getRawDatabase();
  await db.batch([
    db.prepare(`
      CREATE TABLE IF NOT EXISTS donation_requests (
        id TEXT PRIMARY KEY,
        request_id TEXT NOT NULL UNIQUE,
        donor_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT,
        location TEXT NOT NULL,
        number_of_pairs INTEGER NOT NULL CHECK (number_of_pairs > 0),
        shoe_type TEXT,
        shoe_condition TEXT NOT NULL,
        donation_method TEXT NOT NULL DEFAULT 'self_dropoff'
          CHECK (donation_method IN ('self_dropoff', 'pickup_support')),
        pickup_address TEXT,
        preferred_pickup_date TEXT,
        donor_notes TEXT,
        status TEXT NOT NULL DEFAULT 'new'
          CHECK (status IN (
            'new', 'contacted', 'pickup_scheduled', 'collected',
            'under_restoration', 'ready_for_donation', 'donated', 'rejected'
          )),
        internal_notes TEXT,
        submitted_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `),
    db.prepare(`
      CREATE INDEX IF NOT EXISTS donation_requests_status_submitted_idx
      ON donation_requests(status, submitted_at)
    `),
    db.prepare(`
      CREATE INDEX IF NOT EXISTS donation_requests_submitted_at_idx
      ON donation_requests(submitted_at)
    `),
    db.prepare(`
      CREATE INDEX IF NOT EXISTS donation_requests_donor_name_idx
      ON donation_requests(donor_name)
    `),
    db.prepare(`
      CREATE INDEX IF NOT EXISTS donation_requests_phone_idx
      ON donation_requests(phone)
    `),
    db.prepare(`
      CREATE INDEX IF NOT EXISTS donation_requests_location_idx
      ON donation_requests(location)
    `),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS donation_drives (
        id TEXT PRIMARY KEY,
        slug TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        short_description TEXT NOT NULL,
        full_story TEXT NOT NULL,
        cover_image_id TEXT,
        drive_date TEXT NOT NULL,
        location TEXT NOT NULL,
        partner_organization TEXT,
        goal_pairs INTEGER NOT NULL DEFAULT 0 CHECK (goal_pairs >= 0),
        pairs_collected INTEGER NOT NULL DEFAULT 0 CHECK (pairs_collected >= 0),
        pairs_restored INTEGER NOT NULL DEFAULT 0 CHECK (pairs_restored >= 0),
        pairs_donated INTEGER NOT NULL DEFAULT 0 CHECK (pairs_donated >= 0),
        status TEXT NOT NULL DEFAULT 'draft'
          CHECK (status IN ('draft', 'upcoming', 'active', 'completed')),
        is_published INTEGER NOT NULL DEFAULT 0 CHECK (is_published IN (0, 1)),
        cta_text TEXT,
        cta_link TEXT,
        published_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `),
    db.prepare(`
      CREATE INDEX IF NOT EXISTS donation_drives_published_date_idx
      ON donation_drives(is_published, drive_date)
    `),
    db.prepare(`
      CREATE INDEX IF NOT EXISTS donation_drives_status_date_idx
      ON donation_drives(status, drive_date)
    `),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS restoration_stories (
        id TEXT PRIMARY KEY,
        slug TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        category TEXT NOT NULL
          CHECK (category IN (
            'sneaker_restoration', 'donated_shoe_restoration',
            'cleaning_repair', 'community_impact'
          )),
        before_image_id TEXT,
        after_image_id TEXT,
        description TEXT NOT NULL,
        restoration_work TEXT NOT NULL,
        story_date TEXT NOT NULL,
        is_published INTEGER NOT NULL DEFAULT 0 CHECK (is_published IN (0, 1)),
        published_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `),
    db.prepare(`
      CREATE INDEX IF NOT EXISTS restoration_stories_published_date_idx
      ON restoration_stories(is_published, story_date)
    `),
    db.prepare(`
      CREATE INDEX IF NOT EXISTS restoration_stories_category_date_idx
      ON restoration_stories(category, story_date)
    `),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS community_updates (
        id TEXT PRIMARY KEY,
        slug TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        cover_image_id TEXT,
        gallery_image_ids TEXT NOT NULL DEFAULT '[]',
        update_date TEXT NOT NULL,
        location TEXT NOT NULL,
        recipient_organization TEXT NOT NULL,
        shoes_donated INTEGER NOT NULL DEFAULT 0 CHECK (shoes_donated >= 0),
        story TEXT NOT NULL,
        is_published INTEGER NOT NULL DEFAULT 0 CHECK (is_published IN (0, 1)),
        published_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `),
    db.prepare(`
      CREATE INDEX IF NOT EXISTS community_updates_published_date_idx
      ON community_updates(is_published, update_date)
    `),
    db.prepare(`
      CREATE INDEX IF NOT EXISTS community_updates_recipient_date_idx
      ON community_updates(recipient_organization, update_date)
    `),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS donation_impact_stats (
        id TEXT PRIMARY KEY,
        total_pairs_collected INTEGER NOT NULL DEFAULT 0 CHECK (total_pairs_collected >= 0),
        total_pairs_restored INTEGER NOT NULL DEFAULT 0 CHECK (total_pairs_restored >= 0),
        total_pairs_donated INTEGER NOT NULL DEFAULT 0 CHECK (total_pairs_donated >= 0),
        donation_drives_completed INTEGER NOT NULL DEFAULT 0 CHECK (donation_drives_completed >= 0),
        partner_organizations INTEGER NOT NULL DEFAULT 0 CHECK (partner_organizations >= 0),
        communities_reached INTEGER NOT NULL DEFAULT 0 CHECK (communities_reached >= 0),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `),
  ]);
}

async function ensureCsrDatabase() {
  csrSetupPromise ??= initialiseCsrDatabase().catch((error) => {
    csrSetupPromise = null;
    throw error;
  });
  await csrSetupPromise;
}

async function getDatabase() {
  await ensureCsrDatabase();
  return getRawDatabase();
}

function text(value: unknown) {
  return String(value ?? "");
}

function nullableText(value: unknown) {
  return value === null || value === undefined || value === ""
    ? null
    : String(value);
}

function number(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function nullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function bool(value: unknown) {
  return value === true || value === 1 || value === "1";
}

function stringArray(value: unknown) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(String(value));
    return Array.isArray(parsed)
      ? parsed.map((item) => String(item)).filter(Boolean)
      : [];
  } catch {
    return [];
  }
}

const MAX_IMAGE_URL_LENGTH = 2_000;

/**
 * CSR content accepts only website-relative image paths or external HTTPS
 * URLs. This intentionally keeps image binary data out of D1 and prevents
 * legacy opaque media identifiers from reaching the frontend as broken URLs.
 */
export function isSafeDonationImageUrl(value: string) {
  if (!value || value.length > MAX_IMAGE_URL_LENGTH) return false;
  if (/\s|[\u0000-\u001f\u007f]/u.test(value) || value.includes("\\")) {
    return false;
  }

  if (value.startsWith("/")) {
    if (value.startsWith("//")) return false;
    try {
      const url = new URL(value, "https://shoe-doctor.invalid");
      const pathname = decodeURIComponent(url.pathname).toLowerCase();
      return (
        !pathname.startsWith("//") &&
        !pathname.includes("\\") &&
        pathname !== "/public" &&
        !pathname.startsWith("/public/")
      );
    } catch {
      return false;
    }
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

/** Returns null for empty or legacy unsafe values read from existing D1 rows. */
export function normalizeDonationImageUrl(value: unknown) {
  const candidate = String(value ?? "").trim();
  return isSafeDonationImageUrl(candidate) ? candidate : null;
}

function parseDonationRequest(row: RawRow): DonationRequest {
  return {
    id: text(row.id),
    requestId: text(row.request_id),
    donorName: text(row.donor_name),
    phone: text(row.phone),
    email: nullableText(row.email),
    emailUpdatesConsent: bool(row.email_update_consent),
    location: text(row.location),
    numberOfPairs: number(row.number_of_pairs),
    shoeType: nullableText(row.shoe_type),
    shoeCondition: text(row.shoe_condition),
    donationMethod:
      row.donation_method === "pickup_support"
        ? "pickup_support"
        : "self_dropoff",
    pickupAddress: nullableText(row.pickup_address),
    preferredPickupDate: nullableText(row.preferred_pickup_date),
    donorNotes: nullableText(row.donor_notes),
    internalNotes: nullableText(row.internal_notes),
    status: normalizeDonationStatus(row.workflow_status, row.status),
    distributionLocation: nullableText(row.distribution_location),
    distributionCampaign: nullableText(row.distribution_campaign),
    distributionDate: nullableText(row.distribution_date),
    pairsDistributed: nullableNumber(row.pairs_distributed),
    impactNote: nullableText(row.impact_note),
    lastEmailEvent: null,
    lastEmailSentAt: null,
    submittedAt: text(row.submitted_at),
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
  };
}

function parseDonationEmailEvent(row: RawRow): DonationEmailEvent {
  const deliveryStatus = text(row.delivery_status) as DonationEmailDeliveryStatus;
  const parsedAttemptCount = nullableNumber(row.attempt_count);
  return {
    id: text(row.id),
    donationId: text(row.donation_id),
    donationReference: text(row.donation_reference),
    recipientEmail: nullableText(row.recipient_email),
    emailType: normalizeDonationStatus(row.email_type, row.workflow_status),
    workflowStatus: normalizeDonationStatus(row.workflow_status, row.email_type),
    eventKey: text(row.event_key),
    deliveryStatus:
      deliveryStatus === "sent" ||
      deliveryStatus === "failed" ||
      deliveryStatus === "skipped" ||
      deliveryStatus === "pending"
        ? deliveryStatus
        : "failed",
    attemptCount:
      parsedAttemptCount !== null && parsedAttemptCount >= 0
        ? Math.floor(parsedAttemptCount)
        : 0,
    errorSummary: nullableText(row.error_summary),
    sentAt: nullableText(row.sent_at),
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
  };
}

function parseDonationDrive(row: RawRow): DonationDrive {
  return {
    id: text(row.id),
    slug: text(row.slug),
    title: text(row.title),
    shortDescription: text(row.short_description),
    fullStory: text(row.full_story),
    coverImageUrl: normalizeDonationImageUrl(row.cover_image_id),
    driveDate: text(row.drive_date),
    location: text(row.location),
    partnerOrganization: nullableText(row.partner_organization),
    goalPairs: number(row.goal_pairs),
    pairsCollected: number(row.pairs_collected),
    pairsRestored: number(row.pairs_restored),
    pairsDonated: number(row.pairs_donated),
    status: text(row.status) as DonationDriveStatus,
    isPublished: bool(row.is_published),
    ctaText: nullableText(row.cta_text),
    ctaLink: nullableText(row.cta_link),
    publishedAt: nullableText(row.published_at),
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
  };
}

function parseRestorationStory(row: RawRow): RestorationStory {
  return {
    id: text(row.id),
    slug: text(row.slug),
    title: text(row.title),
    category: text(row.category) as RestorationStoryCategory,
    beforeImageUrl: normalizeDonationImageUrl(row.before_image_id),
    afterImageUrl: normalizeDonationImageUrl(row.after_image_id),
    description: text(row.description),
    restorationWork: text(row.restoration_work),
    storyDate: text(row.story_date),
    isPublished: bool(row.is_published),
    publishedAt: nullableText(row.published_at),
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
  };
}

function parseCommunityUpdate(row: RawRow): CommunityUpdate {
  return {
    id: text(row.id),
    slug: text(row.slug),
    title: text(row.title),
    coverImageUrl: normalizeDonationImageUrl(row.cover_image_id),
    galleryImageUrls: stringArray(row.gallery_image_ids)
      .map(normalizeDonationImageUrl)
      .filter((url): url is string => Boolean(url)),
    updateDate: text(row.update_date),
    location: text(row.location),
    recipientOrganization: text(row.recipient_organization),
    shoesDonated: number(row.shoes_donated),
    story: text(row.story),
    isPublished: bool(row.is_published),
    publishedAt: nullableText(row.published_at),
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
  };
}

function parseImpactStats(row: RawRow): DonationImpactStats {
  return {
    totalPairsCollected: number(row.total_pairs_collected),
    totalPairsRestored: number(row.total_pairs_restored),
    totalPairsDonated: number(row.total_pairs_donated),
    donationDrivesCompleted: number(row.donation_drives_completed),
    partnerOrganizations: number(row.partner_organizations),
    communitiesReached: number(row.communities_reached),
    updatedAt: text(row.updated_at),
  };
}

function boundedLimit(limit: number | undefined) {
  const value = Math.floor(Number(limit ?? MAX_LIST_LIMIT));
  return Math.max(1, Math.min(MAX_LIST_LIMIT, Number.isFinite(value) ? value : MAX_LIST_LIMIT));
}

function boundedOffset(offset: number | undefined) {
  const value = Math.floor(Number(offset ?? 0));
  return Math.max(0, Math.min(1_000_000, Number.isFinite(value) ? value : 0));
}

/** Converts a title into a stable, URL-safe starting point. */
export function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

async function uniqueSlug(
  table: "donation_drives" | "restoration_stories" | "community_updates",
  proposed: string | null | undefined,
  title: string,
  currentId?: string,
) {
  const db = await getDatabase();
  const base = slugify(proposed || title) || "shoe-donation-update";
  const contentTables = [
    "donation_drives",
    "restoration_stories",
    "community_updates",
  ] as const;

  for (let suffix = 0; suffix < 1000; suffix += 1) {
    const candidate = suffix ? `${base}-${suffix + 1}` : base;
    const matches = await Promise.all(
      contentTables.map(async (contentTable) => ({
        contentTable,
        row: await db
          .prepare(`SELECT id FROM ${contentTable} WHERE slug = ? LIMIT 1`)
          .bind(candidate)
          .first<{ id: string }>(),
      })),
    );
    const hasConflict = matches.some(
      ({ contentTable, row }) =>
        row && !(contentTable === table && row.id === currentId),
    );
    if (!hasConflict) return candidate;
  }

  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

async function runList<T>(query: string, values: unknown[], parse: (row: RawRow) => T) {
  const db = await getDatabase();
  const result = await db.prepare(query).bind(...values).all<RawRow>();
  return result.results.map(parse);
}

type Database = Awaited<ReturnType<typeof getDatabase>>;

async function attachDonationEmailEvents(donations: DonationRequest[]) {
  if (!donations.length) return;
  const donationIds = donations.map((donation) => donation.id);
  const placeholders = donationIds.map(() => "?").join(", ");
  const db = await getDatabase();
  const result = await db
    .prepare(`
      SELECT * FROM donation_email_events
      WHERE donation_id IN (${placeholders})
      ORDER BY created_at DESC, id DESC
    `)
    .bind(...donationIds)
    .all<RawRow>();
  const latestByDonationId = new Map<string, DonationEmailEvent>();
  const latestSentAtByDonationId = new Map<string, string>();
  result.results.forEach((row) => {
    const event = parseDonationEmailEvent(row);
    if (!latestByDonationId.has(event.donationId)) {
      latestByDonationId.set(event.donationId, event);
    }
    if (
      event.sentAt &&
      (event.sentAt > (latestSentAtByDonationId.get(event.donationId) ?? ""))
    ) {
      latestSentAtByDonationId.set(event.donationId, event.sentAt);
    }
  });
  donations.forEach((donation) => {
    donation.lastEmailEvent = latestByDonationId.get(donation.id) ?? null;
    donation.lastEmailSentAt = latestSentAtByDonationId.get(donation.id) ?? null;
  });
}

export async function createDonationRequest(
  input: DonationRequestInput,
): Promise<DonationRequest> {
  const id = crypto.randomUUID();
  const requestId = `DON-${Date.now().toString(36).toUpperCase()}-${id
    .slice(0, 4)
    .toUpperCase()}`;
  const now = new Date().toISOString();
  const db = await getDatabase();
  await db
    .prepare(
      `INSERT INTO donation_requests (
        id, request_id, donor_name, phone, email, location, number_of_pairs,
        shoe_type, shoe_condition, donation_method, pickup_address,
        preferred_pickup_date, donor_notes, status, workflow_status,
        email_update_consent, internal_notes, distribution_location,
        distribution_campaign, distribution_date, pairs_distributed, impact_note,
        submitted_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', 'submitted', ?, NULL, NULL, NULL, NULL, NULL, NULL, ?, ?, ?)`,
    )
    .bind(
      id,
      requestId,
      input.donorName,
      input.phone,
      input.email ?? null,
      input.location,
      input.numberOfPairs,
      input.shoeType ?? null,
      input.shoeCondition,
      input.donationMethod,
      input.pickupAddress ?? null,
      input.preferredPickupDate ?? null,
      input.donorNotes ?? null,
      input.emailUpdatesConsent ? 1 : 0,
      now,
      now,
      now,
    )
    .run();

  return {
    id,
    requestId,
    donorName: input.donorName,
    phone: input.phone,
    email: input.email ?? null,
    emailUpdatesConsent: input.emailUpdatesConsent,
    location: input.location,
    numberOfPairs: input.numberOfPairs,
    shoeType: input.shoeType ?? null,
    shoeCondition: input.shoeCondition,
    donationMethod: input.donationMethod,
    pickupAddress: input.pickupAddress ?? null,
    preferredPickupDate: input.preferredPickupDate ?? null,
    donorNotes: input.donorNotes ?? null,
    internalNotes: null,
    status: "submitted",
    distributionLocation: null,
    distributionCampaign: null,
    distributionDate: null,
    pairsDistributed: null,
    impactNote: null,
    lastEmailEvent: null,
    lastEmailSentAt: null,
    submittedAt: now,
    createdAt: now,
    updatedAt: now,
  };
}

export async function listDonationRequests(
  options: DonationRequestListOptions = {},
) {
  const clauses: string[] = [];
  const values: unknown[] = [];
  const search = options.search?.trim();
  if (search) {
    const term = `%${search.toLowerCase()}%`;
    clauses.push(
      "(LOWER(request_id) LIKE ? OR LOWER(donor_name) LIKE ? OR LOWER(phone) LIKE ? OR LOWER(email) LIKE ? OR LOWER(location) LIKE ?)",
    );
    values.push(term, term, term, term, term);
  }
  if (options.status) {
    clauses.push("workflow_status = ?");
    values.push(options.status);
  }
  if (options.dateFrom) {
    clauses.push("submitted_at >= ?");
    values.push(`${options.dateFrom}T00:00:00.000Z`);
  }
  if (options.dateTo) {
    clauses.push("submitted_at <= ?");
    values.push(`${options.dateTo}T23:59:59.999Z`);
  }
  values.push(boundedLimit(options.limit), boundedOffset(options.offset));
  const requests = await runList(
    `SELECT * FROM donation_requests${clauses.length ? ` WHERE ${clauses.join(" AND ")}` : ""}
     ORDER BY submitted_at DESC LIMIT ? OFFSET ?`,
    values,
    parseDonationRequest,
  );
  await attachDonationEmailEvents(requests);
  return requests;
}

export async function countDonationRequests(
  options: DonationRequestListOptions = {},
) {
  const clauses: string[] = [];
  const values: unknown[] = [];
  const search = options.search?.trim();
  if (search) {
    const term = `%${search.toLowerCase()}%`;
    clauses.push(
      "(LOWER(request_id) LIKE ? OR LOWER(donor_name) LIKE ? OR LOWER(phone) LIKE ? OR LOWER(email) LIKE ? OR LOWER(location) LIKE ?)",
    );
    values.push(term, term, term, term, term);
  }
  if (options.status) {
    clauses.push("workflow_status = ?");
    values.push(options.status);
  }
  if (options.dateFrom) {
    clauses.push("submitted_at >= ?");
    values.push(`${options.dateFrom}T00:00:00.000Z`);
  }
  if (options.dateTo) {
    clauses.push("submitted_at <= ?");
    values.push(`${options.dateTo}T23:59:59.999Z`);
  }
  const db = await getDatabase();
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS count FROM donation_requests${clauses.length ? ` WHERE ${clauses.join(" AND ")}` : ""}`,
    )
    .bind(...values)
    .first<{ count: number }>();
  return number(row?.count);
}

export async function getDonationRequest(id: string) {
  const db = await getDatabase();
  const row = await db
    .prepare("SELECT * FROM donation_requests WHERE id = ? LIMIT 1")
    .bind(id)
    .first<RawRow>();
  if (!row) return null;
  const donation = parseDonationRequest(row);
  await attachDonationEmailEvents([donation]);
  return donation;
}

export async function updateDonationRequest(
  id: string,
  input: DonationRequestUpdateInput,
): Promise<DonationRequestUpdateResult | null> {
  const current = await getDonationRequest(id);
  if (!current) return null;
  const nextStatus = input.status ?? current.status;
  const statusChanged = nextStatus !== current.status;
  const nextInternalNotes =
    input.internalNotes === undefined ? current.internalNotes : input.internalNotes;
  const nextDistributionLocation =
    input.distributionLocation === undefined
      ? current.distributionLocation
      : input.distributionLocation;
  const nextDistributionCampaign =
    input.distributionCampaign === undefined
      ? current.distributionCampaign
      : input.distributionCampaign;
  const nextDistributionDate =
    input.distributionDate === undefined
      ? current.distributionDate
      : input.distributionDate;
  const nextPairsDistributed =
    input.pairsDistributed === undefined
      ? current.pairsDistributed
      : input.pairsDistributed;
  const nextImpactNote =
    input.impactNote === undefined ? current.impactNote : input.impactNote;
  const now = new Date().toISOString();
  const db = await getDatabase();
  const updated: DonationRequest = {
    ...current,
    status: nextStatus,
    internalNotes: nextInternalNotes,
    distributionLocation: nextDistributionLocation,
    distributionCampaign: nextDistributionCampaign,
    distributionDate: nextDistributionDate,
    pairsDistributed: nextPairsDistributed,
    impactNote: nextImpactNote,
    updatedAt: now,
  };
  const transitionId = statusChanged ? crypto.randomUUID() : null;
  const notificationPlan = statusChanged
    ? buildDonationEmailPlan(updated, nextStatus, {
        notifyCancellation: input.notifyDonor === true,
      })
    : null;
  const notificationEvent =
    notificationPlan?.persistEvent && transitionId
      ? donationEmailEventFromPlan(updated, nextStatus, notificationPlan, now)
      : null;
  const updateStatement = db
    .prepare(
      `UPDATE donation_requests SET
        status = CASE WHEN ? THEN ? ELSE status END,
        workflow_status = ?, internal_notes = ?,
        distribution_location = ?, distribution_campaign = ?, distribution_date = ?,
        pairs_distributed = ?, impact_note = ?, updated_at = ?,
        last_workflow_event_id = CASE WHEN ? THEN ? ELSE last_workflow_event_id END
       WHERE id = ?${statusChanged ? " AND workflow_status = ?" : ""}`,
    )
    .bind(
      statusChanged ? 1 : 0,
      legacyDonationStatusFor(nextStatus),
      nextStatus,
      nextInternalNotes,
      nextDistributionLocation,
      nextDistributionCampaign,
      nextDistributionDate,
      nextPairsDistributed,
      nextImpactNote,
      now,
      statusChanged ? 1 : 0,
      transitionId,
      id,
      ...(statusChanged ? [current.status] : []),
    );
  const statements = [updateStatement];
  if (notificationEvent) {
    statements.push(
      prepareDonationEmailEventInsert(db, notificationEvent, transitionId),
    );
  }
  // The event insert is guarded by the transition token written by this exact
  // conditional UPDATE. D1 executes batch statements transactionally, so a
  // failed event write cannot leave a successful status change without its
  // durable delivery record.
  const results = await db.batch(statements);

  if (!results[0]?.meta.changes) {
    const refreshed = await getDonationRequest(id);
    return refreshed
      ? { request: refreshed, statusChanged: false, notification: null }
      : null;
  }

  let notification: DonationNotificationResult | null = null;
  if (statusChanged && notificationPlan) {
    if (!notificationEvent) {
      notification = {
        status: "skipped",
        event: null,
        reason: notificationPlan.reason,
      };
    } else if (!results[1]?.meta.changes) {
      const existing = await findDonationEmailEvent(
        db,
        updated.id,
        notificationEvent.eventKey,
      );
      if (!existing) {
        throw new Error("Unable to create the donation email event.");
      }
      notification = { status: "already_recorded", event: existing };
    } else if (
      notificationEvent.deliveryStatus !== "pending" ||
      !notificationPlan.content ||
      !notificationEvent.recipientEmail
    ) {
      notification = { status: "skipped", event: notificationEvent };
    } else {
      const delivered = await deliverDonationEmail(
        db,
        updated,
        notificationEvent,
        notificationPlan.content,
      );
      notification = {
        status:
          delivered.deliveryStatus === "sent"
            ? "sent"
            : delivered.deliveryStatus === "pending"
              ? "pending"
              : "failed",
        event: delivered,
      };
    }
  }
  if (notification?.event) {
    updated.lastEmailEvent = notification.event;
    if (notification.event.sentAt) {
      updated.lastEmailSentAt = notification.event.sentAt;
    }
  }
  return { request: updated, statusChanged, notification };
}

type DonationEmailPlan = {
  attemptCount: number;
  content: ReturnType<typeof buildDonationEmail> | null;
  deliveryStatus: DonationEmailDeliveryStatus;
  errorSummary: string | null;
  persistEvent: boolean;
  recipientEmail: string | null;
  reason?: "cancellation_email_not_requested";
};

type DonationNotificationOptions = {
  notifyCancellation?: boolean;
};

/**
 * Persists a single durable email event before delivery. The unique event key
 * is the server-side duplicate guard; frontend state never controls it.
 */
export async function sendDonationStatusNotification(
  donation: DonationRequest,
  status: DonationStatus = donation.status,
  options: DonationNotificationOptions = {},
): Promise<DonationNotificationResult> {
  const plan = buildDonationEmailPlan(donation, status, options);
  if (!plan.persistEvent) {
    return {
      status: "skipped",
      event: null,
      reason: plan.reason,
    };
  }
  const now = new Date().toISOString();
  const event = donationEmailEventFromPlan(donation, status, plan, now);
  let db: Database;
  try {
    db = await getDatabase();
    const created = await prepareDonationEmailEventInsert(db, event).run();
    if (!created.meta.changes) {
      const existing = await findDonationEmailEvent(
        db,
        donation.id,
        event.eventKey,
      );
      return { status: "already_recorded", event: existing };
    }
  } catch {
    // Do not send an email if we could not first create its idempotency record.
    console.error(
      `Unable to create donation email event for ${donation.requestId}.`,
    );
    return { status: "failed", event: null };
  }

  if (event.deliveryStatus !== "pending" || !plan.content || !event.recipientEmail) {
    return { status: "skipped", event };
  }

  const delivered = await deliverDonationEmail(db, donation, event, plan.content);
  return {
    status:
      delivered.deliveryStatus === "sent"
        ? "sent"
        : delivered.deliveryStatus === "pending"
          ? "pending"
          : "failed",
    event: delivered,
  };
}

/**
 * Failed deliveries can be retried by an authenticated admin. A conditional
 * claim makes one attempt active at a time and preserves the original event
 * key, so retrying cannot create a second lifecycle email record.
 */
export async function retryDonationEmailEvent(
  donationId: string,
  eventId: string,
): Promise<DonationEmailRetryResult> {
  const db = await getDatabase();
  const event = await findDonationEmailEventById(db, donationId, eventId);
  if (!event) return { kind: "not_found" };
  if (event.deliveryStatus !== "failed") {
    return { kind: "not_retryable", event };
  }

  const now = new Date().toISOString();
  const claim = await db
    .prepare(`
      UPDATE donation_email_events
      SET delivery_status = 'pending', attempt_count = attempt_count + 1,
          error_summary = NULL, updated_at = ?
      WHERE id = ? AND donation_id = ? AND delivery_status = 'failed'
    `)
    .bind(now, eventId, donationId)
    .run();
  if (!claim.meta.changes) {
    const current = await findDonationEmailEventById(db, donationId, eventId);
    return current?.deliveryStatus === "pending"
      ? { kind: "in_progress", event: current }
      : { kind: "not_retryable", event: current ?? event };
  }

  const claimed: DonationEmailEvent = {
    ...event,
    deliveryStatus: "pending",
    attemptCount: event.attemptCount + 1,
    errorSummary: null,
    sentAt: null,
    updatedAt: now,
  };
  const donation = await getDonationRequest(donationId);
  if (!donation) {
    const failed = await recordDonationEmailWithoutDelivery(
      db,
      claimed,
      "donation_data_unavailable",
    );
    return { kind: "failed", event: failed };
  }

  const recipient = claimed.recipientEmail?.trim() ?? "";
  if (!recipient) {
    const failed = await recordDonationEmailWithoutDelivery(
      db,
      claimed,
      "donor_email_missing",
    );
    return { kind: "failed", event: failed };
  }
  if (!isEmailAddress(recipient)) {
    const failed = await recordDonationEmailWithoutDelivery(
      db,
      claimed,
      "donor_email_invalid",
    );
    return { kind: "failed", event: failed };
  }

  const delivered = await deliverDonationEmail(
    db,
    donation,
    { ...claimed, recipientEmail: recipient },
    buildDonationEmail(claimed.workflowStatus, donation),
  );
  donation.lastEmailEvent = delivered;
  if (delivered.sentAt) donation.lastEmailSentAt = delivered.sentAt;
  return { kind: "retried", event: delivered, donation };
}

function buildDonationEmailPlan(
  donation: DonationRequest,
  status: DonationStatus,
  options: DonationNotificationOptions = {},
): DonationEmailPlan {
  if (status === "cancelled" && !options.notifyCancellation) {
    return {
      attemptCount: 0,
      content: null,
      deliveryStatus: "skipped",
      errorSummary: "cancellation_email_not_requested",
      persistEvent: false,
      reason: "cancellation_email_not_requested",
      recipientEmail: null,
    };
  }
  const content = buildDonationEmail(status, donation);
  if (
    !canNotifyDonationStatus(
      status,
      donation.emailUpdatesConsent,
      options.notifyCancellation,
    )
  ) {
    return {
      attemptCount: 0,
      content,
      deliveryStatus: "skipped",
      errorSummary: "email_updates_not_requested",
      persistEvent: true,
      recipientEmail: null,
    };
  }
  const recipientEmail = donation.email?.trim() ?? "";
  if (!recipientEmail) {
    return {
      attemptCount: 0,
      content,
      deliveryStatus: "skipped",
      errorSummary: "donor_email_missing",
      persistEvent: true,
      recipientEmail: null,
    };
  }
  if (!isEmailAddress(recipientEmail)) {
    return {
      attemptCount: 0,
      content,
      deliveryStatus: "skipped",
      errorSummary: "donor_email_invalid",
      persistEvent: true,
      recipientEmail,
    };
  }
  return {
    attemptCount: 1,
    content,
    deliveryStatus: "pending",
    errorSummary: null,
    persistEvent: true,
    recipientEmail,
  };
}

function donationEmailEventFromPlan(
  donation: DonationRequest,
  status: DonationStatus,
  plan: DonationEmailPlan,
  now: string,
): DonationEmailEvent {
  return {
    id: crypto.randomUUID(),
    donationId: donation.id,
    donationReference: donation.requestId,
    recipientEmail: plan.recipientEmail,
    emailType: status,
    workflowStatus: status,
    eventKey: donationNotificationKey(status),
    deliveryStatus: plan.deliveryStatus,
    attemptCount: plan.attemptCount,
    errorSummary: plan.errorSummary,
    sentAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

function prepareDonationEmailEventInsert(
  db: Database,
  event: DonationEmailEvent,
  transitionId?: string | null,
) {
  const transitionGuard = transitionId
    ? `
      WHERE EXISTS (
        SELECT 1 FROM donation_requests
        WHERE id = ? AND last_workflow_event_id = ?
      )
    `
    : "";
  return db
    .prepare(`
      INSERT OR IGNORE INTO donation_email_events (
        id, donation_id, donation_reference, recipient_email, email_type,
        workflow_status, event_key, delivery_status, attempt_count,
        error_summary, sent_at, created_at, updated_at
      )
      SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?${transitionGuard}
    `)
    .bind(
      event.id,
      event.donationId,
      event.donationReference,
      event.recipientEmail,
      event.emailType,
      event.workflowStatus,
      event.eventKey,
      event.deliveryStatus,
      event.attemptCount,
      event.errorSummary,
      event.createdAt,
      event.updatedAt,
      ...(transitionId ? [event.donationId, transitionId] : []),
    );
}

async function findDonationEmailEvent(
  db: Database,
  donationId: string,
  eventKey: string,
) {
  const row = await db
    .prepare(
      "SELECT * FROM donation_email_events WHERE donation_id = ? AND event_key = ? LIMIT 1",
    )
    .bind(donationId, eventKey)
    .first<RawRow>();
  return row ? parseDonationEmailEvent(row) : null;
}

async function findDonationEmailEventById(
  db: Database,
  donationId: string,
  eventId: string,
) {
  const row = await db
    .prepare(
      "SELECT * FROM donation_email_events WHERE id = ? AND donation_id = ? LIMIT 1",
    )
    .bind(eventId, donationId)
    .first<RawRow>();
  return row ? parseDonationEmailEvent(row) : null;
}

async function recordDonationEmailWithoutDelivery(
  db: Database,
  event: DonationEmailEvent,
  errorSummary: string,
) {
  const now = new Date().toISOString();
  const next: DonationEmailEvent = {
    ...event,
    deliveryStatus: "failed",
    errorSummary,
    sentAt: null,
    updatedAt: now,
  };
  try {
    await db
      .prepare(`
        UPDATE donation_email_events
        SET delivery_status = 'failed', error_summary = ?, sent_at = NULL, updated_at = ?
        WHERE id = ? AND donation_id = ? AND delivery_status = 'pending'
      `)
      .bind(next.errorSummary, next.updatedAt, next.id, next.donationId)
      .run();
  } catch {
    console.error(
      `Unable to record donation email retry outcome for ${event.donationReference}; event ${event.id}.`,
    );
    return {
      ...event,
      errorSummary: "email_result_persist_failed",
      updatedAt: now,
    };
  }
  return next;
}

async function deliverDonationEmail(
  db: Database,
  donation: DonationRequest,
  event: DonationEmailEvent,
  content: ReturnType<typeof buildDonationEmail>,
) {
  let result:
    | { status: "sent" }
    | { status: "failed"; errorCode: string };
  try {
    result = await sendGmailEmail({
      to: event.recipientEmail ?? "",
      subject: content.subject,
      text: content.text,
      html: content.html,
    });
  } catch {
    result = { status: "failed", errorCode: "donation_email_unavailable" };
  }

  const now = new Date().toISOString();
  const next: DonationEmailEvent = {
    ...event,
    deliveryStatus: result.status === "sent" ? "sent" : "failed",
    errorSummary: result.status === "sent" ? null : result.errorCode,
    sentAt: result.status === "sent" ? now : null,
    updatedAt: now,
  };
  if (result.status === "failed") {
    console.error(
      `Donation email failed for ${donation.requestId}; event ${event.id}; ${result.errorCode}.`,
    );
  }
  try {
    await db
      .prepare(`
        UPDATE donation_email_events
        SET delivery_status = ?, error_summary = ?, sent_at = ?, updated_at = ?
        WHERE id = ? AND delivery_status = 'pending'
      `)
      .bind(
        next.deliveryStatus,
        next.errorSummary,
        next.sentAt,
        next.updatedAt,
        next.id,
      )
      .run();
  } catch {
    // The pre-send event remains pending, intentionally preventing a blind
    // resend when Gmail may already have accepted the message.
    console.error(
      `Unable to record donation email outcome for ${donation.requestId}; event ${event.id}.`,
    );
    return {
      ...event,
      errorSummary: "email_result_persist_failed",
      updatedAt: now,
    };
  }
  return next;
}

export async function deleteDonationRequest(id: string) {
  const db = await getDatabase();
  const result = await db
    .prepare("DELETE FROM donation_requests WHERE id = ?")
    .bind(id)
    .run();
  return Boolean(result.meta.changes);
}

export async function listDonationDrives(options: ContentListOptions = {}) {
  const clauses: string[] = [];
  const values: unknown[] = [];
  if (options.status) {
    clauses.push("status = ?");
    values.push(options.status);
  }
  values.push(boundedLimit(options.limit));
  return runList(
    `SELECT * FROM donation_drives${clauses.length ? ` WHERE ${clauses.join(" AND ")}` : ""}
     ORDER BY drive_date DESC, created_at DESC LIMIT ?`,
    values,
    parseDonationDrive,
  );
}

export async function listPublicDonationDrives(options: ContentListOptions = {}) {
  const clauses = ["is_published = 1"];
  const values: unknown[] = [];
  if (options.status) {
    clauses.push("status = ?");
    values.push(options.status);
  }
  values.push(boundedLimit(options.limit));
  return runList(
    `SELECT * FROM donation_drives WHERE ${clauses.join(" AND ")}
     ORDER BY drive_date DESC, created_at DESC LIMIT ?`,
    values,
    parseDonationDrive,
  );
}

export async function getDonationDrive(id: string) {
  const db = await getDatabase();
  const row = await db
    .prepare("SELECT * FROM donation_drives WHERE id = ? LIMIT 1")
    .bind(id)
    .first<RawRow>();
  return row ? parseDonationDrive(row) : null;
}

export async function getPublicDonationDriveBySlug(slug: string) {
  const db = await getDatabase();
  const row = await db
    .prepare(
      "SELECT * FROM donation_drives WHERE slug = ? AND is_published = 1 LIMIT 1",
    )
    .bind(slug)
    .first<RawRow>();
  return row ? parseDonationDrive(row) : null;
}

export async function createDonationDrive(
  input: DonationDriveInput,
): Promise<DonationDrive> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const slug = await uniqueSlug("donation_drives", input.slug, input.title);
  const publishedAt = input.isPublished ? now : null;
  const db = await getDatabase();
  await db
    .prepare(
      `INSERT INTO donation_drives (
        id, slug, title, short_description, full_story, cover_image_id,
        drive_date, location, partner_organization, goal_pairs, pairs_collected,
        pairs_restored, pairs_donated, status, is_published, cta_text, cta_link,
        published_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      slug,
      input.title,
      input.shortDescription,
      input.fullStory,
      input.coverImageUrl ?? null,
      input.driveDate,
      input.location,
      input.partnerOrganization ?? null,
      input.goalPairs,
      input.pairsCollected,
      input.pairsRestored,
      input.pairsDonated,
      input.status,
      input.isPublished ? 1 : 0,
      input.ctaText ?? null,
      input.ctaLink ?? null,
      publishedAt,
      now,
      now,
    )
    .run();
  return {
    id,
    ...input,
    slug,
    coverImageUrl: input.coverImageUrl ?? null,
    partnerOrganization: input.partnerOrganization ?? null,
    ctaText: input.ctaText ?? null,
    ctaLink: input.ctaLink ?? null,
    publishedAt,
    createdAt: now,
    updatedAt: now,
  };
}

export async function updateDonationDrive(
  id: string,
  input: DonationDriveInput,
): Promise<DonationDrive | null> {
  const current = await getDonationDrive(id);
  if (!current) return null;
  const now = new Date().toISOString();
  const slug = await uniqueSlug(
    "donation_drives",
    input.slug || current.slug,
    input.title,
    id,
  );
  const publishedAt = input.isPublished ? current.publishedAt ?? now : null;
  const db = await getDatabase();
  await db
    .prepare(
      `UPDATE donation_drives SET
        slug = ?, title = ?, short_description = ?, full_story = ?,
        cover_image_id = ?, drive_date = ?, location = ?, partner_organization = ?,
        goal_pairs = ?, pairs_collected = ?, pairs_restored = ?, pairs_donated = ?,
        status = ?, is_published = ?, cta_text = ?, cta_link = ?, published_at = ?,
        updated_at = ?
       WHERE id = ?`,
    )
    .bind(
      slug,
      input.title,
      input.shortDescription,
      input.fullStory,
      input.coverImageUrl ?? null,
      input.driveDate,
      input.location,
      input.partnerOrganization ?? null,
      input.goalPairs,
      input.pairsCollected,
      input.pairsRestored,
      input.pairsDonated,
      input.status,
      input.isPublished ? 1 : 0,
      input.ctaText ?? null,
      input.ctaLink ?? null,
      publishedAt,
      now,
      id,
    )
    .run();
  return {
    id,
    ...input,
    slug,
    coverImageUrl: input.coverImageUrl ?? null,
    partnerOrganization: input.partnerOrganization ?? null,
    ctaText: input.ctaText ?? null,
    ctaLink: input.ctaLink ?? null,
    publishedAt,
    createdAt: current.createdAt,
    updatedAt: now,
  };
}

export async function deleteDonationDrive(id: string) {
  const db = await getDatabase();
  const result = await db
    .prepare("DELETE FROM donation_drives WHERE id = ?")
    .bind(id)
    .run();
  return Boolean(result.meta.changes);
}

export async function listRestorationStories(options: { limit?: number } = {}) {
  return runList(
    "SELECT * FROM restoration_stories ORDER BY story_date DESC, created_at DESC LIMIT ?",
    [boundedLimit(options.limit)],
    parseRestorationStory,
  );
}

export async function listPublicRestorationStories(options: { limit?: number } = {}) {
  return runList(
    `SELECT * FROM restoration_stories WHERE is_published = 1
     ORDER BY story_date DESC, created_at DESC LIMIT ?`,
    [boundedLimit(options.limit)],
    parseRestorationStory,
  );
}

export async function getRestorationStory(id: string) {
  const db = await getDatabase();
  const row = await db
    .prepare("SELECT * FROM restoration_stories WHERE id = ? LIMIT 1")
    .bind(id)
    .first<RawRow>();
  return row ? parseRestorationStory(row) : null;
}

export async function getPublicRestorationStoryBySlug(slug: string) {
  const db = await getDatabase();
  const row = await db
    .prepare(
      "SELECT * FROM restoration_stories WHERE slug = ? AND is_published = 1 LIMIT 1",
    )
    .bind(slug)
    .first<RawRow>();
  return row ? parseRestorationStory(row) : null;
}

export async function createRestorationStory(
  input: RestorationStoryInput,
): Promise<RestorationStory> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const slug = await uniqueSlug("restoration_stories", input.slug, input.title);
  const publishedAt = input.isPublished ? now : null;
  const db = await getDatabase();
  await db
    .prepare(
      `INSERT INTO restoration_stories (
        id, slug, title, category, before_image_id, after_image_id, description,
        restoration_work, story_date, is_published, published_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      slug,
      input.title,
      input.category,
      input.beforeImageUrl ?? null,
      input.afterImageUrl ?? null,
      input.description,
      input.restorationWork,
      input.storyDate,
      input.isPublished ? 1 : 0,
      publishedAt,
      now,
      now,
    )
    .run();
  return {
    id,
    ...input,
    slug,
    beforeImageUrl: input.beforeImageUrl ?? null,
    afterImageUrl: input.afterImageUrl ?? null,
    publishedAt,
    createdAt: now,
    updatedAt: now,
  };
}

export async function updateRestorationStory(
  id: string,
  input: RestorationStoryInput,
): Promise<RestorationStory | null> {
  const current = await getRestorationStory(id);
  if (!current) return null;
  const now = new Date().toISOString();
  const slug = await uniqueSlug(
    "restoration_stories",
    input.slug || current.slug,
    input.title,
    id,
  );
  const publishedAt = input.isPublished ? current.publishedAt ?? now : null;
  const db = await getDatabase();
  await db
    .prepare(
      `UPDATE restoration_stories SET
        slug = ?, title = ?, category = ?, before_image_id = ?, after_image_id = ?,
        description = ?, restoration_work = ?, story_date = ?, is_published = ?,
        published_at = ?, updated_at = ?
       WHERE id = ?`,
    )
    .bind(
      slug,
      input.title,
      input.category,
      input.beforeImageUrl ?? null,
      input.afterImageUrl ?? null,
      input.description,
      input.restorationWork,
      input.storyDate,
      input.isPublished ? 1 : 0,
      publishedAt,
      now,
      id,
    )
    .run();
  return {
    id,
    ...input,
    slug,
    beforeImageUrl: input.beforeImageUrl ?? null,
    afterImageUrl: input.afterImageUrl ?? null,
    publishedAt,
    createdAt: current.createdAt,
    updatedAt: now,
  };
}

export async function deleteRestorationStory(id: string) {
  const db = await getDatabase();
  const result = await db
    .prepare("DELETE FROM restoration_stories WHERE id = ?")
    .bind(id)
    .run();
  return Boolean(result.meta.changes);
}

export async function listCommunityUpdates(options: { limit?: number } = {}) {
  return runList(
    "SELECT * FROM community_updates ORDER BY update_date DESC, created_at DESC LIMIT ?",
    [boundedLimit(options.limit)],
    parseCommunityUpdate,
  );
}

export async function listPublicCommunityUpdates(options: { limit?: number } = {}) {
  return runList(
    `SELECT * FROM community_updates WHERE is_published = 1
     ORDER BY update_date DESC, created_at DESC LIMIT ?`,
    [boundedLimit(options.limit)],
    parseCommunityUpdate,
  );
}

export async function getCommunityUpdate(id: string) {
  const db = await getDatabase();
  const row = await db
    .prepare("SELECT * FROM community_updates WHERE id = ? LIMIT 1")
    .bind(id)
    .first<RawRow>();
  return row ? parseCommunityUpdate(row) : null;
}

export async function getPublicCommunityUpdateBySlug(slug: string) {
  const db = await getDatabase();
  const row = await db
    .prepare(
      "SELECT * FROM community_updates WHERE slug = ? AND is_published = 1 LIMIT 1",
    )
    .bind(slug)
    .first<RawRow>();
  return row ? parseCommunityUpdate(row) : null;
}

export async function createCommunityUpdate(
  input: CommunityUpdateInput,
): Promise<CommunityUpdate> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const slug = await uniqueSlug("community_updates", input.slug, input.title);
  const publishedAt = input.isPublished ? now : null;
  const galleryImageUrls = input.galleryImageUrls ?? [];
  const db = await getDatabase();
  await db
    .prepare(
      `INSERT INTO community_updates (
        id, slug, title, cover_image_id, gallery_image_ids, update_date, location,
        recipient_organization, shoes_donated, story, is_published, published_at,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      slug,
      input.title,
      input.coverImageUrl ?? null,
      JSON.stringify(galleryImageUrls),
      input.updateDate,
      input.location,
      input.recipientOrganization,
      input.shoesDonated,
      input.story,
      input.isPublished ? 1 : 0,
      publishedAt,
      now,
      now,
    )
    .run();
  return {
    id,
    ...input,
    slug,
    coverImageUrl: input.coverImageUrl ?? null,
    galleryImageUrls,
    publishedAt,
    createdAt: now,
    updatedAt: now,
  };
}

export async function updateCommunityUpdate(
  id: string,
  input: CommunityUpdateInput,
): Promise<CommunityUpdate | null> {
  const current = await getCommunityUpdate(id);
  if (!current) return null;
  const now = new Date().toISOString();
  const slug = await uniqueSlug(
    "community_updates",
    input.slug || current.slug,
    input.title,
    id,
  );
  const publishedAt = input.isPublished ? current.publishedAt ?? now : null;
  const galleryImageUrls = input.galleryImageUrls ?? [];
  const db = await getDatabase();
  await db
    .prepare(
      `UPDATE community_updates SET
        slug = ?, title = ?, cover_image_id = ?, gallery_image_ids = ?,
        update_date = ?, location = ?, recipient_organization = ?, shoes_donated = ?,
        story = ?, is_published = ?, published_at = ?, updated_at = ?
       WHERE id = ?`,
    )
    .bind(
      slug,
      input.title,
      input.coverImageUrl ?? null,
      JSON.stringify(galleryImageUrls),
      input.updateDate,
      input.location,
      input.recipientOrganization,
      input.shoesDonated,
      input.story,
      input.isPublished ? 1 : 0,
      publishedAt,
      now,
      id,
    )
    .run();
  return {
    id,
    ...input,
    slug,
    coverImageUrl: input.coverImageUrl ?? null,
    galleryImageUrls,
    publishedAt,
    createdAt: current.createdAt,
    updatedAt: now,
  };
}

export async function deleteCommunityUpdate(id: string) {
  const db = await getDatabase();
  const result = await db
    .prepare("DELETE FROM community_updates WHERE id = ?")
    .bind(id)
    .run();
  return Boolean(result.meta.changes);
}

const emptyImpactStats = (): DonationImpactStats => ({
  totalPairsCollected: 0,
  totalPairsRestored: 0,
  totalPairsDonated: 0,
  donationDrivesCompleted: 0,
  partnerOrganizations: 0,
  communitiesReached: 0,
  updatedAt: new Date(0).toISOString(),
});

export async function getDonationImpactStats(): Promise<DonationImpactStats> {
  const db = await getDatabase();
  const row = await db
    .prepare("SELECT * FROM donation_impact_stats WHERE id = ? LIMIT 1")
    .bind(IMPACT_STATS_ID)
    .first<RawRow>();
  return row ? parseImpactStats(row) : emptyImpactStats();
}

export async function updateDonationImpactStats(input: DonationImpactStatsInput) {
  const now = new Date().toISOString();
  const db = await getDatabase();
  await db
    .prepare(
      `INSERT INTO donation_impact_stats (
        id, total_pairs_collected, total_pairs_restored, total_pairs_donated,
        donation_drives_completed, partner_organizations, communities_reached,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        total_pairs_collected = excluded.total_pairs_collected,
        total_pairs_restored = excluded.total_pairs_restored,
        total_pairs_donated = excluded.total_pairs_donated,
        donation_drives_completed = excluded.donation_drives_completed,
        partner_organizations = excluded.partner_organizations,
        communities_reached = excluded.communities_reached,
        updated_at = excluded.updated_at`,
    )
    .bind(
      IMPACT_STATS_ID,
      input.totalPairsCollected,
      input.totalPairsRestored,
      input.totalPairsDonated,
      input.donationDrivesCompleted,
      input.partnerOrganizations,
      input.communitiesReached,
      now,
      now,
    )
    .run();
  return { ...input, updatedAt: now };
}

export async function getCsrDashboardSummary(): Promise<CsrDashboardSummary> {
  const db = await getDatabase();
  const [requests, upcoming, updates, stats] = await Promise.all([
    db
      .prepare("SELECT COUNT(*) AS count FROM donation_requests")
      .first<{ count: number }>(),
    db
      .prepare("SELECT COUNT(*) AS count FROM donation_drives WHERE status = 'upcoming'")
      .first<{ count: number }>(),
    db
      .prepare(
        "SELECT COUNT(*) AS count FROM community_updates WHERE is_published = 1",
      )
      .first<{ count: number }>(),
    getDonationImpactStats(),
  ]);
  return {
    donationRequestsReceived: number(requests?.count),
    upcomingDonationDrives: number(upcoming?.count),
    pairsCollected: stats.totalPairsCollected,
    pairsRestored: stats.totalPairsRestored,
    pairsDonated: stats.totalPairsDonated,
    publishedCommunityUpdates: number(updates?.count),
  };
}

export async function getCsrAdminInitialData(): Promise<CsrAdminInitialData> {
  const [requests, drives, stories, updates, impactStats, summary] = await Promise.all([
    listDonationRequests({ limit: 50 }),
    listDonationDrives(),
    listRestorationStories(),
    listCommunityUpdates(),
    getDonationImpactStats(),
    getCsrDashboardSummary(),
  ]);
  return { requests, drives, stories, updates, impactStats, summary };
}

export async function getPublicDonationPageData(): Promise<PublicDonationPageData> {
  const [donationDrives, restorationStories, communityUpdates, impactStats] =
    await Promise.all([
      listPublicDonationDrives({ limit: 12 }),
      listPublicRestorationStories({ limit: 12 }),
      listPublicCommunityUpdates({ limit: 12 }),
      getDonationImpactStats(),
    ]);
  return {
    latestDrive: donationDrives[0] ?? null,
    donationDrives,
    restorationStories,
    communityUpdates,
    impactStats,
  };
}
