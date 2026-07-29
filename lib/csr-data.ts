/**
 * Persistence helpers for Shoe Doctor's CSR and donations programme.
 *
 * This module intentionally uses the same raw Cloudflare D1 style as
 * `lib/data.ts`. The production migration source is `migrations/`, not the
 * generated Drizzle folder, so keep any schema changes accompanied by a D1
 * migration.
 */

export const DONATION_REQUEST_STATUSES = [
  "new",
  "contacted",
  "pickup_scheduled",
  "collected",
  "under_restoration",
  "ready_for_donation",
  "donated",
  "rejected",
] as const;

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

export type DonationRequestStatus = (typeof DONATION_REQUEST_STATUSES)[number];
export type DonationMethod = (typeof DONATION_METHODS)[number];
export type DonationDriveStatus = (typeof DONATION_DRIVE_STATUSES)[number];
export type RestorationStoryCategory =
  (typeof RESTORATION_STORY_CATEGORIES)[number];

export type DonationMedia = {
  id: string;
  objectKey: string;
  contentType: string;
  sizeBytes: number;
  originalFilename: string;
  createdAt: string;
};

export type DonationRequest = {
  id: string;
  requestId: string;
  donorName: string;
  phone: string;
  email: string | null;
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
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type DonationRequestInput = {
  donorName: string;
  phone: string;
  email?: string | null;
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
  internalNotes?: string | null;
};

export type DonationDrive = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  fullStory: string;
  coverImageId: string | null;
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
  coverImageId?: string | null;
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
  beforeImageId: string | null;
  afterImageId: string | null;
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
  beforeImageId?: string | null;
  afterImageId?: string | null;
  description: string;
  restorationWork: string;
  storyDate: string;
  isPublished: boolean;
};

export type CommunityUpdate = {
  id: string;
  slug: string;
  title: string;
  coverImageId: string | null;
  galleryImageIds: string[];
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
  coverImageId?: string | null;
  galleryImageIds?: string[];
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

async function getDatabase() {
  const { env } = await import("cloudflare:workers");
  if (!env.DB) {
    throw new Error("Cloudflare D1 binding `DB` is unavailable.");
  }
  return env.DB;
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

function parseDonationMedia(row: RawRow): DonationMedia {
  return {
    id: text(row.id),
    objectKey: text(row.object_key),
    contentType: text(row.content_type),
    sizeBytes: number(row.size_bytes),
    originalFilename: text(row.original_filename),
    createdAt: text(row.created_at),
  };
}

function parseDonationRequest(row: RawRow): DonationRequest {
  return {
    id: text(row.id),
    requestId: text(row.request_id),
    donorName: text(row.donor_name),
    phone: text(row.phone),
    email: nullableText(row.email),
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
    status: text(row.status) as DonationRequestStatus,
    submittedAt: text(row.submitted_at),
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
    coverImageId: nullableText(row.cover_image_id),
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
    beforeImageId: nullableText(row.before_image_id),
    afterImageId: nullableText(row.after_image_id),
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
    coverImageId: nullableText(row.cover_image_id),
    galleryImageIds: stringArray(row.gallery_image_ids),
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

export async function getDonationMedia(id: string): Promise<DonationMedia | null> {
  const db = await getDatabase();
  const row = await db
    .prepare("SELECT * FROM donation_media WHERE id = ? LIMIT 1")
    .bind(id)
    .first<RawRow>();
  return row ? parseDonationMedia(row) : null;
}

export async function createDonationMedia(input: Omit<DonationMedia, "createdAt">) {
  const createdAt = new Date().toISOString();
  const db = await getDatabase();
  await db
    .prepare(
      `INSERT INTO donation_media (
        id, object_key, content_type, size_bytes, original_filename, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      input.id,
      input.objectKey,
      input.contentType,
      input.sizeBytes,
      input.originalFilename,
      createdAt,
    )
    .run();
  return { ...input, createdAt };
}

export async function deleteDonationMediaRecord(id: string) {
  const db = await getDatabase();
  const result = await db
    .prepare("DELETE FROM donation_media WHERE id = ?")
    .bind(id)
    .run();
  return Boolean(result.meta.changes);
}

/** Public media may only be read when it is attached to published content. */
export async function getPublicDonationMedia(id: string) {
  const db = await getDatabase();
  const galleryNeedle = `%\"${id}\"%`;
  const row = await db
    .prepare(
      `SELECT media.* FROM donation_media AS media
       WHERE media.id = ?
       AND (
         EXISTS (
           SELECT 1 FROM donation_drives
           WHERE is_published = 1 AND cover_image_id = media.id
         )
         OR EXISTS (
           SELECT 1 FROM restoration_stories
           WHERE is_published = 1
             AND (before_image_id = media.id OR after_image_id = media.id)
         )
         OR EXISTS (
           SELECT 1 FROM community_updates
           WHERE is_published = 1
             AND (cover_image_id = media.id OR gallery_image_ids LIKE ?)
         )
       )
       LIMIT 1`,
    )
    .bind(id, galleryNeedle)
    .first<RawRow>();
  return row ? parseDonationMedia(row) : null;
}

/** Do not remove an upload while a drive, story, or update still uses it. */
export async function isDonationMediaReferenced(id: string) {
  const db = await getDatabase();
  const galleryNeedle = `%\"${id}\"%`;
  const row = await db
    .prepare(
      `SELECT 1 AS referenced
       WHERE EXISTS (SELECT 1 FROM donation_drives WHERE cover_image_id = ?)
          OR EXISTS (
            SELECT 1 FROM restoration_stories
            WHERE before_image_id = ? OR after_image_id = ?
          )
          OR EXISTS (
            SELECT 1 FROM community_updates
            WHERE cover_image_id = ? OR gallery_image_ids LIKE ?
          )
       LIMIT 1`,
    )
    .bind(id, id, id, id, galleryNeedle)
    .first<{ referenced: number }>();
  return Boolean(row?.referenced);
}

/** Reject dangling image IDs before any content record can reference them. */
async function assertDonationMediaIds(
  ids: Array<string | null | undefined>,
) {
  const uniqueIds = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  if (uniqueIds.length === 0) return;

  const db = await getDatabase();
  const placeholders = uniqueIds.map(() => "?").join(", ");
  const result = await db
    .prepare(`SELECT id FROM donation_media WHERE id IN (${placeholders})`)
    .bind(...uniqueIds)
    .all<{ id: string }>();
  if (result.results.length !== uniqueIds.length) {
    throw new Error("One or more selected images are unavailable. Upload them again.");
  }
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
        preferred_pickup_date, donor_notes, internal_notes, status,
        submitted_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 'new', ?, ?, ?)`,
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
    location: input.location,
    numberOfPairs: input.numberOfPairs,
    shoeType: input.shoeType ?? null,
    shoeCondition: input.shoeCondition,
    donationMethod: input.donationMethod,
    pickupAddress: input.pickupAddress ?? null,
    preferredPickupDate: input.preferredPickupDate ?? null,
    donorNotes: input.donorNotes ?? null,
    internalNotes: null,
    status: "new",
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
      "(LOWER(donor_name) LIKE ? OR LOWER(phone) LIKE ? OR LOWER(location) LIKE ?)",
    );
    values.push(term, term, term);
  }
  if (options.status) {
    clauses.push("status = ?");
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
  return runList(
    `SELECT * FROM donation_requests${clauses.length ? ` WHERE ${clauses.join(" AND ")}` : ""}
     ORDER BY submitted_at DESC LIMIT ? OFFSET ?`,
    values,
    parseDonationRequest,
  );
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
      "(LOWER(donor_name) LIKE ? OR LOWER(phone) LIKE ? OR LOWER(location) LIKE ?)",
    );
    values.push(term, term, term);
  }
  if (options.status) {
    clauses.push("status = ?");
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
  return row ? parseDonationRequest(row) : null;
}

export async function updateDonationRequest(
  id: string,
  input: DonationRequestUpdateInput,
) {
  const current = await getDonationRequest(id);
  if (!current) return null;
  const now = new Date().toISOString();
  const db = await getDatabase();
  await db
    .prepare(
      `UPDATE donation_requests SET status = ?, internal_notes = ?, updated_at = ?
       WHERE id = ?`,
    )
    .bind(
      input.status ?? current.status,
      input.internalNotes === undefined ? current.internalNotes : input.internalNotes,
      now,
      id,
    )
    .run();
  return {
    ...current,
    status: input.status ?? current.status,
    internalNotes:
      input.internalNotes === undefined ? current.internalNotes : input.internalNotes,
    updatedAt: now,
  };
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
  await assertDonationMediaIds([input.coverImageId]);
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
      input.coverImageId ?? null,
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
    coverImageId: input.coverImageId ?? null,
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
  await assertDonationMediaIds([input.coverImageId]);
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
      input.coverImageId ?? null,
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
    coverImageId: input.coverImageId ?? null,
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
  await assertDonationMediaIds([input.beforeImageId, input.afterImageId]);
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
      input.beforeImageId ?? null,
      input.afterImageId ?? null,
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
    beforeImageId: input.beforeImageId ?? null,
    afterImageId: input.afterImageId ?? null,
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
  await assertDonationMediaIds([input.beforeImageId, input.afterImageId]);
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
      input.beforeImageId ?? null,
      input.afterImageId ?? null,
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
    beforeImageId: input.beforeImageId ?? null,
    afterImageId: input.afterImageId ?? null,
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
  await assertDonationMediaIds([input.coverImageId, ...(input.galleryImageIds ?? [])]);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const slug = await uniqueSlug("community_updates", input.slug, input.title);
  const publishedAt = input.isPublished ? now : null;
  const galleryImageIds = input.galleryImageIds ?? [];
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
      input.coverImageId ?? null,
      JSON.stringify(galleryImageIds),
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
    coverImageId: input.coverImageId ?? null,
    galleryImageIds,
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
  await assertDonationMediaIds([input.coverImageId, ...(input.galleryImageIds ?? [])]);
  const now = new Date().toISOString();
  const slug = await uniqueSlug(
    "community_updates",
    input.slug || current.slug,
    input.title,
    id,
  );
  const publishedAt = input.isPublished ? current.publishedAt ?? now : null;
  const galleryImageIds = input.galleryImageIds ?? [];
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
      input.coverImageId ?? null,
      JSON.stringify(galleryImageIds),
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
    coverImageId: input.coverImageId ?? null,
    galleryImageIds,
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
