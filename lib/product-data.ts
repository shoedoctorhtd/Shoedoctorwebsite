import { auditValueDiff, buildAuditLogInsert } from "./audit";
import type { AdminActor } from "./admin-types";
import { getDatabase } from "./data";
import {
  type Product,
  type ProductCard,
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
  object_key: string;
  content_type: string;
  byte_size: number;
};

const PRODUCT_SELECT = `
  SELECT p.id, p.sku, p.slug, p.name, p.short_description, p.full_description,
         p.price_npr, p.stock_quantity, p.low_stock_threshold, p.status,
         p.featured, p.created_at, p.updated_at
  FROM products p
`;

const IMAGE_SELECT = `
  SELECT id, product_id, content_type, is_primary, sort_order, created_at
  FROM product_images
`;

export async function listPublicProducts(): Promise<ProductCard[]> {
  const db = await getDatabase();
  const rows = await db
    .prepare(`${PRODUCT_SELECT} WHERE p.status = 'published' ORDER BY p.featured DESC, p.updated_at DESC, p.name COLLATE NOCASE ASC`)
    .all<ProductRow>();
  const products = rows.results.map(parseProduct);
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
      SELECT i.id, i.product_id, i.object_key, i.content_type, i.byte_size
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
 * before an R2 object can be read.
 */
export async function getAdminProductImage(productId: string, imageId: string) {
  const db = await getDatabase();
  const row = await db
    .prepare(`
      SELECT id, product_id, object_key, content_type, byte_size
      FROM product_images
      WHERE id = ? AND product_id = ?
    `)
    .bind(imageId, productId)
    .first<StoredProductImage>();
  return row ?? null;
}

export async function listAdminProducts(filters: ProductListFilters = {}): Promise<Product[]> {
  const db = await getDatabase();
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
    .prepare(`${PRODUCT_SELECT} ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY p.updated_at DESC, p.name COLLATE NOCASE ASC`)
    .bind(...values)
    .all<ProductRow>();
  const products = rows.results.map(parseProduct);
  const images = await listImagesForProducts(products.map((product) => product.id), "admin");
  return products.map((product) => ({ ...product, images: images.get(product.id) ?? [] }));
}

export async function getAdminProduct(id: string): Promise<Product | null> {
  const db = await getDatabase();
  const row = await db.prepare(`${PRODUCT_SELECT} WHERE p.id = ?`).bind(id).first<ProductRow>();
  if (!row) return null;
  const product = parseProduct(row);
  return { ...product, images: (await listImagesForProducts([id], "admin")).get(id) ?? [] };
}

export async function createDraftProduct(input: ProductInput, actor: AdminActor) {
  if (input.status === "published") {
    throw new Error("Create this product as a draft, upload an image, then publish it.");
  }
  const db = await getDatabase();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const product = {
    id,
    ...input,
    stockQuantity: null,
    createdAt: now,
    updatedAt: now,
  };
  const operationId = crypto.randomUUID();
  const result = await db.batch([
    db
      .prepare(`
        INSERT INTO products (
          id, sku, slug, name, short_description, full_description, price_npr,
          stock_quantity, low_stock_threshold, status, featured,
          last_inventory_mutation_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        id, input.sku, input.slug, input.name, input.shortDescription,
        input.fullDescription, input.priceNpr, input.lowStockThreshold,
        input.status, input.featured ? 1 : 0, operationId, now, now,
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
) {
  const before = await getAdminProduct(id);
  if (!before) return { kind: "not_found" as const };
  const db = await getDatabase();
  const now = new Date().toISOString();
  const nextSnapshot = productAuditSnapshot({
    ...before,
    ...input,
    updatedAt: now,
  });
  const diff = auditValueDiff(productAuditSnapshot(before), nextSnapshot);
  if (!diff.changedFields.length) return { kind: "unchanged" as const, product: before };
  const operationId = crypto.randomUUID();
  const action = input.status === "archived"
    ? "PRODUCT_ARCHIVED"
    : before.status !== input.status
      ? input.status === "published" ? "PRODUCT_PUBLISHED" : "PRODUCT_UNPUBLISHED"
      : "PRODUCT_UPDATED";
  try {
    const result = await db.batch([
      db
        .prepare(`
          UPDATE products
          SET sku = ?, slug = ?, name = ?, short_description = ?, full_description = ?,
              price_npr = ?, low_stock_threshold = ?, status = ?, featured = ?, updated_at = ?
          WHERE id = ? AND updated_at = ?
        `)
        .bind(
          input.sku, input.slug, input.name, input.shortDescription,
          input.fullDescription, input.priceNpr, input.lowStockThreshold,
          input.status, input.featured ? 1 : 0, now, id, before.updatedAt,
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
  return updateProduct(id, {
    name: existing.name,
    sku: existing.sku,
    slug: existing.slug,
    shortDescription: existing.shortDescription,
    fullDescription: existing.fullDescription,
    priceNpr: existing.priceNpr,
    lowStockThreshold: existing.lowStockThreshold,
    featured: false,
    status: "archived",
  }, actor);
}

export async function listImagesForAdminProduct(productId: string) {
  return (await listImagesForProducts([productId], "admin")).get(productId) ?? [];
}

export function isProductPriceChanged(before: Product, input: ProductInput) {
  return before.priceNpr !== input.priceNpr;
}

export function productAuditSnapshot(value: {
  id?: string;
  sku: string | null;
  slug: string | null;
  name: string;
  shortDescription: string | null;
  priceNpr: number | null;
  stockQuantity?: number | null;
  lowStockThreshold: number;
  status: ProductStatus;
  featured: boolean;
  updatedAt?: string;
}) {
  return {
    sku: value.sku,
    slug: value.slug,
    name: value.name,
    shortDescription: value.shortDescription,
    priceNpr: value.priceNpr,
    stockQuantity: value.stockQuantity ?? null,
    lowStockThreshold: value.lowStockThreshold,
    status: value.status,
    featured: value.featured,
  };
}

function toProductCard(product: Product): ProductCard {
  const primaryImage = product.images.find((image) => image.isPrimary) ?? product.images[0] ?? null;
  const quantity = product.stockQuantity;
  return {
    slug: product.slug,
    name: product.name,
    shortDescription: product.shortDescription,
    priceNpr: product.priceNpr,
    stockQuantity: quantity,
    lowStockThreshold: product.lowStockThreshold,
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
    priceNpr: nullableInteger(row.price_npr),
    stockQuantity: nullableInteger(row.stock_quantity),
    lowStockThreshold: Math.max(0, Number(row.low_stock_threshold ?? 0)),
    status: row.status === "published" || row.status === "archived" ? row.status : "draft",
    featured: Number(row.featured ?? 0) === 1,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    images: [],
  };
}

function parseImage(row: ProductImageRow, audience: ProductImageAudience): ProductImage {
  const id = String(row.id);
  const productId = String(row.product_id);
  const contentType = row.content_type === "image/png" || row.content_type === "image/webp"
    ? row.content_type
    : "image/jpeg";
  return {
    id,
    productId,
    url: audience === "admin"
      ? `/api/admin/products/${encodeURIComponent(productId)}/images/${encodeURIComponent(id)}/content`
      : `/api/products/images/${encodeURIComponent(id)}`,
    contentType,
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
