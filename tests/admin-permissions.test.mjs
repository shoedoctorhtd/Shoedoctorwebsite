import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { createRequire } from "node:module";
import { DatabaseSync } from "node:sqlite";
import { createHash } from "node:crypto";
import test from "node:test";
import ts from "typescript";

const root = resolve(import.meta.dirname, "..");
const nativeRequire = createRequire(import.meta.url);
const migration = readFileSync(resolve(root, "migrations/0018_granular_admin_permissions.sql"), "utf8");
const owner = { id: "owner", name: "Owner", email: "owner@example.test", role: "super_admin", sessionId: "owner-session", active: true, legacy: false, mustChangePassword: false };

function harness(t, applyMigration = true) {
  const sqlite = new DatabaseSync(":memory:");
  t.after(() => sqlite.close());
  sqlite.exec("PRAGMA foreign_keys = ON");
  for (const name of readdirSync(resolve(root, "migrations")).filter((name) => name.endsWith(".sql") && name < "0018").sort()) {
    sqlite.exec(readFileSync(resolve(root, "migrations", name), "utf8"));
  }
  const stamp = "2026-09-01T00:00:00.000Z";
  function account(id, role = "admin", active = 1) {
    sqlite.prepare(`INSERT INTO admin_users (id, name, email, email_normalized, password_hash, role, active, must_change_password, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'unchanged-password-hash', ?, ?, 0, ?, ?)`).run(id, id, `${id}@example.test`, `${id}@example.test`, role, active, stamp, stamp);
    sqlite.prepare(`INSERT INTO admin_sessions (id, admin_user_id, token_hash, created_at, expires_at)
      VALUES (?, ?, ?, ?, '2099-01-01T00:00:00.000Z')`).run(`${id}-session`, id, createHash("sha256").update(`${id}-token`).digest("base64url"), stamp);
  }
  account("owner", "super_admin"); account("staff"); account("inactive", "admin", 0);
  sqlite.prepare("INSERT INTO admin_product_permissions VALUES ('staff', 'view_inventory', 'owner', ?)").run(stamp);
  sqlite.prepare("INSERT INTO admin_product_permissions VALUES ('inactive', 'adjust_inventory', 'owner', ?)").run(stamp);
  sqlite.prepare("INSERT INTO admin_product_permissions VALUES ('inactive', 'manage_products', 'owner', ?)").run(stamp);
  const beforeAccounts = sqlite.prepare("SELECT * FROM admin_users ORDER BY id").all();
  if (applyMigration) sqlite.exec(migration);
  let currentId = "staff";
  let beforeBatch;
  const db = {
    prepare(sql) {
      const statement = { sql, values: [], bind(...values) { assert.ok(values.length <= 100); this.values = values; return this; },
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
        sqlite.exec("COMMIT"); return result;
      } catch (error) { sqlite.exec("ROLLBACK"); throw error; }
    },
  };
  const cache = new Map();
  let mailFails = false;
  const mails = [];
  const mocks = new Map([
    [resolve(root, "lib/data.ts"), { getDatabase: async () => db, listBookings: async () => [], listServices: async () => [] }],
    [resolve(root, "lib/owner-alerts.ts"), { deliverOwnerAlertEvent: async (id) => { mails.push(id); if (mailFails) throw Error("offline mail"); }, deliverPendingOwnerAlerts: async () => {} }],
    ["next/headers", { cookies: async () => ({ get: (name) => name === "__Host-shoe_doctor_admin_session" ? { value: `${currentId}-token` } : undefined }) }],
    ["next/navigation", { redirect: (path) => { throw Error(`REDIRECT:${path}`); }, notFound: () => { throw Error("NOT_FOUND"); }, useRouter: () => ({ refresh() {} }) }],
    ["next/link", { __esModule: true, default: ({ children, ...props }) => nativeRequire("react").createElement("a", props, children) }],
  ]);
  function load(file) {
    if (mocks.has(file)) return mocks.get(file);
    if (!file.startsWith("@/") && !file.startsWith(root) && !file.startsWith("lib/") && !file.startsWith("app/")) return nativeRequire(file);
    let absolute = file.startsWith("@/") ? resolve(root, file.slice(2)) : resolve(root, file);
    if (!existsSync(absolute)) absolute += existsSync(`${absolute}.ts`) ? ".ts" : ".tsx";
    if (mocks.has(absolute)) return mocks.get(absolute);
    if (absolute.endsWith(".css")) return { __esModule: true, default: new Proxy({}, { get: (_target, key) => key }) };
    if (cache.has(absolute)) return cache.get(absolute).exports;
    const loadedModule = { exports: {} }; cache.set(absolute, loadedModule);
    const source = ts.transpileModule(readFileSync(absolute, "utf8").replaceAll("import.meta.env", "({})").replaceAll("import.meta.url", JSON.stringify("file:///test/module.ts")), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
    const require = (specifier) => load(specifier.startsWith(".") ? resolve(dirname(absolute), specifier) : specifier);
    new Function("require", "module", "exports", source)(require, loadedModule, loadedModule.exports);
    return loadedModule.exports;
  }
  const cookieName = load("lib/admin-cookies.ts").ADMIN_SESSION_COOKIE;
  mocks.set("next/headers", { cookies: async () => ({ get: (name) => name === cookieName ? { value: `${currentId}-token` } : undefined }) });
  function request(path = "/api/admin/bookings", method = "GET", body, id = currentId) {
    return new Request(`https://example.test${path}`, { method, headers: { cookie: `${cookieName}=${id}-token`, origin: "https://example.test", "content-type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  }
  const grants = (id = "staff") => sqlite.prepare("SELECT permission_key FROM admin_permissions WHERE admin_user_id = ? ORDER BY permission_key").all(id).map((row) => row.permission_key);
  const revision = (id = "staff") => sqlite.prepare("SELECT updated_at FROM admin_users WHERE id = ?").get(id).updated_at;
  const set = async (permissions) => load("lib/admin-permissions.ts").replaceAdminPermissions("staff", permissions, owner, revision());
  return { sqlite, load, request, grants, revision, set, db, account, beforeAccounts, mails, mocks,
    as: (id) => { currentId = id; }, mailFailure: () => { mailFails = true; }, interleave: (callback) => { beforeBatch = callback; } };
}

test("migration preserves accounts, sessions, exact product grants, and explicit legacy operations; new accounts have no grants", (t) => {
  const h = harness(t);
  assert.deepEqual(h.sqlite.prepare("SELECT * FROM admin_users ORDER BY id").all(), h.beforeAccounts);
  assert.equal(h.sqlite.prepare("SELECT count(*) AS n FROM admin_sessions WHERE revoked_at IS NULL").get().n, 3);
  assert.deepEqual(h.grants(), ["bookings", "counter_booking", "counter_inventory", "dashboard", "record_offline_sales", "view_inventory"]);
  assert.equal(h.sqlite.prepare("SELECT granted_by_admin_id FROM admin_permissions WHERE admin_user_id = 'staff' AND permission_key = 'view_inventory'").get().granted_by_admin_id, "owner");
  assert.ok(h.grants("inactive").includes("bookings"));
  assert.ok(h.grants("inactive").includes("view_inventory"));
  assert.ok(h.grants("inactive").includes("view_products"));
  h.account("new"); assert.deepEqual(h.grants("new"), []);
  assert.deepEqual(h.sqlite.prepare("PRAGMA foreign_key_check").all(), []);
});

test("deployment before migration preserves existing operations, blocks new access edits, and never restores revoked grants after migration", async (t) => {
  const h = harness(t, false), auth = h.load("lib/admin-auth.ts");
  const before = await auth.getAdminUser(h.request());
  assert.ok(before.permissions.includes("bookings")); assert.ok(before.permissions.includes("view_inventory"));
  assert.equal((await auth.requireAdminApi(h.request(), { permission: "bookings" })).user.id, "staff");
  assert.equal((await auth.requireAdminApi(h.request(), { productPermission: "manage_products" })).response.status, 403);
  await assert.rejects(h.set([]), /migration 0018/);
  await assert.rejects(h.load("lib/admin-users.ts").createManagedAdmin({ name: "New Staff", email: "new@example.test", role: "admin", permissions: [] }, owner), /migration 0018/);
  h.sqlite.exec(migration); await h.set([]);
  assert.equal((await auth.requireAdminApi(h.request(), { permission: "bookings" })).response.status, 403);
  // Simulate missing new storage after deployment: the old name is only a
  // view now, so compatibility must not resurrect the migration defaults.
  h.sqlite.exec("DROP TABLE admin_permissions");
  assert.equal(await auth.getAdminUser(h.request()), null);
  assert.equal((await auth.getAdminUser(h.request("/api/admin/bookings", "GET", undefined, "owner"))).role, "super_admin");
});

test("booking-only, inventory-only, counter combination, and no-access accounts obey the shared page and API policy", async (t) => {
  const h = harness(t), auth = h.load("lib/admin-auth.ts"), policy = h.load("lib/admin-permission-policy.ts");
  for (const [permissions, allowed] of [
    [["bookings"], ["/admin/bookings", "/admin/bookings/any-id"]],
    [["view_inventory", "adjust_inventory"], ["/admin/inventory"]],
    [["bookings", "counter_booking", "counter_inventory", "record_offline_sales"], ["/admin/bookings", "/admin/bookings/new", "/admin/counter-inventory"]],
    [[], []],
  ]) {
    await h.set(permissions);
    const user = await auth.getAdminUser(h.request());
    for (const link of policy.ADMIN_MODULE_LINKS) assert.equal(policy.canAccessAdminPath(user, link.href), allowed.includes(link.href), link.href);
    assert.equal(policy.canAccessAdminPath(user, "/admin/products"), false);
    assert.equal(policy.canAccessAdminPath(user, "/admin/invented-feature"), false);
    await assert.rejects(auth.requireAdminUser("/admin/products"), /REDIRECT:\/admin\/access-denied/);
    if (!permissions.includes("adjust_inventory")) assert.equal((await h.load("app/api/admin/products/[id]/inventory/route.ts").POST(h.request("/api/admin/products/test/inventory", "POST", { movementType: "correction", quantity: 1 }), { params: Promise.resolve({ id: "test" }) })).status, 403);
    for (const key of policy.ADMIN_PERMISSIONS) {
      const result = await auth.requireAdminApi(h.request(), { action: "TEST_PERMISSION", permission: key });
      assert.equal(Boolean(result.user), permissions.includes(key), key);
      if (!permissions.includes(key)) assert.equal(result.response.status, 403);
    }
  }
});

test("manual restricted APIs reject verified admins before any business reads or writes", async (t) => {
  const h = harness(t); await h.set([]);
  let checked = 0;
  for (const file of readdirSync(resolve(root, "app/api/admin"), { recursive: true }).map((path) => path.replaceAll("\\", "/"))) {
    if (!file.endsWith("/route.ts") || ["login/route.ts", "logout/route.ts", "account/password/route.ts"].includes(file)) continue;
    const route = h.load(`app/api/admin/${file}`);
    for (const method of ["GET", "POST", "PUT", "PATCH", "DELETE"]) {
      if (typeof route[method] !== "function") continue;
      const response = await route[method](h.request(`/api/admin/${file.slice(0, -9)}`, method, method === "GET" ? undefined : { role: "super_admin", permissions: ["view_products"] }), { params: Promise.resolve({ id: "staff", imageId: "image", pairId: "pair", emailId: "email", notificationId: "notification" }) });
      assert.equal(response.status, 403, `${method} ${file}`);
      checked++;
    }
  }
  assert.ok(checked >= 60, `Exercised ${checked} protected handlers`);
});

test("Super Admin inherits every permission, including when its grants are absent", async (t) => {
  const h = harness(t); h.as("owner");
  const auth = h.load("lib/admin-auth.ts"), policy = h.load("lib/admin-permission-policy.ts");
  for (const permission of policy.ADMIN_PERMISSIONS) {
    assert.ok((await auth.requireAdminApi(h.request(), { permission, action: "CHECK" })).user);
  }
  for (const link of policy.ADMIN_MODULE_LINKS) assert.equal((await auth.requireAdminUser(link.href)).role, "super_admin");
  assert.equal((await h.load("lib/admin-permissions.ts").replaceAdminPermissions("owner", [], owner, h.revision("owner"))).kind, "super_admin");
});

test("permission saves atomically audit added/removed access, target, actor, session and email event; same session sees changes", async (t) => {
  const h = harness(t), auth = h.load("lib/admin-auth.ts");
  const before = await auth.getAdminUser(h.request()); assert.ok(before.permissions.includes("bookings"));
  const result = await h.set(["view_inventory", "adjust_inventory"]);
  assert.equal(result.kind, "updated");
  const audit = h.sqlite.prepare("SELECT * FROM audit_logs WHERE action = 'ADMIN_PERMISSIONS_UPDATED'").get();
  assert.equal(audit.entity_id, "staff"); assert.equal(audit.admin_user_id, "owner"); assert.equal(audit.session_id, "owner-session");
  assert.deepEqual(JSON.parse(audit.new_values).granted, ["Adjust Product Stock"]);
  assert.ok(JSON.parse(audit.new_values).removed.includes("Booking Management"));
  assert.equal(h.sqlite.prepare("SELECT count(*) AS n FROM owner_alert_events WHERE audit_log_id = ?").get(audit.id).n, 1);
  const after = await auth.getAdminUser(h.request()); assert.equal(after.sessionId, before.sessionId); assert.deepEqual(after.permissions, ["adjust_inventory", "view_inventory"]);
  assert.equal((await auth.requireAdminApi(h.request(), { permission: "bookings" })).response.status, 403);
  assert.equal((await h.set(["adjust_inventory", "view_inventory"])).kind, "unchanged");
  assert.equal(h.sqlite.prepare("SELECT count(*) AS n FROM audit_logs WHERE action = 'ADMIN_PERMISSIONS_UPDATED'").get().n, 1);
});

test("stale and racing permission saves, revoked managers and failed audit writes cannot partially change access", async (t) => {
  const h = harness(t), manager = h.load("lib/admin-permissions.ts");
  const old = h.revision(); await h.set(["bookings"]);
  assert.equal((await manager.replaceAdminPermissions("staff", ["services"], owner, old)).kind, "conflict");
  h.interleave(() => h.sqlite.prepare("UPDATE admin_users SET updated_at = 'concurrent-edit' WHERE id = 'staff'").run());
  assert.equal((await h.set(["services"])).kind, "conflict"); assert.deepEqual(h.grants(), ["bookings"]);
  h.sqlite.prepare("UPDATE admin_users SET updated_at = '2026-09-01T00:00:00.000Z' WHERE id = 'staff'").run();
  h.sqlite.exec("CREATE TRIGGER permission_audit_failure BEFORE INSERT ON audit_logs WHEN NEW.action = 'ADMIN_PERMISSIONS_UPDATED' BEGIN SELECT RAISE(ABORT, 'audit_failure'); END;");
  await assert.rejects(h.set(["services"]), /audit_failure/); assert.deepEqual(h.grants(), ["bookings"]);
  h.sqlite.exec("DROP TRIGGER permission_audit_failure");
  h.interleave(() => h.sqlite.exec("UPDATE admin_sessions SET revoked_at = 'revoked' WHERE id = 'owner-session'"));
  assert.equal((await h.set(["services"])).kind, "conflict"); assert.deepEqual(h.grants(), ["bookings"]);
  await assert.rejects(h.set(["services"]), /Forbidden/);
});

test("permission APIs preserve committed changes on email failure and block escalation through delegated Admin Management", async (t) => {
  const h = harness(t); await h.set(["admin_management"]);
  const auth = h.load("lib/admin-auth.ts"), staff = await auth.getAdminUser(h.request());
  await assert.rejects(h.load("lib/admin-permissions.ts").replaceAdminPermissions("staff", ["services"], staff, h.revision()), /Forbidden/);
  await assert.rejects(h.load("lib/admin-users.ts").createManagedAdmin({ name: "Intruder", email: "new@example.test", role: "super_admin" }, staff), /Forbidden/);
  assert.equal((await h.load("app/api/admin/users/route.ts").GET(h.request("/api/admin/users"))).status, 200);
  assert.equal((await h.load("app/api/admin/users/[id]/permissions/route.ts").PUT(h.request("/api/admin/users/staff/permissions", "PUT", { permissions: ["services"], updatedAt: h.revision() }), { params: Promise.resolve({ id: "staff" }) })).status, 403);
  h.as("owner"); h.mailFailure();
  const response = await h.load("app/api/admin/users/[id]/permissions/route.ts").PUT(h.request("/api/admin/users/staff/permissions", "PUT", { permissions: ["services"], updatedAt: h.revision() }), { params: Promise.resolve({ id: "staff" }) });
  assert.equal(response.status, 200); assert.deepEqual(h.grants(), ["services"]);
  assert.ok(h.mails.length > 0);
  const email = h.load("lib/owner-alert-content.ts").buildOwnerAlertEmail({ actorType: "admin", administratorName: "Owner", administratorRole: "super_admin", action: "ADMIN_PERMISSIONS_UPDATED", entityType: "admin_user", bookingReference: null, pairReference: null, previousValues: {}, newValues: { adminName: "Staff", granted: ["Services & Pricing"], removed: ["Admin Management"] }, reason: null, createdAt: new Date().toISOString() });
  assert.match(email.subject, /Admin Access Updated/); assert.match(email.text, /Granted:\nServices & Pricing/); assert.match(email.text, /Removed:\nAdmin Management/);
});

test("server pages deny direct URLs before rendering restricted data and inventory-only refresh uses its own API", async (t) => {
  const h = harness(t); await h.set(["view_inventory"]);
  for (const path of ["products", "counter-inventory", "bookings/new", "csr-donations", "activity", "users"]) {
    const page = h.load(`app/admin/${path}/page.tsx`).default;
    await assert.rejects(page({ params: Promise.resolve({ id: "test" }), searchParams: Promise.resolve({}) }), /REDIRECT:\/admin\/access-denied/, path);
  }
  const inventory = await h.load("app/api/admin/inventory/route.ts").GET(h.request("/api/admin/inventory?catalogue=1"));
  assert.equal(inventory.status, 200); assert.equal((await inventory.json()).products.length, h.sqlite.prepare("SELECT count(*) AS n FROM products").get().n);
});

test("inventory-only staff can initialize and adjust stock without Product Management, then revocation blocks further writes", async (t) => {
  const h = harness(t); await h.set(["view_inventory", "adjust_inventory"]);
  const route = h.load("app/api/admin/products/[id]/inventory/route.ts");
  const path = "/api/admin/products/starter-shoe-bag/inventory";
  const context = { params: Promise.resolve({ id: "starter-shoe-bag" }) };
  assert.equal((await route.POST(h.request(path, "POST", { initialStock: 5, idempotencyKey: crypto.randomUUID() }), context)).status, 200);
  const adjustment = { movementType: "restock", quantity: 2, reason: "Delivery received", idempotencyKey: crypto.randomUUID() };
  assert.equal((await route.POST(h.request(path, "POST", adjustment), context)).status, 200);
  assert.equal(h.sqlite.prepare("SELECT stock_quantity FROM products WHERE id = 'starter-shoe-bag'").get().stock_quantity, 7);
  await h.set(["view_inventory"]);
  assert.equal((await route.POST(h.request(path, "POST", { ...adjustment, idempotencyKey: crypto.randomUUID() }), context)).status, 403);
  assert.equal(h.sqlite.prepare("SELECT stock_quantity FROM products WHERE id = 'starter-shoe-bag'").get().stock_quantity, 7);
});

test("creating admins saves explicit grants with the account audit and rejects unknown permission keys", async (t) => {
  const h = harness(t), users = h.load("lib/admin-users.ts");
  const result = await users.createManagedAdmin({ name: "Booking Clerk", email: "clerk@example.test", role: "admin", permissions: ["bookings"] }, owner);
  assert.deepEqual(h.grants(result.user.id), ["bookings"]);
  assert.equal(result.user.mustChangePassword, true);
  const audit = h.sqlite.prepare("SELECT new_values FROM audit_logs WHERE entity_id = ? AND action = 'ADMIN_USER_CREATED'").get(result.user.id);
  assert.deepEqual(JSON.parse(audit.new_values).granted, ["Booking Management"]);
  await assert.rejects(users.createManagedAdmin({ name: "Bad Keys", email: "bad@example.test", role: "admin", permissions: ["invented"] }, owner), /valid access permissions/);
});

test("revoked parent modules block retained action grants, including crossing from counter reversals to online orders", async (t) => {
  const h = harness(t), auth = h.load("lib/admin-auth.ts"), policy = h.load("lib/admin-permission-policy.ts");
  await h.set(["adjust_inventory", "manage_products", "record_offline_sales", "cancel_product_orders"]);
  const user = await auth.getAdminUser(h.request());
  for (const key of user.permissions) assert.equal(policy.hasAdminPermission(user, key), false);
  assert.deepEqual(policy.toggleAdminPermission([], "adjust_inventory", true), ["view_inventory", "adjust_inventory"]);
  assert.deepEqual(policy.toggleAdminPermission(["view_inventory", "adjust_inventory"], "view_inventory", false), []);
  const stock = h.load("app/api/admin/products/[id]/inventory/route.ts");
  assert.equal((await stock.POST(h.request("/api/admin/products/test/inventory", "POST", {}), { params: Promise.resolve({ id: "test" }) })).status, 403);
  await h.set(["counter_inventory", "cancel_product_orders", "record_offline_sales"]);
  assert.ok(policy.hasAdminPermission(await auth.getAdminUser(h.request()), "cancel_product_orders"));
  const cancel = h.load("app/api/admin/product-orders/[id]/cancel/route.ts");
  assert.equal((await cancel.POST(h.request("/api/admin/product-orders/online/cancel", "POST", {}), { params: Promise.resolve({ id: "online" }) })).status, 403);
  assert.equal((await h.load("app/api/admin/product-orders/route.ts").POST(h.request("/api/admin/product-orders", "POST", {}))).status, 403);
});

test("navigation, dashboard data and account controls render only assigned features", async (t) => {
  const h = harness(t), React = nativeRequire("react"), { renderToStaticMarkup } = nativeRequire("react-dom/server");
  const access = h.load("app/components/AdminAccessProvider.tsx");
  const render = (role, permissions, component) => renderToStaticMarkup(React.createElement(access.default, { access: { role, permissions } }, component));
  const nav = render("admin", ["bookings"], React.createElement(access.AdminModuleNav));
  assert.match(nav, /href="\/admin\/bookings"/); assert.doesNotMatch(nav, /href="\/admin\/(?:inventory|products|users|services|counter-inventory)"/);
  const users = h.load("app/components/AdminUsersDashboard.tsx").default;
  const readOnly = render("admin", ["admin_management"], React.createElement(users, { initialUsers: [], signedInName: "Staff", signedInRole: "admin" }));
  assert.doesNotMatch(readOnly, /Create an administrator|Manage Access|Select All|Save Permissions/);
  const ownerUi = render("super_admin", [], React.createElement(users, { initialUsers: [], signedInName: "Owner", signedInRole: "super_admin" }));
  assert.match(ownerUi, /Access Permissions/); assert.match(ownerUi, /Select All/); assert.match(ownerUi, /Clear All/);
  await h.set(["view_inventory"]);
  h.mocks.set(resolve(root, "app/components/AdminDashboard.tsx"), { default: () => null });
  h.mocks.set(resolve(root, "lib/data.ts"), { getDatabase: async () => h.db, listBookings: async () => { throw Error("Leaked bookings"); }, listServices: async () => { throw Error("Leaked services"); } });
  await assert.rejects(h.load("app/components/AdminHome.tsx").default({}), /REDIRECT:\/admin\/inventory/);
});
