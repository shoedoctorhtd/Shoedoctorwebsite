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
  type ProductImageUpload,
  validateProductImage,
} from "./product-image-validation";

export { detectImageType, validateProductImage } from "./product-image-validation";

type R2Object = {
  body: ReadableStream;
  httpMetadata?: { contentType?: string };
  etag?: string;
};

type R2Bucket = {
  get(key: string): Promise<R2Object | null>;
  put(key: string, value: ArrayBuffer | Uint8Array, options?: { httpMetadata?: { contentType?: string } }): Promise<unknown>;
  delete(keys: string | string[]): Promise<void>;
};

type ImageRow = {
  id: string;
  product_id: string;
  object_key: string;
  content_type: "image/jpeg" | "image/png" | "image/webp";
  is_primary: number;
  sort_order: number;
};

export async function uploadProductImage(
  productId: string,
  upload: ProductImageUpload,
  actor: AdminActor,
  options: { makePrimary?: boolean; sortOrder?: number } = {},
) {
  const product = await getAdminProduct(productId);
  if (!product) return { kind: "not_found" as const };
  const validated = await validateProductImage(upload);
  const bucket = await getProductImageBucket();
  if (!bucket) throw new Error("Product image storage is not configured. Create and bind the PRODUCT_IMAGES bucket first.");
  const id = crypto.randomUUID();
  const key = `products/${productId}/${crypto.randomUUID()}.${validated.extension}`;
  const now = new Date().toISOString();
  const currentImages = product.images;
  const sortOrder = Number.isSafeInteger(options.sortOrder)
    ? Math.max(0, Math.min(100_000, Number(options.sortOrder)))
    : currentImages.length ? Math.max(...currentImages.map((image) => image.sortOrder)) + 1 : 0;
  const makePrimary = options.makePrimary === true || currentImages.length === 0;

  await bucket.put(key, validated.bytes, { httpMetadata: { contentType: validated.contentType } });
  try {
    const db = await getDatabase();
    const operationId = crypto.randomUUID();
    const statements = [
      ...(makePrimary
        ? [db.prepare("UPDATE product_images SET is_primary = 0 WHERE product_id = ? AND is_primary = 1").bind(productId)]
        : []),
      db.prepare(`
        INSERT INTO product_images (
          id, product_id, object_key, original_name, content_type, byte_size,
          is_primary, sort_order, created_by_admin_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        id, productId, key, safeOriginalName(upload.name), validated.contentType,
        validated.bytes.byteLength, makePrimary ? 1 : 0, sortOrder, actor.id, now,
      ),
      buildAuditLogInsert(db, {
        actor,
        action: "PRODUCT_IMAGE_UPLOADED",
        entityType: "product_image",
        entityId: id,
        newValues: { productId, contentType: validated.contentType, byteSize: validated.bytes.byteLength, primary: makePrimary },
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
    const imageInsertIndex = makePrimary ? 1 : 0;
    if (!result[imageInsertIndex]?.meta.changes) throw new Error("Unable to save product image metadata.");
  } catch (error) {
    // Only the just-created random key is compensating-cleaned. No client key
    // or other record is ever used as an R2 deletion target.
    await bucket.delete(key).catch(() => undefined);
    throw error;
  }
  return { kind: "uploaded" as const, image: (await listImagesForAdminProduct(productId)).find((image) => image.id === id)! };
}

export async function updateProductImage(
  productId: string,
  imageId: string,
  input: { isPrimary?: boolean; sortOrder?: number },
  actor: AdminActor,
) {
  const db = await getDatabase();
  const image = await db.prepare("SELECT * FROM product_images WHERE id = ? AND product_id = ?").bind(imageId, productId).first<ImageRow>();
  if (!image) return { kind: "not_found" as const };
  const nextSortOrder = input.sortOrder === undefined
    ? image.sort_order
    : Math.max(0, Math.min(100_000, Math.trunc(input.sortOrder)));
  const makePrimary = input.isPrimary === true;
  const now = new Date().toISOString();
  const diff = auditValueDiff(
    { primary: image.is_primary === 1, sortOrder: image.sort_order },
    { primary: makePrimary || image.is_primary === 1, sortOrder: nextSortOrder },
  );
  const statements = [
    ...(makePrimary ? [db.prepare("UPDATE product_images SET is_primary = 0 WHERE product_id = ? AND is_primary = 1").bind(productId)] : []),
    db.prepare("UPDATE product_images SET is_primary = ?, sort_order = ? WHERE id = ? AND product_id = ?")
      .bind(makePrimary ? 1 : image.is_primary, nextSortOrder, imageId, productId),
    buildAuditLogInsert(db, {
      actor,
      action: makePrimary ? "PRODUCT_IMAGE_PRIMARY_CHANGED" : "PRODUCT_IMAGE_REORDERED",
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
  ];
  await db.batch(statements);
  return { kind: "updated" as const, image: (await listImagesForAdminProduct(productId)).find((candidate) => candidate.id === imageId)! };
}

export async function deleteProductImage(productId: string, imageId: string, actor: AdminActor) {
  const db = await getDatabase();
  const [product, image, count] = await Promise.all([
    getAdminProduct(productId),
    db.prepare("SELECT * FROM product_images WHERE id = ? AND product_id = ?").bind(imageId, productId).first<ImageRow>(),
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
      ? [db.prepare("UPDATE product_images SET is_primary = 0 WHERE id = ?").bind(imageId), db.prepare("UPDATE product_images SET is_primary = 1 WHERE id = ?").bind(replacement.id)]
      : []),
    db.prepare("DELETE FROM product_images WHERE id = ? AND product_id = ?").bind(imageId, productId),
    buildAuditLogInsert(db, {
      actor,
      action: "PRODUCT_IMAGE_DELETED",
      entityType: "product_image",
      entityId: imageId,
      previousValues: { productId, primary: image.is_primary === 1 },
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
  const bucket = await getProductImageBucket();
  if (bucket) await bucket.delete(image.object_key).catch(() => undefined);
  return { kind: "deleted" as const };
}

export async function getPublicProductImageResponse(imageId: string) {
  const image = await getPublishedProductImage(imageId);
  return image
    ? getProductImageResponse(image, "public, max-age=86400, s-maxage=604800, immutable")
    : new Response("Not found", { status: 404 });
}

/**
 * The route that calls this function requires a verified admin session and a
 * product-view grant. Unlike the public route, it may serve draft images.
 */
export async function getAdminProductImageResponse(productId: string, imageId: string) {
  const image = await getAdminProductImage(productId, imageId);
  return image
    ? getProductImageResponse(image, "private, no-store")
    : new Response("Not found", { status: 404 });
}

async function getProductImageResponse(
  image: { object_key: string; content_type: string },
  cacheControl: string,
) {
  const bucket = await getProductImageBucket();
  if (!bucket) return new Response("Image storage unavailable", { status: 503 });
  const object = await bucket.get(image.object_key);
  if (!object) return new Response("Not found", { status: 404 });
  return new Response(object.body, {
    headers: {
      "Content-Type": object.httpMetadata?.contentType || image.content_type,
      "Cache-Control": cacheControl,
      ...(object.etag ? { ETag: object.etag } : {}),
      "X-Content-Type-Options": "nosniff",
    },
  });
}

async function getProductImageBucket(): Promise<R2Bucket | null> {
  try {
    const workers = (await import(/* @vite-ignore */ "cloudflare:workers")) as { env?: { PRODUCT_IMAGES?: R2Bucket } };
    return workers.env?.PRODUCT_IMAGES ?? null;
  } catch {
    return null;
  }
}

function safeOriginalName(value: string) {
  const leaf = String(value ?? "").split(/[\\/]/u).pop() ?? "";
  const clean = leaf.replace(/[^a-zA-Z0-9._-]/gu, "_").replace(/^\.+/u, "").slice(0, 160);
  return clean || null;
}
