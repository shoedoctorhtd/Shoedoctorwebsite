import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

import {
  buildPublicProductOrderReference,
  generatePublicProductOrderReference,
  normalizeProductOrderReferenceSearch,
} from "../lib/product-order-reference.ts";
import {
  getMissingProductPublicationFields,
  getMissingProductPublicationRequirements,
  nullableInteger,
  parseInventoryAdjustment,
  parseInitialStockQuantity,
  parseInitialProductStock,
  parseOnlineProductOrder,
  parseProductDetails,
  parseProductInput,
  productPublicationRequirementsMessage,
  productSlugFromName,
} from "../lib/product-validation.ts";
import { prepareCheckoutItems } from "../lib/product-checkout.ts";
import { canCancelProductOrderStatus, canTransitionProductOrderStatus } from "../lib/product-order-status.ts";
import { detectImageType, validateProductImage } from "../lib/product-image-validation.ts";
import { clearSessionRetryToken, getSessionRetryToken } from "../app/components/ProductRetryToken.ts";
import { auditValueDiff } from "../lib/audit.ts";
import { HOMEPAGE_PRODUCT_LIMIT, selectHomepageProducts } from "../lib/product-home.ts";
import { resolveCheckoutSource, selectCheckoutLines, shouldClearPersistentCart } from "../lib/product-direct-checkout.ts";
import { selectRelatedPublicProducts } from "../lib/product-related.ts";

const migrationUrl = new URL("../migrations/0012_product_catalogue_inventory.sql", import.meta.url);
const migration0013Url = new URL("../migrations/0013_product_order_payments.sql", import.meta.url);
const migration0014Url = new URL("../migrations/0014_product_image_blobs.sql", import.meta.url);
const migration0015Url = new URL("../migrations/0015_product_content_fields.sql", import.meta.url);
const migration0016Url = new URL("../migrations/0016_product_lifecycle_deletion.sql", import.meta.url);
const now = "2026-08-29T08:00:00.000Z";

async function createCatalogueDatabase() {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON; CREATE TABLE admin_users (id TEXT PRIMARY KEY);");
  const migration = await readFile(migrationUrl, "utf8");
  db.exec(migration);
  return db;
}

async function createProductContentDatabase({ includeProductContentMigration = true } = {}) {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON; CREATE TABLE admin_users (id TEXT PRIMARY KEY);");
  const migrations = [migrationUrl, migration0013Url, migration0014Url];
  if (includeProductContentMigration) migrations.push(migration0015Url);
  migrations.push(migration0016Url);
  for (const migration of migrations) {
    db.exec(await readFile(migration, "utf8"));
  }
  return db;
}

function insertDraft(db, {
  id = "product-1",
  name = "Test product",
  sku = "TEST-1",
  slug = "test-product",
  price = 500,
  stock = 4,
  description = "A valid short description.",
} = {}) {
  db.prepare(`
    INSERT INTO products (
      id, sku, slug, name, short_description, price_npr, stock_quantity,
      low_stock_threshold, status, featured, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 'draft', 0, ?, ?)
  `).run(id, sku, slug, name, description, price, stock, now, now);
}

function insertImage(db, productId = "product-1", id = "image-1") {
  db.prepare(`
    INSERT INTO product_images (
      id, product_id, object_key, original_name, content_type, byte_size,
      is_primary, sort_order, created_at
    ) VALUES (?, ?, ?, 'product.png', 'image/png', 8, 1, 0, ?)
  `).run(id, productId, `products/${productId}/${id}.png`, now);
}

function insertOrder(db, {
  id = "order-1",
  reference = "PO-260829-ABC",
  token = "checkout_token_123456",
  status = "pending",
} = {}) {
  db.prepare(`
    INSERT INTO product_orders (
      id, public_reference, channel, fulfillment_method, subtotal,
      delivery_charge, total, status, payment_status,
      checkout_idempotency_token, created_at, updated_at
    ) VALUES (?, ?, 'online', 'collection', 500, 0, 500, ?, 'pending', ?, ?, ?)
  `).run(id, reference, status, token, now, now);
}

test("0012 seeds exactly the seven incomplete starter drafts and remains idempotent", async (t) => {
  const db = await createCatalogueDatabase();
  t.after(() => db.close());
  const migration = await readFile(migrationUrl, "utf8");
  db.exec(migration);
  const rows = db.prepare("SELECT id, name, sku, slug, price_npr, stock_quantity, status FROM products ORDER BY id").all();
  assert.equal(rows.length, 7);
  assert.deepEqual(rows.map((row) => row.id), [
    "starter-crease-protector",
    "starter-shoe-bag",
    "starter-shoe-cleaning-kit",
    "starter-shoe-cover",
    "starter-shoe-unyellow",
    "starter-suede-eraser",
    "starter-white-paint-filler",
  ]);
  for (const row of rows) {
    assert.equal(row.status, "draft");
    assert.equal(row.sku, null);
    assert.equal(row.slug, null);
    assert.equal(row.price_npr, null);
    assert.equal(row.stock_quantity, null);
  }
});

test("0015 adds nullable product-content fields without changing existing product states", async (t) => {
  const db = await createProductContentDatabase({ includeProductContentMigration: false });
  t.after(() => db.close());
  db.prepare(`
    INSERT INTO products (
      id, sku, slug, name, short_description, price_npr, stock_quantity,
      low_stock_threshold, status, featured, created_at, updated_at
    ) VALUES ('published-before-0015', 'PUBLISHED-001', 'published-before-0015', 'Published before 0015', 'Existing published record.', 99, 2, 0, 'draft', 0, ?, ?)
  `).run(now, now);
  db.prepare(`
    INSERT INTO product_images (
      id, product_id, image_data, mime_type, byte_size, sha256, original_name,
      alt_text, is_primary, sort_order, uploaded_by_admin_id, created_at
    ) VALUES ('a19c8c99-1e92-4e82-9d7a-6a14a336b3d6', 'published-before-0015', X'89504E470D0A1A0A', 'image/png', 8, ?, 'product.png', NULL, 1, 0, NULL, ?)
  `).run("a".repeat(64), now);
  assert.equal(db.prepare("UPDATE products SET status = 'published' WHERE id = 'published-before-0015'").run().changes, 1);

  db.exec(await readFile(migration0015Url, "utf8"));
  const starter = db.prepare("SELECT status, category, compare_at_price_npr, details_json, badge FROM products WHERE id = 'starter-shoe-bag'").get();
  assert.deepEqual({ ...starter }, {
    status: "draft",
    category: null,
    compare_at_price_npr: null,
    details_json: null,
    badge: null,
  });
  assert.deepEqual(
    { ...db.prepare("SELECT status, category, compare_at_price_npr, details_json, badge FROM products WHERE id = 'published-before-0015'").get() },
    { status: "published", category: null, compare_at_price_npr: null, details_json: null, badge: null },
  );

  assert.throws(() => db.prepare("UPDATE products SET badge = 'best_seller' WHERE id = 'published-before-0015'").run(), /CHECK constraint failed/i);
  assert.throws(() => db.prepare("UPDATE products SET category = 'medical_claims' WHERE id = 'published-before-0015'").run(), /CHECK constraint failed/i);
  assert.throws(() => db.prepare("UPDATE products SET compare_at_price_npr = 99 WHERE id = 'published-before-0015'").run(), /CHECK constraint failed/i);
  assert.throws(() => db.prepare("UPDATE products SET details_json = '{not-json' WHERE id = 'published-before-0015'").run(), /CHECK constraint failed/i);

  const details = JSON.stringify({ brand: "Shoe Doctor", keyBenefits: ["Quick clean"] });
  db.prepare("UPDATE products SET category = 'quick_clean', compare_at_price_npr = 149, details_json = ?, badge = 'doctors_pick' WHERE id = 'published-before-0015'").run(details);
  assert.deepEqual(
    { ...db.prepare("SELECT status, category, compare_at_price_npr, details_json, badge FROM products WHERE id = 'published-before-0015'").get() },
    { status: "published", category: "quick_clean", compare_at_price_npr: 149, details_json: details, badge: "doctors_pick" },
  );
});

test("homepage care selection is capped, in-stock, slug-safe, and deterministic", () => {
  const selected = selectHomepageProducts([
    { id: "doctor-out", slug: "doctor-out", name: "Doctor Out", badge: "doctors_pick", featured: false, stockQuantity: 0, updatedAt: "2026-08-29T00:00:00.000Z" },
    { id: "doctor-in", slug: "doctor-in", name: "Doctor In", badge: "doctors_pick", featured: false, stockQuantity: 2, updatedAt: "2026-08-28T00:00:00.000Z" },
    { id: "featured-in", slug: "featured-in", name: "Featured In", badge: null, featured: true, stockQuantity: 4, updatedAt: "2026-08-27T00:00:00.000Z" },
    { id: "plain-in", slug: "plain-in", name: "Plain In", badge: null, featured: false, stockQuantity: 8, updatedAt: "2026-08-26T00:00:00.000Z" },
    { id: "plain-out", slug: "plain-out", name: "Plain Out", badge: null, featured: false, stockQuantity: 0, updatedAt: "2026-08-30T00:00:00.000Z" },
    { id: "invalid", slug: "Not a valid slug", name: "Invalid", badge: "doctors_pick", featured: true, stockQuantity: 9, updatedAt: "2026-08-31T00:00:00.000Z" },
  ]);
  assert.equal(HOMEPAGE_PRODUCT_LIMIT, 4);
  assert.deepEqual(selected.map((product) => product.id), ["doctor-in", "featured-in", "plain-in"]);
  assert.deepEqual(selectHomepageProducts([selected[0]]).map((product) => product.id), ["doctor-in"]);
});

test("Buy Now selects only its safe direct item and leaves cart selection intact", () => {
  const cart = [
    { productSlug: "saved-cleaner", quantity: 2 },
    { productSlug: "saved-protector", quantity: 1 },
  ];
  const buyNow = resolveCheckoutSource({ mode: "buy-now", product: "suede-eraser", quantity: "3" });
  assert.deepEqual(buyNow, { kind: "buy_now", item: { productSlug: "suede-eraser", quantity: 3 } });
  assert.deepEqual(selectCheckoutLines(cart, buyNow), [{ productSlug: "suede-eraser", quantity: 3 }]);
  assert.equal(shouldClearPersistentCart(buyNow), false);
  assert.deepEqual(selectCheckoutLines(cart, resolveCheckoutSource({})), cart);
  assert.equal(shouldClearPersistentCart(resolveCheckoutSource({})), true);

  for (const value of [undefined, "", "0", "1.5", "-1", "101", "nope"]) {
    assert.equal(
      resolveCheckoutSource({ mode: "buy-now", product: "suede-eraser", quantity: value }).kind,
      "invalid_buy_now",
    );
  }
  assert.equal(resolveCheckoutSource({ mode: "buy-now", product: "Invalid slug", quantity: "1" }).kind, "invalid_buy_now");
  const invalid = resolveCheckoutSource({ mode: "buy-now", product: "suede-eraser", quantity: "0" });
  assert.deepEqual(selectCheckoutLines(cart, invalid), []);
  assert.equal(shouldClearPersistentCart(invalid), false);
});

test("related products exclude the current item and prefer its category without inventing relationships", () => {
  const candidates = [
    { slug: "current-cleaner", name: "Current", category: "protection", stockQuantity: 3 },
    { slug: "same-category", name: "Same", category: "protection", stockQuantity: 2 },
    { slug: "other-category", name: "Other", category: "accessories", stockQuantity: 5 },
    { slug: "same-category-two", name: "Same two", category: "protection", stockQuantity: 1 },
  ];
  const related = selectRelatedPublicProducts({ slug: "current-cleaner", category: "protection" }, candidates, 3);
  assert.deepEqual(related.map((product) => product.slug), ["same-category", "same-category-two", "other-category"]);
  assert.deepEqual(selectRelatedPublicProducts({ slug: "current-cleaner", category: "protection" }, candidates, 1).map((product) => product.slug), ["same-category"]);
});

test("0016 only permits harmless initial-stock cleanup before deleting an unused product", async (t) => {
  const db = await createProductContentDatabase();
  t.after(() => db.close());
  const productId = "unused-product";
  insertDraft(db, { id: productId, stock: 4 });
  db.prepare("UPDATE products SET status = 'archived' WHERE id = ?").run(productId);
  db.prepare(`
    INSERT INTO product_images (
      id, product_id, image_data, mime_type, byte_size, sha256, original_name,
      alt_text, is_primary, sort_order, uploaded_by_admin_id, created_at
    ) VALUES ('unused-active-image', ?, X'89504E470D0A1A0A', 'image/png', 8, ?, 'product.png', NULL, 1, 0, NULL, ?)
  `).run(productId, "a".repeat(64), now);
  db.prepare(`
    INSERT INTO product_images_legacy_r2 (
      id, product_id, object_key, original_name, content_type, byte_size,
      is_primary, sort_order, created_at
    ) VALUES ('unused-legacy-image', ?, ?, 'legacy.png', 'image/png', 8, 1, 0, ?)
  `).run(productId, `products/${productId}/legacy.png`, now);
  db.prepare(`
    INSERT INTO inventory_movements (
      id, product_id, stock_change, previous_stock, resulting_stock,
      movement_type, related_order_id, source_id, admin_user_id, reason,
      idempotency_key, created_at
    ) VALUES ('unused-initial-stock', ?, 4, 0, 4, 'initial_stock', NULL, NULL, NULL, 'Initial product stock', 'initial:unused-product', ?)
  `).run(productId, now);

  db.exec("BEGIN;");
  try {
    assert.equal(db.prepare("DELETE FROM product_images WHERE product_id = ?").run(productId).changes, 1);
    assert.equal(db.prepare("DELETE FROM product_images_legacy_r2 WHERE product_id = ?").run(productId).changes, 1);
    assert.equal(db.prepare("DELETE FROM inventory_movements WHERE product_id = ? AND movement_type = 'initial_stock'").run(productId).changes, 1);
    assert.equal(db.prepare("DELETE FROM products WHERE id = ? AND status IN ('draft', 'archived')").run(productId).changes, 1);
    db.exec("COMMIT;");
  } catch (error) {
    db.exec("ROLLBACK;");
    throw error;
  }
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM products WHERE id = ?").get(productId).count, 0);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM product_images WHERE product_id = ?").get(productId).count, 0);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM product_images_legacy_r2 WHERE product_id = ?").get(productId).count, 0);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM inventory_movements WHERE product_id = ?").get(productId).count, 0);

  insertDraft(db, { id: "inventory-history", sku: "INVENTORY-1", slug: "inventory-history" });
  db.prepare(`
    INSERT INTO inventory_movements (
      id, product_id, stock_change, previous_stock, resulting_stock,
      movement_type, related_order_id, source_id, admin_user_id, reason,
      idempotency_key, created_at
    ) VALUES ('meaningful-restock', 'inventory-history', 1, 4, 5, 'restock', NULL, NULL, NULL, 'Supplier restock', 'restock:inventory-history', ?)
  `).run(now);
  assert.throws(() => db.prepare("DELETE FROM inventory_movements WHERE id = 'meaningful-restock'").run(), /inventory movements are immutable/i);
  assert.throws(() => db.prepare("DELETE FROM products WHERE id = 'inventory-history'").run(), /FOREIGN KEY constraint failed/i);

  insertDraft(db, { id: "ordered-product", sku: "ORDERED-1", slug: "ordered-product" });
  insertOrder(db, { id: "ordered-product-order", reference: "PO-260829-ORD", token: "checkout_token_ordered_123" });
  db.prepare(`
    INSERT INTO product_order_items (
      id, order_id, product_id, sku_snapshot, product_name_snapshot,
      unit_price_npr, quantity, line_total_npr, created_at
    ) VALUES ('ordered-product-item', 'ordered-product-order', 'ordered-product', 'ORDER-1', 'Ordered product', 500, 1, 500, ?)
  `).run(now);
  assert.throws(() => db.prepare("DELETE FROM products WHERE id = 'ordered-product'").run(), /FOREIGN KEY constraint failed/i);

  insertDraft(db, { id: "returned-product", sku: "RETURNED-1", slug: "returned-product" });
  insertOrder(db, { id: "returned-product-order", reference: "PO-260829-RET", token: "checkout_token_returned_123" });
  db.prepare(`
    INSERT INTO product_order_returns (
      id, order_id, product_id, quantity, restock, reason, admin_user_id,
      idempotency_key, created_at
    ) VALUES ('returned-product-row', 'returned-product-order', 'returned-product', 1, 0, 'Customer return', NULL, 'return:returned-product', ?)
  `).run(now);
  assert.throws(() => db.prepare("DELETE FROM products WHERE id = 'returned-product'").run(), /FOREIGN KEY constraint failed/i);
});

test("publication validation identifies every missing catalogue field before a draft can be published", () => {
  assert.equal(productSlugFromName("Shoe Wipes"), "shoe-wipes");
  assert.equal(productSlugFromName(`${"a".repeat(99)} b`), "a".repeat(99));
  const missing = getMissingProductPublicationFields({
    name: "Shoe Wipes",
    sku: null,
    slug: null,
    shortDescription: "For quick cleaning.",
    priceNpr: 599,
  });
  assert.deepEqual(missing, ["a valid SKU", "a valid slug"]);
  assert.equal(nullableInteger(null), null);
  assert.equal(nullableInteger(undefined), null);
  assert.equal(nullableInteger(0), 0);
  assert.equal(nullableInteger("0"), 0);
  assert.equal(parseInitialStockQuantity(0), 0);
  assert.throws(() => parseInitialStockQuantity(null), /Initial stock/i);
  const completeWithoutCompareAtPrice = {
    name: "Shoe Wipes",
    sku: "SW-001",
    slug: "shoe-wipes",
    shortDescription: "For quick cleaning.",
    priceNpr: 599,
    compareAtPriceNpr: null,
    status: "published",
  };
  assert.equal(parseProductInput(completeWithoutCompareAtPrice).compareAtPriceNpr, null);
  assert.deepEqual(
    getMissingProductPublicationRequirements(completeWithoutCompareAtPrice, { stockQuantity: nullableInteger(null), imageCount: 1 }),
    ["initial stock"],
  );
  assert.deepEqual(
    getMissingProductPublicationRequirements(completeWithoutCompareAtPrice, { stockQuantity: 0, imageCount: 1 }),
    [],
  );
  assert.equal(productPublicationRequirementsMessage(["initial stock"]), "Before publishing, complete: initial stock.");
  assert.equal(parseProductInput({
    name: "Shoe Wipes",
    sku: "SW-001",
    slug: null,
    shortDescription: "For quick cleaning.",
    priceNpr: 599,
    status: "published",
  }).slug, "shoe-wipes");
  assert.equal(parseProductInput({
    name: "Shoe Wipes",
    sku: "SW-001",
    slug: "   ",
    shortDescription: "For quick cleaning.",
    priceNpr: 599,
    status: "published",
  }).slug, "shoe-wipes");
  assert.equal(parseProductInput({
    name: "Shoe Wipes",
    sku: "SW-001",
    slug: "shoe-wipes-refill",
    shortDescription: "For quick cleaning.",
    priceNpr: 599,
    status: "published",
  }).slug, "shoe-wipes-refill");
  assert.throws(() => parseProductInput({
    name: "Shoe Wipes",
    sku: "SW",
    slug: "x",
    shortDescription: "x",
    priceNpr: 599,
    status: "published",
  }), /Before publishing, complete: a valid slug and short description\./i);
});

test("product content input is bounded, price-protected, and participates in audit snapshots", () => {
  const input = parseProductInput({
    name: "Shoe Wipes",
    sku: "SSW-080-001",
    slug: "shoe-wipes",
    shortDescription: "For fresh marks between professional cleans.",
    fullDescription: "Use only according to the supplied product guidance.",
    category: "quick_clean",
    priceNpr: 99,
    compareAtPriceNpr: 149,
    lowStockThreshold: 5,
    status: "draft",
    featured: false,
    badge: "doctors_pick",
    details: {
      valueProposition: "A quick clean for fresh marks.",
      keyBenefits: ["Quick clean", "Quick clean"],
      suitableMaterials: ["Canvas"],
      howToUse: ["Test a hidden area first."],
      brand: "Shoe Doctor",
      seoTitle: "Shoe Wipes in Nepal | Shoe Doctor",
    },
  });
  assert.equal(input.category, "quick_clean");
  assert.equal(input.compareAtPriceNpr, 149);
  assert.equal(input.badge, "doctors_pick");
  assert.deepEqual(input.details?.keyBenefits, ["Quick clean"]);
  assert.equal(input.details?.seoDescription, null);
  assert.throws(() => parseProductInput({
    ...input,
    compareAtPriceNpr: 99,
  }), /higher than the current NPR price/i);
  assert.throws(() => parseProductInput({
    ...input,
    category: "medical_claims",
  }), /valid product category/i);
  assert.throws(() => parseProductInput({
    ...input,
    details: { unsafeFreeForm: "Not allowed" },
  }), /unsupported field/i);

  const productDetails = input.details ?? {};
  const before = {
    fullDescription: input.fullDescription,
    category: input.category ?? null,
    compareAtPriceNpr: input.compareAtPriceNpr ?? null,
    badge: input.badge ?? null,
    details: productDetails,
    stockQuantity: 10,
  };
  const after = {
    ...before,
    fullDescription: "Updated factual product guidance.",
    details: { ...productDetails, seoDescription: "A concise factual description." },
  };
  const diff = auditValueDiff(before, after);
  assert.deepEqual(diff.changedFields, ["fullDescription", "details"]);
  assert.equal(diff.newValues.fullDescription, "Updated factual product guidance.");
});

test("optional Doctor's Advice stays bounded and remains compatible with older detail payloads", () => {
  const olderDetails = parseProductDetails({ brand: "Shoe Doctor" });
  assert.equal(olderDetails.doctorsAdvice, undefined);
  assert.equal(parseProductDetails({ doctorsAdvice: "Treat delicate materials gently." }).doctorsAdvice, "Treat delicate materials gently.");
  assert.equal(parseProductDetails({ doctorsAdvice: "   " }).doctorsAdvice, null);
  assert.throws(
    () => parseProductDetails({ doctorsAdvice: "a".repeat(1601) }),
    /Doctor's advice is too long/i,
  );
});

test("a seeded draft can receive its real catalogue data, stock, image, and publication state", async (t) => {
  const db = await createCatalogueDatabase();
  t.after(() => db.close());
  const id = "starter-shoe-bag";
  db.prepare(`
    UPDATE products
    SET sku = 'BAG-001', slug = 'shoe-bag', short_description = 'A protective shoe bag.',
        price_npr = 450, stock_quantity = 3, updated_at = ?
    WHERE id = ? AND status = 'draft' AND stock_quantity IS NULL
  `).run(now, id);
  insertImage(db, id, "starter-bag-image");
  assert.equal(db.prepare("UPDATE products SET status = 'published' WHERE id = ?").run(id).changes, 1);
  const published = db.prepare("SELECT status, stock_quantity FROM products WHERE id = ?").get(id);
  assert.equal(published.status, "published");
  assert.equal(published.stock_quantity, 3);
});

test("database rejects incomplete publication, negative stock, and invalid stock history", async (t) => {
  const db = await createCatalogueDatabase();
  t.after(() => db.close());
  assert.throws(() => db.prepare(`
    INSERT INTO products (
      id, sku, slug, name, short_description, price_npr, stock_quantity,
      low_stock_threshold, status, featured, created_at, updated_at
    ) VALUES ('missing-image', 'MI-1', 'missing-image', 'Missing image', 'Complete except image', 500, 1, 0, 'published', 0, ?, ?)
  `).run(now, now), /published products require/i);
  insertDraft(db);
  assert.throws(
    () => db.prepare("UPDATE products SET stock_quantity = -1 WHERE id = 'product-1'").run(),
    /CHECK constraint failed/i,
  );
  db.prepare(`
    INSERT INTO inventory_movements (
      id, product_id, stock_change, previous_stock, resulting_stock,
      movement_type, reason, idempotency_key, created_at
    ) VALUES ('movement-1', 'product-1', 2, 4, 6, 'restock', 'Supplier delivery', 'movement:one', ?)
  `).run(now);
  assert.throws(
    () => db.prepare("UPDATE inventory_movements SET reason = 'changed' WHERE id = 'movement-1'").run(),
    /inventory movements are immutable/i,
  );
  assert.throws(
    () => db.prepare("DELETE FROM inventory_movements WHERE id = 'movement-1'").run(),
    /inventory movements are immutable/i,
  );
  assert.throws(() => db.prepare(`
    INSERT INTO inventory_movements (
      id, product_id, stock_change, previous_stock, resulting_stock,
      movement_type, reason, idempotency_key, created_at
    ) VALUES ('movement-2', 'product-1', -1, 0, 0, 'missing', 'Bad record', 'movement:two', ?)
  `).run(now), /CHECK constraint failed/i);
});

test("published product snapshots remain historical and cannot be edited", async (t) => {
  const db = await createCatalogueDatabase();
  t.after(() => db.close());
  insertDraft(db);
  insertImage(db);
  db.prepare("UPDATE products SET status = 'published' WHERE id = 'product-1'").run();
  insertOrder(db);
  db.prepare(`
    INSERT INTO product_order_items (
      id, order_id, product_id, sku_snapshot, product_name_snapshot,
      unit_price_npr, quantity, line_total_npr, created_at
    ) VALUES ('item-1', 'order-1', 'product-1', 'TEST-1', 'Test product', 500, 1, 500, ?)
  `).run(now);
  db.prepare("UPDATE products SET name = 'New product name', price_npr = 900 WHERE id = 'product-1'").run();
  const snapshot = db.prepare("SELECT product_name_snapshot, unit_price_npr FROM product_order_items WHERE id = 'item-1'").get();
  assert.equal(snapshot.product_name_snapshot, "Test product");
  assert.equal(snapshot.unit_price_npr, 500);
  assert.throws(
    () => db.prepare("UPDATE product_order_items SET unit_price_npr = 900 WHERE id = 'item-1'").run(),
    /product order item snapshots are immutable/i,
  );
});

test("unique checkout tokens and a guarded final-stock update allow one sale only", async (t) => {
  const db = await createCatalogueDatabase();
  t.after(() => db.close());
  insertDraft(db, { stock: 1 });
  insertImage(db);
  db.prepare("UPDATE products SET status = 'published' WHERE id = 'product-1'").run();
  const guardedSale = db.prepare(`
    UPDATE products
    SET stock_quantity = stock_quantity - 1
    WHERE id = 'product-1' AND status = 'published' AND stock_quantity >= 1
  `);
  assert.equal(guardedSale.run().changes, 1);
  assert.equal(guardedSale.run().changes, 0);
  assert.equal(db.prepare("SELECT stock_quantity FROM products WHERE id = 'product-1'").get().stock_quantity, 0);
  insertOrder(db);
  assert.throws(
    () => insertOrder(db, { id: "order-2", reference: "PO-260829-DEF", token: "checkout_token_123456" }),
    /UNIQUE constraint failed: product_orders\.checkout_idempotency_token/i,
  );
});

test("a conditional cancellation marker restores stock exactly once", async (t) => {
  const db = await createCatalogueDatabase();
  t.after(() => db.close());
  insertDraft(db, { stock: 0 });
  insertOrder(db);
  const restore = db.prepare(`
    UPDATE product_orders
    SET status = 'cancelled', stock_restored_at = ?
    WHERE id = 'order-1' AND status <> 'cancelled' AND stock_restored_at IS NULL
  `);
  assert.equal(restore.run(now).changes, 1);
  assert.equal(restore.run(now).changes, 0);
  const order = db.prepare("SELECT status, stock_restored_at FROM product_orders WHERE id = 'order-1'").get();
  assert.equal(order.status, "cancelled");
  assert.equal(order.stock_restored_at, now);
});

test("checkout validation ignores browser prices, rejects invalid quantities, and rejects drafts or sold-out products", () => {
  assert.throws(() => parseOnlineProductOrder({
    idempotencyToken: "checkout_token_123456",
    customerName: "Test Customer",
    phone: "9812345678",
    fulfillmentMethod: "collection",
    paymentMethod: "cod",
    items: [{ productSlug: "test-product", quantity: 1 }],
    total: 1,
  }), /calculated securely/i);
  assert.throws(() => parseOnlineProductOrder({
    idempotencyToken: "checkout_token_123456",
    customerName: "Test Customer",
    phone: "9812345678",
    fulfillmentMethod: "collection",
    paymentMethod: "cod",
    items: [{ productSlug: "test-product", quantity: 0 }],
  }), /whole number/i);
  const request = [{ productSlug: "test-product", quantity: 1 }];
  const base = {
    id: "product-1", slug: "test-product", sku: "TEST-1", name: "Test product",
    priceNpr: 500, stockQuantity: 1, status: "published", updatedAt: now,
  };
  assert.equal(prepareCheckoutItems([{ ...base, status: "draft" }], request).kind, "stock_conflict");
  assert.equal(prepareCheckoutItems([{ ...base, stockQuantity: 0 }], request).kind, "stock_conflict");
  assert.equal(prepareCheckoutItems([base], request).kind, "ready");
  assert.throws(() => parseInventoryAdjustment({
    movementType: "restock", quantity: 2, reason: "", idempotencyKey: "inventory_token_123456",
  }), /Reason/i);
  assert.deepEqual(parseInitialProductStock({ initialStock: 0, idempotencyKey: "initial_stock_token_123456" }), {
    stockQuantity: 0,
    idempotencyKey: "initial_stock_token_123456",
  });
});

test("session retry tokens survive a refresh-safe retry without storing cart or customer values", async (t) => {
  const originalWindow = globalThis.window;
  const entries = new Map();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      sessionStorage: {
        getItem: (key) => entries.get(key) ?? null,
        setItem: (key, value) => entries.set(key, value),
        removeItem: (key) => entries.delete(key),
      },
    },
  });
  t.after(() => {
    if (originalWindow === undefined) delete globalThis.window;
    else Object.defineProperty(globalThis, "window", { configurable: true, value: originalWindow });
  });

  const scope = "test-checkout";
  const request = {
    customerName: "Test Customer",
    phone: "9812345678",
    items: [{ productSlug: "test-product", quantity: 1 }],
  };
  const first = await getSessionRetryToken(scope, request);
  const replay = await getSessionRetryToken(scope, request);
  assert.equal(replay, first);
  const stored = entries.get("shoe-doctor-product-retry-token-v1:test-checkout");
  assert.match(stored, /"fingerprint":"[a-f0-9]{64}"/);
  assert.doesNotMatch(stored, /Test Customer|9812345678|test-product/);

  const changed = await getSessionRetryToken(scope, { ...request, items: [{ productSlug: "test-product", quantity: 2 }] });
  assert.notEqual(changed, first);
  clearSessionRetryToken(scope, first);
  assert.ok(entries.has("shoe-doctor-product-retry-token-v1:test-checkout"));
  clearSessionRetryToken(scope, changed);
  assert.equal(entries.has("shoe-doctor-product-retry-token-v1:test-checkout"), false);
});

test("public references, status transitions, image validation, and admin permission contracts are bounded", async () => {
  assert.equal(buildPublicProductOrderReference("260829", "ABC"), "PO-260829-ABC");
  assert.equal(normalizeProductOrderReferenceSearch("po-260829-abc"), "PO-260829-ABC");
  const used = new Set(["PO-260829-ABC"]);
  const reference = await generatePublicProductOrderReference({
    date: new Date("2026-08-29T08:00:00.000Z"),
    generateSuffix: () => used.size ? "DEF" : "ABC",
    tryPersist: async (candidate) => {
      if (used.has(candidate)) return false;
      used.add(candidate);
      return true;
    },
  });
  assert.equal(reference, "PO-260829-DEF");
  assert.equal(canTransitionProductOrderStatus("pending", "confirmed"), true);
  assert.equal(canTransitionProductOrderStatus("completed", "processing"), false);
  assert.equal(canCancelProductOrderStatus("processing"), true);
  assert.equal(canCancelProductOrderStatus("completed"), false);
  assert.deepEqual(detectImageType(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), { contentType: "image/png", extension: "png" });
  await assert.rejects(() => validateProductImage({
    name: "spoofed.png", type: "image/jpeg", size: 8,
    arrayBuffer: async () => Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).buffer,
  }), /MIME type/i);
  await assert.rejects(() => validateProductImage({
    name: "large.png", type: "image/png", size: 500 * 1024 + 1,
    arrayBuffer: async () => new ArrayBuffer(0),
  }), /no larger than 500 KB/i);
  await assert.rejects(() => validateProductImage({
    name: "truncated.png", type: "image/png", size: 8,
    arrayBuffer: async () => Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).buffer,
  }), /incomplete/i);
});

test("homepage care essentials and permanent product deletion keep their public and admin boundaries", async () => {
  const [homePage, homeSection, homeStyles, productData, productHome, permanentDeleteRoute, restoreRoute, dashboard, adminProductsPage, lifecycleMigration] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/HomeCareEssentials.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/HomeCareEssentials.module.css", import.meta.url), "utf8"),
    readFile(new URL("../lib/product-data.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/product-home.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/products/[id]/permanent-delete/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/products/[id]/restore/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/components/ProductAdminDashboard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/products/page.tsx", import.meta.url), "utf8"),
    readFile(migration0016Url, "utf8"),
  ]);
  assert.match(homePage, /listHomepageProducts\(\)\.catch\(\(\) => \[\]\)/);
  assert.match(homePage, /<HomeCareEssentials products=\{homepageProducts\} \/>/);
  assert.equal((homePage.match(/<HomeCareEssentials products=\{homepageProducts\} \/>/g) ?? []).length, 1);
  assert.match(homeSection, /if \(!visibleProducts\.length\) return null/);
  assert.match(homeSection, /Genuine product/);
  assert.doesNotMatch(homeSection, /ProductStructuredData/);
  assert.match(homeStyles, /grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(homeStyles, /scroll-snap-type: x mandatory/);
  assert.match(productData, /HOMEPAGE_PRODUCT_CANDIDATE_LIMIT = 12/);
  assert.match(productData, /WHERE p\.status = 'published'/);
  assert.match(productData, /AND p\.stock_quantity > 0/);
  assert.match(homeSection, /typeof product\.stockQuantity === "number" &&[\s\S]*product\.stockQuantity > 0/);
  assert.match(productHome, /typeof product\.stockQuantity === "number" &&[\s\S]*product\.stockQuantity > 0/);
  assert.match(productData, /LIMIT \?/);
  assert.match(productData, /PRODUCT_RESTORED/);
  assert.match(productData, /PRODUCT_PERMANENTLY_DELETED/);
  assert.match(productData, /product_order_items/);
  assert.match(productData, /product_order_returns/);
  assert.match(productData, /inventory_movements/);
  assert.match(productData, /product_images_legacy_r2/);
  assert.match(productData, /db\.batch\(/);
  assert.match(productData, /getMissingProductPublicationRequirements/);
  assert.doesNotMatch(productData, /Upload an image and complete all required fields before publishing this product\./);
  assert.match(permanentDeleteRoute, /roles: \["super_admin"\]/);
  assert.match(permanentDeleteRoute, /productPermission: "manage_products"/);
  assert.match(permanentDeleteRoute, /body\.confirmation !== "DELETE"/);
  assert.match(permanentDeleteRoute, /deliverOwnerAlertEvent/);
  assert.match(restoreRoute, /restoreArchivedProduct/);
  assert.match(dashboard, /canPermanentlyDelete/);
  assert.match(dashboard, /Delete permanently/);
  assert.match(dashboard, /\/permanent-delete/);
  assert.match(dashboard, /\/restore/);
  assert.match(dashboard, /\/publish/);
  assert.match(dashboard, /rowPublish/);
  assert.match(dashboard, /deletionConfirmation !== "DELETE"/);
  assert.match(dashboard, /publicationStockQuantity/);
  assert.match(dashboard, /required=\{isPublishing\}/);
  assert.match(dashboard, /Set this before publishing/);
  assert.match(dashboard, /never required to publish/);
  assert.match(adminProductsPage, /user\.role === "super_admin" && canManage/);
  assert.match(lifecycleMigration, /DROP TRIGGER IF EXISTS inventory_movements_prevent_delete/);
  assert.match(lifecycleMigration, /OLD\.movement_type = 'initial_stock'/);
  assert.match(lifecycleMigration, /sibling\.product_id = OLD\.product_id/);
  assert.match(lifecycleMigration, /product_order_items\.product_id = OLD\.product_id/);
  assert.match(lifecycleMigration, /product_order_returns\.product_id = OLD\.product_id/);
});

test("public and admin routes enforce the catalogue, image-access, SEO, header, permission, and atomic-write contracts", async () => {
  const [catalogue, publicApi, productApi, publicImageRoute, adminImageRoute, publishRoute, checkoutApi, adminProductsApi, inventoryApi, globalInventoryApi, inventoryPage, inventory, permissions, header, headerStyles, globalStyles, migration, productData, productImages, sitemap, productStructuredData, blog, recommendation] = await Promise.all([
    readFile(new URL("../app/products/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/products/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/products/[slug]/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/products/images/[imageId]/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/products/[id]/images/[imageId]/content/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/products/[id]/publish/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/product-orders/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/products/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/products/[id]/inventory/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/inventory/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/inventory/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/product-inventory.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/product-permissions.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/components/SiteChrome.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/SiteChrome.module.css", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(migrationUrl, "utf8"),
    readFile(new URL("../lib/product-data.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/product-images.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/sitemap.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/components/ProductStructuredData.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/blog/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/ProductRecommendation.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(catalogue, /listPublicProducts/);
  assert.match(catalogue, /ProductCatalogue/);
  assert.match(publicApi, /listPublicProducts/);
  assert.match(productData, /p\.status = 'published'/);
  assert.match(productData, /before\.status === "published" && input\.slug !== before\.slug/);
  assert.match(productData, /fullDescription: value\.fullDescription/);
  assert.match(productData, /category: value\.category/);
  assert.match(productData, /compareAtPriceNpr: value\.compareAtPriceNpr/);
  assert.match(productData, /badge: value\.badge/);
  assert.match(productData, /details: value\.details/);
  assert.match(productData, /audience === "admin"/);
  assert.match(productData, /\/api\/admin\/products\/\$\{encodeURIComponent\(productId\)\}\/images/);
  assert.match(productApi, /images: product\.images\.map/);
  assert.match(productApi, /getPublicProductBySlug\(slug\)\.catch\(\(\) => null\)/);
  assert.match(sitemap, /listPublicProducts/);
  assert.match(sitemap, /filter\(\(product\) => Boolean\(product\.slug\)\)/);
  assert.match(productStructuredData, /"@type": "Product"/);
  assert.match(productStructuredData, /"@type": "BreadcrumbList"/);
  assert.doesNotMatch(productStructuredData, /aggregateRating|review/iu);
  assert.match(blog, /product\.badge === "doctors_pick"/);
  assert.match(blog, /product\.stockQuantity !== 0/);
  assert.match(recommendation, /product\.badge !== "doctors_pick"/);
  assert.match(recommendation, /product\.stockQuantity === 0/);
  assert.match(publicImageRoute, /getPublicProductImageResponse/);
  assert.match(adminImageRoute, /requireAdminApi/);
  assert.match(adminImageRoute, /productPermission: "view_products"/);
  assert.match(adminImageRoute, /getAdminProductImageResponse/);
  assert.match(publishRoute, /requireAdminApi/);
  assert.match(publishRoute, /productPermission: "manage_products"/);
  assert.match(publishRoute, /publishProduct/);
  assert.match(productImages, /getPublishedProductImage/);
  assert.match(productImages, /private, no-store/);
  assert.match(productData, /export async function publishProduct/);
  assert.match(productData, /SET status = 'published', updated_at = \?/);
  assert.match(productData, /status = 'draft' AND updated_at = \?/);
  assert.match(checkoutApi, /toPublicOrderConfirmation/);
  assert.doesNotMatch(checkoutApi, /\{ order: result\.order,/);
  assert.match(adminProductsApi, /hasProductAdminPermission\(auth\.user, "adjust_inventory"\)/);
  assert.match(adminProductsApi, /input\.compareAtPriceNpr !== undefined/);
  assert.match(inventoryApi, /parseInitialProductStock/);
  assert.match(globalInventoryApi, /listInventoryMovements\(undefined, \{ page \}\)/);
  assert.match(inventoryPage, /initialCompletedOrders/);
  assert.match(inventory, /db\.batch\(/);
  assert.match(inventory, /stock_quantity >= CASE id/);
  assert.match(inventory, /checkout_idempotency_token/);
  assert.match(inventory, /stock_restored_at IS NULL/);
  assert.match(inventory, /updated_at = \?/);
  assert.match(inventory, /canCancelProductOrderStatus/);
  assert.doesNotMatch(inventory, /LIMIT 500/);
  assert.match(permissions, /user\.role === "super_admin"/);
  assert.match(permissions, /admin_product_permissions/);
  assert.match(permissions, /cancel_product_orders/);
  assert.match(header, /navigationItems\.products/);
  assert.match(header, /const mobileNavigationRows/);
  assert.match(header, /navigationItems\.home,[\s\S]*navigationItems\.about,[\s\S]*navigationItems\.donate,[\s\S]*navigationItems\.services/);
  assert.match(header, /navigationItems\.steam,[\s\S]*navigationItems\.products,[\s\S]*navigationItems\.blog,[\s\S]*navigationItems\.contact/);
  assert.match(header, /Book Steam Clean/);
  assert.match(headerStyles, /steamNewBadge/);
  assert.doesNotMatch(globalStyles, /\.sd-steam-nav-trigger span/);
  assert.doesNotMatch(globalStyles, /\.sd-mobile-nav > :nth-child/);
  for (const required of [
    "product_order_items_prevent_update",
    "product_order_items_prevent_delete",
    "inventory_movements_prevent_update",
    "inventory_movements_prevent_delete",
    "product_order_returns_prevent_update",
    "product_order_returns_prevent_delete",
    "product_order_notifications",
    "admin_product_permissions",
  ]) assert.match(migration, new RegExp(required));
});

test("public storefront uses the shared Shoe Doctor treatment and keeps purchase paths intact", async () => {
  const [productsPage, catalogue, shopStyles, trustStrip, professionalCta, detailPurchase, cartPage, checkoutPage] = await Promise.all([
    readFile(new URL("../app/products/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/ProductCatalogue.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/ProductShop.module.css", import.meta.url), "utf8"),
    readFile(new URL("../app/components/ProductTrustStrip.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/ProfessionalCleaningCTA.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/ProductDetailPurchase.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/cart/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/checkout/page.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(productsPage, /Shoe Doctor Care Essentials/);
  assert.match(productsPage, /Everyday care, chosen by Shoe Doctor/);
  assert.doesNotMatch(productsPage, /SHOP ESSENTIALS/);
  assert.match(catalogue, /const SHOP_FILTERS/);
  for (const label of ["All", "Clean", "Protect", "Restore"]) {
    assert.match(catalogue, new RegExp(`label: "${label}"`));
  }
  assert.match(catalogue, /compactDescription/);
  assert.match(catalogue, /AddToCartButton/);
  assert.match(catalogue, /cardAddToCartButton/);
  assert.match(catalogue, /View Product/);
  assert.doesNotMatch(catalogue, /buyNowHref/);
  assert.match(detailPurchase, /mode=buy-now/);
  assert.match(trustStrip, /QR Payment/);
  assert.match(trustStrip, /Cash on Delivery/);
  assert.match(trustStrip, /Delivery where available/);
  assert.match(professionalCta, /Home care isn&apos;t enough/);
  assert.match(professionalCta, /Book professional care/);
  assert.match(cartPage, /YOUR CARE CART/);
  assert.match(checkoutPage, /YOUR ORDER/);
  assert.match(shopStyles, /var\(--berry\)/);
  assert.match(shopStyles, /var\(--blush\)/);
  assert.match(shopStyles, /@media \(max-width: 680px\)[\s\S]*?\.categoryFilters/);
  assert.match(shopStyles, /\.grid[\s\S]*?grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(shopStyles, /@media \(max-width: 980px\)[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
});
