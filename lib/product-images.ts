import { auditValueDiff, buildAuditLogInsert } from "./audit";
import type { AdminActor } from "./admin-types";
import { getDatabase } from "./data";
import {
  getAdminProduct,
  getAdminProductImage,
  getPublishedProductImage,
  listImagesForAdminProduct,
} from "./product-data";
import {
  assertProductImageUploadCapacity,
  MAX_PRODUCT_IMAGE_STORAGE_BYTES,
  MAX_PRODUCT_IMAGES_PER_PRODUCT,
  PRODUCT_IMAGE_STORAGE_LIMIT_MESSAGE,
  type ProductImageUpload,
  validateProductImage,
} from "./product-image-validation";
import { buildProductImageResponse } from "./product-image-response";

export {
  detectImageType,
  MAX_PRODUCT_IMAGE_BYTES,
  MAX_PRODUCT_IMAGE_DIMENSION,
  MAX_PRODUCT_IMAGES_PER_PRODUCT,
  MAX_PRODUCT_IMAGE_STORAGE_BYTES,
  PRODUCT_IMAGE_STORAGE_LIMIT_MESSAGE,
  assertProductImageUploadCapacity,
  validateProductImage,
} from "./product-image-validation";
export { buildProductImageResponse } from "./product-image-response";

type ImageMetadataRow = {
  id: string;
  product_id: string;
  byte_size: number;
  is_primary: number;
  sort_order: number;
  alt_text: string | null;
};

type ImageStorageState = {
  image_count: number;
  bytes_used: number;
};

const OPAQUE_IMAGE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export async function uploadProductImage(
  productId: string,
  upload: ProductImageUpload,
  actor: AdminActor,
  options: { makePrimary?: boolean; sortOrder?: number } = {},
) {
  const product = await getAdminProduct(productId);
  if (!product) return { kind: "not_found" as const };
  const validated = await validateProductImage(upload);
  const db = await getDatabase();
  const state = await getImageStorageState(db, productId);
  assertUploadCapacity(state, validated.byteSize);

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const sortOrder = Number.isSafeInteger(options.sortOrder)
    ? Math.max(0, Math.min(100_000, Number(options.sortOrder)))
    : product.images.length ? Math.max(...product.images.map((image) => image.sortOrder)) + 1 : 0;
  const makePrimary = options.makePrimary === true || product.images.length === 0;
  const operationId = crypto.randomUUID();
  const insert = db.prepare(`
    INSERT INTO product_images (
      id, product_id, image_data, mime_type, byte_size, sha256, original_name,
      alt_text, is_primary, sort_order, uploaded_by_admin_id, created_at
    )
    SELECT ?, ?, ?, ?, ?, ?, ?, NULL, 0, ?, ?, ?
    WHERE EXISTS (SELECT 1 FROM products WHERE id = ?)
      AND (SELECT COUNT(*) FROM product_images WHERE product_id = ?) < ?
      AND (SELECT COALESCE(SUM(byte_size), 0) FROM product_images) + ? <= ?
  `).bind(
    id,
    productId,
    validated.imageData,
    validated.contentType,
    validated.byteSize,
    validated.sha256,
    safeOriginalName(upload.name),
    sortOrder,
    actor.id,
    now,
    productId,
    productId,
    MAX_PRODUCT_IMAGES_PER_PRODUCT,
    validated.byteSize,
    MAX_PRODUCT_IMAGE_STORAGE_BYTES,
  );
  const statements = [
    insert,
    ...(makePrimary
      ? [
          db.prepare(`
            UPDATE product_images
            SET is_primary = 0
            WHERE product_id = ? AND is_primary = 1
              AND EXISTS (SELECT 1 FROM product_images WHERE id = ? AND product_id = ?)
          `).bind(productId, id, productId),
          db.prepare("UPDATE product_images SET is_primary = 1 WHERE id = ? AND product_id = ?")
            .bind(id, productId),
        ]
      : []),
    buildAuditLogInsert(db, {
      actor,
      action: "PRODUCT_IMAGE_UPLOADED",
      entityType: "product_image",
      entityId: id,
      newValues: {
        productId,
        contentType: validated.contentType,
        byteSize: validated.byteSize,
        primary: makePrimary,
        width: validated.width,
        height: validated.height,
      },
      changedFields: ["image"],
      requestId: operationId,
      createdAt: now,
      conditionalOn: {
        sql: "EXISTS (SELECT 1 FROM product_images WHERE id = ?)",
        bindings: [id],
      },
    }),
  ];
  const result = await db.batch(statements);
  if (!result[0]?.meta.changes) {
    const current = await getImageStorageState(db, productId);
    assertUploadCapacity(current, validated.byteSize);
    if (!(await getAdminProduct(productId))) return { kind: "not_found" as const };
    throw new Error("Unable to save product image.");
  }
  return {
    kind: "uploaded" as const,
    image: (await listImagesForAdminProduct(productId)).find((image) => image.id === id)!,
  };
}

export async function updateProductImage(
  productId: string,
  imageId: string,
  input: { isPrimary?: boolean; sortOrder?: number; altText?: string | null },
  actor: AdminActor,
) {
  if (!isOpaqueImageId(imageId)) return { kind: "not_found" as const };
  const db = await getDatabase();
  const image = await db
    .prepare("SELECT id, product_id, byte_size, is_primary, sort_order, alt_text FROM product_images WHERE id = ? AND product_id = ?")
    .bind(imageId, productId)
    .first<ImageMetadataRow>();
  if (!image) return { kind: "not_found" as const };
  const nextSortOrder = input.sortOrder === undefined
    ? image.sort_order
    : Math.max(0, Math.min(100_000, Math.trunc(input.sortOrder)));
  const nextAltText = input.altText === undefined ? image.alt_text : normalizeAltText(input.altText);
  const makePrimary = input.isPrimary === true;
  const nextPrimary = makePrimary || image.is_primary === 1;
  const now = new Date().toISOString();
  const diff = auditValueDiff(
    { primary: image.is_primary === 1, sortOrder: image.sort_order, altText: image.alt_text },
    { primary: nextPrimary, sortOrder: nextSortOrder, altText: nextAltText },
  );
  if (!diff.changedFields.length) {
    return {
      kind: "updated" as const,
      image: (await listImagesForAdminProduct(productId)).find((candidate) => candidate.id === imageId)!,
    };
  }
  await db.batch([
    ...(makePrimary
      ? [db.prepare("UPDATE product_images SET is_primary = 0 WHERE product_id = ? AND is_primary = 1").bind(productId)]
      : []),
    db.prepare("UPDATE product_images SET is_primary = ?, sort_order = ?, alt_text = ? WHERE id = ? AND product_id = ?")
      .bind(nextPrimary ? 1 : 0, nextSortOrder, nextAltText, imageId, productId),
    buildAuditLogInsert(db, {
      actor,
      action: makePrimary ? "PRODUCT_IMAGE_PRIMARY_CHANGED" : "PRODUCT_IMAGE_UPDATED",
      entityType: "product_image",
      entityId: imageId,
      previousValues: diff.previousValues,
      newValues: diff.newValues,
      changedFields: diff.changedFields,
      createdAt: now,
      conditionalOn: {
        sql: "EXISTS (SELECT 1 FROM product_images WHERE id = ?)",
        bindings: [imageId],
      },
    }),
  ]);
  return {
    kind: "updated" as const,
    image: (await listImagesForAdminProduct(productId)).find((candidate) => candidate.id === imageId)!,
  };
}

export async function replaceProductImage(
  productId: string,
  imageId: string,
  upload: ProductImageUpload,
  actor: AdminActor,
) {
  if (!isOpaqueImageId(imageId)) return { kind: "not_found" as const };
  const db = await getDatabase();
  const [product, image, state] = await Promise.all([
    getAdminProduct(productId),
    db
      .prepare("SELECT id, product_id, byte_size, is_primary, sort_order, alt_text FROM product_images WHERE id = ? AND product_id = ?")
      .bind(imageId, productId)
      .first<ImageMetadataRow>(),
    getImageStorageState(db, productId),
  ]);
  if (!product || !image) return { kind: "not_found" as const };
  const validated = await validateProductImage(upload);
  if (state.bytes_used - image.byte_size + validated.byteSize > MAX_PRODUCT_IMAGE_STORAGE_BYTES) {
    throw new Error(PRODUCT_IMAGE_STORAGE_LIMIT_MESSAGE);
  }
  const replacementId = crypto.randomUUID();
  const now = new Date().toISOString();
  const operationId = crypto.randomUUID();
  const result = await db.batch([
    db.prepare(`
      INSERT INTO product_images (
        id, product_id, image_data, mime_type, byte_size, sha256, original_name,
        alt_text, is_primary, sort_order, uploaded_by_admin_id, created_at
      )
      SELECT ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?
      WHERE EXISTS (SELECT 1 FROM products WHERE id = ?)
        AND EXISTS (SELECT 1 FROM product_images WHERE id = ? AND product_id = ?)
        AND (SELECT COUNT(*) FROM product_images WHERE product_id = ?) <= ?
        AND (SELECT COALESCE(SUM(byte_size), 0) FROM product_images) - ? + ? <= ?
    `).bind(
      replacementId,
      productId,
      validated.imageData,
      validated.contentType,
      validated.byteSize,
      validated.sha256,
      safeOriginalName(upload.name),
      image.alt_text,
      image.sort_order,
      actor.id,
      now,
      productId,
      imageId,
      productId,
      productId,
      MAX_PRODUCT_IMAGES_PER_PRODUCT,
      image.byte_size,
      validated.byteSize,
      MAX_PRODUCT_IMAGE_STORAGE_BYTES,
    ),
    ...(image.is_primary === 1
      ? [
          db.prepare(`
            UPDATE product_images SET is_primary = 0
            WHERE id = ? AND product_id = ?
              AND EXISTS (SELECT 1 FROM product_images WHERE id = ?)
          `).bind(imageId, productId, replacementId),
          db.prepare("UPDATE product_images SET is_primary = 1 WHERE id = ? AND product_id = ?")
            .bind(replacementId, productId),
        ]
      : []),
    db.prepare(`
      DELETE FROM product_images
      WHERE id = ? AND product_id = ?
        AND EXISTS (SELECT 1 FROM product_images WHERE id = ? AND product_id = ?)
    `).bind(imageId, productId, replacementId, productId),
    buildAuditLogInsert(db, {
      actor,
      action: "PRODUCT_IMAGE_REPLACED",
      entityType: "product_image",
      entityId: replacementId,
      previousValues: { replacedImageId: imageId, byteSize: image.byte_size },
      newValues: { productId, contentType: validated.contentType, byteSize: validated.byteSize },
      changedFields: ["image"],
      requestId: operationId,
      createdAt: now,
      conditionalOn: {
        sql: "EXISTS (SELECT 1 FROM product_images WHERE id = ?) AND NOT EXISTS (SELECT 1 FROM product_images WHERE id = ?)",
        bindings: [replacementId, imageId],
      },
    }),
  ]);
  if (!result[0]?.meta.changes) {
    if (!(await getAdminProduct(productId))) return { kind: "not_found" as const };
    throw new Error("Unable to replace product image.");
  }
  return {
    kind: "replaced" as const,
    image: (await listImagesForAdminProduct(productId)).find((candidate) => candidate.id === replacementId)!,
  };
}

export async function deleteProductImage(productId: string, imageId: string, actor: AdminActor) {
  if (!isOpaqueImageId(imageId)) return { kind: "not_found" as const };
  const db = await getDatabase();
  const [product, image, count] = await Promise.all([
    getAdminProduct(productId),
    db
      .prepare("SELECT id, product_id, byte_size, is_primary, sort_order, alt_text FROM product_images WHERE id = ? AND product_id = ?")
      .bind(imageId, productId)
      .first<ImageMetadataRow>(),
    db.prepare("SELECT COUNT(*) AS count FROM product_images WHERE product_id = ?").bind(productId).first<{ count: number }>(),
  ]);
  if (!product || !image) return { kind: "not_found" as const };
  if (product.status === "published" && Number(count?.count ?? 0) <= 1) {
    throw new Error("A published product must retain at least one image.");
  }
  const now = new Date().toISOString();
  const replacement = image.is_primary === 1
    ? product.images.find((candidate) => candidate.id !== imageId) ?? null
    : null;
  const result = await db.batch([
    ...(replacement
      ? [
          db.prepare("UPDATE product_images SET is_primary = 0 WHERE id = ?").bind(imageId),
          db.prepare("UPDATE product_images SET is_primary = 1 WHERE id = ?").bind(replacement.id),
        ]
      : []),
    db.prepare("DELETE FROM product_images WHERE id = ? AND product_id = ?").bind(imageId, productId),
    buildAuditLogInsert(db, {
      actor,
      action: "PRODUCT_IMAGE_DELETED",
      entityType: "product_image",
      entityId: imageId,
      previousValues: { productId, primary: image.is_primary === 1, byteSize: image.byte_size },
      changedFields: ["image"],
      createdAt: now,
      conditionalOn: {
        sql: "NOT EXISTS (SELECT 1 FROM product_images WHERE id = ?)",
        bindings: [imageId],
      },
    }),
  ]);
  const deletedIndex = replacement ? 2 : 0;
  if (!result[deletedIndex]?.meta.changes) return { kind: "not_found" as const };
  return { kind: "deleted" as const };
}

export async function getPublicProductImageResponse(request: Request, imageId: string) {
  if (!isOpaqueImageId(imageId)) return notFound();
  const image = await getPublishedProductImage(imageId);
  return image
    ? buildProductImageResponse(image, request, "public, max-age=300, s-maxage=3600, must-revalidate")
    : notFound();
}

/** Draft images use this authenticated endpoint; the public endpoint only joins published products. */
export async function getAdminProductImageResponse(request: Request, productId: string, imageId: string) {
  if (!isOpaqueImageId(imageId)) return notFound();
  const image = await getAdminProductImage(productId, imageId);
  return image ? buildProductImageResponse(image, request, "private, no-store") : notFound();
}

function assertUploadCapacity(state: ImageStorageState, nextByteSize: number) {
  assertProductImageUploadCapacity(state.image_count, state.bytes_used, nextByteSize);
}

async function getImageStorageState(db: Awaited<ReturnType<typeof getDatabase>>, productId: string): Promise<ImageStorageState> {
  const [count, storage] = await Promise.all([
    db.prepare("SELECT COUNT(*) AS image_count FROM product_images WHERE product_id = ?").bind(productId).first<{ image_count: number }>(),
    db.prepare("SELECT COALESCE(SUM(byte_size), 0) AS bytes_used FROM product_images").first<{ bytes_used: number }>(),
  ]);
  return {
    image_count: Math.max(0, Number(count?.image_count ?? 0)),
    bytes_used: Math.max(0, Number(storage?.bytes_used ?? 0)),
  };
}

function normalizeAltText(value: string | null) {
  const normalized = String(value ?? "").replace(/\s+/gu, " ").trim();
  if (normalized.length > 240) throw new Error("Image alt text must be 240 characters or fewer.");
  return normalized || null;
}

function safeOriginalName(value: string) {
  const leaf = String(value ?? "").split(/[\\/]/u).pop() ?? "";
  const clean = leaf.replace(/[^a-zA-Z0-9._-]/gu, "_").replace(/^\.+/u, "").slice(0, 160);
  return clean || null;
}

function isOpaqueImageId(value: string) {
  return OPAQUE_IMAGE_ID.test(value);
}

function notFound() {
  return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
}
