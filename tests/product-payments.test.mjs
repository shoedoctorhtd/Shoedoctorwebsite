import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

import { validatePaymentReceipt } from "../lib/payment-receipt-validation.ts";
import { parseOnlineProductOrder } from "../lib/product-validation.ts";

const catalogueMigration = new URL("../migrations/0012_product_catalogue_inventory.sql", import.meta.url);
const paymentMigration = new URL("../migrations/0013_product_order_payments.sql", import.meta.url);

test("0013 adds constrained QR/COD metadata without persistent receipt bytes", async (t) => {
  const db = new DatabaseSync(":memory:");
  t.after(() => db.close());
  db.exec("PRAGMA foreign_keys = ON; CREATE TABLE admin_users (id TEXT PRIMARY KEY);");
  db.exec(await readFile(catalogueMigration, "utf8"));
  db.exec(await readFile(paymentMigration, "utf8"));
  const orderColumns = db.prepare("PRAGMA table_info(product_orders)").all().map((row) => row.name);
  assert.deepEqual(orderColumns.filter((name) => name.startsWith("payment_") || name.startsWith("cod_")), [
    "payment_method", "payment_status", "payment_amount", "payment_access_token_hash",
    "payment_submitted_at", "payment_verified_at", "payment_verified_by_admin_id",
    "payment_rejection_reason", "cod_collected_at", "cod_collected_by_admin_id",
  ]);
  const receiptSql = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'product_payment_receipts'").get().sql;
  assert.match(receiptSql, /sha256_checksum TEXT NOT NULL/i);
  assert.match(receiptSql, /UNIQUE\(order_id, sha256_checksum\)/i);
  assert.doesNotMatch(receiptSql, /\b(blob|object_key|public_url|r2|kv)\b/i);
  assert.deepEqual(db.prepare("PRAGMA foreign_key_check").all(), []);
});

test("checkout accepts only QR/COD and requires an opaque QR access token", () => {
  const base = {
    idempotencyToken: "checkout_token_123456",
    customerName: "Test Customer",
    phone: "9812345678",
    fulfillmentMethod: "collection",
    items: [{ productSlug: "test-product", quantity: 1 }],
  };
  assert.throws(() => parseOnlineProductOrder({ ...base, paymentMethod: "bank" }), /QR online payment or cash on delivery/i);
  assert.throws(() => parseOnlineProductOrder({ ...base, paymentMethod: "qr" }), /secure payment link/i);
  const qr = parseOnlineProductOrder({ ...base, paymentMethod: "qr", paymentAccessToken: "a".repeat(43) });
  assert.equal(qr.paymentMethod, "qr");
  assert.equal(qr.paymentAccessToken, "a".repeat(43));
  const cod = parseOnlineProductOrder({ ...base, paymentMethod: "cod" });
  assert.equal(cod.paymentAccessToken, null);
  assert.throws(() => parseOnlineProductOrder({ ...base, paymentMethod: "cod", paymentAccessToken: "a".repeat(43) }), /does not use/i);
});

test("receipt validation checks file signatures, MIME, and the 3 MB limit", async () => {
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
  const receipt = await validatePaymentReceipt({ name: "paid.png", type: "image/png", size: png.length, arrayBuffer: async () => png.buffer });
  assert.equal(receipt.contentType, "image/png");
  assert.equal(receipt.originalDisplayFilename, "paid.png");
  await assert.rejects(
    validatePaymentReceipt({ name: "spoofed.pdf", type: "application/pdf", size: png.length, arrayBuffer: async () => png.buffer }),
    /does not match/i,
  );
  await assert.rejects(
    validatePaymentReceipt({ name: "large.png", type: "image/png", size: 3 * 1024 * 1024 + 1, arrayBuffer: async () => png.buffer }),
    /3 MB/i,
  );
});

test("public and admin payment routes retain bearer-token and permission boundaries", async () => {
  const publicRoute = await readFile(new URL("../app/api/orders/[reference]/payment/route.ts", import.meta.url), "utf8");
  const approvalRoute = await readFile(new URL("../app/api/admin/product-orders/[id]/payment/approve/route.ts", import.meta.url), "utf8");
  const paymentService = await readFile(new URL("../lib/product-payments.ts", import.meta.url), "utf8");
  const permissions = await readFile(new URL("../lib/product-permissions.ts", import.meta.url), "utf8");
  assert.match(publicRoute, /x-payment-access-token/);
  assert.match(publicRoute, /hiddenNotFound/);
  assert.match(approvalRoute, /productPermission: "verify_product_payments"/);
  assert.match(permissions, /"verify_product_payments"/);
  assert.match(paymentService, /attachments: \[\{/);
  assert.doesNotMatch(paymentService, /PRODUCT_IMAGES|R2|KVNamespace/);
});

test("admin order filters retain every QR and COD lifecycle status", async () => {
  const [apiRoute, page] = await Promise.all([
    readFile(new URL("../app/api/admin/product-orders/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/product-orders/page.tsx", import.meta.url), "utf8"),
  ]);
  for (const source of [apiRoute, page]) {
    for (const status of ["awaiting_payment", "payment_review"]) {
      assert.match(source, new RegExp(`status === "${status}"`));
    }
    for (const status of ["submitted", "rejected", "cod_pending"]) {
      assert.match(source, new RegExp(`paymentStatus === "${status}"`));
    }
  }
});
