import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  buildAuditLogInsert,
  buildOwnerAlertEventInsert,
  type AuditActor,
} from "./audit";
import { getDatabase } from "./data";
import { deliverOwnerAlertEvent, deliverPendingOwnerAlerts } from "./owner-alerts";
import type { AdminRole, AuthenticatedAdmin } from "./admin-types";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_DURATION_SECONDS,
  adminSessionCookieValue,
  clearAdminSessionCookieValue,
} from "./admin-cookies";
import {
  hasRequiredAdminRole as policyAllowsRole,
  hasTrustedAdminMutationOrigin,
  normalizeAdminEmail,
  safeAdminReturnPath,
} from "./admin-policy";
import {
  hashAdminPassword,
  performDummyAdminPasswordWork,
  verifyAdminPassword,
} from "./admin-password";

export { ADMIN_SESSION_COOKIE, ADMIN_SESSION_DURATION_SECONDS } from "./admin-cookies";
const LEGACY_SESSION_COOKIE = "shoe_doctor_admin_session";
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 8;

type AuthEnvironment = {
  ADMIN_EMAIL?: string;
  ADMIN_PASSWORD?: string;
  SESSION_SECRET?: string;
};

type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  active: number;
  must_change_password: number;
};

type SessionRow = AdminUserRow & {
  session_id: string;
  expires_at: string;
  revoked_at: string | null;
};

type LegacySessionPayload = {
  email: string;
  exp: number;
  legacy: true;
};

export type CredentialResult =
  | { ok: true; kind: "named"; user: Omit<AuthenticatedAdmin, "sessionId" | "legacy"> }
  | { ok: true; kind: "legacy"; email: string; sessionSecret: string }
  | { ok: false; reason: "configuration" | "credentials" | "rate_limited" };

export type AdminApiAuthResult =
  | { user: AuthenticatedAdmin; response?: never }
  | { response: Response; user?: never };

type AdminApiOptions = {
  action?: string;
  mutation?: boolean;
  roles?: readonly AdminRole[];
  entityType?: string;
  entityId?: string | null;
  bookingReference?: string | null;
};

export async function getAdminUser(request?: Request): Promise<AuthenticatedAdmin | null> {
  const token = request
    ? readCookie(request.headers.get("cookie"), ADMIN_SESSION_COOKIE)
    : (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  const legacyToken = request
    ? readCookie(request.headers.get("cookie"), LEGACY_SESSION_COOKIE)
    : (await cookies()).get(LEGACY_SESSION_COOKIE)?.value;

  try {
    const db = await getDatabase();
    if (token) {
      const tokenHash = await digestText(token);
      const row = await db
        .prepare(`
          SELECT s.id AS session_id, s.expires_at, s.revoked_at,
                 u.id, u.name, u.email, u.role, u.active, u.must_change_password
          FROM admin_sessions s
          INNER JOIN admin_users u ON u.id = s.admin_user_id
          WHERE s.token_hash = ?
        `)
        .bind(tokenHash)
        .first<SessionRow>();
      if (
        row &&
        !row.revoked_at &&
        row.active === 1 &&
        (row.role === "admin" || row.role === "super_admin") &&
        Date.parse(row.expires_at) > Date.now()
      ) {
        const user = toAuthenticatedAdmin(row);
        // Best-effort activity heartbeat; auth does not depend on this update.
        void db
          .prepare("UPDATE admin_sessions SET last_used_at = ? WHERE id = ? AND revoked_at IS NULL")
          .bind(new Date().toISOString(), row.session_id)
          .run();
        return user;
      }
    }

    const settings = await db
      .prepare("SELECT shared_login_disabled_at FROM admin_auth_settings WHERE singleton = 1")
      .first<{ shared_login_disabled_at: string | null }>();
    if (settings?.shared_login_disabled_at) return null;
    return legacyToken ? verifyLegacySession(legacyToken) : null;
  } catch (error) {
    // Before 0011 is applied, retain only the old signed shared-login path so
    // deployment cannot lock the owner out. Once bootstrap disables it, this
    // fallback is unreachable even if a legacy cookie still exists.
    if (isMissingAdminSchema(error)) {
      return legacyToken ? verifyLegacySession(legacyToken) : null;
    }
    console.error("Unable to validate the administrator session.");
    return null;
  }
}

export async function requireAdminUser(returnTo = "/admin") {
  const user = await getAdminUser();
  if (user) return user;
  redirect(`/admin/login?next=${encodeURIComponent(safeReturnPath(returnTo))}`);
}

export async function requireSuperAdminUser(returnTo = "/admin") {
  const user = await requireAdminUser(returnTo);
  if (user.role === "super_admin") return user;
  redirect("/admin?forbidden=super-admin");
}

export async function requireAdminApi(
  request: Request,
  options: AdminApiOptions = {},
): Promise<AdminApiAuthResult> {
  const user = await getAdminUser(request);
  if (!user) {
    await recordAnonymousDeniedAttempt(request, options, "No verified administrator session.");
    return { response: Response.json({ message: "Unauthorized" }, { status: 401 }) };
  }

  if (options.mutation && user.legacy && options.action !== "ADMIN_LOGOUT") {
    await recordDeniedAttempt(user, options, "Legacy shared access cannot make changes after the named-account migration.");
    return {
      response: Response.json(
        { message: "Create the first named Super Admin before making changes." },
        { status: 403 },
      ),
    };
  }

  if (options.mutation && !hasTrustedMutationOrigin(request)) {
    await recordDeniedAttempt(user, options, "Invalid request origin.");
    return { response: Response.json({ message: "Forbidden" }, { status: 403 }) };
  }

  if (!hasRequiredAdminRole(user.role, options.roles)) {
    await recordDeniedAttempt(user, options, "Role does not permit this action.");
    return { response: Response.json({ message: "Forbidden" }, { status: 403 }) };
  }

  if (
    options.mutation &&
    user.mustChangePassword &&
    options.action !== "ADMIN_PASSWORD_CHANGE" &&
    options.action !== "ADMIN_LOGOUT"
  ) {
    await recordDeniedAttempt(user, options, "Temporary-password change is required before this action.");
    return {
      response: Response.json(
        { message: "Change the temporary administrator password before continuing." },
        { status: 403 },
      ),
    };
  }

  return { user };
}

export async function verifyAdminCredentials(
  emailInput: string,
  password: string,
  request?: Request,
): Promise<CredentialResult> {
  const email = normalizeEmail(emailInput);
  if (!email || !password || password.length > 256) {
    return { ok: false, reason: "credentials" };
  }

  try {
    const db = await getDatabase();
    const limit = await consumeLoginAttempt(db, email, request);
    if (limit === "blocked") return { ok: false, reason: "rate_limited" };

    const user = await db
      .prepare(`
        SELECT id, name, email, role, active, must_change_password, password_hash
        FROM admin_users
        WHERE email_normalized = ?
      `)
      .bind(email)
      .first<AdminUserRow & { password_hash: string }>();
    if (!user) {
      const [settings, count] = await Promise.all([
        db
          .prepare("SELECT shared_login_disabled_at FROM admin_auth_settings WHERE singleton = 1")
          .first<{ shared_login_disabled_at: string | null }>(),
        db.prepare("SELECT COUNT(*) AS count FROM admin_users").first<{ count: number }>(),
      ]);
      // Migration-first bootstrap is safe: only while no named account exists
      // and the one-time bootstrap has not disabled it can the old secret
      // authenticate the owner. This path disappears permanently afterwards.
      if (!settings?.shared_login_disabled_at && Number(count?.count ?? 0) === 0) {
        const config = await getLegacyAuthConfig();
        if (!config) return { ok: false, reason: "configuration" };
        const [emailMatches, passwordMatches] = await Promise.all([
          constantTimeEqual(email, config.adminEmail),
          constantTimeEqual(password, config.adminPassword),
        ]);
        if (emailMatches && passwordMatches) {
          await clearLoginAttempts(db, email, request);
          return {
            ok: true,
            kind: "legacy",
            email: config.adminEmail,
            sessionSecret: config.sessionSecret,
          };
        }
      }
    }
    const passwordMatches = user
      ? await verifyPassword(password, user.password_hash)
      : await performDummyPasswordWork(password, email);
    if (!user || !passwordMatches || user.active !== 1) {
      return { ok: false, reason: "credentials" };
    }
    await clearLoginAttempts(db, email, request);
    return {
      ok: true,
      kind: "named",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        active: true,
        mustChangePassword: user.must_change_password === 1,
      },
    };
  } catch (error) {
    if (!isMissingAdminSchema(error)) {
      console.error("Unable to validate administrator credentials.");
      return { ok: false, reason: "configuration" };
    }
  }

  const config = await getLegacyAuthConfig();
  if (!config) return { ok: false, reason: "configuration" };
  const [emailMatches, passwordMatches] = await Promise.all([
    constantTimeEqual(email, config.adminEmail),
    constantTimeEqual(password, config.adminPassword),
  ]);
  if (!emailMatches || !passwordMatches) return { ok: false, reason: "credentials" };
  return {
    ok: true,
    kind: "legacy",
    email: config.adminEmail,
    sessionSecret: config.sessionSecret,
  };
}

export async function createAdminSession(
  user: Omit<AuthenticatedAdmin, "sessionId" | "legacy">,
) {
  const db = await getDatabase();
  const token = randomToken();
  const now = new Date().toISOString();
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + ADMIN_SESSION_DURATION_SECONDS * 1000).toISOString();
  const actor: AuthenticatedAdmin = {
    ...user,
    active: true,
    sessionId,
    legacy: false,
  };
  const batch = await db.batch([
    db
      .prepare(`
        INSERT INTO admin_sessions (
          id, admin_user_id, token_hash, created_at, expires_at, last_used_at
        ) SELECT ?, ?, ?, ?, ?, ?
        WHERE EXISTS (SELECT 1 FROM admin_users WHERE id = ? AND active = 1)
      `)
      .bind(sessionId, user.id, await digestText(token), now, expiresAt, now, user.id),
    db
      .prepare(`
        UPDATE admin_users SET last_login_at = ?, updated_at = ?
        WHERE id = ? AND active = 1
          AND EXISTS (SELECT 1 FROM admin_sessions WHERE id = ? AND admin_user_id = ?)
      `)
      .bind(now, now, user.id, sessionId, user.id),
    buildAuditLogInsert(db, {
      actor,
      action: "ADMIN_LOGIN",
      entityType: "admin_session",
      entityId: sessionId,
      newValues: { login: "successful" },
      changedFields: ["login"],
      createdAt: now,
      conditionalOn: {
        sql: "EXISTS (SELECT 1 FROM admin_sessions WHERE id = ? AND admin_user_id = ?)",
        bindings: [sessionId, user.id],
      },
    }),
  ]);
  if (!batch[0]?.meta.changes || !batch[1]?.meta.changes || !batch[2]?.meta.changes) return null;
  try {
    // The bootstrap outbox and any request that ended before delivery are
    // drained while the Worker is still alive. Delivery failure remains
    // contained in the outbox and must never prevent a valid login.
    await deliverPendingOwnerAlerts();
  } catch (error) {
    console.error("Unable to drain pending owner alerts after administrator login.", error);
  }
  return { token, user: actor };
}

export async function createLegacyAdminSessionToken(email: string, sessionSecret: string) {
  const payload: LegacySessionPayload = {
    email: normalizeEmail(email),
    exp: Math.floor(Date.now() / 1000) + ADMIN_SESSION_DURATION_SECONDS,
    legacy: true,
  };
  const encodedPayload = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await sign(encodedPayload, sessionSecret);
  return `${encodedPayload}.${signature}`;
}

export async function logoutAdminSession(request: Request) {
  const user = await getAdminUser(request);
  if (!user || user.legacy || !user.sessionId) return;
  const db = await getDatabase();
  const now = new Date().toISOString();
  const operationId = crypto.randomUUID();
  await db.batch([
    db
      .prepare("UPDATE admin_sessions SET revoked_at = ?, last_mutation_id = ? WHERE id = ? AND revoked_at IS NULL")
      .bind(now, operationId, user.sessionId),
    buildAuditLogInsert(db, {
      actor: user,
      action: "ADMIN_LOGOUT",
      entityType: "admin_session",
      entityId: user.sessionId,
      newValues: { logout: "successful" },
      changedFields: ["logout"],
      createdAt: now,
      conditionalOn: {
        sql: "EXISTS (SELECT 1 FROM admin_sessions WHERE id = ? AND last_mutation_id = ?)",
        bindings: [user.sessionId, operationId],
      },
    }),
  ]);
}

export function adminSessionCookie(token: string) {
  return adminSessionCookieValue(token);
}

export function clearAdminSessionCookie() {
  return clearAdminSessionCookieValue();
}

export function clearLegacyAdminSessionCookie() {
  return [
    `${LEGACY_SESSION_COOKIE}=`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Strict",
    "Max-Age=0",
  ].join("; ");
}

export function legacyAdminSessionCookie(token: string) {
  return [
    `${LEGACY_SESSION_COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Strict",
    `Max-Age=${ADMIN_SESSION_DURATION_SECONDS}`,
  ].join("; ");
}

export function safeReturnPath(value: string | null | undefined) {
  return safeAdminReturnPath(value);
}

export function normalizeEmail(value: unknown) {
  return normalizeAdminEmail(value);
}

export async function hashPassword(password: string) {
  return hashAdminPassword(password);
}

export async function verifyPassword(password: string, stored: string) {
  return verifyAdminPassword(password, stored);
}

function toAuthenticatedAdmin(row: SessionRow): AuthenticatedAdmin {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    active: true,
    mustChangePassword: row.must_change_password === 1,
    sessionId: row.session_id,
    legacy: false,
  };
}

async function recordDeniedAttempt(
  user: AuthenticatedAdmin,
  options: AdminApiOptions,
  reason: string,
) {
  const actor: AuditActor = user.legacy
    ? {
        actorType: "legacy",
        name: user.name,
        email: user.email,
      }
    : user;
  const actorKey = user.legacy
    ? `legacy:${(await digestText(user.email)).slice(0, 40)}`
    : `admin:${user.id}`;
  await recordDeniedAudit(actor, actorKey, options, reason);
}

async function recordAnonymousDeniedAttempt(
  request: Request,
  options: AdminApiOptions,
  reason: string,
) {
  // Failed ordinary authentication is covered by the login rate limiter. For
  // unauthenticated calls, retain only one safe security event per anonymous
  // source/action/hour so a hostile scanner cannot fill the immutable log.
  if (!isHighRiskDeniedAction(options)) return;
  const source = request.headers.get("cf-connecting-ip")?.trim() || "unknown";
  const sourceHash = (await digestText(`anonymous-denied:${source}`)).slice(0, 40);
  const hour = new Date().toISOString().slice(0, 13);
  await recordDeniedAudit(
    { actorType: "system", name: "Unauthenticated administrator request" },
    `anonymous:${sourceHash}`,
    options,
    reason,
    `denied:${sourceHash}:${options.action ?? "UNKNOWN"}:${hour}`,
  );
}

async function recordDeniedAudit(
  actor: AuditActor,
  actorKey: string,
  options: AdminApiOptions,
  reason: string,
  requestId?: string,
) {
  try {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const auditId = crypto.randomUUID();
    const highRisk = isHighRiskDeniedAction(options);
    const alertId = highRisk ? crypto.randomUUID() : null;
    const result = await db.batch([
      buildAuditLogInsert(db, {
        id: auditId,
        actor,
        action: "ACCESS_DENIED",
        entityType: options.entityType ?? "security",
        entityId: options.entityId ?? null,
        bookingReference: options.bookingReference ?? null,
        newValues: { attemptedAction: options.action ?? "UNKNOWN" },
        changedFields: ["attemptedAction"],
        reason,
        requestId,
        createdAt: now,
        conditionalOn: requestId
          ? {
              sql: "NOT EXISTS (SELECT 1 FROM audit_logs WHERE request_id = ?)",
              bindings: [requestId],
            }
          : undefined,
      }),
      ...(alertId
        ? [
            buildOwnerAlertEventInsert(db, {
              id: alertId,
              auditLogId: auditId,
              alertType: "ACCESS_DENIED",
              // One alert per actor/action/hour prevents a noisy blocked
              // client from becoming an owner-alert denial of service.
              eventKey: `denied:${actorKey}:${options.action ?? "UNKNOWN"}:${now.slice(0, 13)}`,
              ignoreDuplicate: true,
              createdAt: now,
              conditionalOn: {
                sql: "EXISTS (SELECT 1 FROM audit_logs WHERE id = ?)",
                bindings: [auditId],
              },
            }),
          ]
        : []),
    ]);
    if (alertId && result[0]?.meta.changes && result[1]?.meta.changes) {
      // This is a high-risk event. Await the best-effort attempt so it is not
      // abandoned when a Worker finishes the forbidden response. The durable
      // outbox still preserves the event if delivery fails.
      await deliverOwnerAlertEvent(alertId);
    }
  } catch (error) {
    // Authorisation remains fail-closed even if an audit store is temporarily unavailable.
    console.error("Unable to record denied administrator action.", error);
  }
}

function isHighRiskDeniedAction(options: AdminApiOptions) {
  const action = options.action ?? "";
  return /(?:DELETE|RESTORE|SERVICE_(?:CREATE|UPDATE|DELETE)|ADMIN_(?:USER|ACCESS)|CSR_(?:POST|PATCH|PUT|DELETE)|EXPORT|NOTIFICATION_RETRY|OWNER_ALERT_RETRY)/u.test(action);
}

export function hasRequiredAdminRole(role: AdminRole, roles?: readonly AdminRole[]) {
  return policyAllowsRole(role, roles);
}

export function hasTrustedMutationOrigin(request: Request) {
  return hasTrustedAdminMutationOrigin(request);
}

async function verifyLegacySession(token: string): Promise<AuthenticatedAdmin | null> {
  const config = await getLegacyAuthConfig();
  if (!config) return null;
  const [encodedPayload, suppliedSignature, extra] = token.split(".");
  if (!encodedPayload || !suppliedSignature || extra) return null;
  const expected = await sign(encodedPayload, config.sessionSecret);
  if (!(await constantTimeEqual(suppliedSignature, expected))) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(encodedPayload))) as Partial<LegacySessionPayload>;
    if (
      payload.legacy !== true ||
      typeof payload.email !== "string" ||
      typeof payload.exp !== "number" ||
      payload.exp <= Math.floor(Date.now() / 1000) ||
      !(await constantTimeEqual(normalizeEmail(payload.email), config.adminEmail))
    ) {
      return null;
    }
    return {
      id: "legacy-shared-admin",
      name: "Legacy shared administrator",
      email: config.adminEmail,
      role: "super_admin",
      active: true,
      mustChangePassword: false,
      sessionId: null,
      legacy: true,
    };
  } catch {
    return null;
  }
}

async function consumeLoginAttempt(
  db: Awaited<ReturnType<typeof getDatabase>>,
  email: string,
  request?: Request,
) {
  const now = new Date();
  const nowIso = now.toISOString();
  const keys = await loginRateLimitKeys(email, request);
  const cutoff = new Date(now.getTime() - LOGIN_WINDOW_MS).toISOString();
  const blockedUntil = new Date(now.getTime() + LOGIN_WINDOW_MS).toISOString();
  // Check the source and account buckets before creating an identity row. A
  // blocked source cannot grow rows by rotating email addresses, and a blocked
  // account cannot grow rows by rotating source IPs.
  const primaryKeys = keys.filter((key) => key.scope !== "login_identity");
  const primaryWhere = primaryKeys.map(() => "(scope = ? AND key_hash = ?)").join(" OR ");
  const primaryLimits = await db
    .prepare(`SELECT blocked_until FROM admin_login_rate_limits WHERE ${primaryWhere}`)
    .bind(...primaryKeys.flatMap(({ scope, keyHash }) => [scope, keyHash]))
    .all<{ blocked_until: string | null }>();
  if (primaryLimits.results.some((row) => row.blocked_until && Date.parse(row.blocked_until) > now.getTime())) {
    return "blocked";
  }
  // A completed login clears its own keys. This bounded cleanup covers failed
  // identities so a hostile source cannot retain an unbounded rate-limit row
  // set indefinitely.
  await db
    .prepare("DELETE FROM admin_login_rate_limits WHERE updated_at < ?")
    .bind(new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString())
    .run();
  // Identity, account-only, and source-IP buckets are incremented atomically.
  // The broader buckets prevent rotating email addresses or source IPs from
  // evading the per-credential limit.
  await db.batch(keys.map(({ scope, keyHash }) => db
    .prepare(`
      INSERT INTO admin_login_rate_limits (
        scope, key_hash, window_started_at, attempt_count, blocked_until, created_at, updated_at
      ) VALUES (?, ?, ?, 1, NULL, ?, ?)
      ON CONFLICT(scope, key_hash) DO UPDATE SET
        window_started_at = CASE
          WHEN admin_login_rate_limits.window_started_at <= ? THEN excluded.window_started_at
          ELSE admin_login_rate_limits.window_started_at
        END,
        attempt_count = CASE
          WHEN admin_login_rate_limits.blocked_until IS NOT NULL AND admin_login_rate_limits.blocked_until > ? THEN admin_login_rate_limits.attempt_count
          WHEN admin_login_rate_limits.window_started_at <= ? THEN 1
          ELSE admin_login_rate_limits.attempt_count + 1
        END,
        blocked_until = CASE
          WHEN admin_login_rate_limits.blocked_until IS NOT NULL AND admin_login_rate_limits.blocked_until > ? THEN admin_login_rate_limits.blocked_until
          WHEN admin_login_rate_limits.window_started_at <= ? THEN NULL
          WHEN admin_login_rate_limits.attempt_count + 1 > ? THEN ?
          ELSE NULL
        END,
        updated_at = ?
    `)
    .bind(
      scope,
      keyHash,
      nowIso,
      nowIso,
      nowIso,
      cutoff,
      nowIso,
      cutoff,
      nowIso,
      cutoff,
      LOGIN_MAX_ATTEMPTS,
      blockedUntil,
      nowIso,
    )));
  const predicates = keys.map(() => "(scope = ? AND key_hash = ?)").join(" OR ");
  const current = await db
    .prepare(`SELECT blocked_until FROM admin_login_rate_limits WHERE ${predicates}`)
    .bind(...keys.flatMap(({ scope, keyHash }) => [scope, keyHash]))
    .all<{ blocked_until: string | null }>();
  return current.results.some((row) => row.blocked_until && Date.parse(row.blocked_until) > now.getTime())
    ? "blocked"
    : "allowed";
}

async function clearLoginAttempts(
  db: Awaited<ReturnType<typeof getDatabase>>,
  email: string,
  request?: Request,
) {
  const keys = await loginRateLimitKeys(email, request);
  const predicates = keys.map(() => "(scope = ? AND key_hash = ?)").join(" OR ");
  await db
    .prepare(`DELETE FROM admin_login_rate_limits WHERE ${predicates}`)
    .bind(...keys.flatMap(({ scope, keyHash }) => [scope, keyHash]))
    .run();
}

async function loginRateLimitKeys(email: string, request?: Request) {
  const ip = request?.headers.get("cf-connecting-ip")?.trim() || "";
  const keys = [
    ...(ip ? [{ scope: "login_ip", material: `admin-login:ip:${ip}` }] : []),
    { scope: "login_account", material: `admin-login:account:${email}` },
    { scope: "login_identity", material: `admin-login:identity:${email}:${ip || "unknown"}` },
  ];
  return Promise.all(keys.map(async ({ scope, material }) => ({ scope, keyHash: await digestText(material) })));
}

async function getLegacyAuthConfig() {
  const runtime = await getRuntimeEnvironment();
  const adminEmail = normalizeEmail(runtime.ADMIN_EMAIL);
  const adminPassword = String(runtime.ADMIN_PASSWORD ?? "");
  const sessionSecret = String(runtime.SESSION_SECRET ?? "");
  return adminEmail && adminPassword && sessionSecret.length >= 32
    ? { adminEmail, adminPassword, sessionSecret }
    : null;
}

async function getRuntimeEnvironment(): Promise<AuthEnvironment> {
  try {
    const workers = (await import("cloudflare:workers")) as { env?: AuthEnvironment };
    if (workers.env) return workers.env;
  } catch {
    // Local tooling can use ignored development values.
  }
  const runtimeEnv = {
    ADMIN_EMAIL: process.env.ADMIN_EMAIL,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    SESSION_SECRET: process.env.SESSION_SECRET,
  };
  if (runtimeEnv.ADMIN_PASSWORD || runtimeEnv.SESSION_SECRET) return runtimeEnv;
  return { ...runtimeEnv, ...(await loadLocalDevEnvironment()) };
}

async function loadLocalDevEnvironment(): Promise<AuthEnvironment> {
  try {
    const { readFile } = await import("node:fs/promises");
    const contents = await readFile(new URL("../.dev.vars", import.meta.url), "utf8");
    return contents.split(/\r?\n/u).reduce<AuthEnvironment>((env, line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return env;
      const [key, ...rest] = trimmed.split("=");
      if (key) env[key as keyof AuthEnvironment] = rest.join("=");
      return env;
    }, {});
  } catch {
    return {};
  }
}

async function performDummyPasswordWork(password: string, key: string) {
  return performDummyAdminPasswordWork(password, key);
}

async function digestText(value: string) {
  return base64UrlEncode(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))));
}

async function constantTimeEqual(left: string, right: string) {
  return constantTimeEqualBytes(
    new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(left))),
    new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(right))),
  );
}

function constantTimeEqualBytes(left: Uint8Array, right: Uint8Array) {
  let difference = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (left[index % Math.max(left.length, 1)] ?? 0) ^ (right[index % Math.max(right.length, 1)] ?? 0);
  }
  return difference === 0;
}

async function sign(value: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return base64UrlEncode(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value))));
}

function randomToken() {
  return base64UrlEncode(crypto.getRandomValues(new Uint8Array(32)));
}

function base64UrlEncode(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

function base64UrlDecode(value: string) {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function readCookie(header: string | null, name: string) {
  if (!header) return null;
  const prefix = `${name}=`;
  const found = header.split(";").map((part) => part.trim()).find((part) => part.startsWith(prefix));
  return found ? found.slice(prefix.length) : null;
}

function isMissingAdminSchema(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /(?:no such table|not found).*?(?:admin_users|admin_sessions|admin_auth_settings|admin_login_rate_limits)/iu.test(message);
}
