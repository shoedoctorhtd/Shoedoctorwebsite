import {
  STEAM_ASSISTED_DEEP_CLEAN_ID,
  steamCleaningContent,
} from "./steam-cleaning";
import {
  calculateBookingTotals,
  calculatePickupDeliveryFee,
  getExactNprPrice,
  isPickupArea,
  type PickupArea,
} from "./booking-pricing";
import { isEmailAddress } from "./email/address";
import { sendGmailStatusEmail } from "./email/gmail";
import {
  buildStatusEmail,
  type StatusEmailContent,
} from "./email/statusTemplates";
import {
  generatePublicBookingReference,
  getPhysicalPairTag,
  getBookingPublicReference,
  isPublicReferenceCollision,
} from "./booking-reference";
import {
  auditValueDiff,
  buildAuditLogInsert,
  buildOwnerAlertEventInsert,
  type AuditActor,
} from "./audit";
import type { AdminActor } from "./admin-types";

export const SERVICE_CATEGORIES = ["Cleaning", "Repairs", "Add-ons"] as const;
export const SERVICE_TONES = ["lime", "coral", "violet", "blue", "cream"] as const;
export const BOOKING_STATUSES = [
  "new",
  "confirmed",
  "received",
  "in_progress",
  "completed",
  "ready",
  "cancelled",
] as const;
export const FULFILLMENT_METHODS = [
  "self_dropoff",
  "pickup_delivery",
] as const;

export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];
export type ServiceTone = (typeof SERVICE_TONES)[number];
export type BookingStatus = (typeof BOOKING_STATUSES)[number];
export type FulfillmentMethod = (typeof FULFILLMENT_METHODS)[number];
export type BookingNotificationStatus =
  | "pending"
  | "sent"
  | "failed"
  | "skipped";

export type BookingCreationSource = "customer" | "admin" | "system" | "legacy";

export type BookingOperationalNote = {
  id: string;
  bookingId: string;
  note: string;
  adminUserId: string | null;
  administratorName: string | null;
  administratorRole: "super_admin" | "admin" | null;
  createdAt: string;
};

export type BookingNotification = {
  id: string;
  bookingId: string;
  statusHistoryId: string;
  channel: "email";
  recipient: string | null;
  notificationType: "status_update";
  status: BookingNotificationStatus;
  attemptCount: number;
  lastError: string | null;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BookingStatusHistory = {
  id: string;
  bookingId: string;
  previousStatus: BookingStatus;
  newStatus: BookingStatus;
  changedBy: string | null;
  adminUserId: string | null;
  administratorName: string | null;
  administratorRole: "super_admin" | "admin" | null;
  pairId: string | null;
  pairReference: string | null;
  createdAt: string;
  notification: BookingNotification | null;
};

export type BookingStatusUpdateResult =
  | { kind: "not_found" }
  | { kind: "unchanged"; booking: Booking }
  | { kind: "conflict"; booking: Booking }
  | {
      kind: "updated";
      booking: Booking;
      history: BookingStatusHistory;
      notification: BookingNotification;
    };

export type BookingNotificationRetryResult =
  | { kind: "not_found" }
  | { kind: "not_retryable"; notification: BookingNotification }
  | { kind: "in_progress"; notification: BookingNotification }
  | { kind: "failed"; notification: BookingNotification }
  | {
      kind: "retried";
      booking: Booking;
      notification: BookingNotification;
    };

export type Service = {
  id: string;
  name: string;
  category: ServiceCategory;
  priceLabel: string;
  specialPriceLabel: string | null;
  turnaround: string;
  description: string;
  features: string[];
  badge: string | null;
  tone: ServiceTone;
  icon: string;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type ServiceInput = Omit<Service, "id" | "createdAt" | "updatedAt">;

export type ServiceUpdateResult =
  | { kind: "not_found" }
  | { kind: "conflict"; service: Service }
  | { kind: "updated"; service: Service & { ownerAlertEventId?: string | null } };

export type ServiceDeleteResult =
  | { kind: "not_found" }
  | { kind: "conflict"; service: Service }
  | { kind: "deleted"; ownerAlertEventId?: string | null };

export type Booking = {
  id: string;
  reference: string;
  publicReference: string | null;
  customerName: string;
  phone: string;
  email: string | null;
  customerId: string | null;
  createdSource: BookingCreationSource;
  createdByAdminId: string | null;
  createdByAdminName: string | null;
  updatedByAdminId: string | null;
  updatedByAdminName: string | null;
  deletedAt: string | null;
  deletedByAdminId: string | null;
  deletedByAdminName: string | null;
  deletionReason: string | null;
  restoredAt: string | null;
  restoredByAdminId: string | null;
  restoredByAdminName: string | null;
  restorationReason: string | null;
  recordVersion: number;
  serviceId: string;
  serviceName: string;
  shoeType: string;
  shoeBrand: string | null;
  preferredDate: string | null;
  fulfillmentMethod: FulfillmentMethod;
  pickupArea: PickupArea | null;
  deliveryFee: number;
  pairCount: number;
  serviceSubtotal: number | null;
  expressFee: number | null;
  totalAmount: number | null;
  discountAmount: number | null;
  paymentAmount: number | null;
  paymentStatus: "unpaid" | "partial" | "paid" | "refunded" | null;
  freeDeliveryApplied: boolean;
  freeDeliveryReason: string | null;
  pickupAddress: string | null;
  locationUrl: string | null;
  notes: string | null;
  expressRequested: boolean;
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
  items: BookingItem[];
  statusHistory: BookingStatusHistory[];
  operationalNotes: BookingOperationalNote[];
};

export type BookingItem = {
  id: string;
  bookingId: string;
  pairNumber: number;
  serviceId: string;
  serviceName: string;
  servicePriceLabel: string;
  servicePrice: number | null;
  footwearType: string;
  brand: string | null;
  specialRequest: string | null;
  status: BookingStatus | null;
  createdAt: string;
};

export type BookingItemInput = {
  serviceId: string;
  footwearType: string;
  brand?: string | null;
  specialRequest?: string | null;
};

export type BookingInput = {
  customerName: string;
  phone: string;
  email?: string | null;
  items: BookingItemInput[];
  preferredDate?: string | null;
  fulfillmentMethod: FulfillmentMethod;
  pickupArea?: PickupArea | null;
  pickupAddress?: string | null;
  locationUrl?: string | null;
  notes?: string | null;
  expressRequested: boolean;
};

export type BookingCreationContext = {
  source?: Exclude<BookingCreationSource, "legacy">;
  actor?: AdminActor | null;
};

export type BookingDetailsUpdateInput = {
  customerName?: string;
  phone?: string;
  email?: string | null;
  preferredDate?: string | null;
  fulfillmentMethod?: FulfillmentMethod;
  pickupArea?: PickupArea | null;
  pickupAddress?: string | null;
  locationUrl?: string | null;
  notes?: string | null;
  totalAmount?: number | null;
  discountAmount?: number | null;
  paymentAmount?: number | null;
  paymentStatus?: "unpaid" | "partial" | "paid" | "refunded" | null;
};

const seedServices: Array<
  Omit<Service, "createdAt" | "updatedAt">
> = [
  {
    id: "basic-clean",
    name: "Basic Clean",
    category: "Cleaning",
    priceLabel: "Rs 299",
    specialPriceLabel: "Made-in-Nepal: Rs 249",
    turnaround: "1–2 days",
    description: "A sharp exterior refresh for everyday pairs.",
    features: ["Exterior cleaning", "Sole cleaning", "Laces", "Finishing"],
    badge: null,
    tone: "cream",
    icon: "✦",
    active: true,
    sortOrder: 10,
  },
  {
    id: "deep-clean",
    name: "Deep Clean",
    category: "Cleaning",
    priceLabel: "Rs 449",
    specialPriceLabel: "Made-in-Nepal: Rs 399",
    turnaround: "2–3 days",
    description:
      "Inside-and-out care with detailed treatment for pairs that need a proper reset.",
    features: [
      "Inside & outside",
      "Stain treatment",
      "Deodorizing",
      "Detailed finishing",
      "Steam brush detailing on suitable areas when required",
    ],
    badge: "Most popular",
    tone: "lime",
    icon: "✦",
    active: true,
    sortOrder: 20,
  },
  {
    id: STEAM_ASSISTED_DEEP_CLEAN_ID,
    name: steamCleaningContent.serviceName,
    category: "Cleaning",
    priceLabel: steamCleaningContent.priceLabel,
    specialPriceLabel: null,
    turnaround: steamCleaningContent.turnaround,
    description: steamCleaningContent.serviceIntro,
    features: [
      "Material inspection before treatment",
      "Controlled steam brush detailing",
      "Material-safe cleaning and drying",
      "Price confirmed after diagnosis",
    ],
    badge: "First time in Nepal",
    tone: "blue",
    icon: "≋",
    active: true,
    sortOrder: 25,
  },
  {
    id: "premium-care",
    name: "Premium Care",
    category: "Cleaning",
    priceLabel: "Rs 699",
    specialPriceLabel: "Made-in-Nepal: Rs 649",
    turnaround: "3–4 days",
    description: "Deep care plus correction work for high-value favourites.",
    features: [
      "Deep cleaning",
      "Stain treatment & deodorizing",
      "Sole whitening & un-yellowing",
      "Crease reduction",
      "Minor touch-up or repaint",
      "Semi re-gluing if needed",
      "Precision steam brush detailing where suitable",
    ],
    badge: "Premium",
    tone: "violet",
    icon: "◆",
    active: true,
    sortOrder: 30,
  },
  {
    id: "full-restoration",
    name: "Full Restoration",
    category: "Cleaning",
    priceLabel: "From Rs 1,299",
    specialPriceLabel: null,
    turnaround: "4–7 days",
    description: "The complete treatment plan for seriously worn pairs.",
    features: [
      "Deep cleaning & stain treatment",
      "Deodorizing",
      "Sole whitening & un-yellowing",
      "Crease reduction",
      "Minor restoration & repainting",
      "Full or half re-gluing",
      "Stitching if needed",
    ],
    badge: "Complete care",
    tone: "coral",
    icon: "+",
    active: true,
    sortOrder: 40,
  },
  {
    id: "minor-stitching",
    name: "Minor Stitching",
    category: "Repairs",
    priceLabel: "Rs 199–299",
    specialPriceLabel: null,
    turnaround: "1–2 days",
    description: "Targeted repair for a small torn or loosened seam.",
    features: [
      "Small torn seam repair",
      "Loose stitch reinforcement",
      "Final quality check",
    ],
    badge: null,
    tone: "cream",
    icon: "⌁",
    active: true,
    sortOrder: 50,
  },
  {
    id: "full-stitching",
    name: "Full Stitching",
    category: "Repairs",
    priceLabel: "From Rs 599",
    specialPriceLabel: null,
    turnaround: "2–3 days",
    description: "Structural stitching for the side, upper or sole.",
    features: [
      "Complete side or sole stitching",
      "Upper and sole reinforcement",
      "Final quality check",
    ],
    badge: null,
    tone: "blue",
    icon: "⌁",
    active: true,
    sortOrder: 60,
  },
  {
    id: "half-regluing",
    name: "Half Re-gluing",
    category: "Repairs",
    priceLabel: "From Rs 299",
    specialPriceLabel: null,
    turnaround: "1–2 days",
    description: "Material-safe bonding for partial sole separation.",
    features: [
      "Partial sole separation",
      "Surface preparation",
      "Material-safe adhesive",
    ],
    badge: null,
    tone: "lime",
    icon: "↻",
    active: true,
    sortOrder: 70,
  },
  {
    id: "full-regluing",
    name: "Full Re-gluing",
    category: "Repairs",
    priceLabel: "From Rs 599",
    specialPriceLabel: null,
    turnaround: "2–3 days",
    description: "Complete sole bonding and clamping with a clean edge finish.",
    features: ["Complete sole separation", "Bonding and clamping", "Final edge clean-up"],
    badge: null,
    tone: "coral",
    icon: "↻",
    active: true,
    sortOrder: 80,
  },
  {
    id: "half-repaint",
    name: "Half Repaint",
    category: "Repairs",
    priceLabel: "From Rs 799",
    specialPriceLabel: null,
    turnaround: "3–4 days",
    description: "Colour correction and repainting for a selected area.",
    features: ["Deep cleaning", "Colour preparation", "Partial repainting"],
    badge: null,
    tone: "violet",
    icon: "◒",
    active: true,
    sortOrder: 90,
  },
  {
    id: "full-repaint",
    name: "Full Repaint",
    category: "Repairs",
    priceLabel: "From Rs 1,199",
    specialPriceLabel: null,
    turnaround: "4–5 days",
    description: "Complete recolouring with protective finishing.",
    features: ["Deep cleaning", "Complete recolouring", "Protective finishing"],
    badge: null,
    tone: "blue",
    icon: "◒",
    active: true,
    sortOrder: 100,
  },
  {
    id: "express-wash-dry",
    name: "Express Wash & Dry",
    category: "Add-ons",
    priceLabel: "+ Rs 149",
    specialPriceLabel: null,
    turnaround: "2–3 hours",
    description: "Fast-track washing and drying when a same-day slot is available.",
    features: ["Priority cleaning slot", "Wash & dry in 2–3 hours", "Subject to availability"],
    badge: "Fastest",
    tone: "coral",
    icon: "⚡",
    active: true,
    sortOrder: 110,
  },
  {
    id: "repair-priority",
    name: "Repair Priority",
    category: "Add-ons",
    priceLabel: "+ Rs 150",
    specialPriceLabel: null,
    turnaround: "Priority queue",
    description: "Priority handling for eligible repair jobs.",
    features: ["Priority service when available", "Added to repair charge"],
    badge: null,
    tone: "lime",
    icon: "⚡",
    active: true,
    sortOrder: 120,
  },
  {
    id: "delicate-materials",
    name: "Delicate Materials",
    category: "Add-ons",
    priceLabel: "+ Rs 150–300",
    specialPriceLabel: null,
    turnaround: "After diagnosis",
    description: "Special handling for materials that require slower, gentler care.",
    features: ["Suede", "Nubuck", "Leather care", "Price depends on material"],
    badge: null,
    tone: "cream",
    icon: "◇",
    active: true,
    sortOrder: 130,
  },
];

let setupPromise: Promise<void> | null = null;

export async function getDatabase() {
  // Client-side RSC analysis can see server data modules. Keep the Workers
  // runtime binding dynamic so Vite does not try to resolve it for a browser
  // chunk; Workerd resolves this specifier when the server function runs.
  const { env } = await import(/* @vite-ignore */ "cloudflare:workers");
  if (!env.DB) {
    throw new Error("D1 binding DB is unavailable.");
  }
  return env.DB;
}

async function initialiseDatabase() {
  const db = await getDatabase();

  await db.batch([
    db.prepare(`
      CREATE TABLE IF NOT EXISTS services (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        price_label TEXT NOT NULL,
        special_price_label TEXT,
        turnaround TEXT NOT NULL,
        description TEXT NOT NULL,
        features TEXT NOT NULL DEFAULT '[]',
        badge TEXT,
        tone TEXT NOT NULL DEFAULT 'lime',
        icon TEXT NOT NULL DEFAULT '+',
        active INTEGER NOT NULL DEFAULT 1,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `),
    db.prepare(`
      CREATE INDEX IF NOT EXISTS services_category_sort_idx
      ON services(category, sort_order)
    `),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS bookings (
        id TEXT PRIMARY KEY,
        reference TEXT NOT NULL UNIQUE,
        public_reference TEXT,
        customer_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT,
        service_id TEXT NOT NULL,
        service_name TEXT NOT NULL,
        shoe_type TEXT NOT NULL,
        shoe_brand TEXT,
        preferred_date TEXT,
        fulfillment_method TEXT NOT NULL DEFAULT 'self_dropoff',
        pickup_area TEXT,
        delivery_fee INTEGER NOT NULL DEFAULT 0,
        pair_count INTEGER NOT NULL DEFAULT 1,
        service_subtotal INTEGER,
        express_fee INTEGER DEFAULT 0,
        total_amount INTEGER,
        free_delivery_applied INTEGER NOT NULL DEFAULT 0,
        free_delivery_reason TEXT,
        pickup_address TEXT,
        location_url TEXT,
        notes TEXT,
        express_requested INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'new',
        last_status_history_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `),
    db.prepare(`
      CREATE INDEX IF NOT EXISTS bookings_status_created_idx
      ON bookings(status, created_at)
    `),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS booking_items (
        id TEXT PRIMARY KEY,
        booking_id TEXT NOT NULL,
        pair_number INTEGER NOT NULL CHECK (pair_number >= 1),
        service_id TEXT NOT NULL,
        service_name TEXT NOT NULL,
        service_price_label TEXT NOT NULL,
        service_price INTEGER CHECK (service_price IS NULL OR service_price >= 0),
        footwear_type TEXT NOT NULL,
        brand TEXT,
        special_request TEXT,
        status TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
        UNIQUE(booking_id, pair_number)
      )
    `),
    db.prepare(`
      CREATE INDEX IF NOT EXISTS booking_items_booking_pair_idx
      ON booking_items(booking_id, pair_number)
    `),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS booking_status_history (
        id TEXT PRIMARY KEY,
        booking_id TEXT NOT NULL,
        previous_status TEXT NOT NULL,
        new_status TEXT NOT NULL,
        changed_by TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
      )
    `),
    db.prepare(`
      CREATE INDEX IF NOT EXISTS booking_status_history_booking_created_idx
      ON booking_status_history(booking_id, created_at)
    `),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS booking_notifications (
        id TEXT PRIMARY KEY,
        booking_id TEXT NOT NULL,
        status_history_id TEXT NOT NULL,
        channel TEXT NOT NULL CHECK (channel IN ('email')),
        recipient TEXT,
        notification_type TEXT NOT NULL CHECK (notification_type IN ('status_update')),
        status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
        attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
        last_error TEXT,
        sent_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
        FOREIGN KEY (status_history_id) REFERENCES booking_status_history(id) ON DELETE CASCADE,
        UNIQUE(status_history_id, channel, notification_type)
      )
    `),
    db.prepare(`
      CREATE INDEX IF NOT EXISTS booking_notifications_booking_status_idx
      ON booking_notifications(booking_id, status, updated_at)
    `),
    db.prepare(`
      CREATE INDEX IF NOT EXISTS booking_notifications_history_idx
      ON booking_notifications(status_history_id)
    `),
  ]);

  const bookingColumns = await db
    .prepare("PRAGMA table_info(bookings)")
    .all<{ name: string }>();
  const bookingColumnNames = new Set(
    bookingColumns.results.map((column) => column.name),
  );
  if (!bookingColumnNames.has("public_reference")) {
    try {
      await db
        .prepare("ALTER TABLE bookings ADD COLUMN public_reference TEXT")
        .run();
    } catch (error) {
      // Two cold Worker instances can both pass the PRAGMA check. The winner
      // adds the compatibility column; the loser can safely continue.
      const message = error instanceof Error ? error.message : String(error);
      if (!/duplicate column name:\s*public_reference/iu.test(message)) {
        throw error;
      }
    }
  }
  await db
    .prepare(
      "CREATE UNIQUE INDEX IF NOT EXISTS bookings_public_reference_unique ON bookings(public_reference)",
    )
    .run();
  if (!bookingColumnNames.has("pickup_area")) {
    await db.prepare("ALTER TABLE bookings ADD COLUMN pickup_area TEXT").run();
  }
  if (!bookingColumnNames.has("delivery_fee")) {
    await db
      .prepare(
        "ALTER TABLE bookings ADD COLUMN delivery_fee INTEGER NOT NULL DEFAULT 0",
      )
      .run();
  }
  if (!bookingColumnNames.has("pair_count")) {
    await db
      .prepare(
        "ALTER TABLE bookings ADD COLUMN pair_count INTEGER NOT NULL DEFAULT 1",
      )
      .run();
  }
  if (!bookingColumnNames.has("service_subtotal")) {
    await db
      .prepare("ALTER TABLE bookings ADD COLUMN service_subtotal INTEGER")
      .run();
  }
  if (!bookingColumnNames.has("express_fee")) {
    await db
      .prepare(
        "ALTER TABLE bookings ADD COLUMN express_fee INTEGER DEFAULT 0",
      )
      .run();
  }
  if (!bookingColumnNames.has("total_amount")) {
    await db
      .prepare("ALTER TABLE bookings ADD COLUMN total_amount INTEGER")
      .run();
  }
  if (!bookingColumnNames.has("free_delivery_applied")) {
    await db
      .prepare(
        "ALTER TABLE bookings ADD COLUMN free_delivery_applied INTEGER NOT NULL DEFAULT 0",
      )
      .run();
  }
  if (!bookingColumnNames.has("free_delivery_reason")) {
    await db
      .prepare("ALTER TABLE bookings ADD COLUMN free_delivery_reason TEXT")
      .run();
  }
  if (!bookingColumnNames.has("last_status_history_id")) {
    await db
      .prepare("ALTER TABLE bookings ADD COLUMN last_status_history_id TEXT")
      .run();
  }

  const row = await db
    .prepare("SELECT COUNT(*) AS count FROM services")
    .first<{ count: number }>();

  if (Number(row?.count ?? 0) === 0) {
    const now = new Date().toISOString();
    await db.batch(
      seedServices.map((service) =>
        db
          .prepare(`
            INSERT OR IGNORE INTO services (
              id, name, category, price_label, special_price_label,
              turnaround, description, features, badge, tone, icon,
              active, sort_order, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `)
          .bind(
            service.id,
            service.name,
            service.category,
            service.priceLabel,
            service.specialPriceLabel,
            service.turnaround,
            service.description,
            JSON.stringify(service.features),
            service.badge,
            service.tone,
            service.icon,
            service.active ? 1 : 0,
            service.sortOrder,
            now,
            now,
          ),
      ),
    );
  }

}

export async function ensureDatabase() {
  setupPromise ??= initialiseDatabase().catch((error) => {
    setupPromise = null;
    throw error;
  });
  await setupPromise;
}

const PUBLIC_REFERENCE_BACKFILL_BATCH_SIZE = 25;

/**
 * Backfill a small, resumable batch only from protected/admin list reads.
 * This keeps a large historical table from turning a customer booking or a
 * Worker cold start into an unbounded migration job.
 */
async function backfillBookingPublicReferences(
  db: Database,
  limit = PUBLIC_REFERENCE_BACKFILL_BATCH_SIZE,
) {
  const result = await db
    .prepare(`
      SELECT id, created_at
      FROM bookings
      WHERE public_reference IS NULL OR public_reference = ''
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `)
    .bind(limit)
    .all<Record<string, unknown>>();

  for (const row of result.results) {
    const bookingId = String(row.id);
    const createdAt = new Date(String(row.created_at));
    if (Number.isNaN(createdAt.getTime())) {
      // Do not silently assign today's date to historical data. The record
      // remains usable in the protected dashboard until its source date is
      // repaired, while all other bookings can continue to be processed.
      console.error(
        `Unable to backfill a public booking reference for ${bookingId}: invalid created_at.`,
      );
      continue;
    }

    await assignBookingPublicReference(db, bookingId, createdAt);
  }
}

async function assignBookingPublicReference(
  db: Database,
  bookingId: string,
  createdAt: Date,
) {
  await generatePublicBookingReference({
    date: createdAt,
    tryPersist: async (publicReference) => {
      try {
        const update = await db
          .prepare(`
            UPDATE bookings
            SET public_reference = ?
            WHERE id = ? AND (public_reference IS NULL OR public_reference = '')
          `)
          .bind(publicReference, bookingId)
          .run();
        if (update.meta.changes) return true;

        // Another Worker may have completed this record after the SELECT.
        // This row no longer needs a candidate from this loop.
        const current = await db
          .prepare("SELECT public_reference FROM bookings WHERE id = ?")
          .bind(bookingId)
          .first<{ public_reference: string | null }>();
        return Boolean(current?.public_reference);
      } catch (error) {
        if (isPublicReferenceCollision(error)) return false;
        throw error;
      }
    },
  });
}

function parseService(row: Record<string, unknown>): Service {
  let features: string[] = [];
  try {
    const parsed = JSON.parse(String(row.features ?? "[]"));
    if (Array.isArray(parsed)) {
      features = parsed.map(String).filter(Boolean);
    }
  } catch {
    features = [];
  }

  return {
    id: String(row.id),
    name: String(row.name),
    category: row.category as ServiceCategory,
    priceLabel: String(row.price_label),
    specialPriceLabel: row.special_price_label
      ? String(row.special_price_label)
      : null,
    turnaround: String(row.turnaround),
    description: String(row.description),
    features,
    badge: row.badge ? String(row.badge) : null,
    tone: row.tone as ServiceTone,
    icon: String(row.icon),
    active: Boolean(row.active),
    sortOrder: Number(row.sort_order),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function parseBooking(row: Record<string, unknown>): Booking {
  const pickupArea = row.pickup_area ? String(row.pickup_area) : "";
  const deliveryFee = readNonNegativeAmount(row.delivery_fee, 0);
  const pairCount = readPositiveInteger(row.pair_count, 1);

  return {
    id: String(row.id),
    reference: String(row.reference),
    publicReference: row.public_reference
      ? String(row.public_reference)
      : null,
    customerName: String(row.customer_name),
    phone: String(row.phone),
    email: row.email ? String(row.email) : null,
    customerId: row.customer_id ? String(row.customer_id) : null,
    createdSource:
      row.created_source === "customer" ||
      row.created_source === "admin" ||
      row.created_source === "system" ||
      row.created_source === "legacy"
        ? row.created_source
        : "legacy",
    createdByAdminId: row.created_by_admin_id ? String(row.created_by_admin_id) : null,
    createdByAdminName: row.created_by_admin_name_snapshot
      ? String(row.created_by_admin_name_snapshot)
      : null,
    updatedByAdminId: row.updated_by_admin_id ? String(row.updated_by_admin_id) : null,
    updatedByAdminName: row.updated_by_admin_name_snapshot
      ? String(row.updated_by_admin_name_snapshot)
      : null,
    deletedAt: row.deleted_at ? String(row.deleted_at) : null,
    deletedByAdminId: row.deleted_by_admin_id ? String(row.deleted_by_admin_id) : null,
    deletedByAdminName: row.deleted_by_admin_name_snapshot
      ? String(row.deleted_by_admin_name_snapshot)
      : null,
    deletionReason: row.deletion_reason ? String(row.deletion_reason) : null,
    restoredAt: row.restored_at ? String(row.restored_at) : null,
    restoredByAdminId: row.restored_by_admin_id ? String(row.restored_by_admin_id) : null,
    restoredByAdminName: row.restored_by_admin_name_snapshot
      ? String(row.restored_by_admin_name_snapshot)
      : null,
    restorationReason: row.restoration_reason ? String(row.restoration_reason) : null,
    recordVersion: readPositiveInteger(row.record_version, 1),
    serviceId: String(row.service_id),
    serviceName: String(row.service_name),
    shoeType: String(row.shoe_type),
    shoeBrand: row.shoe_brand ? String(row.shoe_brand) : null,
    preferredDate: row.preferred_date ? String(row.preferred_date) : null,
    fulfillmentMethod:
      row.fulfillment_method === "pickup_delivery"
        ? "pickup_delivery"
        : "self_dropoff",
    pickupArea: isPickupArea(pickupArea) ? pickupArea : null,
    deliveryFee,
    pairCount,
    serviceSubtotal: readOptionalNonNegativeAmount(row.service_subtotal),
    expressFee: readOptionalNonNegativeAmount(row.express_fee),
    totalAmount: readOptionalNonNegativeAmount(row.total_amount),
    discountAmount: readOptionalNonNegativeAmount(row.discount_amount),
    paymentAmount: readOptionalNonNegativeAmount(row.payment_amount),
    paymentStatus:
      row.payment_status === "unpaid" ||
      row.payment_status === "partial" ||
      row.payment_status === "paid" ||
      row.payment_status === "refunded"
        ? row.payment_status
        : null,
    freeDeliveryApplied: Number(row.free_delivery_applied ?? 0) === 1,
    freeDeliveryReason: row.free_delivery_reason
      ? String(row.free_delivery_reason)
      : null,
    pickupAddress: row.pickup_address ? String(row.pickup_address) : null,
    locationUrl: row.location_url ? String(row.location_url) : null,
    notes: row.notes ? String(row.notes) : null,
    expressRequested: Boolean(row.express_requested),
    status: row.status as BookingStatus,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    items: [],
    statusHistory: [],
    operationalNotes: [],
  };
}

function parseBookingItem(row: Record<string, unknown>): BookingItem {
  const status = row.status ? String(row.status) : "";
  return {
    id: String(row.id),
    bookingId: String(row.booking_id),
    pairNumber: readPositiveInteger(row.pair_number, 1),
    serviceId: String(row.service_id),
    serviceName: String(row.service_name),
    servicePriceLabel: String(row.service_price_label),
    servicePrice: readOptionalNonNegativeAmount(row.service_price),
    footwearType: String(row.footwear_type),
    brand: row.brand ? String(row.brand) : null,
    specialRequest: row.special_request ? String(row.special_request) : null,
    status: BOOKING_STATUSES.includes(status as BookingStatus)
      ? (status as BookingStatus)
      : null,
    createdAt: String(row.created_at),
  };
}

function readPositiveInteger(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 1 ? parsed : fallback;
}

function readNonNegativeAmount(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

function readOptionalNonNegativeAmount(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

function parseBookingNotification(
  row: Record<string, unknown>,
): BookingNotification {
  const attemptCount = Number(row.attempt_count ?? 0);
  return {
    id: String(row.id),
    bookingId: String(row.booking_id),
    statusHistoryId: String(row.status_history_id),
    channel: "email",
    recipient: row.recipient ? String(row.recipient) : null,
    notificationType: "status_update",
    status: row.status as BookingNotificationStatus,
    attemptCount: Number.isFinite(attemptCount) ? attemptCount : 0,
    lastError: row.last_error ? String(row.last_error) : null,
    sentAt: row.sent_at ? String(row.sent_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function parseBookingStatusHistory(
  row: Record<string, unknown>,
  notification: BookingNotification | null = null,
): BookingStatusHistory {
  return {
    id: String(row.id),
    bookingId: String(row.booking_id),
    previousStatus: row.previous_status as BookingStatus,
    newStatus: row.new_status as BookingStatus,
    changedBy: row.changed_by ? String(row.changed_by) : null,
    adminUserId: row.admin_user_id ? String(row.admin_user_id) : null,
    administratorName: row.administrator_name_snapshot
      ? String(row.administrator_name_snapshot)
      : null,
    administratorRole:
      row.administrator_role_snapshot === "super_admin" ||
      row.administrator_role_snapshot === "admin"
        ? row.administrator_role_snapshot
        : null,
    pairId: row.pair_id ? String(row.pair_id) : null,
    pairReference: row.pair_reference ? String(row.pair_reference) : null,
    createdAt: String(row.created_at),
    notification,
  };
}

export function getSeedServices(): Service[] {
  const now = new Date(0).toISOString();
  return seedServices.map((service) => ({
    ...service,
    createdAt: now,
    updatedAt: now,
  }));
}

export async function listServices(includeInactive = false): Promise<Service[]> {
  await ensureDatabase();
  const query = includeInactive
    ? "SELECT * FROM services ORDER BY sort_order ASC, name ASC"
    : "SELECT * FROM services WHERE active = 1 ORDER BY sort_order ASC, name ASC";
  const db = await getDatabase();
  const result = await db.prepare(query).all<Record<string, unknown>>();
  return result.results.map(parseService);
}

export async function listPublicServices(): Promise<Service[]> {
  try {
    return await listServices(false);
  } catch {
    return getSeedServices().filter((service) => service.active);
  }
}

export async function createService(input: ServiceInput, actor?: AdminActor | null): Promise<Service & { ownerAlertEventId?: string | null }> {
  await ensureDatabase();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const db = await getDatabase();

  const auditId = crypto.randomUUID();
  const ownerAlertEventId = actor ? crypto.randomUUID() : null;
  const batch = await db.batch([
    db.prepare(`
      INSERT INTO services (
        id, name, category, price_label, special_price_label, turnaround,
        description, features, badge, tone, icon, active, sort_order,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      input.name,
      input.category,
      input.priceLabel,
      input.specialPriceLabel,
      input.turnaround,
      input.description,
      JSON.stringify(input.features),
      input.badge,
      input.tone,
      input.icon,
      input.active ? 1 : 0,
      input.sortOrder,
      now,
      now,
    ),
    ...(actor
      ? [
          buildAuditLogInsert(db, {
            id: auditId,
            actor,
            action: "SERVICE_CREATED",
            entityType: "service",
            entityId: id,
            newValues: serviceAuditSnapshot({ id, ...input, createdAt: now, updatedAt: now }),
            changedFields: ["service"],
            createdAt: now,
            conditionalOn: {
              sql: "EXISTS (SELECT 1 FROM services WHERE id = ?)",
              bindings: [id],
            },
          }),
          buildOwnerAlertEventInsert(db, {
            id: ownerAlertEventId!,
            auditLogId: auditId,
            alertType: "SERVICE_CREATED",
            createdAt: now,
            conditionalOn: {
              sql: "EXISTS (SELECT 1 FROM services WHERE id = ?)",
              bindings: [id],
            },
          }),
        ]
      : []),
  ]);
  if (!batch[0]?.meta.changes || (actor && (!batch[1]?.meta.changes || !batch[2]?.meta.changes))) {
    throw new Error("Unable to save the service audit record.");
  }

  return { id, ...input, createdAt: now, updatedAt: now, ownerAlertEventId };
}

export async function updateService(
  id: string,
  input: ServiceInput,
  actor?: AdminActor | null,
  expectedUpdatedAt?: string | null,
): Promise<ServiceUpdateResult> {
  await ensureDatabase();
  const now = new Date().toISOString();
  const db = await getDatabase();
  const existingRow = await db.prepare("SELECT * FROM services WHERE id = ?").bind(id).first<Record<string, unknown>>();
  if (!existingRow) return { kind: "not_found" };
  const existing = parseService(existingRow);
  if (!expectedUpdatedAt || expectedUpdatedAt !== existing.updatedAt) {
    return { kind: "conflict", service: existing };
  }
  const auditId = crypto.randomUUID();
  const ownerAlertEventId = actor ? crypto.randomUUID() : null;
  const operationId = crypto.randomUUID();
  const batch = await db.batch([
    db.prepare(`
      UPDATE services SET
        name = ?, category = ?, price_label = ?, special_price_label = ?,
        turnaround = ?, description = ?, features = ?, badge = ?, tone = ?,
        icon = ?, active = ?, sort_order = ?, updated_at = ?, last_mutation_id = ?
       WHERE id = ? AND updated_at = ?
    `).bind(
      input.name,
      input.category,
      input.priceLabel,
      input.specialPriceLabel,
      input.turnaround,
      input.description,
      JSON.stringify(input.features),
      input.badge,
      input.tone,
      input.icon,
      input.active ? 1 : 0,
      input.sortOrder,
      now,
      operationId,
      id,
      expectedUpdatedAt,
    ),
    ...(actor
      ? [
          buildAuditLogInsert(db, {
            id: auditId,
            actor,
            action: "SERVICE_UPDATED",
            entityType: "service",
            entityId: id,
            ...auditValueDiff(serviceAuditSnapshot(existing), serviceAuditSnapshot({
              id,
              ...input,
              createdAt: existing.createdAt,
              updatedAt: now,
            })),
            createdAt: now,
            conditionalOn: {
              sql: "EXISTS (SELECT 1 FROM services WHERE id = ? AND last_mutation_id = ?)",
              bindings: [id, operationId],
            },
          }),
          buildOwnerAlertEventInsert(db, {
            id: ownerAlertEventId!,
            auditLogId: auditId,
            alertType: "SERVICE_UPDATED",
            createdAt: now,
            conditionalOn: {
              sql: "EXISTS (SELECT 1 FROM services WHERE id = ? AND last_mutation_id = ?)",
              bindings: [id, operationId],
            },
          }),
        ]
      : []),
  ]);
  if (!batch[0]?.meta.changes) {
    const currentRow = await db.prepare("SELECT * FROM services WHERE id = ?").bind(id).first<Record<string, unknown>>();
    return currentRow ? { kind: "conflict", service: parseService(currentRow) } : { kind: "not_found" };
  }
  if (actor && (!batch[1]?.meta.changes || !batch[2]?.meta.changes)) throw new Error("Unable to save the service audit record.");
  return {
    kind: "updated",
    service: {
      id,
      ...input,
      createdAt: existing.createdAt,
      updatedAt: now,
      ownerAlertEventId,
    },
  };
}

export async function deleteService(
  id: string,
  actor?: AdminActor | null,
  expectedUpdatedAt?: string | null,
): Promise<ServiceDeleteResult> {
  await ensureDatabase();
  const db = await getDatabase();
  const existingRow = await db.prepare("SELECT * FROM services WHERE id = ?").bind(id).first<Record<string, unknown>>();
  if (!existingRow) return { kind: "not_found" };
  const existing = parseService(existingRow);
  if (!expectedUpdatedAt || expectedUpdatedAt !== existing.updatedAt) {
    return { kind: "conflict", service: existing };
  }
  const now = new Date().toISOString();
  const auditId = crypto.randomUUID();
  const ownerAlertEventId = actor ? crypto.randomUUID() : null;
  const batch = await db.batch([
    ...(actor
      ? [
          buildAuditLogInsert(db, {
            id: auditId,
            actor,
            action: "SERVICE_DELETED",
            entityType: "service",
            entityId: id,
            previousValues: serviceAuditSnapshot(existing),
            changedFields: ["service"],
            createdAt: now,
            conditionalOn: { sql: "EXISTS (SELECT 1 FROM services WHERE id = ? AND updated_at = ?)", bindings: [id, expectedUpdatedAt] },
          }),
          db.prepare("DELETE FROM services WHERE id = ? AND updated_at = ?").bind(id, expectedUpdatedAt),
          buildOwnerAlertEventInsert(db, {
            id: ownerAlertEventId!,
            auditLogId: auditId,
            alertType: "SERVICE_DELETED",
            createdAt: now,
            conditionalOn: { sql: "EXISTS (SELECT 1 FROM audit_logs WHERE id = ?)", bindings: [auditId] },
          }),
        ]
      : [db.prepare("DELETE FROM services WHERE id = ? AND updated_at = ?").bind(id, expectedUpdatedAt)]),
  ]);
  const deletedIndex = actor ? 1 : 0;
  if (!batch[deletedIndex]?.meta.changes) {
    const currentRow = await db.prepare("SELECT * FROM services WHERE id = ?").bind(id).first<Record<string, unknown>>();
    return currentRow ? { kind: "conflict", service: parseService(currentRow) } : { kind: "not_found" };
  }
  if (actor && (!batch[0]?.meta.changes || !batch[2]?.meta.changes)) throw new Error("Unable to save the service audit record.");
  return { kind: "deleted", ownerAlertEventId };
}

export async function createBooking(
  input: BookingInput,
  context: BookingCreationContext = {},
): Promise<Booking> {
  await ensureDatabase();
  const db = await getDatabase();
  const createdSource = context.source ?? "customer";
  const actor = context.actor ?? null;
  if (createdSource === "admin" && !actor) {
    throw new Error("An authenticated administrator is required for counter bookings.");
  }
  if (!Array.isArray(input.items) || input.items.length < 1 || input.items.length > 20) {
    throw new Error("A booking must include between 1 and 20 pairs.");
  }

  const serviceIds = [...new Set(input.items.map((item) => item.serviceId))];
  if (serviceIds.some((serviceId) => !serviceId)) {
    throw new Error("Each pair must have a valid service.");
  }
  const servicePlaceholders = serviceIds.map(() => "?").join(", ");
  const serviceResult = await db
    .prepare(`
      SELECT id, name, price_label
      FROM services
      WHERE active = 1 AND id IN (${servicePlaceholders})
    `)
    .bind(...serviceIds)
    .all<{ id: string; name: string; price_label: string }>();
  const serviceById = new Map(
    serviceResult.results.map((service) => [service.id, service]),
  );
  if (serviceById.size !== serviceIds.length) {
    throw new Error("One or more selected services are no longer available.");
  }

  const itemSnapshots = input.items.map((item, index) => {
    const service = serviceById.get(item.serviceId);
    if (!service) {
      throw new Error("One or more selected services are no longer available.");
    }
    return {
      id: crypto.randomUUID(),
      pairNumber: index + 1,
      serviceId: service.id,
      serviceName: service.name,
      servicePriceLabel: service.price_label,
      servicePrice: getExactNprPrice(service.price_label),
      footwearType: item.footwearType,
      brand: item.brand ?? null,
      specialRequest: item.specialRequest ?? null,
    };
  });

  const requestedPickupArea = input.pickupArea ?? "";
  if (
    input.fulfillmentMethod === "pickup_delivery" &&
    !isPickupArea(requestedPickupArea)
  ) {
    throw new Error("Please choose a pickup area.");
  }

  const pickupArea =
    input.fulfillmentMethod === "pickup_delivery" &&
    isPickupArea(requestedPickupArea)
      ? requestedPickupArea
      : null;
  const delivery = calculatePickupDeliveryFee(
    input.fulfillmentMethod,
    pickupArea,
    itemSnapshots.length,
  );
  if (delivery.deliveryFee === null) {
    throw new Error("Please choose a pickup area.");
  }

  let expressRequested = input.expressRequested;
  let expressFee: number | null = 0;
  if (
    expressRequested &&
    itemSnapshots.some((item) => item.serviceId === "express-wash-dry")
  ) {
    // The legacy form treats Express Wash & Dry as its own primary service,
    // not an extra charge on top of itself.
    expressRequested = false;
  }
  if (expressRequested) {
    const expressService = await db
      .prepare(
        "SELECT price_label FROM services WHERE id = ? AND active = 1",
      )
      .bind("express-wash-dry")
      .first<{ price_label: string }>();
    // Older booking behavior accepted a request even when Express was not
    // currently configured as an exact-priced public service. Keep that
    // request compatible, but never invent an add-on fee.
    expressFee = expressService
      ? getExactNprPrice(expressService.price_label)
      : null;
  }

  const { serviceSubtotal, total } = calculateBookingTotals(
    itemSnapshots.map((item) => item.servicePrice),
    delivery.deliveryFee,
    expressFee,
  );
  const freeDeliveryReason = delivery.freeDeliveryApplied
    ? "4+ pairs within Hetauda"
    : null;

  const id = crypto.randomUUID();
  const auditId = crypto.randomUUID();
  const createdAt = new Date();
  const reference = `SD-${createdAt.getTime().toString(36).toUpperCase()}-${id
    .slice(0, 4)
    .toUpperCase()}`;
  const now = createdAt.toISOString();
  const firstItem = itemSnapshots[0];
  const auditActor: AuditActor = actor ?? {
    actorType: createdSource === "customer" ? "customer" : "system",
    name: createdSource === "customer" ? "Customer" : "System",
  };

  const publicReference = await generatePublicBookingReference({
    date: createdAt,
    tryPersist: async (candidate) => {
      try {
        const batchResults = await db.batch([
          db.prepare(`
            INSERT INTO bookings (
              id, reference, public_reference, customer_name, phone, email, service_id,
              service_name, shoe_type, shoe_brand, preferred_date,
              fulfillment_method, pickup_area, delivery_fee, pair_count,
              service_subtotal, express_fee, total_amount, free_delivery_applied,
              free_delivery_reason, pickup_address, location_url, notes,
              express_requested, status, created_source, created_by_admin_id,
              created_by_admin_name_snapshot, updated_by_admin_id,
              updated_by_admin_name_snapshot, record_version, discount_amount,
              payment_amount, payment_status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            id,
            reference,
            candidate,
            input.customerName,
            input.phone,
            input.email ?? null,
            firstItem.serviceId,
            firstItem.serviceName,
            firstItem.footwearType,
            firstItem.brand,
            input.preferredDate ?? null,
            input.fulfillmentMethod,
            pickupArea,
            delivery.deliveryFee,
            itemSnapshots.length,
            serviceSubtotal,
            expressFee,
            total,
            delivery.freeDeliveryApplied ? 1 : 0,
            freeDeliveryReason,
            input.pickupAddress ?? null,
            input.locationUrl ?? null,
            input.notes ?? null,
            expressRequested ? 1 : 0,
            "new",
            createdSource,
            actor?.id ?? null,
            actor?.name ?? null,
            actor?.id ?? null,
            actor?.name ?? null,
            1,
            0,
            0,
            "unpaid",
            now,
            now,
          ),
          ...itemSnapshots.map((item) =>
            db
              .prepare(`
                INSERT INTO booking_items (
                  id, booking_id, pair_number, service_id, service_name,
                  service_price_label, service_price, footwear_type, brand,
                  special_request, status, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)
              `)
              .bind(
                item.id,
                id,
                item.pairNumber,
                item.serviceId,
                item.serviceName,
                item.servicePriceLabel,
                item.servicePrice,
                item.footwearType,
                item.brand,
                item.specialRequest,
                now,
              ),
          ),
          buildAuditLogInsert(db, {
            id: auditId,
            actor: auditActor,
            action: "BOOKING_CREATED",
            entityType: "booking",
            entityId: id,
            bookingReference: candidate,
            newValues: {
              source: createdSource,
              pairCount: itemSnapshots.length,
              status: "new",
              serviceSubtotal,
              deliveryFee: delivery.deliveryFee,
              totalAmount: total,
            },
            changedFields: [
              "source",
              "pairCount",
              "status",
              "serviceSubtotal",
              "deliveryFee",
              "totalAmount",
            ],
            createdAt: now,
          }),
        ]);
        if (batchResults.some((result) => !result.meta.changes)) {
          throw new Error("Unable to save every pair in this booking.");
        }
        return true;
      } catch (error) {
        // The D1 unique index is the final authority. A concurrent booking can
        // claim this exact reference between generation and INSERT, so only
        // that conflict retries with another suffix.
        if (isPublicReferenceCollision(error)) return false;
        throw error;
      }
    },
  });

  return {
    id,
    reference,
    publicReference,
    customerName: input.customerName,
    phone: input.phone,
    email: input.email ?? null,
    customerId: null,
    createdSource,
    createdByAdminId: actor?.id ?? null,
    createdByAdminName: actor?.name ?? null,
    updatedByAdminId: actor?.id ?? null,
    updatedByAdminName: actor?.name ?? null,
    deletedAt: null,
    deletedByAdminId: null,
    deletedByAdminName: null,
    deletionReason: null,
    restoredAt: null,
    restoredByAdminId: null,
    restoredByAdminName: null,
    restorationReason: null,
    recordVersion: 1,
    serviceId: firstItem.serviceId,
    serviceName: firstItem.serviceName,
    shoeType: firstItem.footwearType,
    shoeBrand: firstItem.brand,
    preferredDate: input.preferredDate ?? null,
    fulfillmentMethod: input.fulfillmentMethod,
    pickupArea,
    deliveryFee: delivery.deliveryFee,
    pairCount: itemSnapshots.length,
    serviceSubtotal,
    expressFee,
    totalAmount: total,
    discountAmount: 0,
    paymentAmount: 0,
    paymentStatus: "unpaid",
    freeDeliveryApplied: delivery.freeDeliveryApplied,
    freeDeliveryReason,
    pickupAddress: input.pickupAddress ?? null,
    locationUrl: input.locationUrl ?? null,
    notes: input.notes ?? null,
    expressRequested,
    status: "new",
    createdAt: now,
    updatedAt: now,
    items: itemSnapshots.map((item) => ({
      ...item,
      bookingId: id,
      status: null,
      createdAt: now,
    })),
    statusHistory: [],
    operationalNotes: [],
  };
}

function parseBookingOperationalNote(row: Record<string, unknown>): BookingOperationalNote {
  return {
    id: String(row.id),
    bookingId: String(row.booking_id),
    note: String(row.note),
    adminUserId: row.admin_user_id ? String(row.admin_user_id) : null,
    administratorName: row.administrator_name_snapshot
      ? String(row.administrator_name_snapshot)
      : null,
    administratorRole:
      row.administrator_role_snapshot === "super_admin" ||
      row.administrator_role_snapshot === "admin"
        ? row.administrator_role_snapshot
        : null,
    createdAt: String(row.created_at),
  };
}

export async function listBookings(
  options: { includeDeleted?: boolean } = {},
): Promise<Booking[]> {
  await ensureDatabase();
  const db = await getDatabase();
  await backfillBookingPublicReferences(db);
  const result = await db
    .prepare(
      options.includeDeleted
        ? "SELECT * FROM bookings ORDER BY created_at DESC LIMIT 500"
        : "SELECT * FROM bookings WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 500",
    )
    .all<Record<string, unknown>>();
  const bookings = result.results.map(parseBooking);
  await Promise.all([
    attachBookingItems(db, bookings),
    attachBookingStatusHistory(db, bookings),
    attachBookingOperationalNotes(db, bookings),
  ]);
  return bookings;
}

/**
 * Exact operational-reference lookup for the existing protected admin API.
 * This deliberately avoids the dashboard's 500-record overview limit.
 */
export async function findBookingsByPublicReference(
  publicReference: string,
  options: { includeDeleted?: boolean } = {},
): Promise<Booking[]> {
  await ensureDatabase();
  const db = await getDatabase();
  const result = await db
    .prepare(
      options.includeDeleted
        ? "SELECT * FROM bookings WHERE public_reference = ?"
        : "SELECT * FROM bookings WHERE public_reference = ? AND deleted_at IS NULL",
    )
    .bind(publicReference)
    .all<Record<string, unknown>>();
  const bookings = result.results.map(parseBooking);
  await Promise.all([
    attachBookingItems(db, bookings),
    attachBookingStatusHistory(db, bookings),
    attachBookingOperationalNotes(db, bookings),
  ]);
  return bookings;
}

export async function listDeletedBookings(): Promise<Booking[]> {
  await ensureDatabase();
  const db = await getDatabase();
  const result = await db
    .prepare("SELECT * FROM bookings WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC LIMIT 500")
    .all<Record<string, unknown>>();
  const bookings = result.results.map(parseBooking);
  await Promise.all([
    attachBookingItems(db, bookings),
    attachBookingStatusHistory(db, bookings),
    attachBookingOperationalNotes(db, bookings),
  ]);
  return bookings;
}

export async function getBookingForAdmin(id: string, includeDeleted = false) {
  await ensureDatabase();
  const db = await getDatabase();
  const foundBooking = await findBookingById(db, id);
  if (!foundBooking || (!includeDeleted && foundBooking.deletedAt)) return null;
  // Historical bookings can predate short public references. Normalise them
  // through the established generator before returning an actionable admin
  // record, rather than inventing a separate legacy identifier path.
  const booking = await ensureBookingPublicReference(db, foundBooking);
  await Promise.all([
    attachBookingStatusHistory(db, [booking]),
    attachBookingOperationalNotes(db, [booking]),
  ]);
  return booking;
}

export async function updateBookingStatus(
  id: string,
  status: BookingStatus,
  actor?: AdminActor | null,
  expectedVersion?: number | null,
): Promise<BookingStatusUpdateResult> {
  await ensureDatabase();
  const db = await getDatabase();
  const foundBooking = await findBookingById(db, id);
  if (!foundBooking || foundBooking.deletedAt) return { kind: "not_found" };
  const booking = await ensureBookingPublicReference(db, foundBooking);
  if (booking.status === status) return { kind: "unchanged", booking };
  const version = Number.isSafeInteger(expectedVersion) && Number(expectedVersion) > 0
    ? Number(expectedVersion)
    : booking.recordVersion;

  const now = new Date().toISOString();
  const historyId = crypto.randomUUID();
  const notificationId = crypto.randomUUID();
  const auditId = crypto.randomUUID();
  const plan = buildStatusNotificationPlan(booking, status);
  const history: BookingStatusHistory = {
    id: historyId,
    bookingId: booking.id,
    previousStatus: booking.status,
    newStatus: status,
    changedBy: cleanChangedBy(actor?.email),
    adminUserId: actor?.id ?? null,
    administratorName: actor?.name ?? null,
    administratorRole: actor?.role ?? null,
    pairId: null,
    pairReference: null,
    createdAt: now,
    notification: null,
  };
  let notification = notificationFromPlan({
    id: notificationId,
    bookingId: booking.id,
    statusHistoryId: historyId,
    now,
    plan,
  });

  // The last-history pointer is a per-request token. It lets the history and
  // notification inserts prove that this exact conditional UPDATE won, so two
  // simultaneous clicks cannot create two messages for one transition.
  const batchResults = await db.batch([
    db
      .prepare(`
        UPDATE bookings
        SET status = ?, updated_at = ?, last_status_history_id = ?,
            updated_by_admin_id = ?, updated_by_admin_name_snapshot = ?,
            record_version = record_version + 1
        WHERE id = ? AND status = ? AND deleted_at IS NULL AND record_version = ?
      `)
      .bind(status, now, historyId, actor?.id ?? null, actor?.name ?? null, booking.id, booking.status, version),
    db
      .prepare(`
        INSERT INTO booking_status_history (
          id, booking_id, previous_status, new_status, changed_by, admin_user_id,
          administrator_name_snapshot, administrator_role_snapshot, pair_id,
          pair_reference, created_at
        ) SELECT ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?
        WHERE EXISTS (
          SELECT 1 FROM bookings
          WHERE id = ? AND last_status_history_id = ?
        )
      `)
      .bind(
        history.id,
        history.bookingId,
        history.previousStatus,
        history.newStatus,
        history.changedBy,
        history.adminUserId,
        history.administratorName,
        history.administratorRole,
        history.createdAt,
        booking.id,
        history.id,
      ),
    db
      .prepare(`
        INSERT INTO booking_notifications (
          id, booking_id, status_history_id, channel, recipient,
          notification_type, status, attempt_count, last_error, sent_at,
          created_at, updated_at
        )
        SELECT ?, ?, ?, 'email', ?, 'status_update', ?, ?, ?, ?, ?, ?
        WHERE EXISTS (
          SELECT 1 FROM booking_status_history
          WHERE id = ? AND booking_id = ?
        )
      `)
      .bind(
        notification.id,
        notification.bookingId,
        notification.statusHistoryId,
        notification.recipient,
        notification.status,
        notification.attemptCount,
        notification.lastError,
        notification.sentAt,
        notification.createdAt,
        notification.updatedAt,
        history.id,
        booking.id,
      ),
    buildAuditLogInsert(db, {
      id: auditId,
      actor: actor ?? { actorType: "system", name: "System" },
      action: "BOOKING_STATUS_CHANGED",
      entityType: "booking",
      entityId: booking.id,
      bookingReference: getBookingPublicReference(booking),
      previousValues: { status: booking.status },
      newValues: { status },
      changedFields: ["status"],
      createdAt: now,
      conditionalOn: {
        sql: "EXISTS (SELECT 1 FROM bookings WHERE id = ? AND last_status_history_id = ?)",
        bindings: [booking.id, historyId],
      },
    }),
  ]);

  if (!batchResults[0]?.meta.changes) {
    const current = await findBookingById(db, id);
    if (!current) return { kind: "not_found" };
    return current.status === status
      ? { kind: "unchanged", booking: current }
      : { kind: "conflict", booking: current };
  }
  if (!batchResults[1]?.meta.changes || !batchResults[2]?.meta.changes || !batchResults[3]?.meta.changes) {
    throw new Error("Unable to create the booking status notification record.");
  }

  const updatedBooking: Booking = {
    ...booking,
    status,
    updatedAt: now,
    updatedByAdminId: actor?.id ?? null,
    updatedByAdminName: actor?.name ?? null,
    recordVersion: booking.recordVersion + 1,
  };
  if (notification.status === "pending" && plan.content && notification.recipient) {
    notification = await deliverStatusNotification(
      db,
      updatedBooking,
      notification,
      plan.content,
    );
  }

  history.notification = notification;
  updatedBooking.statusHistory = [...booking.statusHistory, history];
  return { kind: "updated", booking: updatedBooking, history, notification };
}

export async function updateBookingItemStatus(
  bookingId: string,
  itemId: string,
  status: BookingStatus,
  actor: AdminActor,
  expectedVersion?: number | null,
) {
  await ensureDatabase();
  const db = await getDatabase();
  const foundBooking = await findBookingById(db, bookingId);
  if (!foundBooking || foundBooking.deletedAt) return { kind: "not_found" as const };
  const booking = await ensureBookingPublicReference(db, foundBooking);
  const item = booking.items.find((candidate) => candidate.id === itemId);
  if (!item) return { kind: "pair_not_found" as const };
  const previousStatus = item.status ?? booking.status;
  if (previousStatus === status) return { kind: "unchanged" as const, booking };
  const version = validRecordVersion(expectedVersion) ?? booking.recordVersion;
  const now = new Date().toISOString();
  const historyId = crypto.randomUUID();
  const auditId = crypto.randomUUID();
  const operationId = crypto.randomUUID();
  const pairReference = booking.publicReference
    ? getPhysicalPairTag(booking.publicReference, item.pairNumber)
    : `Pair ${item.pairNumber}`;
  const batch = await db.batch([
    db
      .prepare(`
        UPDATE bookings
        SET updated_at = ?, updated_by_admin_id = ?, updated_by_admin_name_snapshot = ?,
            record_version = record_version + 1, last_admin_mutation_id = ?
        WHERE id = ? AND deleted_at IS NULL AND record_version = ?
          AND EXISTS (SELECT 1 FROM booking_items WHERE id = ? AND booking_id = ?)
      `)
      .bind(now, actor.id, actor.name, operationId, booking.id, version, item.id, booking.id),
    db
      .prepare(`
        UPDATE booking_items
        SET status = ?
        WHERE id = ? AND booking_id = ?
          AND EXISTS (
            SELECT 1 FROM bookings
            WHERE id = ? AND last_admin_mutation_id = ?
          )
      `)
      .bind(status, item.id, booking.id, booking.id, operationId),
    db
      .prepare(`
        INSERT INTO booking_status_history (
          id, booking_id, previous_status, new_status, changed_by, admin_user_id,
          administrator_name_snapshot, administrator_role_snapshot, pair_id,
          pair_reference, created_at
        ) SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        WHERE EXISTS (
          SELECT 1 FROM bookings WHERE id = ? AND last_admin_mutation_id = ?
        )
      `)
      .bind(
        historyId,
        booking.id,
        previousStatus,
        status,
        actor.email,
        actor.id,
        actor.name,
        actor.role,
        item.id,
        pairReference,
        now,
        booking.id,
        operationId,
      ),
    buildAuditLogInsert(db, {
      id: auditId,
      actor,
      action: "BOOKING_PAIR_STATUS_CHANGED",
      entityType: "booking_pair",
      entityId: item.id,
      bookingReference: getBookingPublicReference(booking),
      pairReference,
      previousValues: { status: previousStatus },
      newValues: { status },
      changedFields: ["status"],
      createdAt: now,
      conditionalOn: {
        sql: "EXISTS (SELECT 1 FROM bookings WHERE id = ? AND last_admin_mutation_id = ?)",
        bindings: [booking.id, operationId],
      },
    }),
  ]);
  if (!batch[0]?.meta.changes) {
    const current = await findBookingById(db, bookingId);
    return current ? { kind: "conflict" as const, booking: current } : { kind: "not_found" as const };
  }
  if (!batch[1]?.meta.changes || !batch[2]?.meta.changes || !batch[3]?.meta.changes) {
    throw new Error("Unable to save the pair status history and audit record.");
  }
  const updated = await getBookingForAdmin(bookingId, true);
  return { kind: "updated" as const, booking: updated ?? booking };
}

/** Super-Admin correction path for a pair's saved service snapshot. The
 * original price label/name remain in the audit diff, while the booking keeps
 * its multi-pair structure and a fresh optimistic-concurrency version. */
export async function updateBookingItemService(
  bookingId: string,
  itemId: string,
  serviceId: string,
  actor: AdminActor,
  expectedVersion: number,
) {
  await ensureDatabase();
  const db = await getDatabase();
  const booking = await findBookingById(db, bookingId);
  if (!booking || booking.deletedAt) return { kind: "not_found" as const };
  const item = booking.items.find((candidate) => candidate.id === itemId);
  if (!item) return { kind: "pair_not_found" as const };
  const service = await db
    .prepare("SELECT id, name, price_label FROM services WHERE id = ?")
    .bind(serviceId)
    .first<{ id: string; name: string; price_label: string }>();
  if (!service) return { kind: "service_not_found" as const };
  const nextPrice = getExactNprPrice(service.price_label);
  const nextTotals = calculateBookingTotals(
    booking.items.map((candidate) => candidate.id === item.id ? nextPrice : candidate.servicePrice),
    booking.deliveryFee,
    booking.expressFee,
  );
  const before = {
    serviceId: item.serviceId,
    serviceName: item.serviceName,
    servicePriceLabel: item.servicePriceLabel,
    servicePrice: item.servicePrice,
    serviceSubtotal: booking.serviceSubtotal,
    totalAmount: booking.totalAmount,
  };
  const after = {
    serviceId: service.id,
    serviceName: service.name,
    servicePriceLabel: service.price_label,
    servicePrice: nextPrice,
    serviceSubtotal: nextTotals.serviceSubtotal,
    totalAmount: nextTotals.total,
  };
  const diff = auditValueDiff(before, after);
  if (!diff.changedFields.length) return { kind: "unchanged" as const, booking };
  const version = validRecordVersion(expectedVersion);
  if (!version) throw new Error("Refresh the booking before changing its service.");
  const now = new Date().toISOString();
  const operationId = crypto.randomUUID();
  const auditId = crypto.randomUUID();
  const alertId = crypto.randomUUID();
  const pairReference = booking.publicReference
    ? getPhysicalPairTag(booking.publicReference, item.pairNumber)
    : `Pair ${item.pairNumber}`;
  const summaryFields = item.pairNumber === 1
    ? ", service_id = ?, service_name = ?, service_subtotal = ?, total_amount = ?"
    : ", service_subtotal = ?, total_amount = ?";
  const parentBindings = [
    now,
    actor.id,
    actor.name,
    operationId,
    ...(item.pairNumber === 1 ? [service.id, service.name] : []),
    nextTotals.serviceSubtotal,
    nextTotals.total,
    booking.id,
    version,
  ];
  const batch = await db.batch([
    db
      .prepare(`
        UPDATE bookings
        SET updated_at = ?, updated_by_admin_id = ?, updated_by_admin_name_snapshot = ?,
            last_admin_mutation_id = ?, record_version = record_version + 1${summaryFields}
        WHERE id = ? AND deleted_at IS NULL AND record_version = ?
      `)
      .bind(...parentBindings),
    db
      .prepare(`
        UPDATE booking_items
        SET service_id = ?, service_name = ?, service_price_label = ?, service_price = ?
        WHERE id = ? AND booking_id = ?
          AND EXISTS (SELECT 1 FROM bookings WHERE id = ? AND last_admin_mutation_id = ?)
      `)
      .bind(service.id, service.name, service.price_label, nextPrice, item.id, booking.id, booking.id, operationId),
    buildAuditLogInsert(db, {
      id: auditId,
      actor,
      action: "BOOKING_PAIR_SERVICE_CHANGED",
      entityType: "booking_pair",
      entityId: item.id,
      bookingReference: getBookingPublicReference(booking),
      pairReference,
      previousValues: diff.previousValues,
      newValues: diff.newValues,
      changedFields: diff.changedFields,
      createdAt: now,
      conditionalOn: {
        sql: "EXISTS (SELECT 1 FROM bookings WHERE id = ? AND last_admin_mutation_id = ?)",
        bindings: [booking.id, operationId],
      },
    }),
    buildOwnerAlertEventInsert(db, {
      id: alertId,
      auditLogId: auditId,
      alertType: "BOOKING_PAIR_SERVICE_CHANGED",
      createdAt: now,
      conditionalOn: {
        sql: "EXISTS (SELECT 1 FROM bookings WHERE id = ? AND last_admin_mutation_id = ?)",
        bindings: [booking.id, operationId],
      },
    }),
  ]);
  if (!batch[0]?.meta.changes) {
    const current = await getBookingForAdmin(bookingId, true);
    return current ? { kind: "conflict" as const, booking: current } : { kind: "not_found" as const };
  }
  if (!batch[1]?.meta.changes || !batch[2]?.meta.changes || !batch[3]?.meta.changes) {
    throw new Error("Unable to preserve the pair service change and audit record.");
  }
  return {
    kind: "updated" as const,
    booking: (await getBookingForAdmin(bookingId, true)) ?? booking,
    ownerAlertEventId: alertId,
  };
}

export async function addBookingOperationalNote(
  bookingId: string,
  noteInput: string,
  actor: AdminActor,
  expectedVersion?: number | null,
) {
  const note = cleanOperationalNote(noteInput);
  if (!note) throw new Error("Enter an operational note between 1 and 800 characters.");
  await ensureDatabase();
  const db = await getDatabase();
  const booking = await findBookingById(db, bookingId);
  if (!booking || booking.deletedAt) return { kind: "not_found" as const };
  const version = validRecordVersion(expectedVersion) ?? booking.recordVersion;
  const now = new Date().toISOString();
  const noteId = crypto.randomUUID();
  const auditId = crypto.randomUUID();
  const operationId = crypto.randomUUID();
  const batch = await db.batch([
    db
      .prepare(`
        UPDATE bookings
        SET updated_at = ?, updated_by_admin_id = ?, updated_by_admin_name_snapshot = ?,
            record_version = record_version + 1, last_admin_mutation_id = ?
        WHERE id = ? AND deleted_at IS NULL AND record_version = ?
      `)
      .bind(now, actor.id, actor.name, operationId, booking.id, version),
    db
      .prepare(`
        INSERT INTO booking_operational_notes (
          id, booking_id, note, admin_user_id, administrator_name_snapshot,
          administrator_role_snapshot, created_at
        ) SELECT ?, ?, ?, ?, ?, ?, ?
        WHERE EXISTS (SELECT 1 FROM bookings WHERE id = ? AND last_admin_mutation_id = ?)
      `)
      .bind(noteId, booking.id, note, actor.id, actor.name, actor.role, now, booking.id, operationId),
    buildAuditLogInsert(db, {
      id: auditId,
      actor,
      action: "BOOKING_OPERATIONAL_NOTE_ADDED",
      entityType: "booking_operational_note",
      entityId: noteId,
      bookingReference: getBookingPublicReference(booking),
      newValues: { note },
      changedFields: ["note"],
      createdAt: now,
      conditionalOn: {
        sql: "EXISTS (SELECT 1 FROM booking_operational_notes WHERE id = ? AND booking_id = ?) AND EXISTS (SELECT 1 FROM bookings WHERE id = ? AND last_admin_mutation_id = ?)",
        bindings: [noteId, booking.id, booking.id, operationId],
      },
    }),
  ]);
  if (!batch[0]?.meta.changes) return { kind: "conflict" as const, booking };
  if (!batch[1]?.meta.changes || !batch[2]?.meta.changes) {
    throw new Error("Unable to preserve the operational note and audit record.");
  }
  return {
    kind: "updated" as const,
    booking: (await getBookingForAdmin(bookingId, true)) ?? booking,
  };
}

export async function updateBookingDetails(
  bookingId: string,
  input: BookingDetailsUpdateInput,
  actor: AdminActor,
  expectedVersion?: number | null,
) {
  await ensureDatabase();
  const db = await getDatabase();
  const booking = await findBookingById(db, bookingId);
  if (!booking || booking.deletedAt) return { kind: "not_found" as const };
  const before = bookingEditableSnapshot(booking);
  const after = mergeBookingDetails(before, input);
  const diff = auditValueDiff(before, after);
  if (!diff.changedFields.length) return { kind: "unchanged" as const, booking };
  const version = validRecordVersion(expectedVersion) ?? booking.recordVersion;
  const now = new Date().toISOString();
  const auditId = crypto.randomUUID();
  const operationId = crypto.randomUUID();
  const requiresOwnerAlert = diff.changedFields.some((field) =>
    ["customerName", "phone", "email", "totalAmount", "discountAmount", "paymentAmount", "paymentStatus"].includes(field),
  );
  const alertId = requiresOwnerAlert ? crypto.randomUUID() : null;
  const columns: Record<keyof typeof after, string> = {
    customerName: "customer_name",
    phone: "phone",
    email: "email",
    preferredDate: "preferred_date",
    fulfillmentMethod: "fulfillment_method",
    pickupArea: "pickup_area",
    pickupAddress: "pickup_address",
    locationUrl: "location_url",
    notes: "notes",
    totalAmount: "total_amount",
    discountAmount: "discount_amount",
    paymentAmount: "payment_amount",
    paymentStatus: "payment_status",
  };
  const setters = diff.changedFields.map((field) => `${columns[field as keyof typeof after]} = ?`);
  const values = diff.changedFields.map((field) => after[field as keyof typeof after]);
  const action = diff.changedFields.every((field) => ["customerName", "phone", "email"].includes(field))
    ? "BOOKING_CUSTOMER_CHANGED"
    : "BOOKING_DETAILS_CHANGED";
  const batch = await db.batch([
    db
      .prepare(`
        UPDATE bookings
        SET ${setters.join(", ")}, updated_at = ?, updated_by_admin_id = ?,
            updated_by_admin_name_snapshot = ?, record_version = record_version + 1,
            last_admin_mutation_id = ?
        WHERE id = ? AND deleted_at IS NULL AND record_version = ?
      `)
      .bind(...values, now, actor.id, actor.name, operationId, booking.id, version),
    buildAuditLogInsert(db, {
      id: auditId,
      actor,
      action,
      entityType: "booking",
      entityId: booking.id,
      bookingReference: getBookingPublicReference(booking),
      previousValues: diff.previousValues,
      newValues: diff.newValues,
      changedFields: diff.changedFields,
      createdAt: now,
      conditionalOn: {
        sql: "EXISTS (SELECT 1 FROM bookings WHERE id = ? AND last_admin_mutation_id = ?)",
        bindings: [booking.id, operationId],
      },
    }),
    ...(alertId
      ? [
          buildOwnerAlertEventInsert(db, {
            id: alertId,
            auditLogId: auditId,
            alertType: action,
            conditionalOn: {
              sql: "EXISTS (SELECT 1 FROM bookings WHERE id = ? AND last_admin_mutation_id = ?)",
              bindings: [booking.id, operationId],
            },
            createdAt: now,
          }),
        ]
      : []),
  ]);
  if (!batch[0]?.meta.changes) return { kind: "conflict" as const, booking };
  if (!batch[1]?.meta.changes || (alertId && !batch[2]?.meta.changes)) {
    throw new Error("Unable to write the booking audit record.");
  }
  return {
    kind: "updated" as const,
    booking: (await getBookingForAdmin(bookingId, true)) ?? booking,
    ownerAlertEventId: alertId,
  };
}

export async function softDeleteBooking(
  bookingId: string,
  reasonInput: string,
  actor: AdminActor,
  expectedVersion?: number | null,
) {
  const reason = cleanDeletionReason(reasonInput);
  if (!reason) throw new Error("A deletion or void reason is required.");
  await ensureDatabase();
  const db = await getDatabase();
  const booking = await findBookingById(db, bookingId);
  if (!booking) return { kind: "not_found" as const };
  if (booking.deletedAt) return { kind: "already_deleted" as const, booking };
  const version = validRecordVersion(expectedVersion) ?? booking.recordVersion;
  const now = new Date().toISOString();
  const auditId = crypto.randomUUID();
  const alertId = crypto.randomUUID();
  const operationId = crypto.randomUUID();
  const before = bookingDeletionSnapshot(booking);
  const after = { ...before, deletedAt: now, deletedBy: actor.name, deletionReason: reason };
  const batch = await db.batch([
    db
      .prepare(`
        UPDATE bookings
        SET deleted_at = ?, deleted_by_admin_id = ?, deleted_by_admin_name_snapshot = ?,
            deletion_reason = ?, updated_at = ?, updated_by_admin_id = ?,
            updated_by_admin_name_snapshot = ?, record_version = record_version + 1,
            last_admin_mutation_id = ?
        WHERE id = ? AND deleted_at IS NULL AND record_version = ?
      `)
      .bind(now, actor.id, actor.name, reason, now, actor.id, actor.name, operationId, booking.id, version),
    buildAuditLogInsert(db, {
      id: auditId,
      actor,
      action: "BOOKING_SOFT_DELETED",
      entityType: "booking",
      entityId: booking.id,
      bookingReference: getBookingPublicReference(booking),
      previousValues: before,
      newValues: after,
      changedFields: ["deletedAt", "deletedBy", "deletionReason"],
      reason,
      createdAt: now,
      conditionalOn: {
        sql: "EXISTS (SELECT 1 FROM bookings WHERE id = ? AND last_admin_mutation_id = ?)",
        bindings: [booking.id, operationId],
      },
    }),
    buildOwnerAlertEventInsert(db, {
      id: alertId,
      auditLogId: auditId,
      alertType: "BOOKING_SOFT_DELETED",
      conditionalOn: {
        sql: "EXISTS (SELECT 1 FROM bookings WHERE id = ? AND last_admin_mutation_id = ?)",
        bindings: [booking.id, operationId],
      },
      createdAt: now,
    }),
  ]);
  if (!batch[0]?.meta.changes) return { kind: "conflict" as const, booking };
  if (!batch[1]?.meta.changes || !batch[2]?.meta.changes) {
    throw new Error("Unable to preserve the deletion audit and owner alert record.");
  }
  return { kind: "deleted" as const, booking: (await getBookingForAdmin(bookingId, true)) ?? booking, ownerAlertEventId: alertId };
}

export async function restoreBooking(
  bookingId: string,
  reasonInput: string,
  actor: AdminActor,
  expectedVersion?: number | null,
) {
  const reason = cleanDeletionReason(reasonInput);
  if (!reason) throw new Error("A restoration reason is required.");
  await ensureDatabase();
  const db = await getDatabase();
  const booking = await findBookingById(db, bookingId);
  if (!booking) return { kind: "not_found" as const };
  if (!booking.deletedAt) return { kind: "not_deleted" as const, booking };
  const version = validRecordVersion(expectedVersion) ?? booking.recordVersion;
  const now = new Date().toISOString();
  const auditId = crypto.randomUUID();
  const alertId = crypto.randomUUID();
  const operationId = crypto.randomUUID();
  const before = bookingDeletionSnapshot(booking);
  const after = { ...before, restoredAt: now, restoredBy: actor.name, restorationReason: reason, active: true };
  const batch = await db.batch([
    db
      .prepare(`
        UPDATE bookings
        SET deleted_at = NULL, restored_at = ?, restored_by_admin_id = ?,
            restored_by_admin_name_snapshot = ?, restoration_reason = ?, updated_at = ?,
            updated_by_admin_id = ?, updated_by_admin_name_snapshot = ?,
            record_version = record_version + 1, last_admin_mutation_id = ?
        WHERE id = ? AND deleted_at IS NOT NULL AND record_version = ?
      `)
      .bind(now, actor.id, actor.name, reason, now, actor.id, actor.name, operationId, booking.id, version),
    buildAuditLogInsert(db, {
      id: auditId,
      actor,
      action: "BOOKING_RESTORED",
      entityType: "booking",
      entityId: booking.id,
      bookingReference: getBookingPublicReference(booking),
      previousValues: before,
      newValues: after,
      changedFields: ["deletedAt", "restoredAt", "restoredBy", "restorationReason"],
      reason,
      createdAt: now,
      conditionalOn: {
        sql: "EXISTS (SELECT 1 FROM bookings WHERE id = ? AND last_admin_mutation_id = ?)",
        bindings: [booking.id, operationId],
      },
    }),
    buildOwnerAlertEventInsert(db, {
      id: alertId,
      auditLogId: auditId,
      alertType: "BOOKING_RESTORED",
      conditionalOn: {
        sql: "EXISTS (SELECT 1 FROM bookings WHERE id = ? AND last_admin_mutation_id = ?)",
        bindings: [booking.id, operationId],
      },
      createdAt: now,
    }),
  ]);
  if (!batch[0]?.meta.changes) return { kind: "conflict" as const, booking };
  if (!batch[1]?.meta.changes || !batch[2]?.meta.changes) {
    throw new Error("Unable to preserve the restoration audit and owner alert record.");
  }
  return { kind: "restored" as const, booking: (await getBookingForAdmin(bookingId, true)) ?? booking, ownerAlertEventId: alertId };
}

export async function retryBookingStatusNotification(
  bookingId: string,
  notificationId: string,
  actor?: AdminActor | null,
): Promise<BookingNotificationRetryResult> {
  await ensureDatabase();
  const db = await getDatabase();
  const notification = await findBookingNotification(db, bookingId, notificationId);
  if (!notification) return { kind: "not_found" };
  if (notification.status !== "failed") {
    return { kind: "not_retryable", notification };
  }

  const bookingForAudit = await findBookingById(db, bookingId);
  const now = new Date().toISOString();
  const auditId = crypto.randomUUID();
  const operationId = crypto.randomUUID();
  const claimResults = await db.batch([
    db.prepare(`
      UPDATE booking_notifications
      SET status = 'pending', attempt_count = attempt_count + 1,
          last_error = NULL, updated_at = ?, last_mutation_id = ?
      WHERE id = ? AND booking_id = ? AND status = 'failed'
    `).bind(now, operationId, notificationId, bookingId),
    buildAuditLogInsert(db, {
      id: auditId,
      actor: actor ?? { actorType: "system", name: "System" },
      action: "BOOKING_NOTIFICATION_RETRIED",
      entityType: "booking_notification",
      entityId: notificationId,
      bookingReference: bookingForAudit ? getBookingPublicReference(bookingForAudit) : null,
      previousValues: { status: "failed", attemptCount: notification.attemptCount },
      newValues: { status: "pending", attemptCount: notification.attemptCount + 1 },
      changedFields: ["status", "attemptCount"],
      conditionalOn: {
        sql: "EXISTS (SELECT 1 FROM booking_notifications WHERE id = ? AND booking_id = ? AND status = 'pending' AND last_mutation_id = ?)",
        bindings: [notificationId, bookingId, operationId],
      },
      createdAt: now,
    }),
  ]);
  if (!claimResults[0]?.meta.changes) {
    const current = await findBookingNotification(db, bookingId, notificationId);
    return { kind: "in_progress", notification: current ?? notification };
  }

  const claimedNotification: BookingNotification = {
    ...notification,
    status: "pending",
    attemptCount: notification.attemptCount + 1,
    lastError: null,
    updatedAt: now,
  };
  const [foundBooking, history] = await Promise.all([
    findBookingById(db, bookingId),
    findBookingStatusHistory(db, notification.statusHistoryId),
  ]);

  if (!foundBooking || !history) {
    const failed = await recordNotificationWithoutDelivery(
      db,
      claimedNotification,
      "failed",
      "notification_data_unavailable",
    );
    return { kind: "failed", notification: failed };
  }
  if (!claimResults[1]?.meta.changes) {
    throw new Error("Unable to record the notification retry audit event.");
  }
  const booking = await ensureBookingPublicReference(db, foundBooking);

  const content = buildStatusEmail(history.newStatus, {
    bookingReference: getBookingPublicReference(booking),
    customerName: booking.customerName,
    fulfillmentMethod: booking.fulfillmentMethod,
    serviceName: booking.serviceName,
  });
  const recipient = claimedNotification.recipient?.trim() ?? "";
  if (!content) {
    const skipped = await recordNotificationWithoutDelivery(
      db,
      claimedNotification,
      "skipped",
      "status_not_customer_notifiable",
    );
    return { kind: "retried", booking, notification: skipped };
  }
  if (!recipient) {
    const skipped = await recordNotificationWithoutDelivery(
      db,
      claimedNotification,
      "skipped",
      "customer_email_missing",
    );
    return { kind: "retried", booking, notification: skipped };
  }
  if (!isEmailAddress(recipient)) {
    const skipped = await recordNotificationWithoutDelivery(
      db,
      claimedNotification,
      "skipped",
      "customer_email_invalid",
    );
    return { kind: "retried", booking, notification: skipped };
  }

  const delivered = await deliverStatusNotification(
    db,
    booking,
    claimedNotification,
    content,
  );
  return { kind: "retried", booking, notification: delivered };
}

type Database = Awaited<ReturnType<typeof getDatabase>>;

type StatusNotificationPlan = {
  attemptCount: number;
  content: StatusEmailContent | null;
  lastError: string | null;
  recipient: string | null;
  status: BookingNotificationStatus;
};

async function attachBookingStatusHistory(db: Database, bookings: Booking[]) {
  if (!bookings.length) return;

  const bookingIds = bookings.map((booking) => booking.id);
  const placeholders = bookingIds.map(() => "?").join(", ");
  const [historyResult, notificationResult] = await Promise.all([
    db
      .prepare(`
        SELECT * FROM booking_status_history
        WHERE booking_id IN (${placeholders})
        ORDER BY created_at ASC
      `)
      .bind(...bookingIds)
      .all<Record<string, unknown>>(),
    db
      .prepare(`
        SELECT * FROM booking_notifications
        WHERE booking_id IN (${placeholders})
          AND channel = 'email'
          AND notification_type = 'status_update'
      `)
      .bind(...bookingIds)
      .all<Record<string, unknown>>(),
  ]);
  const notificationByHistoryId = new Map(
    notificationResult.results.map((row) => {
      const notification = parseBookingNotification(row);
      return [notification.statusHistoryId, notification] as const;
    }),
  );
  const bookingById = new Map(bookings.map((booking) => [booking.id, booking]));
  historyResult.results.forEach((row) => {
    const history = parseBookingStatusHistory(
      row,
      notificationByHistoryId.get(String(row.id)) ?? null,
    );
    bookingById.get(history.bookingId)?.statusHistory.push(history);
  });
}

async function attachBookingItems(db: Database, bookings: Booking[]) {
  if (!bookings.length) return;

  const bookingIds = bookings.map((booking) => booking.id);
  const placeholders = bookingIds.map(() => "?").join(", ");
  const result = await db
    .prepare(`
      SELECT * FROM booking_items
      WHERE booking_id IN (${placeholders})
      ORDER BY booking_id ASC, pair_number ASC
    `)
    .bind(...bookingIds)
    .all<Record<string, unknown>>();
  const bookingById = new Map(bookings.map((booking) => [booking.id, booking]));
  result.results.forEach((row) => {
    const item = parseBookingItem(row);
    bookingById.get(item.bookingId)?.items.push(item);
  });
}

async function attachBookingOperationalNotes(db: Database, bookings: Booking[]) {
  if (!bookings.length) return;
  const bookingIds = bookings.map((booking) => booking.id);
  const placeholders = bookingIds.map(() => "?").join(", ");
  const result = await db
    .prepare(`
      SELECT * FROM booking_operational_notes
      WHERE booking_id IN (${placeholders})
      ORDER BY created_at DESC
    `)
    .bind(...bookingIds)
    .all<Record<string, unknown>>();
  const bookingById = new Map(bookings.map((booking) => [booking.id, booking]));
  result.results.forEach((row) => {
    const note = parseBookingOperationalNote(row);
    bookingById.get(note.bookingId)?.operationalNotes.push(note);
  });
}

async function findBookingById(db: Database, id: string) {
  const row = await db
    .prepare("SELECT * FROM bookings WHERE id = ?")
    .bind(id)
    .first<Record<string, unknown>>();
  if (!row) return null;
  const booking = parseBooking(row);
  await attachBookingItems(db, [booking]);
  return booking;
}

async function ensureBookingPublicReference(
  db: Database,
  booking: Booking,
) {
  if (booking.publicReference) return booking;

  const createdAt = new Date(booking.createdAt);
  if (Number.isNaN(createdAt.getTime())) {
    console.error(
      `Unable to assign a public booking reference for ${booking.id}: invalid created_at.`,
    );
    return booking;
  }

  await assignBookingPublicReference(db, booking.id, createdAt);
  return (await findBookingById(db, booking.id)) ?? booking;
}

async function findBookingNotification(
  db: Database,
  bookingId: string,
  notificationId: string,
) {
  const row = await db
    .prepare(`
      SELECT * FROM booking_notifications
      WHERE id = ? AND booking_id = ?
        AND channel = 'email' AND notification_type = 'status_update'
    `)
    .bind(notificationId, bookingId)
    .first<Record<string, unknown>>();
  return row ? parseBookingNotification(row) : null;
}

async function findBookingStatusHistory(db: Database, id: string) {
  const row = await db
    .prepare("SELECT * FROM booking_status_history WHERE id = ?")
    .bind(id)
    .first<Record<string, unknown>>();
  return row ? parseBookingStatusHistory(row) : null;
}

function buildStatusNotificationPlan(
  booking: Booking,
  status: BookingStatus,
): StatusNotificationPlan {
  const content = buildStatusEmail(status, {
    bookingReference: getBookingPublicReference(booking),
    customerName: booking.customerName,
    fulfillmentMethod: booking.fulfillmentMethod,
    serviceName: booking.serviceName,
  });
  if (!content) {
    return {
      attemptCount: 0,
      content: null,
      lastError: "status_not_customer_notifiable",
      recipient: null,
      status: "skipped",
    };
  }

  const recipient = booking.email?.trim() ?? "";
  if (!recipient) {
    return {
      attemptCount: 0,
      content,
      lastError: "customer_email_missing",
      recipient: null,
      status: "skipped",
    };
  }
  if (!isEmailAddress(recipient)) {
    return {
      attemptCount: 0,
      content,
      lastError: "customer_email_invalid",
      recipient,
      status: "skipped",
    };
  }
  return {
    attemptCount: 1,
    content,
    lastError: null,
    recipient,
    status: "pending",
  };
}

function notificationFromPlan(input: {
  bookingId: string;
  id: string;
  now: string;
  plan: StatusNotificationPlan;
  statusHistoryId: string;
}): BookingNotification {
  return {
    id: input.id,
    bookingId: input.bookingId,
    statusHistoryId: input.statusHistoryId,
    channel: "email",
    recipient: input.plan.recipient,
    notificationType: "status_update",
    status: input.plan.status,
    attemptCount: input.plan.attemptCount,
    lastError: input.plan.lastError,
    sentAt: null,
    createdAt: input.now,
    updatedAt: input.now,
  };
}

async function deliverStatusNotification(
  db: Database,
  booking: Booking,
  notification: BookingNotification,
  content: StatusEmailContent,
) {
  const result = await sendGmailStatusEmail({
    content,
    to: notification.recipient ?? "",
  });
  const nextStatus: BookingNotificationStatus =
    result.status === "sent" ? "sent" : "failed";
  const lastError = result.status === "sent" ? null : result.errorCode;
  const now = new Date().toISOString();
  const next: BookingNotification = {
    ...notification,
    status: nextStatus,
    lastError,
    sentAt: result.status === "sent" ? now : null,
    updatedAt: now,
  };

  if (result.status === "failed") {
    console.error(
      `Status email failed for booking ${getBookingPublicReference(booking)}; notification ${notification.id}; ${result.errorCode}.`,
    );
  }
  try {
    await db
      .prepare(`
        UPDATE booking_notifications
        SET status = ?, last_error = ?, sent_at = ?, updated_at = ?
        WHERE id = ? AND status = 'pending'
      `)
      .bind(next.status, next.lastError, next.sentAt, next.updatedAt, next.id)
      .run();
  } catch {
    // Keeping the row pending is safer than permitting a blind retry after an
    // email may already have reached Gmail.
    console.error(
      `Unable to record status email outcome for booking ${getBookingPublicReference(booking)}; notification ${notification.id}.`,
    );
    return {
      ...notification,
      lastError: "notification_result_persist_failed",
      updatedAt: now,
    };
  }
  return next;
}

async function recordNotificationWithoutDelivery(
  db: Database,
  notification: BookingNotification,
  status: "failed" | "skipped",
  lastError: string,
) {
  const now = new Date().toISOString();
  const next: BookingNotification = {
    ...notification,
    status,
    lastError,
    sentAt: null,
    updatedAt: now,
  };
  try {
    await db
      .prepare(`
        UPDATE booking_notifications
        SET status = ?, last_error = ?, sent_at = NULL, updated_at = ?
        WHERE id = ? AND status = 'pending'
      `)
      .bind(next.status, next.lastError, next.updatedAt, next.id)
      .run();
  } catch {
    console.error(
      `Unable to record skipped status email for notification ${notification.id}.`,
    );
    return {
      ...notification,
      lastError: "notification_result_persist_failed",
      updatedAt: now,
    };
  }
  return next;
}

function cleanChangedBy(value: string | null | undefined) {
  const cleaned = String(value ?? "").trim().slice(0, 160);
  return cleaned || null;
}

function validRecordVersion(value: unknown) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function cleanOperationalNote(value: unknown) {
  const note = String(value ?? "").trim().replace(/\s+/gu, " ");
  return note.length > 0 && note.length <= 800 ? note : "";
}

function cleanDeletionReason(value: unknown) {
  const reason = String(value ?? "").trim().replace(/\s+/gu, " ");
  return reason.length >= 3 && reason.length <= 500 ? reason : "";
}

function bookingEditableSnapshot(booking: Booking) {
  return {
    customerName: booking.customerName,
    phone: booking.phone,
    email: booking.email,
    preferredDate: booking.preferredDate,
    fulfillmentMethod: booking.fulfillmentMethod,
    pickupArea: booking.pickupArea,
    pickupAddress: booking.pickupAddress,
    locationUrl: booking.locationUrl,
    notes: booking.notes,
    totalAmount: booking.totalAmount,
    discountAmount: booking.discountAmount,
    paymentAmount: booking.paymentAmount,
    paymentStatus: booking.paymentStatus,
  };
}

function mergeBookingDetails(
  current: ReturnType<typeof bookingEditableSnapshot>,
  input: BookingDetailsUpdateInput,
) {
  const next = { ...current };
  if (input.customerName !== undefined) next.customerName = input.customerName;
  if (input.phone !== undefined) next.phone = input.phone;
  if (input.email !== undefined) next.email = input.email;
  if (input.preferredDate !== undefined) next.preferredDate = input.preferredDate;
  if (input.fulfillmentMethod !== undefined) next.fulfillmentMethod = input.fulfillmentMethod;
  if (input.pickupArea !== undefined) next.pickupArea = input.pickupArea;
  if (input.pickupAddress !== undefined) next.pickupAddress = input.pickupAddress;
  if (input.locationUrl !== undefined) next.locationUrl = input.locationUrl;
  if (input.notes !== undefined) next.notes = input.notes;
  if (input.totalAmount !== undefined) next.totalAmount = input.totalAmount;
  if (input.discountAmount !== undefined) next.discountAmount = input.discountAmount;
  if (input.paymentAmount !== undefined) next.paymentAmount = input.paymentAmount;
  if (input.paymentStatus !== undefined) next.paymentStatus = input.paymentStatus;

  if (next.fulfillmentMethod === "self_dropoff") {
    next.pickupArea = null;
    next.pickupAddress = null;
    next.locationUrl = null;
  }
  if (next.fulfillmentMethod === "pickup_delivery" && (!next.pickupArea || !next.pickupAddress)) {
    throw new Error("Pickup and delivery bookings need a pickup area and address.");
  }
  for (const amount of [next.totalAmount, next.discountAmount, next.paymentAmount]) {
    if (amount !== null && (!Number.isSafeInteger(amount) || amount < 0)) {
      throw new Error("Prices, discounts, and payment amounts must be non-negative whole rupee amounts.");
    }
  }
  return next;
}

function bookingDeletionSnapshot(booking: Booking) {
  return {
    booking: {
      publicReference: booking.publicReference,
      creationSource: booking.createdSource,
      status: booking.status,
      pairCount: booking.pairCount,
      fulfillmentMethod: booking.fulfillmentMethod,
      pickupArea: booking.pickupArea,
      preferredDate: booking.preferredDate,
      serviceSubtotal: booking.serviceSubtotal,
      deliveryFee: booking.deliveryFee,
      expressFee: booking.expressFee,
      totalAmount: booking.totalAmount,
      discountAmount: booking.discountAmount,
      paymentAmount: booking.paymentAmount,
      paymentStatus: booking.paymentStatus,
    },
    pairs: booking.items.map((item) => ({
      pairNumber: item.pairNumber,
      serviceId: item.serviceId,
      serviceName: item.serviceName,
      servicePriceLabel: item.servicePriceLabel,
      servicePrice: item.servicePrice,
      status: item.status,
    })),
    deletedAt: booking.deletedAt,
    deletedBy: booking.deletedByAdminName,
    deletionReason: booking.deletionReason,
    restoredAt: booking.restoredAt,
    restoredBy: booking.restoredByAdminName,
    restorationReason: booking.restorationReason,
  };
}

function serviceAuditSnapshot(service: Service) {
  return {
    name: service.name,
    category: service.category,
    priceLabel: service.priceLabel,
    specialPriceLabel: service.specialPriceLabel,
    turnaround: service.turnaround,
    description: service.description,
    features: service.features,
    badge: service.badge,
    tone: service.tone,
    icon: service.icon,
    active: service.active,
    sortOrder: service.sortOrder,
  };
}
