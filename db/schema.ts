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
    lastMutationId: text("last_mutation_id"),
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
    publicReference: text("public_reference"),
    customerName: text("customer_name").notNull(),
    phone: text("phone").notNull(),
    email: text("email"),
    customerId: text("customer_id"),
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
    createdSource: text("created_source"),
    createdByAdminId: text("created_by_admin_id"),
    createdByAdminNameSnapshot: text("created_by_admin_name_snapshot"),
    updatedByAdminId: text("updated_by_admin_id"),
    updatedByAdminNameSnapshot: text("updated_by_admin_name_snapshot"),
    deletedAt: text("deleted_at"),
    deletedByAdminId: text("deleted_by_admin_id"),
    deletedByAdminNameSnapshot: text("deleted_by_admin_name_snapshot"),
    deletionReason: text("deletion_reason"),
    restoredAt: text("restored_at"),
    restoredByAdminId: text("restored_by_admin_id"),
    restoredByAdminNameSnapshot: text("restored_by_admin_name_snapshot"),
    restorationReason: text("restoration_reason"),
    recordVersion: integer("record_version").notNull().default(1),
    lastAdminMutationId: text("last_admin_mutation_id"),
    discountAmount: integer("discount_amount"),
    paymentAmount: integer("payment_amount"),
    paymentStatus: text("payment_status"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("bookings_public_reference_unique").on(table.publicReference),
    index("bookings_status_created_idx").on(table.status, table.createdAt),
    index("bookings_customer_id_idx").on(table.customerId),
  ],
);

export const customers = sqliteTable(
  "customers",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    phoneNormalized: text("phone_normalized").notNull(),
    email: text("email"),
    emailNormalized: text("email_normalized"),
    recoveryEmail: text("recovery_email"),
    defaultAddress: text("default_address"),
    defaultPickupArea: text("default_pickup_area"),
    recoveryEmailEnabledAt: text("recovery_email_enabled_at"),
    emailVerifiedAt: text("email_verified_at"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("customers_phone_normalized_idx").on(table.phoneNormalized),
    uniqueIndex("customers_phone_email_identity_uniq").on(
      table.phoneNormalized,
      table.emailNormalized,
    ),
  ],
);

export const customerSessions = sqliteTable(
  "customer_sessions",
  {
    id: text("id").primaryKey(),
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    createdAt: text("created_at").notNull(),
    expiresAt: text("expires_at").notNull(),
    lastUsedAt: text("last_used_at"),
    revokedAt: text("revoked_at"),
  },
  (table) => [
    uniqueIndex("customer_sessions_token_hash_uniq").on(table.tokenHash),
    index("customer_sessions_customer_active_idx").on(
      table.customerId,
      table.revokedAt,
      table.expiresAt,
    ),
    index("customer_sessions_expires_at_idx").on(table.expiresAt),
  ],
);

export const customerVerificationCodes = sqliteTable(
  "customer_verification_codes",
  {
    id: text("id").primaryKey(),
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    codeHash: text("code_hash").notNull(),
    createdAt: text("created_at").notNull(),
    expiresAt: text("expires_at").notNull(),
    attemptCount: integer("attempt_count").notNull().default(0),
    consumedAt: text("consumed_at"),
  },
  (table) => [
    index("customer_verification_codes_customer_active_idx").on(
      table.customerId,
      table.consumedAt,
      table.expiresAt,
      table.createdAt,
    ),
    index("customer_verification_codes_expires_at_idx").on(table.expiresAt),
  ],
);

export const customerRateLimits = sqliteTable(
  "customer_rate_limits",
  {
    id: text("id").primaryKey(),
    keyHash: text("key_hash").notNull(),
    scope: text("scope").notNull(),
    windowStartedAt: text("window_started_at").notNull(),
    count: integer("count").notNull().default(0),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("customer_rate_limits_scope_key_uniq").on(
      table.scope,
      table.keyHash,
    ),
    index("customer_rate_limits_window_started_idx").on(table.windowStartedAt),
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
    adminUserId: text("admin_user_id"),
    administratorNameSnapshot: text("administrator_name_snapshot"),
    administratorRoleSnapshot: text("administrator_role_snapshot"),
    pairId: text("pair_id"),
    pairReference: text("pair_reference"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("booking_status_history_booking_created_idx").on(
      table.bookingId,
      table.createdAt,
    ),
  ],
);

export const bookingOperationalNotes = sqliteTable(
  "booking_operational_notes",
  {
    id: text("id").primaryKey(),
    bookingId: text("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "restrict" }),
    note: text("note").notNull(),
    adminUserId: text("admin_user_id"),
    administratorNameSnapshot: text("administrator_name_snapshot"),
    administratorRoleSnapshot: text("administrator_role_snapshot"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("booking_operational_notes_booking_created_idx").on(table.bookingId, table.createdAt)],
);

export const adminUsers = sqliteTable(
  "admin_users",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailNormalized: text("email_normalized").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: text("role").notNull(),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull(),
    createdByAdminId: text("created_by_admin_id"),
    updatedAt: text("updated_at").notNull(),
    lastLoginAt: text("last_login_at"),
    mustChangePassword: integer("must_change_password", { mode: "boolean" }).notNull().default(false),
    lastMutationId: text("last_mutation_id"),
  },
  (table) => [
    uniqueIndex("admin_users_email_normalized_unique").on(table.emailNormalized),
    index("admin_users_active_role_idx").on(table.active, table.role),
  ],
);

export const adminSessions = sqliteTable(
  "admin_sessions",
  {
    id: text("id").primaryKey(),
    adminUserId: text("admin_user_id")
      .notNull()
      .references(() => adminUsers.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    createdAt: text("created_at").notNull(),
    expiresAt: text("expires_at").notNull(),
    lastUsedAt: text("last_used_at"),
    revokedAt: text("revoked_at"),
    lastMutationId: text("last_mutation_id"),
  },
  (table) => [
    uniqueIndex("admin_sessions_token_hash_uniq").on(table.tokenHash),
    index("admin_sessions_user_active_idx").on(table.adminUserId, table.revokedAt, table.expiresAt),
  ],
);

export const adminAuthSettings = sqliteTable("admin_auth_settings", {
  singleton: integer("singleton").primaryKey(),
  bootstrapCompletedAt: text("bootstrap_completed_at"),
  sharedLoginDisabledAt: text("shared_login_disabled_at"),
  updatedAt: text("updated_at").notNull(),
});

export const adminLoginRateLimits = sqliteTable(
  "admin_login_rate_limits",
  {
    scope: text("scope").notNull(),
    keyHash: text("key_hash").notNull(),
    windowStartedAt: text("window_started_at").notNull(),
    attemptCount: integer("attempt_count").notNull().default(0),
    blockedUntil: text("blocked_until"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("admin_login_rate_limits_scope_key_uniq").on(table.scope, table.keyHash),
    index("admin_login_rate_limits_blocked_idx").on(table.blockedUntil),
  ],
);

export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: text("id").primaryKey(),
    actorType: text("actor_type").notNull(),
    adminUserId: text("admin_user_id"),
    administratorNameSnapshot: text("administrator_name_snapshot"),
    administratorEmailSnapshot: text("administrator_email_snapshot"),
    administratorRoleSnapshot: text("administrator_role_snapshot"),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    bookingReference: text("booking_reference"),
    pairReference: text("pair_reference"),
    previousValues: text("previous_values"),
    newValues: text("new_values"),
    changedFields: text("changed_fields").notNull().default("[]"),
    reason: text("reason"),
    sessionId: text("session_id"),
    requestId: text("request_id"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("audit_logs_created_at_idx").on(table.createdAt),
    index("audit_logs_admin_created_idx").on(table.adminUserId, table.createdAt),
    index("audit_logs_action_created_idx").on(table.action, table.createdAt),
    index("audit_logs_entity_created_idx").on(table.entityType, table.entityId, table.createdAt),
    index("audit_logs_booking_reference_created_idx").on(table.bookingReference, table.createdAt),
    index("audit_logs_request_id_created_idx").on(table.requestId, table.createdAt),
  ],
);

export const ownerAlertEvents = sqliteTable(
  "owner_alert_events",
  {
    id: text("id").primaryKey(),
    auditLogId: text("audit_log_id")
      .notNull()
      .references(() => auditLogs.id, { onDelete: "restrict" }),
    eventKey: text("event_key").notNull(),
    alertType: text("alert_type").notNull(),
    deliveryStatus: text("delivery_status").notNull().default("pending"),
    attemptCount: integer("attempt_count").notNull().default(0),
    errorSummary: text("error_summary"),
    sentAt: text("sent_at"),
    leaseToken: text("lease_token"),
    leaseExpiresAt: text("lease_expires_at"),
    lastMutationId: text("last_mutation_id"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("owner_alert_events_audit_log_id_unique").on(table.auditLogId),
    uniqueIndex("owner_alert_events_event_key_unique").on(table.eventKey),
    index("owner_alert_events_delivery_updated_idx").on(table.deliveryStatus, table.updatedAt),
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
    lastMutationId: text("last_mutation_id"),
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
    workflowStatus: text("workflow_status").notNull().default("submitted"),
    lastWorkflowEventId: text("last_workflow_event_id"),
    emailUpdatesConsent: integer("email_update_consent", { mode: "boolean" })
      .notNull()
      .default(false),
    distributionLocation: text("distribution_location"),
    distributionCampaign: text("distribution_campaign"),
    distributionDate: text("distribution_date"),
    pairsDistributed: integer("pairs_distributed"),
    impactNote: text("impact_note"),
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
    index("donation_requests_workflow_status_submitted_idx").on(
      table.workflowStatus,
      table.submittedAt,
    ),
  ],
);

export const donationEmailEvents = sqliteTable(
  "donation_email_events",
  {
    id: text("id").primaryKey(),
    donationId: text("donation_id")
      .notNull()
      .references(() => donationRequests.id, { onDelete: "cascade" }),
    donationReference: text("donation_reference").notNull(),
    recipientEmail: text("recipient_email"),
    emailType: text("email_type").notNull(),
    workflowStatus: text("workflow_status").notNull(),
    eventKey: text("event_key").notNull(),
    deliveryStatus: text("delivery_status").notNull().default("pending"),
    attemptCount: integer("attempt_count").notNull().default(0),
    errorSummary: text("error_summary"),
    sentAt: text("sent_at"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("donation_email_events_donation_event_key_uniq").on(
      table.donationId,
      table.eventKey,
    ),
    index("donation_email_events_donation_created_idx").on(
      table.donationId,
      table.createdAt,
    ),
    index("donation_email_events_delivery_updated_idx").on(
      table.deliveryStatus,
      table.updatedAt,
    ),
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
