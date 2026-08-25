/*
 * One-time, operator-run bootstrap for the first named Super Admin.
 *
 * Run only after migration 0011 is applied to the intended D1 database:
 *   npm run admin:bootstrap -- --remote
 *
 * It never sends credentials to the browser, never creates a public endpoint,
 * and refuses to run if any named admin already exists. The generated PBKDF2
 * value matches the Workers Web Crypto verifier in lib/admin-auth.ts.
 */
import { execFileSync } from "node:child_process";
import { pbkdf2Sync, randomBytes, randomUUID } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const args = process.argv.slice(2);
const remote = args.includes("--remote");
const databaseFlag = args.indexOf("--database");
const database = databaseFlag >= 0 ? args[databaseFlag + 1] : "shoe-doctor-db";

if (!remote || !database || database.startsWith("-")) {
  console.error("Refusing to choose a database implicitly. Use: npm run admin:bootstrap -- --remote [--database shoe-doctor-db]");
  process.exitCode = 1;
} else {
  await bootstrap();
}

async function bootstrap() {
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const name = cleanName(await rl.question("First Super Admin name: "));
    const email = normalizeEmail(await rl.question("First Super Admin email: "));
    const password = process.env.SUPER_ADMIN_PASSWORD ?? "";
    if (!name || !email) throw new Error("Enter a valid name and email.");
    if (password.length < 12 || password.length > 256) {
      throw new Error("Set SUPER_ADMIN_PASSWORD to a unique 12–256 character password before running this script. It is never written to disk.");
    }

    const now = new Date().toISOString();
    const id = randomUUID();
    const auditId = randomUUID();
    const ownerAlertId = randomUUID();
    const passwordHash = hashPassword(password);
    const snapshot = JSON.stringify({ name, email, role: "super_admin", active: true, mustChangePassword: false });
    const sql = [
      `INSERT INTO admin_users (id, name, email, email_normalized, password_hash, role, active, created_at, created_by_admin_id, updated_at, must_change_password) SELECT ${literal(id)}, ${literal(name)}, ${literal(email)}, ${literal(email)}, ${literal(passwordHash)}, 'super_admin', 1, ${literal(now)}, NULL, ${literal(now)}, 0 WHERE NOT EXISTS (SELECT 1 FROM admin_users);`,
      `INSERT INTO audit_logs (id, actor_type, admin_user_id, administrator_name_snapshot, administrator_email_snapshot, administrator_role_snapshot, action, entity_type, entity_id, booking_reference, pair_reference, previous_values, new_values, changed_fields, reason, session_id, request_id, created_at) SELECT ${literal(auditId)}, 'legacy', NULL, 'Bootstrap migration', NULL, NULL, 'ADMIN_USER_CREATED', 'admin_user', id, NULL, NULL, NULL, ${literal(snapshot)}, '["creation"]', 'One-time named Super Admin bootstrap', NULL, NULL, ${literal(now)} FROM admin_users WHERE id = ${literal(id)} AND (SELECT COUNT(*) FROM admin_users) = 1;`,
      `INSERT INTO owner_alert_events (id, audit_log_id, event_key, alert_type, delivery_status, attempt_count, created_at, updated_at) SELECT ${literal(ownerAlertId)}, ${literal(auditId)}, ${literal(`audit:${auditId}`)}, 'ADMIN_USER_CREATED', 'pending', 1, ${literal(now)}, ${literal(now)} WHERE EXISTS (SELECT 1 FROM audit_logs WHERE id = ${literal(auditId)});`,
      `UPDATE admin_auth_settings SET bootstrap_completed_at = ${literal(now)}, shared_login_disabled_at = ${literal(now)}, updated_at = ${literal(now)} WHERE singleton = 1 AND EXISTS (SELECT 1 FROM admin_users WHERE id = ${literal(id)}) AND (SELECT COUNT(*) FROM admin_users) = 1;`,
      `SELECT CASE WHEN EXISTS (SELECT 1 FROM admin_users WHERE id = ${literal(id)}) AND EXISTS (SELECT 1 FROM audit_logs WHERE id = ${literal(auditId)}) AND EXISTS (SELECT 1 FROM owner_alert_events WHERE id = ${literal(ownerAlertId)}) AND EXISTS (SELECT 1 FROM admin_auth_settings WHERE singleton = 1 AND shared_login_disabled_at = ${literal(now)}) THEN 'created' ELSE 'not_created' END AS bootstrap_status;`,
    ].join("\n");
    // Keep the password hash out of command-line arguments and Wrangler's
    // command debug output. Only a restrictive, short-lived local SQL file
    // contains the derived hash; the raw password is never written to disk.
    const temporaryDirectory = await mkdtemp(join(tmpdir(), "shoe-doctor-admin-bootstrap-"));
    const sqlFile = join(temporaryDirectory, "bootstrap.sql");
    let result;
    try {
      await writeFile(sqlFile, sql, { encoding: "utf8", mode: 0o600 });
      result = runWrangler(["d1", "execute", database, "--remote", "--json", "--file", sqlFile]);
    } finally {
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
    if (findValue(JSON.parse(result), "bootstrap_status") !== "created") {
      throw new Error("A named administrator already exists or the bootstrap transaction could not complete. No changes were made by this run.");
    }
    console.log("Named Super Admin created, the shared-login fallback was permanently disabled, and a durable owner-alert record was queued. Its delivery is claimed on the first named Super Admin login after deployment. Sign in through /admin with the new named account.");
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Unable to bootstrap the first Super Admin.");
    process.exitCode = 1;
  } finally {
    rl.close();
  }
}

function runWrangler(command) {
  const executable = process.platform === "win32" ? "npx.cmd" : "npx";
  return execFileSync(executable, ["wrangler", ...command], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

function findValue(value, key) {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findValue(item, key);
      if (found !== undefined) return found;
    }
  }
  if (value && typeof value === "object") {
    if (typeof value[key] === "string") return value[key];
    for (const child of Object.values(value)) {
      const found = findValue(child, key);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

function hashPassword(password) {
  const salt = randomBytes(16);
  const iterations = 310_000;
  const derived = pbkdf2Sync(password, salt, iterations, 32, "sha256");
  return `pbkdf2_sha256$${iterations}$${salt.toString("base64url")}$${derived.toString("base64url")}`;
}

function literal(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function normalizeEmail(value) {
  const email = String(value).trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email) && email.length <= 160 ? email : "";
}

function cleanName(value) {
  const name = String(value).trim().replace(/\s+/gu, " ");
  return name.length >= 2 && name.length <= 120 ? name : "";
}
