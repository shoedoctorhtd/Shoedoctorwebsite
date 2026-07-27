import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

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
    pickupAddress: text("pickup_address"),
    locationUrl: text("location_url"),
    notes: text("notes"),
    expressRequested: integer("express_requested", { mode: "boolean" })
      .notNull()
      .default(false),
    status: text("status").notNull().default("new"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("bookings_status_created_idx").on(table.status, table.createdAt),
  ],
);
