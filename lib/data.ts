export const SERVICE_CATEGORIES = ["Cleaning", "Repairs", "Add-ons"] as const;
export const SERVICE_TONES = ["lime", "coral", "violet", "blue", "cream"] as const;
export const BOOKING_STATUSES = [
  "new",
  "confirmed",
  "in_progress",
  "ready",
  "completed",
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

export type Booking = {
  id: string;
  reference: string;
  customerName: string;
  phone: string;
  email: string | null;
  serviceId: string;
  serviceName: string;
  shoeType: string;
  shoeBrand: string | null;
  preferredDate: string | null;
  fulfillmentMethod: FulfillmentMethod;
  pickupAddress: string | null;
  locationUrl: string | null;
  notes: string | null;
  expressRequested: boolean;
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
};

export type BookingInput = {
  customerName: string;
  phone: string;
  email?: string | null;
  serviceId: string;
  shoeType: string;
  shoeBrand?: string | null;
  preferredDate?: string | null;
  fulfillmentMethod: FulfillmentMethod;
  pickupAddress?: string | null;
  locationUrl?: string | null;
  notes?: string | null;
  expressRequested: boolean;
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
    description: "Inside-and-out care for pairs that need a proper reset.",
    features: [
      "Inside & outside",
      "Stain treatment",
      "Deodorizing",
      "Detailed finishing",
    ],
    badge: "Most popular",
    tone: "lime",
    icon: "✦",
    active: true,
    sortOrder: 20,
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
    priceLabel: "+ Rs 199",
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

async function getDatabase() {
  const { env } = await import("cloudflare:workers");
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
        customer_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT,
        service_id TEXT NOT NULL,
        service_name TEXT NOT NULL,
        shoe_type TEXT NOT NULL,
        shoe_brand TEXT,
        preferred_date TEXT,
        fulfillment_method TEXT NOT NULL DEFAULT 'self_dropoff',
        pickup_address TEXT,
        location_url TEXT,
        notes TEXT,
        express_requested INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'new',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `),
    db.prepare(`
      CREATE INDEX IF NOT EXISTS bookings_status_created_idx
      ON bookings(status, created_at)
    `),
  ]);

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
  return {
    id: String(row.id),
    reference: String(row.reference),
    customerName: String(row.customer_name),
    phone: String(row.phone),
    email: row.email ? String(row.email) : null,
    serviceId: String(row.service_id),
    serviceName: String(row.service_name),
    shoeType: String(row.shoe_type),
    shoeBrand: row.shoe_brand ? String(row.shoe_brand) : null,
    preferredDate: row.preferred_date ? String(row.preferred_date) : null,
    fulfillmentMethod:
      row.fulfillment_method === "pickup_delivery"
        ? "pickup_delivery"
        : "self_dropoff",
    pickupAddress: row.pickup_address ? String(row.pickup_address) : null,
    locationUrl: row.location_url ? String(row.location_url) : null,
    notes: row.notes ? String(row.notes) : null,
    expressRequested: Boolean(row.express_requested),
    status: row.status as BookingStatus,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
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

export async function createService(input: ServiceInput): Promise<Service> {
  await ensureDatabase();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const db = await getDatabase();

  await db
    .prepare(`
      INSERT INTO services (
        id, name, category, price_label, special_price_label, turnaround,
        description, features, badge, tone, icon, active, sort_order,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
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
    )
    .run();

  return { id, ...input, createdAt: now, updatedAt: now };
}

export async function updateService(
  id: string,
  input: ServiceInput,
): Promise<Service | null> {
  await ensureDatabase();
  const now = new Date().toISOString();
  const db = await getDatabase();
  const result = await db
    .prepare(`
      UPDATE services SET
        name = ?, category = ?, price_label = ?, special_price_label = ?,
        turnaround = ?, description = ?, features = ?, badge = ?, tone = ?,
        icon = ?, active = ?, sort_order = ?, updated_at = ?
      WHERE id = ?
    `)
    .bind(
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
      id,
    )
    .run();

  if (!result.meta.changes) return null;
  const created = await db
    .prepare("SELECT created_at FROM services WHERE id = ?")
    .bind(id)
    .first<{ created_at: string }>();
  return {
    id,
    ...input,
    createdAt: created?.created_at ?? now,
    updatedAt: now,
  };
}

export async function deleteService(id: string): Promise<boolean> {
  await ensureDatabase();
  const db = await getDatabase();
  const result = await db
    .prepare("DELETE FROM services WHERE id = ?")
    .bind(id)
    .run();
  return Boolean(result.meta.changes);
}

export async function createBooking(input: BookingInput): Promise<Booking> {
  await ensureDatabase();
  const db = await getDatabase();
  const serviceRow = await db
    .prepare("SELECT id, name FROM services WHERE id = ? AND active = 1")
    .bind(input.serviceId)
    .first<{ id: string; name: string }>();

  if (!serviceRow) {
    throw new Error("The selected service is no longer available.");
  }

  const id = crypto.randomUUID();
  const reference = `SD-${Date.now().toString(36).toUpperCase()}-${id
    .slice(0, 4)
    .toUpperCase()}`;
  const now = new Date().toISOString();

  await db
    .prepare(`
      INSERT INTO bookings (
        id, reference, customer_name, phone, email, service_id,
        service_name, shoe_type, shoe_brand, preferred_date,
        fulfillment_method, pickup_address, location_url, notes,
        express_requested, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?)
    `)
    .bind(
      id,
      reference,
      input.customerName,
      input.phone,
      input.email ?? null,
      serviceRow.id,
      serviceRow.name,
      input.shoeType,
      input.shoeBrand ?? null,
      input.preferredDate ?? null,
      input.fulfillmentMethod,
      input.pickupAddress ?? null,
      input.locationUrl ?? null,
      input.notes ?? null,
      input.expressRequested ? 1 : 0,
      now,
      now,
    )
    .run();

  return {
    id,
    reference,
    customerName: input.customerName,
    phone: input.phone,
    email: input.email ?? null,
    serviceId: serviceRow.id,
    serviceName: serviceRow.name,
    shoeType: input.shoeType,
    shoeBrand: input.shoeBrand ?? null,
    preferredDate: input.preferredDate ?? null,
    fulfillmentMethod: input.fulfillmentMethod,
    pickupAddress: input.pickupAddress ?? null,
    locationUrl: input.locationUrl ?? null,
    notes: input.notes ?? null,
    expressRequested: input.expressRequested,
    status: "new",
    createdAt: now,
    updatedAt: now,
  };
}

export async function listBookings(): Promise<Booking[]> {
  await ensureDatabase();
  const db = await getDatabase();
  const result = await db
    .prepare("SELECT * FROM bookings ORDER BY created_at DESC LIMIT 500")
    .all<Record<string, unknown>>();
  return result.results.map(parseBooking);
}

export async function updateBookingStatus(
  id: string,
  status: BookingStatus,
): Promise<boolean> {
  await ensureDatabase();
  const db = await getDatabase();
  const result = await db
    .prepare("UPDATE bookings SET status = ?, updated_at = ? WHERE id = ?")
    .bind(status, new Date().toISOString(), id)
    .run();
  return Boolean(result.meta.changes);
}
