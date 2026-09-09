import { buildAuditLogInsert, buildOwnerAlertEventInsert } from "./audit";
import { getDatabase } from "./data";
import { hashPassword, normalizeEmail, verifyPassword } from "./admin-auth";
import type { AdminActor, AdminRole } from "./admin-types";
import { assertAdminPermissionSchema, assertPermissionManager, listAdminPermissions, permissionGrantStatements } from "./admin-permissions";
import { parseAdminPermissions, permissionLabel, type AdminPermission } from "./admin-permission-policy";

export type ManagedAdminUser = {
  permissions?: AdminPermission[];
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  active: boolean;
  createdAt: string;
  createdByAdminId: string | null;
  updatedAt: string;
  lastLoginAt: string | null;
  mustChangePassword: boolean;
};

type AdminRow = {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  active: number;
  created_at: string;
  created_by_admin_id: string | null;
  updated_at: string;
  last_login_at: string | null;
  must_change_password: number;
  password_hash?: string;
};

export async function listAdminUsers(): Promise<ManagedAdminUser[]> {
  const db = await getDatabase();
  const result = await db
    .prepare(`
      SELECT id, name, email, role, active, created_at, created_by_admin_id,
             updated_at, last_login_at, must_change_password
      FROM admin_users
      ORDER BY active DESC, role ASC, created_at ASC
    `)
    .all<AdminRow>();
  return Promise.all(result.results.map(async (row) => ({ ...parseAdminUser(row), permissions: row.role === "admin" ? await listAdminPermissions(row.id) : [] })));
}

export async function getManagedAdminUser(id: string): Promise<ManagedAdminUser | null> {
  const db = await getDatabase();
  const row = await findAdmin(db, id);
  return row ? { ...parseAdminUser(row), permissions: row.role === "admin" ? await listAdminPermissions(row.id) : [] } : null;
}

export async function createManagedAdmin(
  input: { name: unknown; email: unknown; role: unknown; confirmation?: unknown; permissions?: unknown },
  actor: AdminActor,
) {
  await assertPermissionManager(actor);
  await assertAdminPermissionSchema();
  const name = cleanName(input.name);
  const email = normalizeEmail(input.email);
  const role = input.role === "super_admin" ? "super_admin" : input.role === "admin" ? "admin" : null;
  if (!name || !email || !role) throw new Error("Name, email, and a valid role are required.");
  const permissions = role === "super_admin" ? [] : parseAdminPermissions(input.permissions ?? []);
  if (role === "super_admin" && normalizeEmail(input.confirmation) !== email) {
    throw new Error("Type the new Super Admin email to confirm this role assignment.");
  }

  const db = await getDatabase();
  const existing = await db
    .prepare("SELECT id FROM admin_users WHERE email_normalized = ?")
    .bind(email)
    .first<{ id: string }>();
  if (existing) throw new Error("An administrator with that email already exists.");

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);
  const id = crypto.randomUUID();
  const auditId = crypto.randomUUID();
  const ownerAlertEventId = crypto.randomUUID();
  const now = new Date().toISOString();
  const snapshot = { name, email, role, active: true, mustChangePassword: true, permissions, granted: permissions.map(permissionLabel), removed: [] };
  await db.batch([
    db
      .prepare(`
        INSERT INTO admin_users (
          id, name, email, email_normalized, password_hash, role, active,
          created_at, created_by_admin_id, updated_at, must_change_password
        ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, 1)
      `)
      .bind(id, name, email, email, passwordHash, role, now, actor.id, now),
    ...permissionGrantStatements(db, id, permissions, actor.id, now),
    buildAuditLogInsert(db, {
      id: auditId,
      actor,
      action: "ADMIN_USER_CREATED",
      entityType: "admin_user",
      entityId: id,
      newValues: snapshot,
      changedFields: Object.keys(snapshot),
      createdAt: now,
    }),
    buildOwnerAlertEventInsert(db, {
      id: ownerAlertEventId,
      auditLogId: auditId,
      alertType: "ADMIN_USER_CREATED",
      createdAt: now,
    }),
  ]);
  return {
    user: {
      id,
      name,
      email,
      role,
      active: true,
      createdAt: now,
      createdByAdminId: actor.id,
      updatedAt: now,
      lastLoginAt: null,
      mustChangePassword: true,
      permissions,
    } satisfies ManagedAdminUser,
    temporaryPassword,
    ownerAlertEventId,
  };
}

export async function setManagedAdminActive(
  targetId: string,
  active: boolean,
  actor: AdminActor,
  expectedUpdatedAt?: string | null,
) {
  await assertPermissionManager(actor);
  const db = await getDatabase();
  const target = await findAdmin(db, targetId);
  if (!target) return { kind: "not_found" as const };
  if (!expectedUpdatedAt || target.updated_at !== expectedUpdatedAt) return { kind: "conflict" as const };
  if (target.active === (active ? 1 : 0)) return { kind: "unchanged" as const, user: parseAdminUser(target) };
  if (!active && target.id === actor.id) return { kind: "self_protected" as const };
  if (!active && target.role === "super_admin" && (await activeSuperAdminCount(db)) <= 1) {
    return { kind: "final_super_admin" as const };
  }

  const now = new Date().toISOString();
  const auditId = crypto.randomUUID();
  const ownerAlertEventId = crypto.randomUUID();
  const operationId = crypto.randomUUID();
  const before = accountSnapshot(target);
  const after = { ...before, active };
  const batch = await db.batch([
    db
      .prepare("UPDATE admin_users SET active = ?, updated_at = ?, last_mutation_id = ? WHERE id = ? AND active = ? AND updated_at = ?")
      .bind(active ? 1 : 0, now, operationId, targetId, target.active, target.updated_at),
    ...(!active
      ? [
          db
            .prepare(`
              UPDATE admin_sessions SET revoked_at = ?
              WHERE admin_user_id = ? AND revoked_at IS NULL
                AND EXISTS (SELECT 1 FROM admin_users WHERE id = ? AND active = 0 AND last_mutation_id = ?)
            `)
            .bind(now, targetId, targetId, operationId),
        ]
      : []),
    buildAuditLogInsert(db, {
      id: auditId,
      actor,
      action: active ? "ADMIN_USER_ACTIVATED" : "ADMIN_USER_DEACTIVATED",
      entityType: "admin_user",
      entityId: targetId,
      previousValues: before,
      newValues: after,
      changedFields: ["active"],
      createdAt: now,
      conditionalOn: {
        sql: "EXISTS (SELECT 1 FROM admin_users WHERE id = ? AND last_mutation_id = ?)",
        bindings: [targetId, operationId],
      },
    }),
    buildOwnerAlertEventInsert(db, {
      id: ownerAlertEventId,
      auditLogId: auditId,
      alertType: active ? "ADMIN_USER_ACTIVATED" : "ADMIN_USER_DEACTIVATED",
      createdAt: now,
      conditionalOn: {
        sql: "EXISTS (SELECT 1 FROM admin_users WHERE id = ? AND last_mutation_id = ?)",
        bindings: [targetId, operationId],
      },
    }),
  ]);
  if (!batch[0]?.meta.changes) {
    const current = await findAdmin(db, targetId);
    return current && current.active === (active ? 1 : 0)
      ? { kind: "unchanged" as const, user: parseAdminUser(current) }
      : { kind: "conflict" as const };
  }
  if (!batch.at(-1)?.meta.changes || !batch[active ? 1 : 2]?.meta.changes) {
    throw new Error("Unable to preserve the administrator account audit record.");
  }
  return { kind: "updated" as const, user: { ...parseAdminUser(target), active, updatedAt: now }, ownerAlertEventId };
}

export async function changeManagedAdminRole(
  targetId: string,
  role: AdminRole,
  actor: AdminActor,
  expectedUpdatedAt?: string | null,
) {
  await assertPermissionManager(actor);
  const db = await getDatabase();
  const target = await findAdmin(db, targetId);
  if (!target) return { kind: "not_found" as const };
  if (!expectedUpdatedAt || target.updated_at !== expectedUpdatedAt) return { kind: "conflict" as const };
  if (target.role === role) return { kind: "unchanged" as const, user: parseAdminUser(target) };
  if (target.id === actor.id) return { kind: "self_protected" as const };
  if (target.active === 1 && target.role === "super_admin" && role !== "super_admin" && (await activeSuperAdminCount(db)) <= 1) {
    return { kind: "final_super_admin" as const };
  }

  const now = new Date().toISOString();
  const auditId = crypto.randomUUID();
  const ownerAlertEventId = crypto.randomUUID();
  const operationId = crypto.randomUUID();
  const before = accountSnapshot(target);
  const after = { ...before, role };
  const batch = await db.batch([
    db.prepare("UPDATE admin_users SET role = ?, updated_at = ?, last_mutation_id = ? WHERE id = ? AND role = ? AND updated_at = ?").bind(role, now, operationId, targetId, target.role, target.updated_at),
    db
      .prepare(`
        UPDATE admin_sessions SET revoked_at = ?
        WHERE admin_user_id = ? AND revoked_at IS NULL
          AND EXISTS (SELECT 1 FROM admin_users WHERE id = ? AND role = ? AND last_mutation_id = ?)
      `)
      .bind(now, targetId, targetId, role, operationId),
    buildAuditLogInsert(db, {
      id: auditId,
      actor,
      action: "ADMIN_ROLE_CHANGED",
      entityType: "admin_user",
      entityId: targetId,
      previousValues: before,
      newValues: after,
      changedFields: ["role"],
      createdAt: now,
      conditionalOn: {
        sql: "EXISTS (SELECT 1 FROM admin_users WHERE id = ? AND last_mutation_id = ?)",
        bindings: [targetId, operationId],
      },
    }),
    buildOwnerAlertEventInsert(db, {
      id: ownerAlertEventId,
      auditLogId: auditId,
      alertType: "ADMIN_ROLE_CHANGED",
      createdAt: now,
      conditionalOn: {
        sql: "EXISTS (SELECT 1 FROM admin_users WHERE id = ? AND last_mutation_id = ?)",
        bindings: [targetId, operationId],
      },
    }),
  ]);
  if (!batch[0]?.meta.changes) {
    const current = await findAdmin(db, targetId);
    return current && current.role === role
      ? { kind: "unchanged" as const, user: parseAdminUser(current) }
      : { kind: "conflict" as const };
  }
  if (!batch[2]?.meta.changes || !batch[3]?.meta.changes) {
    throw new Error("Unable to preserve the administrator role audit record.");
  }
  return { kind: "updated" as const, user: { ...parseAdminUser(target), role, updatedAt: now }, ownerAlertEventId };
}

export async function resetManagedAdminAccess(
  targetId: string,
  actor: AdminActor,
  expectedUpdatedAt?: string | null,
) {
  await assertPermissionManager(actor);
  const db = await getDatabase();
  const target = await findAdmin(db, targetId);
  if (!target) return { kind: "not_found" as const };
  if (!expectedUpdatedAt || target.updated_at !== expectedUpdatedAt) return { kind: "conflict" as const };
  if (!target.active) return { kind: "inactive" as const };
  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);
  const now = new Date().toISOString();
  const auditId = crypto.randomUUID();
  const ownerAlertEventId = crypto.randomUUID();
  const operationId = crypto.randomUUID();
  const batch = await db.batch([
    db
      .prepare(`
        UPDATE admin_users
        SET password_hash = ?, must_change_password = 1, updated_at = ?, last_mutation_id = ?
        WHERE id = ? AND active = 1 AND updated_at = ?
      `)
      .bind(passwordHash, now, operationId, targetId, target.updated_at),
    db
      .prepare(`
        UPDATE admin_sessions SET revoked_at = ?
        WHERE admin_user_id = ? AND revoked_at IS NULL
          AND EXISTS (SELECT 1 FROM admin_users WHERE id = ? AND active = 1 AND must_change_password = 1 AND last_mutation_id = ?)
      `)
      .bind(now, targetId, targetId, operationId),
    buildAuditLogInsert(db, {
      id: auditId,
      actor,
      action: "ADMIN_ACCESS_RESET",
      entityType: "admin_user",
      entityId: targetId,
      previousValues: { mustChangePassword: target.must_change_password === 1 },
      newValues: { mustChangePassword: true, sessionsRevoked: true },
      changedFields: ["access", "sessions"],
      reason: "Secure administrator access reset",
      createdAt: now,
      conditionalOn: {
        sql: "EXISTS (SELECT 1 FROM admin_users WHERE id = ? AND last_mutation_id = ?)",
        bindings: [targetId, operationId],
      },
    }),
    buildOwnerAlertEventInsert(db, {
      id: ownerAlertEventId,
      auditLogId: auditId,
      alertType: "ADMIN_ACCESS_RESET",
      createdAt: now,
      conditionalOn: {
        sql: "EXISTS (SELECT 1 FROM admin_users WHERE id = ? AND last_mutation_id = ?)",
        bindings: [targetId, operationId],
      },
    }),
  ]);
  if (!batch[0]?.meta.changes || !batch[2]?.meta.changes || !batch[3]?.meta.changes) {
    const current = await findAdmin(db, targetId);
    return current?.active === 0 ? { kind: "inactive" as const } : { kind: "conflict" as const };
  }
  return {
    kind: "updated" as const,
    user: { ...parseAdminUser(target), mustChangePassword: true, updatedAt: now },
    temporaryPassword,
    ownerAlertEventId,
  };
}

export async function changeOwnAdminPassword(
  actor: AdminActor,
  currentPassword: string,
  nextPassword: string,
) {
  const db = await getDatabase();
  const target = await db
    .prepare("SELECT *, password_hash FROM admin_users WHERE id = ? AND active = 1")
    .bind(actor.id)
    .first<AdminRow>();
  if (!target) return { kind: "not_found" as const };
  if (!(await verifyPassword(currentPassword, String(target.password_hash ?? "")))) {
    return { kind: "credentials" as const };
  }
  const passwordHash = await hashPassword(nextPassword);
  const now = new Date().toISOString();
  const operationId = crypto.randomUUID();
  const batch = await db.batch([
    db
      .prepare(`
        UPDATE admin_users
        SET password_hash = ?, must_change_password = 0, updated_at = ?, last_mutation_id = ?
        WHERE id = ? AND password_hash = ? AND active = 1
      `)
      .bind(passwordHash, now, operationId, actor.id, String(target.password_hash ?? "")),
    db
      .prepare("UPDATE admin_sessions SET revoked_at = ? WHERE admin_user_id = ? AND revoked_at IS NULL")
      .bind(now, actor.id),
    buildAuditLogInsert(db, {
      actor,
      action: "ADMIN_PASSWORD_CHANGED",
      entityType: "admin_user",
      entityId: actor.id,
      previousValues: { mustChangePassword: target.must_change_password === 1 },
      newValues: { mustChangePassword: false },
      changedFields: ["password", "sessions"],
      createdAt: now,
      conditionalOn: {
        sql: "EXISTS (SELECT 1 FROM admin_users WHERE id = ? AND last_mutation_id = ?)",
        bindings: [actor.id, operationId],
      },
    }),
  ]);
  if (!batch[0]?.meta.changes || !batch[2]?.meta.changes) {
    return { kind: "conflict" as const };
  }
  return { kind: "updated" as const };
}

async function findAdmin(db: Awaited<ReturnType<typeof getDatabase>>, id: string) {
  return db
    .prepare(`
      SELECT id, name, email, role, active, created_at, created_by_admin_id,
             updated_at, last_login_at, must_change_password
      FROM admin_users WHERE id = ?
    `)
    .bind(id)
    .first<AdminRow>();
}

async function activeSuperAdminCount(db: Awaited<ReturnType<typeof getDatabase>>) {
  const row = await db
    .prepare("SELECT COUNT(*) AS count FROM admin_users WHERE active = 1 AND role = 'super_admin'")
    .first<{ count: number }>();
  return Number(row?.count ?? 0);
}

function parseAdminUser(row: AdminRow): ManagedAdminUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    active: row.active === 1,
    createdAt: row.created_at,
    createdByAdminId: row.created_by_admin_id,
    updatedAt: row.updated_at,
    lastLoginAt: row.last_login_at,
    mustChangePassword: row.must_change_password === 1,
  };
}

function accountSnapshot(row: AdminRow) {
  return {
    name: row.name,
    email: row.email,
    role: row.role,
    active: row.active === 1,
    mustChangePassword: row.must_change_password === 1,
  };
}

function cleanName(value: unknown) {
  const name = String(value ?? "").trim().replace(/\s+/gu, " ");
  return name.length >= 2 && name.length <= 120 ? name : "";
}

function generateTemporaryPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}
