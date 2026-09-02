import { auditValueDiff, buildAuditLogInsert, buildOwnerAlertEventInsert } from "./audit";
import type { AdminActor } from "./admin-types";
import { getDatabase } from "./data";
import { HOMEPAGE_PRODUCT_LIMIT, selectHomepageProducts } from "./product-home";
import { MAX_PRODUCT_IMAGE_STORAGE_BYTES } from "./product-image-validation";
import { parseProductDetails } from "./product-validation";
import {
  PRODUCT_BADGES,
  PRODUCT_CATEGORIES,
  emptyProductDetails,
  type Product,
  type ProductBadge,
  type ProductCard,
  type ProductCategory,
  type ProductDetails,
  type ProductImage,
  type ProductInput,
  type ProductListFilters,
  type ProductStatus,
} from "./product-types";

type ProductRow = Record<string, unknown>;
type ProductImageRow = Record<string, unknown>;
type ProductImageAudience = "public" | "admin";
type StoredProductImage = {
  id: string;
  product_id: string;
  image_data: ArrayBuffer | Uint8Array | number[];
  mime_type: string;
  byte_size: number;
  sha256: string;
};

export type ProductImageStorageSummary = {
  imageCount: number;
  bytesUsed: number;
  byteLimit: number;
};

export type ProductListPage = {
  products: Product[];
  page: number;
  pageSize: number;
  hasMore: boolean;
};

type ProductListPagination = {
  page?: number;
  pageSize?: number;
};

const DEFAULT_ADMIN_PRODUCT_PAGE_SIZE = 50;
const MAX_ADMIN_PRODUCT_PAGE_SIZE = 100;
const HOMEPAGE_PRODUCT_CANDIDATE_LIMIT = 12;

const PRODUCT_SELECT = `
  SELECT p.id, p.sku, p.slug, p.name, p.short_description, p.full_description,
         p.category, p.price_npr, p.compare_at_price_npr, p.stock_quantity,
         p.low_stock_threshold, p.status, p.featured, p.details_json, p.badge,
         p.created_at, p.updated_at
  FROM products p
`;

const IMAGE_SELECT = `
  SELECT id, product_id, mime_type, alt_text, is_primary, sort_order, created_at
  FROM product_images
`;

function safeInitialStockMovementSql(alias: string) {
  return `${alias}.movement_type = 'initial_stock'
    AND ${alias}.related_order_id IS NULL
    AND ${alias}.source_id IS NULL
    AND ${alias}.stock_change > 0
    AND ${alias}.previous_stock = 0
    AND ${alias}.resulting_stock = ${alias}.stock_change`;
}

function productPermanentDeleteEligibilitySql(productAlias: string) {
  return `${productAlias}.id = ?
    AND ${productAlias}.updated_at = ?
    AND ${productAlias}.status IN ('draft', 'archived')
    AND NOT EXISTS (
      SELECT 1 FROM product_order_items
      WHERE product_order_items.product_id = ${productAlias}.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM product_order_returns
      WHERE product_order_returns.product_id = ${productAlias}.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM inventory_movements AS meaningful_movement
      WHERE meaningful_movement.product_id = ${productAlias}.id
        AND NOT (${safeInitialStockMovementSql("meaningful_movement")})
    )
    AND (
      SELECT COUNT(*) FROM inventory_movements AS initial_movement
      WHERE initial_movement.product_id = ${productAlias}.id
    ) <= 1`;
}

export async function listPublicProducts(): Promise<ProductCard[]> {
  const db = await getDatabase();
  const rows = await db
    .prepare(`${PRODUCT_SELECT} WHERE p.status = 'published' ORDER BY p.featured DESC, p.updated_at DESC, p.name COLLATE NOCASE ASC`)
    .all<ProductRow>();
  const products = rows.results.map(parseProduct);
  const images = await listImagesForProducts(products.map((product) => product.id));
  return products.map((product) => toProductCard({ ...product, images: images.get(product.id) ?? [] }));
}

/**
 * Homepage-only catalogue slice. This intentionally reads a capped candidate
 * set instead of loading the full shop catalogue on the home route.
 */
export async function listHomepageProducts(limit = HOMEPAGE_PRODUCT_LIMIT): Promise<ProductCard[]> {
  const db = await getDatabase();
  const rows = await db
    .prepare(`
      ${PRODUCT_SELECT}
      WHERE p.status = 'published'
        AND p.slug IS NOT NULL
        AND length(trim(p.slug)) > 0
        AND p.short_description IS NOT NULL
        AND length(trim(p.short_description)) >= 2
      ORDER BY
        CASE WHEN p.badge = 'doctors_pick' THEN 0 ELSE 1 END ASC,
        CASE WHEN p.featured = 1 THEN 0 ELSE 1 END ASC,
        CASE WHEN p.stock_quantity > 0 THEN 0 ELSE 1 END ASC,
        p.updated_at DESC,
        p.name COLLATE NOCASE ASC,
        p.id ASC
      LIMIT ?
    `)
    .bind(HOMEPAGE_PRODUCT_CANDIDATE_LIMIT)
    .all<ProductRow>();
  const candidates: Product[] = rows.results.map(parseProduct);
  const products = selectHomepageProducts<Product>(candidates, limit);
  const images = await listImagesForProducts(products.map((product) => product.id));
  return products.map((product) => toProductCard({ ...product, images: images.get(product.id) ?? [] }));
}

export async function listFeaturedPublicProducts(limit = 4) {
  const products = await listPublicProducts();
  return products.filter((product) => product.isLowStock === false || product.stockQuantity !== 0).slice(0, Math.max(1, Math.min(12, limit)));
}

export async function getPublicProductBySlug(slug: string): Promise<Product | null> {
  const db = await getDatabase();
  const row = await db
    .prepare(`${PRODUCT_SELECT} WHERE p.status = 'published' AND p.slug = ?`)
    .bind(slug)
    .first<ProductRow>();
  if (!row) return null;
  const product = parseProduct(row);
  return { ...product, images: (await listImagesForProducts([product.id])).get(product.id) ?? [] };
}

export async function getPublishedProductImage(imageId: string) {
  const db = await getDatabase();
  const row = await db
    .prepare(`
      SELECT i.id, i.product_id, i.image_data, i.mime_type, i.byte_size, i.sha256
      FROM product_images i
      INNER JOIN products p ON p.id = i.product_id
      WHERE i.id = ? AND p.status = 'published'
    `)
    .bind(imageId)
    .first<StoredProductImage>();
  return row ?? null;
}

/**
 * This lookup deliberately does not require publication. Its caller is the
 * authenticated admin image endpoint, which verifies the product view grant
 * before an image BLOB can be read.
 */
export async function getAdminProductImage(productId: string, imageId: string) {
  const db = await getDatabase();
  const row = await db
    .prepare(`
      SELECT id, product_id, image_data, mime_type, byte_size, sha256
      FROM product_images
      WHERE id = ? AND product_id = ?
    `)
    .bind(imageId, productId)
    .first<StoredProductImage>();
  return row ?? null;
}

/**
 * Metadata-only, bounded product list for the admin catalogue. Image bytes are
 * loaded only by the dedicated image-content endpoints.
 */
export async function listAdminProductPage(
  filters: ProductListFilters = {},
  pagination: ProductListPagination = {},
): Promise<ProductListPage> {
  const db = await getDatabase();
  const page = clampPage(pagination.page);
  const pageSize = clampPageSize(pagination.pageSize);
  const where: string[] = [];
  const values: unknown[] = [];
  const search = String(filters.search ?? "").trim().slice(0, 120);
  if (search) {
    where.push("(p.name LIKE ? OR p.sku LIKE ? OR p.slug LIKE ?)");
    values.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (filters.status) {
    where.push("p.status = ?");
    values.push(filters.status);
  }
  if (filters.stock === "in_stock") {
    where.push("p.stock_quantity > p.low_stock_threshold");
  } else if (filters.stock === "low_stock") {
    where.push("p.stock_quantity > 0 AND p.stock_quantity <= p.low_stock_threshold");
  } else if (filters.stock === "out_of_stock") {
    where.push("p.stock_quantity = 0");
  }
  const rows = await db
    .prepare(`${PRODUCT_SELECT} ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY p.updated_at DESC, p.name COLLATE NOCASE ASC LIMIT ? OFFSET ?`)
    .bind(...values, pageSize + 1, (page - 1) * pageSize)
    .all<ProductRow>();
  const hasMore = rows.results.length > pageSize;
  const products = rows.results.slice(0, pageSize).map(parseProduct);
  const images = await listImagesForProducts(products.map((product) => product.id), "admin");
  return {
    products: products.map((product) => ({ ...product, images: images.get(product.id) ?? [] })),
    page,
    pageSize,
    hasMore,
  };
}

/** Kept for admin pages that need a bounded first page of product metadata. */
export async function listAdminProducts(filters: ProductListFilters = {}): Promise<Product[]> {
  return (await listAdminProductPage(filters, { pageSize: MAX_ADMIN_PRODUCT_PAGE_SIZE })).products;
}

export async function getAdminProduct(id: string): Promise<Product | null> {
  const db = await getDatabase();
  const row = await db.prepare(`${PRODUCT_SELECT} WHERE p.id = ?`).bind(id).first<ProductRow>();
  if (!row) return null;
  const product = parseProduct(row);
  return { ...product, images: (await listImagesForProducts([id], "admin")).get(id) ?? [] };
}

/** The UI displays this application guard only to image-capable admins. */
export async function getProductImageStorageSummary(): Promise<ProductImageStorageSummary> {
  const db = await getDatabase();
  const row = await db
    .prepare("SELECT COUNT(*) AS image_count, COALESCE(SUM(byte_size), 0) AS bytes_used FROM product_images")
    .first<{ image_count: number; bytes_used: number }>();
  return {
    imageCount: Math.max(0, Number(row?.image_count ?? 0)),
    bytesUsed: Math.max(0, Number(row?.bytes_used ?? 0)),
    byteLimit: MAX_PRODUCT_IMAGE_STORAGE_BYTES,
  };
}

export async function createDraftProduct(input: ProductInput, actor: AdminActor) {
  if (input.status !== "draft") {
    throw new Error("Create this product as a draft, upload an image, then publish it.");
  }
  const db = await getDatabase();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const product = {
    id,
    ...input,
    category: input.category ?? null,
    compareAtPriceNpr: input.compareAtPriceNpr ?? null,
    badge: input.badge ?? null,
    details: input.details ?? emptyProductDetails(),
    stockQuantity: null,
    createdAt: now,
    updatedAt: now,
  };
  const operationId = crypto.randomUUID();
  const result = await db.batch([
    db
      .prepare(`
        INSERT INTO products (
          id, sku, slug, name, short_description, full_description, category,
          price_npr, compare_at_price_npr, stock_quantity, low_stock_threshold,
          status, featured, details_json, badge,
          last_inventory_mutation_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        id, input.sku, input.slug, input.name, input.shortDescription,
        input.fullDescription, product.category, input.priceNpr,
        product.compareAtPriceNpr, input.lowStockThreshold, input.status,
        input.featured ? 1 : 0, serializeProductDetails(product.details),
        product.badge, operationId, now, now,
      ),
    buildAuditLogInsert(db, {
      actor,
      action: "PRODUCT_CREATED",
      entityType: "product",
      entityId: id,
      newValues: productAuditSnapshot(product),
      changedFields: ["created"],
      createdAt: now,
      conditionalOn: {
        sql: "EXISTS (SELECT 1 FROM products WHERE id = ?)",
        bindings: [id],
      },
    }),
  ]);
  if (!result[0]?.meta.changes || !result[1]?.meta.changes) {
    throw new Error("Unable to create the product.");
  }
  return (await getAdminProduct(id))!;
}

export async function updateProduct(
  id: string,
  input: ProductInput,
  actor: AdminActor,
  options: { expectedUpdatedAt?: string; auditAction?: string } = {},
) {
  const before = await getAdminProduct(id);
  if (!before) return { kind: "not_found" as const };
  if (options.expectedUpdatedAt && options.expectedUpdatedAt !== before.updatedAt) {
    return { kind: "conflict" as const, product: before };
  }
  if (before.status === "published" && input.slug !== before.slug) {
    throw new Error("Published product slugs are locked to preserve existing links. Unpublish it before changing the slug.");
  }
  const next = {
    ...before,
    ...input,
    category: input.category === undefined ? before.category : input.category,
    compareAtPriceNpr: input.compareAtPriceNpr === undefined ? before.compareAtPriceNpr : input.compareAtPriceNpr,
    badge: input.badge === undefined ? before.badge : input.badge,
    details: input.details === undefined ? before.details : input.details,
  };
  if (next.compareAtPriceNpr !== null && (next.priceNpr === null || next.compareAtPriceNpr <= next.priceNpr)) {
    throw new Error("Compare-at NPR price must be higher than the current NPR price.");
  }
  const db = await getDatabase();
  const now = new Date().toISOString();
  const nextSnapshot = productAuditSnapshot({ ...next, updatedAt: now });
  const diff = auditValueDiff(productAuditSnapshot(before), nextSnapshot);
  if (!diff.changedFields.length) return { kind: "unchanged" as const, product: before };
  const operationId = crypto.randomUUID();
  const action = options.auditAction ?? (input.status === "archived"
    ? "PRODUCT_ARCHIVED"
    : before.status !== input.status
      ? input.status === "published" ? "PRODUCT_PUBLISHED" : "PRODUCT_UNPUBLISHED"
      : "PRODUCT_UPDATED");
  try {
    const result = await db.batch([
      db
        .prepare(`
          UPDATE products
          SET sku = ?, slug = ?, name = ?, short_description = ?, full_description = ?,
              category = ?, price_npr = ?, compare_at_price_npr = ?, low_stock_threshold = ?,
              status = ?, featured = ?, details_json = ?, badge = ?, updated_at = ?
          WHERE id = ? AND updated_at = ?
        `)
        .bind(
          input.sku, input.slug, input.name, input.shortDescription,
          input.fullDescription, next.category, input.priceNpr, next.compareAtPriceNpr,
          input.lowStockThreshold, input.status, input.featured ? 1 : 0,
          serializeProductDetails(next.details), next.badge, now, id, before.updatedAt,
        ),
      buildAuditLogInsert(db, {
        actor,
        action,
        entityType: "product",
        entityId: id,
        previousValues: diff.previousValues,
        newValues: diff.newValues,
        changedFields: diff.changedFields,
        createdAt: now,
        requestId: operationId,
        conditionalOn: {
          sql: "EXISTS (SELECT 1 FROM products WHERE id = ? AND updated_at = ?)",
          bindings: [id, now],
        },
      }),
    ]);
    if (!result[0]?.meta.changes) {
      return { kind: "conflict" as const, product: (await getAdminProduct(id)) ?? before };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/published products require/iu.test(message)) {
      throw new Error("Upload an image and complete all required fields before publishing this product.");
    }
    if (/unique constraint failed:\s*products\.(?:sku|slug)/iu.test(message)) {
      throw new Error("SKU and slug must each be unique.");
    }
    throw error;
  }
  return { kind: "updated" as const, product: (await getAdminProduct(id))! };
}

export async function archiveProduct(id: string, actor: AdminActor) {
  const existing = await getAdminProduct(id);
  if (!existing) return { kind: "not_found" as const };
  return updateProduct(id, productInputFromExisting(existing, "archived", { featured: false, badge: null }), actor);
}

export async function restoreArchivedProduct(id: string, actor: AdminActor, expectedUpdatedAt: string) {
  const existing = await getAdminProduct(id);
  if (!existing) return { kind: "not_found" as const };
  if (expectedUpdatedAt !== existing.updatedAt) return { kind: "conflict" as const, product: existing };
  if (existing.status !== "archived") return { kind: "not_archived" as const, product: existing };
  return updateProduct(
    id,
    productInputFromExisting(existing, "draft"),
    actor,
    { expectedUpdatedAt, auditAction: "PRODUCT_RESTORED" },
  );
}

export type ProductPermanentDeleteResult =
  | { kind: "deleted"; ownerAlertEventId: string }
  | { kind: "not_found" }
  | { kind: "conflict"; product: Product }
  | { kind: "not_deletable_status"; product: Product }
  | { kind: "has_business_history"; product: Product };

/**
 * Removes only an unused draft or archived catalogue record. Orders, returns,
 * meaningful inventory ledger rows, audit logs, and anything they reference
 * are deliberately preserved and make permanent deletion unavailable.
 */
export async function permanentlyDeleteUnusedProduct(
  id: string,
  actor: AdminActor,
  expectedUpdatedAt: string,
): Promise<ProductPermanentDeleteResult> {
  const db = await getDatabase();
  const existing = await getAdminProduct(id);
  if (!existing) return { kind: "not_found" };
  if (expectedUpdatedAt !== existing.updatedAt) return { kind: "conflict", product: existing };
  if (existing.status !== "draft" && existing.status !== "archived") {
    return { kind: "not_deletable_status", product: existing };
  }

  const dependencies = await db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM product_order_items WHERE product_id = ?) AS order_item_count,
      (SELECT COUNT(*) FROM product_order_returns WHERE product_id = ?) AS return_count,
      (SELECT COUNT(*) FROM inventory_movements WHERE product_id = ?) AS inventory_movement_count,
      (SELECT COUNT(*) FROM inventory_movements WHERE product_id = ? AND ${safeInitialStockMovementSql("inventory_movements")}) AS safe_initial_movement_count,
      (SELECT COUNT(*) FROM product_images WHERE product_id = ?) AS image_count,
      (SELECT COUNT(*) FROM product_images_legacy_r2 WHERE product_id = ?) AS legacy_image_count
  `).bind(id, id, id, id, id, id).first<{
    order_item_count: number;
    return_count: number;
    inventory_movement_count: number;
    safe_initial_movement_count: number;
    image_count: number;
    legacy_image_count: number;
  }>();
  const orderItemCount = Number(dependencies?.order_item_count ?? 0);
  const returnCount = Number(dependencies?.return_count ?? 0);
  const inventoryMovementCount = Number(dependencies?.inventory_movement_count ?? 0);
  const safeInitialMovementCount = Number(dependencies?.safe_initial_movement_count ?? 0);
  if (
    orderItemCount > 0
    || returnCount > 0
    || inventoryMovementCount !== safeInitialMovementCount
    || safeInitialMovementCount > 1
  ) {
    return { kind: "has_business_history", product: existing };
  }

  const now = new Date().toISOString();
  const auditId = crypto.randomUUID();
  const ownerAlertEventId = crypto.randomUUID();
  const eligibilitySql = productPermanentDeleteEligibilitySql("products");
  const eligibility = { sql: `EXISTS (SELECT 1 FROM products WHERE ${eligibilitySql})`, bindings: [id, expectedUpdatedAt] };
  const batch = await db.batch([
    buildAuditLogInsert(db, {
      id: auditId,
      actor,
      action: "PRODUCT_PERMANENTLY_DELETED",
      entityType: "product",
      entityId: id,
      previousValues: productAuditSnapshot(existing),
      newValues: {
        permanentlyDeleted: true,
        removedImageCount: Number(dependencies?.image_count ?? 0),
        removedLegacyImageMetadataCount: Number(dependencies?.legacy_image_count ?? 0),
        removedInitialStockMovementCount: safeInitialMovementCount,
      },
      changedFields: ["deleted"],
      reason: "Unused product permanently deleted after dependency checks.",
      requestId: crypto.randomUUID(),
      createdAt: now,
      conditionalOn: eligibility,
    }),
    db.prepare(`
      DELETE FROM product_images
      WHERE product_id = ? AND ${eligibility.sql}
    `).bind(id, ...eligibility.bindings),
    db.prepare(`
      DELETE FROM product_images_legacy_r2
      WHERE product_id = ? AND ${eligibility.sql}
    `).bind(id, ...eligibility.bindings),
    db.prepare(`
      DELETE FROM inventory_movements
      WHERE product_id = ?
        AND ${safeInitialStockMovementSql("inventory_movements")}
        AND ${eligibility.sql}
    `).bind(id, ...eligibility.bindings),
    db.prepare(`DELETE FROM products WHERE ${eligibilitySql}`).bind(...eligibility.bindings),
    buildOwnerAlertEventInsert(db, {
      id: ownerAlertEventId,
      auditLogId: auditId,
      alertType: "PRODUCT_PERMANENTLY_DELETED",
      createdAt: now,
      conditionalOn: {
        sql: "EXISTS (SELECT 1 FROM audit_logs WHERE id = ?) AND NOT EXISTS (SELECT 1 FROM products WHERE id = ?)",
        bindings: [auditId, id],
      },
    }),
  ]);

  if (!batch[4]?.meta.changes) {
    const current = await getAdminProduct(id);
    if (!current) return { kind: "not_found" };
    if (current.status !== "draft" && current.status !== "archived") {
      return { kind: "not_deletable_status", product: current };
    }
    return { kind: "conflict", product: current };
  }
  if (!batch[0]?.meta.changes || !batch[5]?.meta.changes) {
    throw new Error("Unable to preserve the product deletion audit record.");
  }
  return { kind: "deleted", ownerAlertEventId };
}

function productInputFromExisting(
  product: Product,
  status: ProductStatus,
  overrides: Partial<Pick<ProductInput, "featured" | "badge">> = {},
): ProductInput {
  return {
    name: product.name,
    sku: product.sku,
    slug: product.slug,
    shortDescription: product.shortDescription,
    fullDescription: product.fullDescription,
    category: product.category,
    priceNpr: product.priceNpr,
    compareAtPriceNpr: product.compareAtPriceNpr,
    lowStockThreshold: product.lowStockThreshold,
    featured: overrides.featured ?? product.featured,
    badge: overrides.badge === undefined ? product.badge : overrides.badge,
    details: product.details,
    status,
  };
}

export async function listImagesForAdminProduct(productId: string) {
  return (await listImagesForProducts([productId], "admin")).get(productId) ?? [];
}

export function isProductPriceChanged(before: Product, input: ProductInput) {
  return before.priceNpr !== input.priceNpr || (
    input.compareAtPriceNpr !== undefined && before.compareAtPriceNpr !== input.compareAtPriceNpr
  );
}

export function productAuditSnapshot(value: {
  id?: string;
  sku: string | null;
  slug: string | null;
  name: string;
  shortDescription: string | null;
  fullDescription: string | null;
  category: ProductCategory | null;
  priceNpr: number | null;
  compareAtPriceNpr: number | null;
  stockQuantity?: number | null;
  lowStockThreshold: number;
  status: ProductStatus;
  featured: boolean;
  badge: ProductBadge | null;
  details: ProductDetails;
  updatedAt?: string;
}) {
  return {
    sku: value.sku,
    slug: value.slug,
    name: value.name,
    shortDescription: value.shortDescription,
    fullDescription: value.fullDescription,
    category: value.category,
    priceNpr: value.priceNpr,
    compareAtPriceNpr: value.compareAtPriceNpr,
    stockQuantity: value.stockQuantity ?? null,
    lowStockThreshold: value.lowStockThreshold,
    status: value.status,
    featured: value.featured,
    badge: value.badge,
    details: value.details,
  };
}

function toProductCard(product: Product): ProductCard {
  const primaryImage = product.images.find((image) => image.isPrimary) ?? product.images[0] ?? null;
  const quantity = product.stockQuantity;
  return {
    slug: product.slug,
    name: product.name,
    shortDescription: product.shortDescription,
    category: product.category,
    priceNpr: product.priceNpr,
    compareAtPriceNpr: product.compareAtPriceNpr,
    stockQuantity: quantity,
    lowStockThreshold: product.lowStockThreshold,
    badge: product.badge,
    primaryImage,
    isOutOfStock: quantity === 0,
    isLowStock: quantity !== null && quantity > 0 && quantity <= product.lowStockThreshold,
  };
}

function parseProduct(row: ProductRow): Product {
  return {
    id: String(row.id),
    sku: nullableText(row.sku),
    slug: nullableText(row.slug),
    name: String(row.name ?? ""),
    shortDescription: nullableText(row.short_description),
    fullDescription: nullableText(row.full_description),
    category: parseProductCategory(row.category),
    priceNpr: nullableInteger(row.price_npr),
    compareAtPriceNpr: nullableInteger(row.compare_at_price_npr),
    stockQuantity: nullableInteger(row.stock_quantity),
    lowStockThreshold: Math.max(0, Number(row.low_stock_threshold ?? 0)),
    status: row.status === "published" || row.status === "archived" ? row.status : "draft",
    featured: Number(row.featured ?? 0) === 1,
    badge: parseProductBadge(row.badge),
    details: parseStoredProductDetails(row.details_json),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    images: [],
  };
}

function parseImage(row: ProductImageRow, audience: ProductImageAudience): ProductImage {
  const id = String(row.id);
  const productId = String(row.product_id);
  const contentType = row.mime_type === "image/png" || row.mime_type === "image/webp"
    ? row.mime_type
    : "image/jpeg";
  return {
    id,
    productId,
    url: audience === "admin"
      ? `/api/admin/products/${encodeURIComponent(productId)}/images/${encodeURIComponent(id)}/content`
      : `/api/products/images/${encodeURIComponent(id)}`,
    contentType,
    altText: nullableText(row.alt_text),
    isPrimary: Number(row.is_primary ?? 0) === 1,
    sortOrder: Math.max(0, Number(row.sort_order ?? 0)),
    createdAt: String(row.created_at),
  };
}

async function listImagesForProducts(productIds: string[], audience: ProductImageAudience = "public") {
  const grouped = new Map<string, ProductImage[]>();
  if (!productIds.length) return grouped;
  const db = await getDatabase();
  const placeholders = productIds.map(() => "?").join(", ");
  const rows = await db
    .prepare(`${IMAGE_SELECT} WHERE product_id IN (${placeholders}) ORDER BY product_id, is_primary DESC, sort_order ASC, created_at ASC`)
    .bind(...productIds)
    .all<ProductImageRow>();
  rows.results.map((row) => parseImage(row, audience)).forEach((image) => {
    const list = grouped.get(image.productId) ?? [];
    list.push(image);
    grouped.set(image.productId, list);
  });
  return grouped;
}

function nullableText(value: unknown) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || null;
}

function nullableInteger(value: unknown) {
  const number = Number(value);
  return Number.isSafeInteger(number) ? number : null;
}

function parseProductCategory(value: unknown): ProductCategory | null {
  const category = nullableText(value);
  return category && PRODUCT_CATEGORIES.includes(category as ProductCategory)
    ? category as ProductCategory
    : null;
}

function parseProductBadge(value: unknown): ProductBadge | null {
  const badge = nullableText(value);
  return badge && PRODUCT_BADGES.includes(badge as ProductBadge)
    ? badge as ProductBadge
    : null;
}

function parseStoredProductDetails(value: unknown): ProductDetails {
  const source = nullableText(value);
  if (!source) return emptyProductDetails();
  try {
    return parseProductDetails(JSON.parse(source));
  } catch {
    // A malformed legacy row must never take the catalogue or admin UI down.
    return emptyProductDetails();
  }
}

function serializeProductDetails(value: ProductDetails) {
  return JSON.stringify(value);
}

function clampPage(value: number | undefined) {
  const numeric = Number(value);
  if (!Number.isSafeInteger(numeric)) return 1;
  return Math.max(1, Math.min(100_000, numeric));
}

function clampPageSize(value: number | undefined) {
  const numeric = Number(value);
  if (!Number.isSafeInteger(numeric)) return DEFAULT_ADMIN_PRODUCT_PAGE_SIZE;
  return Math.max(1, Math.min(MAX_ADMIN_PRODUCT_PAGE_SIZE, numeric));
}
