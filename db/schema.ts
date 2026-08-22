import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const services = sqliteTable(
  "services",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    category: text("category").notNull(),
    priceLabel: text("price_label").notNull(),
    specialPriceLabel: text("special_price_label"),
    turnaround: text("turnaround").notNull(),
    description: text("description").notNull(),
    features: text("features").notNull().default("[]"),
    badge: text("badge"),
    tone: text("tone").notNull().default("lime"),
    icon: text("icon").notNull().default("+"),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("services_category_sort_idx").on(
      table.category,
      table.sortOrder,
    ),
  ],
);

export const bookings = sqliteTable(
  "bookings",
  {
    id: text("id").primaryKey(),
    reference: text("reference").notNull().unique(),
    customerName: text("customer_name").notNull(),
    phone: text("phone").notNull(),
    email: text("email"),
    serviceId: text("service_id").notNull(),
    serviceName: text("service_name").notNull(),
    shoeType: text("shoe_type").notNull(),
    shoeBrand: text("shoe_brand"),
    preferredDate: text("preferred_date"),
    fulfillmentMethod: text("fulfillment_method")
      .notNull()
      .default("self_dropoff"),
    pickupArea: text("pickup_area"),
    deliveryFee: integer("delivery_fee").notNull().default(0),
    pairCount: integer("pair_count").notNull().default(1),
    serviceSubtotal: integer("service_subtotal"),
    expressFee: integer("express_fee").default(0),
    totalAmount: integer("total_amount"),
    freeDeliveryApplied: integer("free_delivery_applied", { mode: "boolean" })
      .notNull()
      .default(false),
    freeDeliveryReason: text("free_delivery_reason"),
    pickupAddress: text("pickup_address"),
    locationUrl: text("location_url"),
    notes: text("notes"),
    expressRequested: integer("express_requested", { mode: "boolean" })
      .notNull()
      .default(false),
    status: text("status").notNull().default("new"),
    lastStatusHistoryId: text("last_status_history_id"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("bookings_status_created_idx").on(table.status, table.createdAt),
  ],
);

export const bookingItems = sqliteTable(
  "booking_items",
  {
    id: text("id").primaryKey(),
    bookingId: text("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    pairNumber: integer("pair_number").notNull(),
    serviceId: text("service_id").notNull(),
    serviceName: text("service_name").notNull(),
    servicePriceLabel: text("service_price_label").notNull(),
    servicePrice: integer("service_price"),
    footwearType: text("footwear_type").notNull(),
    brand: text("brand"),
    specialRequest: text("special_request"),
    status: text("status"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("booking_items_booking_pair_uniq").on(
      table.bookingId,
      table.pairNumber,
    ),
    index("booking_items_booking_pair_idx").on(table.bookingId, table.pairNumber),
  ],
);

export const bookingStatusHistory = sqliteTable(
  "booking_status_history",
  {
    id: text("id").primaryKey(),
    bookingId: text("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    previousStatus: text("previous_status").notNull(),
    newStatus: text("new_status").notNull(),
    changedBy: text("changed_by"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("booking_status_history_booking_created_idx").on(
      table.bookingId,
      table.createdAt,
    ),
  ],
);

export const bookingNotifications = sqliteTable(
  "booking_notifications",
  {
    id: text("id").primaryKey(),
    bookingId: text("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    statusHistoryId: text("status_history_id")
      .notNull()
      .references(() => bookingStatusHistory.id, { onDelete: "cascade" }),
    channel: text("channel").notNull().default("email"),
    recipient: text("recipient"),
    notificationType: text("notification_type")
      .notNull()
      .default("status_update"),
    status: text("status").notNull().default("pending"),
    attemptCount: integer("attempt_count").notNull().default(0),
    lastError: text("last_error"),
    sentAt: text("sent_at"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("booking_notifications_history_channel_type_uniq").on(
      table.statusHistoryId,
      table.channel,
      table.notificationType,
    ),
    index("booking_notifications_booking_status_idx").on(
      table.bookingId,
      table.status,
      table.updatedAt,
    ),
    index("booking_notifications_history_idx").on(table.statusHistoryId),
  ],
);

export const donationRequests = sqliteTable(
  "donation_requests",
  {
    id: text("id").primaryKey(),
    requestId: text("request_id").notNull().unique(),
    donorName: text("donor_name").notNull(),
    phone: text("phone").notNull(),
    email: text("email"),
    location: text("location").notNull(),
    numberOfPairs: integer("number_of_pairs").notNull(),
    shoeType: text("shoe_type"),
    shoeCondition: text("shoe_condition").notNull(),
    donationMethod: text("donation_method")
      .notNull()
      .default("self_dropoff"),
    pickupAddress: text("pickup_address"),
    preferredPickupDate: text("preferred_pickup_date"),
    donorNotes: text("donor_notes"),
    status: text("status").notNull().default("new"),
    internalNotes: text("internal_notes"),
    submittedAt: text("submitted_at").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("donation_requests_status_submitted_idx").on(
      table.status,
      table.submittedAt,
    ),
    index("donation_requests_submitted_at_idx").on(table.submittedAt),
    index("donation_requests_donor_name_idx").on(table.donorName),
    index("donation_requests_phone_idx").on(table.phone),
    index("donation_requests_location_idx").on(table.location),
  ],
);

export const donationDrives = sqliteTable(
  "donation_drives",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    shortDescription: text("short_description").notNull(),
    fullStory: text("full_story").notNull(),
    // The column name is retained for deployed-D1 compatibility. It now holds
    // a validated image URL or public website image path.
    coverImageUrl: text("cover_image_id"),
    driveDate: text("drive_date").notNull(),
    location: text("location").notNull(),
    partnerOrganization: text("partner_organization"),
    goalPairs: integer("goal_pairs").notNull().default(0),
    pairsCollected: integer("pairs_collected").notNull().default(0),
    pairsRestored: integer("pairs_restored").notNull().default(0),
    pairsDonated: integer("pairs_donated").notNull().default(0),
    status: text("status").notNull().default("draft"),
    isPublished: integer("is_published", { mode: "boolean" })
      .notNull()
      .default(false),
    ctaText: text("cta_text"),
    ctaLink: text("cta_link"),
    publishedAt: text("published_at"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("donation_drives_published_date_idx").on(
      table.isPublished,
      table.driveDate,
    ),
    index("donation_drives_status_date_idx").on(table.status, table.driveDate),
  ],
);

export const restorationStories = sqliteTable(
  "restoration_stories",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    category: text("category").notNull(),
    // Existing column names are retained; values are URL/path strings.
    beforeImageUrl: text("before_image_id"),
    afterImageUrl: text("after_image_id"),
    description: text("description").notNull(),
    restorationWork: text("restoration_work").notNull(),
    storyDate: text("story_date").notNull(),
    isPublished: integer("is_published", { mode: "boolean" })
      .notNull()
      .default(false),
    publishedAt: text("published_at"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("restoration_stories_published_date_idx").on(
      table.isPublished,
      table.storyDate,
    ),
    index("restoration_stories_category_date_idx").on(
      table.category,
      table.storyDate,
    ),
  ],
);

export const communityUpdates = sqliteTable(
  "community_updates",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    // Existing column names are retained; values are URL/path strings.
    coverImageUrl: text("cover_image_id"),
    galleryImageUrls: text("gallery_image_ids").notNull().default("[]"),
    updateDate: text("update_date").notNull(),
    location: text("location").notNull(),
    recipientOrganization: text("recipient_organization").notNull(),
    shoesDonated: integer("shoes_donated").notNull().default(0),
    story: text("story").notNull(),
    isPublished: integer("is_published", { mode: "boolean" })
      .notNull()
      .default(false),
    publishedAt: text("published_at"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("community_updates_published_date_idx").on(
      table.isPublished,
      table.updateDate,
    ),
    index("community_updates_recipient_date_idx").on(
      table.recipientOrganization,
      table.updateDate,
    ),
  ],
);

export const donationImpactStats = sqliteTable("donation_impact_stats", {
  id: text("id").primaryKey(),
  totalPairsCollected: integer("total_pairs_collected").notNull().default(0),
  totalPairsRestored: integer("total_pairs_restored").notNull().default(0),
  totalPairsDonated: integer("total_pairs_donated").notNull().default(0),
  donationDrivesCompleted: integer("donation_drives_completed")
    .notNull()
    .default(0),
  partnerOrganizations: integer("partner_organizations").notNull().default(0),
  communitiesReached: integer("communities_reached").notNull().default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
