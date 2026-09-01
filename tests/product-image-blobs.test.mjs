import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

import { buildProductImageResponse } from "../lib/product-image-response.ts";
import {
  assertProductImageUploadCapacity,
  MAX_PRODUCT_IMAGE_BYTES,
  MAX_PRODUCT_IMAGE_STORAGE_BYTES,
  PRODUCT_IMAGE_STORAGE_LIMIT_MESSAGE,
  validateProductImage,
} from "../lib/product-image-validation.ts";

const migration0012Url = new URL("../migrations/0012_product_catalogue_inventory.sql", import.meta.url);
const migration0014Url = new URL("../migrations/0014_product_image_blobs.sql", import.meta.url);
const now = "2026-08-30T08:00:00.000Z";

async function createBlobImageDatabase({ legacyImage = false } = {}) {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON; CREATE TABLE admin_users (id TEXT PRIMARY KEY);");
  db.exec(await readFile(migration0012Url, "utf8"));
  if (legacyImage) {
    insertDraftProduct(db, "legacy-product");
    db.prepare(`
      INSERT INTO product_images (
        id, product_id, object_key, original_name, content_type, byte_size,
        is_primary, sort_order, created_at
      ) VALUES ('legacy-image', 'legacy-product', 'products/legacy-product/legacy.png', 'legacy.png', 'image/png', 8, 1, 0, ?)
    `).run(now);
    db.prepare("UPDATE products SET status = 'published' WHERE id = 'legacy-product'").run();
  }
  db.exec(await readFile(migration0014Url, "utf8"));
  return db;
}

function insertDraftProduct(db, id = "blob-product") {
  db.prepare(`
    INSERT INTO products (
      id, sku, slug, name, short_description, price_npr, stock_quantity,
      low_stock_threshold, status, featured, created_at, updated_at
    ) VALUES (?, 'BLOB-001', 'blob-product', 'Blob product', 'A complete product description.', 500, 3, 1, 'draft', 0, ?, ?)
  `).run(id, now, now);
}

function insertBlobImage(db, {
  id = "b2b7a844-9a3e-44ba-b95d-6d1f5a9c13d6",
  productId = "blob-product",
  bytes = Buffer.from(minimalPng()),
  mimeType = "image/png",
  byteSize = bytes.byteLength,
  sha256 = "a".repeat(64),
  primary = 1,
} = {}) {
  db.prepare(`
    INSERT INTO product_images (
      id, product_id, image_data, mime_type, byte_size, sha256, original_name,
      alt_text, is_primary, sort_order, uploaded_by_admin_id, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'product.png', 'Product image', ?, 0, NULL, ?)
  `).run(id, productId, bytes, mimeType, byteSize, sha256, primary, now);
}

function minimalPng(width = 10, height = 10) {
  const bytes = [
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    (width >>> 24) & 0xff, (width >>> 16) & 0xff, (width >>> 8) & 0xff, width & 0xff,
    (height >>> 24) & 0xff, (height >>> 16) & 0xff, (height >>> 8) & 0xff, height & 0xff,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x01, 0x49, 0x44, 0x41, 0x54, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44,
    0x00, 0x00, 0x00, 0x00,
  ];
  return Uint8Array.from(bytes);
}

function minimalJpeg(width = 10, height = 10) {
  return Uint8Array.from([
    0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08,
    (height >>> 8) & 0xff, height & 0xff, (width >>> 8) & 0xff, width & 0xff,
    0x03, 0x01, 0x11, 0x00, 0x02, 0x11, 0x00, 0x03, 0x11, 0x00,
    0xff, 0xda, 0x00, 0x0c, 0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3f, 0x00,
    0x00, 0xff, 0xd9,
  ]);
}

function minimalWebp(width = 10, height = 10) {
  const canvasWidth = width - 1;
  const canvasHeight = height - 1;
  const payload = [
    0x2f,
    canvasWidth & 0xff,
    ((canvasWidth >>> 8) & 0x3f) | ((canvasHeight & 0x03) << 6),
    (canvasHeight >>> 2) & 0xff,
    (canvasHeight >>> 10) & 0x0f,
    0x00,
  ];
  const riffSize = 4 + 8 + payload.length;
  return Uint8Array.from([
    0x52, 0x49, 0x46, 0x46, riffSize & 0xff, (riffSize >>> 8) & 0xff, (riffSize >>> 16) & 0xff, (riffSize >>> 24) & 0xff,
    0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x4c,
    payload.length, 0x00, 0x00, 0x00,
    ...payload,
  ]);
}

test("0014 safely retains unrecoverable R2 metadata and creates the D1 BLOB product-image schema", async (t) => {
  const db = await createBlobImageDatabase({ legacyImage: true });
  t.after(() => db.close());
  const activeSchema = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'product_images'").get().sql;
  assert.match(activeSchema, /image_data BLOB NOT NULL/i);
  assert.match(activeSchema, /mime_type TEXT NOT NULL/i);
  assert.match(activeSchema, /length\(image_data\) <= 512000/i);
  assert.doesNotMatch(activeSchema, /object_key/i);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM product_images").get().count, 0);
  const legacy = db.prepare("SELECT product_id, object_key, original_name FROM product_images_legacy_r2").get();
  assert.equal(legacy.product_id, "legacy-product");
  assert.equal(legacy.object_key, "products/legacy-product/legacy.png");
  assert.equal(legacy.original_name, "legacy.png");
  assert.equal(db.prepare("SELECT status FROM products WHERE id = 'legacy-product'").get().status, "draft");
  const seeds = db.prepare("SELECT status FROM products WHERE id LIKE 'starter-%'").all();
  assert.equal(seeds.length, 7);
  assert.ok(seeds.every((row) => row.status === "draft"));
});

test("D1 BLOB schema enforces bytes, MIME, and publication uses only active BLOB image rows", async (t) => {
  const db = await createBlobImageDatabase();
  t.after(() => db.close());
  insertDraftProduct(db);
  assert.throws(
    () => db.prepare("UPDATE products SET status = 'published' WHERE id = 'blob-product'").run(),
    /published products require.*image/i,
  );
  insertBlobImage(db);
  assert.equal(db.prepare("UPDATE products SET status = 'published' WHERE id = 'blob-product'").run().changes, 1);
  const stored = db.prepare("SELECT image_data, byte_size, mime_type, sha256 FROM product_images").get();
  assert.equal(stored.byte_size, minimalPng().byteLength);
  assert.equal(stored.mime_type, "image/png");
  assert.equal(stored.sha256, "a".repeat(64));
  assert.equal(Buffer.from(stored.image_data).byteLength, minimalPng().byteLength);

  assert.throws(() => insertBlobImage(db, {
    id: "5a0f6757-ced8-4b1f-af0e-e920c286dd9a",
    bytes: Buffer.alloc(0),
    byteSize: 0,
    primary: 0,
  }), /CHECK constraint failed/i);
  assert.throws(() => insertBlobImage(db, {
    id: "3d8a1977-fbfd-4dc5-96e3-e43320fdbbca",
    bytes: Buffer.alloc(MAX_PRODUCT_IMAGE_BYTES + 1),
    byteSize: MAX_PRODUCT_IMAGE_BYTES + 1,
    primary: 0,
  }), /CHECK constraint failed/i);
  assert.throws(() => insertBlobImage(db, {
    id: "c4e3626a-af88-465d-bd26-6dd07db4278d",
    mimeType: "image/gif",
    primary: 0,
  }), /CHECK constraint failed/i);
  assert.throws(
    () => db.prepare("DELETE FROM product_images WHERE id = 'b2b7a844-9a3e-44ba-b95d-6d1f5a9c13d6'").run(),
    /published product must retain at least one image/i,
  );
});

test("server validation accepts bounded JPEG, PNG, WebP and rejects invalid, oversize, or oversized dimensions", async () => {
  for (const [name, type, bytes] of [
    ["receipt.jpg", "image/jpeg", minimalJpeg()],
    ["receipt.png", "image/png", minimalPng()],
    ["receipt.webp", "image/webp", minimalWebp()],
  ]) {
    const image = await validateProductImage({ name, type, size: bytes.byteLength, arrayBuffer: async () => bytes.buffer });
    assert.equal(image.contentType, type);
    assert.ok(image.sha256.match(/^[a-f0-9]{64}$/));
  }
  for (const [name, type, bytes] of [
    ["receipt-alt.jpg", "image/jpg", minimalJpeg()],
    ["receipt-alt.png", "image/x-png", minimalPng()],
    ["receipt-alt.webp", "", minimalWebp()],
  ]) {
    const image = await validateProductImage({ name, type, size: bytes.byteLength, arrayBuffer: async () => bytes.buffer });
    assert.ok(image.contentType.startsWith("image/"));
    assert.ok(image.sha256.match(/^[a-f0-9]{64}$/));
  }
  await assert.rejects(
    validateProductImage({ name: "bad.gif", type: "image/gif", size: 6, arrayBuffer: async () => Uint8Array.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]).buffer }),
    /Only valid JPEG, PNG, and WebP/i,
  );
  const pngWithoutImageData = minimalPng();
  const idatOffset = pngWithoutImageData.findIndex((value, index, bytes) => value === 0x49 && bytes[index + 1] === 0x44 && bytes[index + 2] === 0x41 && bytes[index + 3] === 0x54);
  pngWithoutImageData[idatOffset] = 0x74;
  const jpegWithoutScan = Uint8Array.from([...minimalJpeg().slice(0, -17), 0xff, 0xd9]);
  const webpWithoutPayload = minimalWebp();
  webpWithoutPayload.set([0x56, 0x50, 0x38, 0x58], 12);
  for (const [name, type, bytes] of [
    ["empty-payload.png", "image/png", pngWithoutImageData],
    ["empty-payload.jpg", "image/jpeg", jpegWithoutScan],
    ["empty-payload.webp", "image/webp", webpWithoutPayload],
  ]) {
    await assert.rejects(
      validateProductImage({ name, type, size: bytes.byteLength, arrayBuffer: async () => bytes.buffer }),
      /incomplete or not a valid/i,
    );
  }
  await assert.rejects(
    validateProductImage({ name: "large.png", type: "image/png", size: MAX_PRODUCT_IMAGE_BYTES + 1, arrayBuffer: async () => new ArrayBuffer(0) }),
    /no larger than 500 KB/i,
  );
  const largeDimension = minimalPng(1601, 1200);
  await assert.rejects(
    validateProductImage({ name: "wide.png", type: "image/png", size: largeDimension.byteLength, arrayBuffer: async () => largeDimension.buffer }),
    /1600 × 1600/i,
  );
});

test("the image safeguards cap each product at three images and the application image storage at 50 MB", () => {
  assert.throws(
    () => assertProductImageUploadCapacity(3, 0, 1),
    /up to 3 images/i,
  );
  assert.throws(
    () => assertProductImageUploadCapacity(2, MAX_PRODUCT_IMAGE_STORAGE_BYTES - 100, 101),
    new RegExp(PRODUCT_IMAGE_STORAGE_LIMIT_MESSAGE),
  );
  assert.doesNotThrow(() => assertProductImageUploadCapacity(2, MAX_PRODUCT_IMAGE_STORAGE_BYTES - 100, 100));
});

test("binary image responses send safe headers and honor ETag revalidation", async () => {
  const image = {
    id: "b2b7a844-9a3e-44ba-b95d-6d1f5a9c13d6",
    image_data: minimalPng(),
    mime_type: "image/png",
    sha256: "b".repeat(64),
  };
  const first = buildProductImageResponse(image, new Request("https://shoe.example/api/products/images/image"), "public, max-age=60, immutable");
  assert.equal(first.status, 200);
  assert.equal(first.headers.get("content-type"), "image/png");
  assert.equal(first.headers.get("x-content-type-options"), "nosniff");
  assert.match(first.headers.get("content-disposition") ?? "", /^inline;/);
  assert.equal(first.headers.get("etag"), `"${"b".repeat(64)}"`);
  assert.deepEqual(new Uint8Array(await first.arrayBuffer()), minimalPng());
  const revalidated = buildProductImageResponse(
    image,
    new Request("https://shoe.example/api/products/images/image", { headers: { "if-none-match": `"${"b".repeat(64)}"` } }),
    "public, max-age=60, immutable",
  );
  assert.equal(revalidated.status, 304);
});

test("binary image responses accept D1 BLOB byte arrays", async () => {
  const expectedBytes = minimalPng();
  const response = buildProductImageResponse(
    {
      id: "dc53b8ae-ea83-45be-a20f-24cfeb1f1a73",
      image_data: [...expectedBytes],
      mime_type: "image/png",
      sha256: "c".repeat(64),
    },
    new Request("https://shoe.example/api/products/images/image"),
    "public, max-age=60, immutable",
  );

  assert.equal(response.status, 200);
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), expectedBytes);
  assert.equal(
    buildProductImageResponse(
      {
        id: "dc53b8ae-ea83-45be-a20f-24cfeb1f1a73",
        image_data: [0, 256],
        mime_type: "image/png",
        sha256: "c".repeat(64),
      },
      new Request("https://shoe.example/api/products/images/image"),
      "public, max-age=60, immutable",
    ).status,
    404,
  );
});

test("catalogue queries omit BLOB data and all source and generated deployment contracts are R2-free", async () => {
  const [productData, productImages, wrangler, hosting, worker, packageJson, validationScript, generatedHosting, generatedWorker] = await Promise.all([
    readFile(new URL("../lib/product-data.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/product-images.ts", import.meta.url), "utf8"),
    readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8"),
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
    readFile(new URL("../worker/index.ts", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../scripts/validate-artifact.sh", import.meta.url), "utf8"),
    readFile(new URL("../dist/.openai/hosting.json", import.meta.url), "utf8"),
    readFile(new URL("../dist/server/wrangler.json", import.meta.url), "utf8"),
  ]);
  const imageSelect = productData.match(/const IMAGE_SELECT = `([\s\S]*?)`;/)?.[1] ?? "";
  assert.doesNotMatch(imageSelect, /image_data/i);
  assert.match(productData, /SELECT i\.id, i\.product_id, i\.image_data/i);
  assert.match(productData, /LIMIT \? OFFSET \?/);
  assert.match(productData, /listAdminProductPage/);
  assert.match(productImages, /COALESCE\(SUM\(byte_size\), 0\) FROM product_images\) \+ \? <= \?/);
  assert.doesNotMatch(productImages, /R2Bucket|getProductImageBucket|bucket\.(put|get|delete)/i);
  for (const source of [wrangler, hosting, worker, packageJson]) {
    assert.doesNotMatch(source, /\bPRODUCT_IMAGES\b|shoe-doctor-product-images|r2_buckets/i);
  }
  assert.match(validationScript, /r2_buckets/);
  const deployedHosting = JSON.parse(generatedHosting);
  const deployedWorker = JSON.parse(generatedWorker);
  assert.equal(Object.hasOwn(deployedHosting, "r2"), false);
  assert.equal(deployedWorker.r2_buckets?.length ?? 0, 0);
  assert.doesNotMatch(generatedWorker, /PRODUCT_IMAGES|shoe-doctor-product-images/i);
});
