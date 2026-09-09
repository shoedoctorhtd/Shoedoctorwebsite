import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import ts from "typescript";

const root = resolve(import.meta.dirname, "..");
const actor = { id: "counter-admin", name: "Counter Staff", email: "staff@example.test", role: "admin", sessionId: "verified-session", active: true, legacy: false, mustChangePassword: false };

// Load actual production modules with only framework, database transport and
// email delivery replaced. Every prepared statement runs on real SQLite.
function harness(t) {
  const sqlite = new DatabaseSync(":memory:");
  t.after(() => sqlite.close());
  sqlite.exec("PRAGMA foreign_keys = ON");
  for (const file of readdirSync(resolve(root, "migrations")).filter((file) => file.endsWith(".sql")).sort()) {
    sqlite.exec(readFileSync(resolve(root, "migrations", file), "utf8"));
  }
  sqlite.prepare(`INSERT INTO admin_users (id, name, email, email_normalized, password_hash, role, active, must_change_password, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'test-hash', 'admin', 1, 0, '2026-09-09', '2026-09-09')`).run(actor.id, actor.name, actor.email, actor.email);
  sqlite.prepare(`INSERT INTO admin_users (id, name, email, email_normalized, password_hash, role, active, must_change_password, created_at, updated_at)
    VALUES ('other-admin', 'Other Staff', 'other@example.test', 'other@example.test', 'test-hash', 'admin', 1, 0, '2026-09-09', '2026-09-09')`).run();
  sqlite.prepare(`INSERT INTO admin_sessions (id, admin_user_id, token_hash, created_at, expires_at)
    VALUES (?, ?, 'test-session-hash', '2026-09-09', '2099-09-09')`).run(actor.sessionId, actor.id);
  let beforeBatch;
  const db = {
    prepare(sql) {
      const statement = { sql, values: [], bind(...values) { assert.ok(values.length <= 100, "D1 permits at most 100 bound parameters"); this.values = values; return this; },
        async first() { return sqlite.prepare(sql).get(...this.values) ?? null; },
        async all() { return { results: sqlite.prepare(sql).all(...this.values) }; },
        async run() { return { meta: { changes: Number(sqlite.prepare(sql).run(...this.values).changes) } }; },
      };
      return statement;
    },
    async batch(statements) {
      if (beforeBatch) { const callback = beforeBatch; beforeBatch = undefined; callback(); }
      sqlite.exec("BEGIN");
      try {
        const result = statements.map((statement) => ({ meta: { changes: Number(sqlite.prepare(statement.sql).run(...statement.values).changes) } }));
        sqlite.exec("COMMIT");
        return result;
      } catch (error) { sqlite.exec("ROLLBACK"); throw error; }
    },
  };
  const emails = [];
  let delivery = "sent";
  const cache = new Map();
  const mocks = new Map([
    [resolve(root, "lib/data.ts"), { getDatabase: async () => db }],
    [resolve(root, "lib/booking-email.ts"), { sendOwnerEmail: async (content) => { emails.push(content); return { status: delivery }; } }],
    [resolve(root, "lib/email/gmail.ts"), { sendGmailEmail: async () => ({ status: "sent" }) }],
  ]);
  function load(file) {
    let absolute = file.startsWith("@/") ? resolve(root, file.slice(2)) : resolve(root, file);
    if (!existsSync(absolute) && !absolute.endsWith(".ts")) absolute += ".ts";
    if (mocks.has(absolute)) return mocks.get(absolute);
    if (cache.has(absolute)) return cache.get(absolute).exports;
    const loadedModule = { exports: {} };
    cache.set(absolute, loadedModule);
    const source = ts.transpileModule(readFileSync(absolute, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    const require = (specifier) => load(specifier.startsWith("@/") ? specifier : resolve(dirname(absolute), specifier));
    new Function("require", "module", "exports", source)(require, loadedModule, loadedModule.exports);
    return loadedModule.exports;
  }
  function product(slug, stock = 10, price = 99) {
    sqlite.prepare(`INSERT INTO products (id, sku, slug, name, short_description, full_description,
      price_npr, stock_quantity, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'Product description', 'Full product description', ?, ?, 'draft', '2026-09-09', '2026-09-09')`)
      .run(slug, slug.toUpperCase(), slug, slug, price, stock);
    sqlite.prepare(`INSERT INTO product_images (id, product_id, image_data, mime_type, byte_size, sha256, is_primary, created_at)
      VALUES (?, ?, X'0102', 'image/png', 2, ?, 1, '2026-09-09')`).run(`img-${slug}`, slug, "a".repeat(64));
    sqlite.prepare("UPDATE products SET status = 'published' WHERE id = ?").run(slug);
  }
  const inventory = load("lib/product-inventory.ts");
  const alerts = load("lib/owner-alerts.ts");
  function request(items, token = crypto.randomUUID()) {
    return load("lib/product-validation.ts").parseOfflineSale({ items: items.map(([productSlug, quantity]) => ({ productSlug, quantity })), idempotencyToken: token, paymentStatus: "paid" });
  }
  return { sqlite, db, load, inventory, alerts, emails, product, request, mocks,
    setDelivery: (value) => { delivery = value; },
    interleave: (callback) => { beforeBatch = callback; },
    stock: (slug) => sqlite.prepare("SELECT stock_quantity FROM products WHERE id = ?").get(slug).stock_quantity,
  };
}

test("single and multi-product counter sales share online stock, preserve actor/prices, and reverse once", async (t) => {
  const h = harness(t); h.product("shoe-wipes", 5); h.product("suede-eraser", 2, 299);
  const single = await h.inventory.recordOfflineProductSale(h.request([["shoe-wipes", 2]]), actor);
  assert.equal(single.kind, "created"); assert.match(single.order.publicReference, /^CS-\d{8}-/);
  assert.equal(single.order.total, 198); assert.equal(single.order.createdByAdminId, actor.id); assert.equal(h.stock("shoe-wipes"), 3);
  const multi = await h.inventory.recordOfflineProductSale(h.request([["shoe-wipes", 2], ["suede-eraser", 2]]), actor);
  assert.equal(multi.order.total, 796); assert.equal(h.stock("suede-eraser"), 0);
  const online = await h.inventory.createOnlineProductOrder({ ...h.request([["shoe-wipes", 1]]), customerName: "Customer", phone: "9812345678", email: null, fulfillmentMethod: "collection", deliveryAddress: null, customerNote: null, paymentMethod: "cod" });
  assert.equal(online.kind, "created"); assert.equal(h.stock("shoe-wipes"), 0);
  const reversal = await h.inventory.cancelProductOrder(multi.order.id, "Customer changed mind", actor, crypto.randomUUID());
  assert.equal(reversal.kind, "cancelled"); assert.equal(h.stock("shoe-wipes"), 2); assert.equal(h.stock("suede-eraser"), 2);
  assert.equal((await h.inventory.cancelProductOrder(multi.order.id, "Retry", actor, crypto.randomUUID())).kind, "already_cancelled");
  assert.equal(h.stock("shoe-wipes"), 2);
  const audit = h.sqlite.prepare("SELECT * FROM audit_logs WHERE action = 'COUNTER_SALE_REVERSED'").get();
  assert.equal(audit.admin_user_id, actor.id); assert.equal(audit.administrator_email_snapshot, actor.email);
  assert.throws(() => h.sqlite.prepare("DELETE FROM inventory_movements WHERE related_order_id = ?").run(multi.order.id), /immutable/);
  assert.deepEqual(h.sqlite.prepare("PRAGMA foreign_key_check").all(), []);
});

test("invalid, archived, insufficient, and changed-price sales leave all stock untouched", async (t) => {
  const h = harness(t); h.product("shoe-wipes", 2); h.product("suede-eraser", 1, 299);
  for (const qty of [0, -1, 1.5, 101]) assert.throws(() => h.request([["shoe-wipes", qty]]));
  assert.throws(() => h.request([]));
  const bad = await h.inventory.recordOfflineProductSale(h.request([["shoe-wipes", 1], ["suede-eraser", 2]]), actor);
  assert.equal(bad.kind, "stock_conflict"); assert.equal(h.stock("shoe-wipes"), 2);
  const changed = await h.inventory.recordOfflineProductSale(h.request([["shoe-wipes", 1]]), actor, { "shoe-wipes": 98 });
  assert.equal(changed.kind, "stock_conflict"); assert.equal(h.stock("shoe-wipes"), 2);
  h.sqlite.exec("UPDATE products SET status = 'archived' WHERE id = 'shoe-wipes'");
  assert.equal((await h.inventory.recordOfflineProductSale(h.request([["shoe-wipes", 1]]), actor)).kind, "stock_conflict");
  assert.equal(h.sqlite.prepare("SELECT COUNT(*) AS count FROM product_orders").get().count, 0);
});

test("simultaneous requests and retries cannot double-sell or create duplicate mail", async (t) => {
  const h = harness(t); h.product("shoe-wipes", 2);
  const request = h.request([["shoe-wipes", 2]]);
  const results = await Promise.all([h.inventory.recordOfflineProductSale(request, actor), h.inventory.recordOfflineProductSale(request, actor)]);
  assert.deepEqual(results.map((result) => result.kind).sort(), ["created", "duplicate"]);
  assert.equal(h.stock("shoe-wipes"), 0);
  await assert.rejects(h.inventory.recordOfflineProductSale({ ...request, items: [{ productSlug: "shoe-wipes", quantity: 1 }] }, actor), /different sale/);
  await assert.rejects(h.inventory.recordOfflineProductSale(request, { ...actor, id: "other-admin" }), /different sale/);
  assert.equal(h.sqlite.prepare("SELECT COUNT(*) AS count FROM owner_alert_events").get().count, 1);
  assert.equal(h.sqlite.prepare("SELECT COUNT(*) AS count FROM product_order_notifications").get().count, 0);
  await Promise.all([h.alerts.deliverPendingOwnerAlerts(), h.alerts.deliverPendingOwnerAlerts()]);
  assert.equal(h.emails.length, 1); assert.match(h.emails[0].text, /2 → 0/);
  assert.match(h.emails[0].text, /staff@example.test/); assert.match(h.emails[0].text, /Rs 99 × 2 = Rs 198/);
  assert.match(h.emails[0].subject, /Counter Sale CS-/);
});

test("racing stock edits and later SQL failures roll back the entire multi-product transaction", async (t) => {
  const h = harness(t); h.product("shoe-wipes", 5); h.product("suede-eraser", 5, 299);
  h.interleave(() => h.sqlite.exec("UPDATE products SET stock_quantity = 0, updated_at = 'other-write' WHERE id = 'suede-eraser'"));
  assert.equal((await h.inventory.recordOfflineProductSale(h.request([["shoe-wipes", 2], ["suede-eraser", 2]]), actor)).kind, "stock_conflict");
  assert.equal(h.stock("shoe-wipes"), 5);
  h.sqlite.exec("UPDATE products SET stock_quantity = 5 WHERE id = 'suede-eraser'; CREATE TRIGGER fail_item BEFORE INSERT ON product_order_items WHEN NEW.product_id = 'suede-eraser' BEGIN SELECT RAISE(ABORT, 'test_failure'); END;");
  await assert.rejects(h.inventory.recordOfflineProductSale(h.request([["shoe-wipes", 2], ["suede-eraser", 2]]), actor), /test_failure/);
  assert.equal(h.stock("shoe-wipes"), 5); assert.equal(h.stock("suede-eraser"), 5);
  assert.equal(h.sqlite.prepare("SELECT COUNT(*) AS count FROM product_orders").get().count, 0);
  assert.equal(h.sqlite.prepare("SELECT COUNT(*) AS count FROM audit_logs").get().count, 0);
});

test("prior returns and a racing return prevent full reversal", async (t) => {
  const h = harness(t); h.product("shoe-wipes", 5); h.product("suede-eraser", 5, 299);
  const sale = await h.inventory.recordOfflineProductSale(h.request([["shoe-wipes", 2], ["suede-eraser", 1]]), actor);
  const returnItem = () => h.sqlite.prepare(`INSERT INTO product_order_returns (id, order_id, product_id, quantity, restock, reason, admin_user_id, idempotency_key, created_at)
    VALUES ('return-test', ?, 'shoe-wipes', 1, 0, 'Used item', ?, 'return-request-key', '2026-09-09')`).run(sale.order.id, actor.id);
  h.interleave(returnItem);
  assert.equal((await h.inventory.cancelProductOrder(sale.order.id, "Reverse", actor, crypto.randomUUID())).kind, "conflict");
  assert.equal(h.stock("shoe-wipes"), 3); assert.equal(h.stock("suede-eraser"), 4);
  assert.equal((await h.inventory.cancelProductOrder(sale.order.id, "Reverse again", actor, crypto.randomUUID())).kind, "conflict");
});

test("20-product counter sale and reversal fit D1 parameter limits", async (t) => {
  const h = harness(t);
  const items = Array.from({ length: 20 }, (_, i) => [`counter-product-${i}`, 1]);
  for (const [slug] of items) h.product(slug, 1);
  const result = await h.inventory.recordOfflineProductSale(h.request(items), actor);
  assert.equal(result.kind, "created"); assert.equal(result.order.items.length, 20);
  for (const [slug] of items) assert.equal(h.stock(slug), 0);
  assert.equal((await h.inventory.cancelProductOrder(result.order.id, "Reverse batch", actor, crypto.randomUUID())).kind, "cancelled");
  for (const [slug] of items) assert.equal(h.stock(slug), 1);
});

test("reversal handles concurrent requests and rolls back a failed movement insert", async (t) => {
  const h = harness(t); h.product("shoe-wipes", 5); h.product("suede-eraser", 5);
  const sale = await h.inventory.recordOfflineProductSale(h.request([["shoe-wipes", 2], ["suede-eraser", 1]]), actor);
  h.sqlite.exec("CREATE TRIGGER fail_reversal BEFORE INSERT ON inventory_movements WHEN NEW.movement_type = 'order_cancellation_restore' AND NEW.product_id = 'suede-eraser' BEGIN SELECT RAISE(ABORT, 'test_reverse_failure'); END;");
  await assert.rejects(h.inventory.cancelProductOrder(sale.order.id, "Return", actor, crypto.randomUUID()), /test_reverse_failure/);
  assert.equal(h.stock("shoe-wipes"), 3); assert.equal(h.stock("suede-eraser"), 4);
  assert.equal(h.sqlite.prepare("SELECT status FROM product_orders WHERE id = ?").get(sale.order.id).status, "completed");
  h.sqlite.exec("DROP TRIGGER fail_reversal");
  const results = await Promise.all([h.inventory.cancelProductOrder(sale.order.id, "Return", actor, crypto.randomUUID()), h.inventory.cancelProductOrder(sale.order.id, "Return", actor, crypto.randomUUID())]);
  assert.deepEqual(results.map((result) => result.kind).sort(), ["already_cancelled", "cancelled"]);
  assert.equal(h.stock("shoe-wipes"), 5); assert.equal(h.stock("suede-eraser"), 5);
  assert.equal(h.sqlite.prepare("SELECT COUNT(*) AS count FROM audit_logs WHERE action = 'COUNTER_SALE_REVERSED'").get().count, 1);
});

test("failed email leaves sale committed; safe retry uses original movement and actor snapshots", async (t) => {
  const h = harness(t); h.product("shoe-wipes", 5);
  const sale = await h.inventory.recordOfflineProductSale(h.request([["shoe-wipes", 2]]), actor);
  const event = h.sqlite.prepare("SELECT id FROM owner_alert_events").get();
  h.setDelivery("failed"); await h.alerts.deliverOwnerAlertEvent(event.id);
  assert.equal(h.stock("shoe-wipes"), 3); assert.equal(h.sqlite.prepare("SELECT delivery_status FROM owner_alert_events").get().delivery_status, "failed");
  h.setDelivery("sent"); await h.alerts.retryOwnerAlertEvent(event.id, actor);
  assert.equal(h.emails.length, 2); assert.equal(h.emails[0].text, h.emails[1].text);
  assert.equal((await h.alerts.retryOwnerAlertEvent(event.id, actor)).kind, "not_retryable");
  await h.inventory.cancelProductOrder(sale.order.id, "Customer returned sale", actor, crypto.randomUUID());
  await h.alerts.deliverPendingOwnerAlerts();
  assert.equal(h.emails.length, 3); assert.match(h.emails[2].subject, /Counter Sale Reversed/); assert.match(h.emails[2].text, /3 → 5/);
});

test("product price, inventory and permission changes queue one useful management alert each", async (t) => {
  const h = harness(t); h.product("shoe-wipes", 5);
  const products = h.load("lib/product-data.ts");
  const before = await products.getAdminProduct("shoe-wipes");
  await products.updateProduct("shoe-wipes", { ...before, priceNpr: 149 }, actor);
  await h.inventory.adjustProductInventory("shoe-wipes", { movementType: "restock", quantity: 2, count: null, reason: "New shipment", idempotencyKey: crypto.randomUUID() }, actor);
  // Permission edits require a separately verified Super Admin, never the target actor.
  h.sqlite.exec("UPDATE admin_users SET role = 'super_admin' WHERE id = 'other-admin'");
  h.sqlite.prepare("INSERT INTO admin_sessions (id, admin_user_id, token_hash, created_at, expires_at) VALUES ('owner-session', 'other-admin', 'owner-hash', '2026-09-09', '2099-01-01')").run();
  const manager = { ...actor, id: "other-admin", role: "super_admin", sessionId: "owner-session" };
  await h.load("lib/product-permissions.ts").replaceProductAdminPermissions(actor.id, ["view_inventory"], manager, "2026-09-09");
  await h.alerts.deliverPendingOwnerAlerts();
  assert.equal(h.emails.length, 3);
  const price = h.emails.find((email) => email.subject.includes("PRICE CHANGED"));
  assert.match(price.text, /priceNpr: 99/); assert.match(price.text, /priceNpr: 149/); assert.match(price.text, /SHOE-WIPES/);
  assert.match(h.emails.find((email) => email.subject.includes("RESTOCKED")).text, /stockQuantity: 7/);
});

test("every manual inventory movement type queues a management activity event", async (t) => {
  const h = harness(t); h.product("shoe-wipes", 8);
  for (const [movementType, quantity, count] of [
    ["restock", 1, null], ["damaged", 1, null], ["missing", 1, null], ["count_correction", null, 5],
  ]) {
    await h.inventory.adjustProductInventory("shoe-wipes", {
      movementType, quantity, count, reason: `Test ${movementType}`, idempotencyKey: crypto.randomUUID(),
    }, actor);
  }
  assert.equal(h.sqlite.prepare("SELECT COUNT(*) AS count FROM owner_alert_events").get().count, 4);
});

test("central activity outbox adopts explicit legacy alerts; reads and retries generate no mail", async (t) => {
  const h = harness(t); const audit = h.load("lib/audit.ts");
  await h.db.batch([
    audit.buildAuditLogInsert(h.db, { id: "service-audit", actor, action: "SERVICE_UPDATED", entityType: "service", newValues: { price: 449 }, previousValues: { price: 399 } }),
    audit.buildOwnerAlertEventInsert(h.db, { id: "existing-alert-id", auditLogId: "service-audit", alertType: "SERVICE_UPDATED" }),
  ]);
  for (const action of ["PRODUCT_LIST", "BOOKING_VIEW", "OWNER_ALERT_RETRIED", "ADMIN_LOGIN", "PRODUCT_SEARCH"]) {
    await h.db.batch([audit.buildAuditLogInsert(h.db, { actor, action, entityType: "test" })]);
  }
  assert.equal(h.sqlite.prepare("SELECT COUNT(*) AS count FROM owner_alert_events").get().count, 1);
  assert.equal(h.sqlite.prepare("SELECT id FROM owner_alert_events").get().id, "existing-alert-id");
  await h.alerts.deliverPendingOwnerAlerts(); assert.equal(h.emails.length, 1);
});

test("counter inventory admits normal admins while reversals remain permission-gated", async (t) => {
  const h = harness(t); h.product("shoe-wipes", 5);
  const requiredPermissions = [];
  h.mocks.set(resolve(root, "lib/admin-auth.ts"), { requireAdminApi: async (_request, options) => {
    requiredPermissions.push(options.productPermission);
    return options.productPermission === "cancel_product_orders"
      ? { response: Response.json({ message: "Forbidden" }, { status: 403 }) }
      : { user: actor };
  } });
  const api = h.load("app/api/admin/counter-inventory/route.ts");
  const body = { ...h.request([["shoe-wipes", 1]]), expectedPrices: { "shoe-wipes": 99 }, adminId: "forged", adminName: "Forged" };
  const make = () => new Request("https://example.test/api/admin/counter-inventory", { method: "POST", body: JSON.stringify(body) });
  const catalogue = await api.GET(new Request("https://example.test/api/admin/counter-inventory"));
  assert.equal(catalogue.status, 200);
  assert.equal((await catalogue.json()).products[0].images[0].url, "/api/products/images/img-shoe-wipes");
  const response = await api.POST(make()); assert.equal(response.status, 201);
  const order = (await response.json()).order; assert.equal(order.createdByAdminId, actor.id);
  const history = h.load("app/api/admin/counter-inventory/history/route.ts");
  assert.equal((await history.GET(new Request("https://example.test/api/admin/counter-inventory/history"))).status, 200);
  const reverse = h.load("app/api/admin/counter-inventory/[id]/reverse/route.ts");
  assert.equal((await reverse.POST(make(), { params: Promise.resolve({ id: order.id }) })).status, 403);
  assert.deepEqual(requiredPermissions, [undefined, undefined, undefined, "cancel_product_orders"]);
  const permissions = h.load("lib/product-permissions.ts");
  assert.equal(await permissions.hasProductAdminPermission(actor, "cancel_product_orders"), false);
  assert.equal(await permissions.hasProductAdminPermission({ ...actor, role: "super_admin" }, "cancel_product_orders"), true);
});
