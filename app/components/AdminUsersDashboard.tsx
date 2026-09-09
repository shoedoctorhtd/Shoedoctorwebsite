"use client";

import { FormEvent, useState, useEffect, useRef } from "react";
import type { ManagedAdminUser } from "@/lib/admin-users";
import type { AdminRole } from "@/lib/admin-types";
import AdminHeader from "@/app/components/AdminHeader";

import AdminPermissionFields from "./AdminPermissionFields";
import type { AdminPermission } from "@/lib/admin-permission-policy";
import styles from "./AdminPermissions.module.css";

type Props = { initialUsers: ManagedAdminUser[]; signedInName: string; signedInRole: AdminRole };

function formatDate(value: string | null) {
  if (!value) return "Never";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-NP", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Kathmandu",
      }).format(date);
}

export default function AdminUsersDashboard({ initialUsers, signedInName, signedInRole }: Props) {
  const canManage = signedInRole === "super_admin";
  const [newPermissions, setNewPermissions] = useState<AdminPermission[]>([]);
  const [accessEditor, setAccessEditor] = useState<ManagedAdminUser | null>(null);
  const [selected, setSelected] = useState<AdminPermission[]>([]);
  const [accessError, setAccessError] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (accessEditor) dialog.current?.showModal(); }, [accessEditor]);
  const [users, setUsers] = useState(initialUsers);
  const [notice, setNotice] = useState<string | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<"admin" | "super_admin">("admin");

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setBusy("create");
    setNotice(null);
    setTemporaryPassword(null);
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          role: formData.get("role"),
          confirmation: formData.get("confirmation"),
          permissions: newRole === "admin" ? newPermissions : [],
        }),
      });
      const result = (await response.json()) as { user?: ManagedAdminUser; temporaryPassword?: string; message?: string };
      if (!response.ok || !result.user || !result.temporaryPassword) throw new Error(result.message || "Unable to create administrator.");
      setUsers((current) => [...current, result.user!]);
      setTemporaryPassword(result.temporaryPassword);
      form.reset();
      setNewRole("admin");
      setNewPermissions([]);
      setNotice("Administrator created. Give the temporary password to them through a secure channel.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to create administrator.");
    } finally {
      setBusy(null);
    }
  }

  async function updateUser(
    user: ManagedAdminUser,
    body: Record<string, unknown>,
    label: string,
  ) {
    const confirmation = window.prompt(`Type ${user.email} to confirm ${label.toLowerCase()}.`);
    if (confirmation === null) return;
    setBusy(user.id);
    setNotice(null);
    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(user.id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...body, confirmation, updatedAt: user.updatedAt }),
      });
      const result = (await response.json()) as { user?: ManagedAdminUser; message?: string };
      if (!response.ok || !result.user) throw new Error(result.message || `Unable to ${label.toLowerCase()}.`);
      setUsers((current) => current.map((candidate) => candidate.id === user.id ? result.user! : candidate));
      setNotice(`${user.name}: ${label} complete.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : `Unable to ${label.toLowerCase()}.`);
    } finally {
      setBusy(null);
    }
  }

  async function resetAccess(user: ManagedAdminUser) {
    const confirmation = window.prompt(`Type ${user.email} to confirm the access reset.`);
    if (confirmation === null) return;
    setBusy(user.id);
    setNotice(null);
    setTemporaryPassword(null);
    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(user.id)}/reset`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirmation, updatedAt: user.updatedAt }),
      });
      const result = (await response.json()) as { user?: ManagedAdminUser; temporaryPassword?: string; message?: string };
      if (!response.ok || !result.temporaryPassword || !result.user) throw new Error(result.message || "Unable to reset access.");
      setUsers((current) => current.map((candidate) => candidate.id === user.id ? result.user! : candidate));
      setTemporaryPassword(result.temporaryPassword);
      setNotice(`${user.name}'s sessions were revoked and a new temporary password was created.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to reset access.");
    } finally {
      setBusy(null);
    }
  }

  async function manageAccess(user: ManagedAdminUser) {
    setBusy(user.id); setNotice(null); setAccessError(null);
    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(user.id)}/permissions`, { cache: "no-store" });
      const result = await response.json() as { user?: ManagedAdminUser; message?: string };
      if (!response.ok || !result.user) throw new Error(result.message ?? "Unable to load access.");
      setSelected(result.user.permissions ?? []); setAccessEditor(result.user);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to load access."); }
    finally { setBusy(null); }
  }

  async function savePermissions(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!accessEditor) return;
    setBusy(accessEditor.id); setAccessError(null);
    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(accessEditor.id)}/permissions`, {
        method: "PUT", headers: { "content-type": "application/json" },
        body: JSON.stringify({ permissions: selected, updatedAt: accessEditor.updatedAt }),
      });
      const result = await response.json() as { permissions?: AdminPermission[]; updatedAt?: string; message?: string };
      if (!response.ok || !result.permissions || !result.updatedAt) throw new Error(result.message ?? "Unable to save access.");
      setUsers((current) => current.map((user) => user.id === accessEditor.id ? { ...user, permissions: result.permissions!, updatedAt: result.updatedAt! } : user));
      setNotice(`Permissions saved for ${accessEditor.name}. Access changes apply on their next server request.`);
      dialog.current?.close(); setAccessEditor(null);
    } catch (error) { setAccessError(error instanceof Error ? error.message : "Unable to save access."); }
    finally { setBusy(null); }
  }

  return (
    <main id="main-content" className="admin-shell admin-management-shell">
      <AdminHeader name={signedInName} role={signedInRole} />
      <section className="admin-welcome"><p className="section-kicker">Access control</p><h1>ADMIN USERS</h1><p>Each Admin uses an individual account with assigned access. Super Admins retain all permissions.</p></section>
      {notice && <p className="admin-notice" role="status">{notice}</p>}
      {temporaryPassword && <section className="admin-sensitive-result"><strong>Temporary password</strong><code>{temporaryPassword}</code><p>Copy it now. It is not stored or shown again.</p></section>}
      {canManage && <section className="admin-panel">
        <div className="admin-panel-heading"><div><p className="section-kicker">New account</p><h2>Create an administrator</h2></div></div>
        <form className="admin-form-grid" onSubmit={createUser}>
          <label><span>Name</span><input name="name" minLength={2} maxLength={120} required /></label>
          <label><span>Email</span><input name="email" type="email" maxLength={160} required /></label>
          <label><span>Role</span><select name="role" value={newRole} onChange={(event) => setNewRole(event.target.value as "admin" | "super_admin")}><option value="admin">Admin</option><option value="super_admin">Super Admin</option></select></label>
          {newRole === "super_admin" ? <label className="full-field"><span>Confirm Super Admin email</span><input name="confirmation" type="email" required placeholder="Type the new Super Admin email exactly" /></label> : null}
          {newRole === "admin" ? <AdminPermissionFields value={newPermissions} onChange={setNewPermissions} disabled={busy === "create"} /> : <p className="full-field">Super Admin automatically has all access. Individual permissions cannot restrict this role.</p>}
          <div className="modal-actions"><button className="admin-primary" type="submit" disabled={busy === "create"}>{busy === "create" ? "Creating…" : "Create administrator"}</button></div>
        </form>
      </section>}
      <section className="admin-panel">
        <div className="admin-panel-heading"><div><p className="section-kicker">Named accounts</p><h2>Administrator access</h2></div></div>
        <div className="admin-user-list">
          {users.map((user) => (
            <article className="admin-user-row" key={user.id}>
              <div><strong>{user.name}</strong><span>{user.email}</span><small>Created {formatDate(user.createdAt)} · Last login {formatDate(user.lastLoginAt)}</small></div>
              <div><span className={`admin-role-pill ${user.role}`}>{user.role === "super_admin" ? "Super Admin" : "Admin"}</span><span className={user.active ? "status-pill ready" : "status-pill cancelled"}>{user.active ? "Active" : "Inactive"}</span>{user.mustChangePassword && <small>Temporary password pending</small>}</div>
              {canManage && <div className="admin-row-actions">
                <button className="admin-primary" type="button" disabled={busy !== null} onClick={() => void manageAccess(user)}>Manage Access</button>
                <button type="button" disabled={busy === user.id} onClick={() => void updateUser(user, { operation: "set_active", active: !user.active }, user.active ? "Deactivate" : "Activate")}>{user.active ? "Deactivate" : "Activate"}</button>
                <button type="button" disabled={busy === user.id} onClick={() => void updateUser(user, { operation: "set_role", role: user.role === "admin" ? "super_admin" : "admin" }, user.role === "admin" ? "Promote" : "Demote")}>{user.role === "admin" ? "Promote" : "Demote"}</button>
                <button type="button" disabled={busy === user.id || !user.active} onClick={() => void resetAccess(user)}>Reset access</button>
              </div>}
            </article>
          ))}
        </div>
      </section>
      {canManage && <dialog ref={dialog} className={styles.dialog} onCancel={(event) => { if (busy) event.preventDefault(); else setAccessEditor(null); }} aria-labelledby="manage-access-title">
        {accessEditor && <form onSubmit={savePermissions}>
          <div className={styles.heading}><h2 id="manage-access-title">Manage Access: {accessEditor.name}</h2><button className="admin-secondary" type="button" disabled={busy !== null} onClick={() => { dialog.current?.close(); setAccessEditor(null); }}>Close</button></div>
          <p>{accessEditor.email}</p>
          {accessEditor.role === "super_admin" ? <p>Super Admin automatically has every permission. These permissions cannot restrict this account.</p> : <>
            <AdminPermissionFields value={selected} onChange={setSelected} disabled={busy !== null} />
            {accessError && <p className="admin-notice admin-notice--error" role="alert">{accessError}</p>}
            <div className="modal-actions"><button className="admin-primary" type="submit" disabled={busy !== null}>{busy ? "Saving..." : "Save Permissions"}</button></div>
          </>}
        </form>}
      </dialog>}
    </main>
  );
}
