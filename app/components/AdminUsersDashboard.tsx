"use client";

import { FormEvent, useState } from "react";
import type { ManagedAdminUser } from "@/lib/admin-users";
import type { AdminRole } from "@/lib/admin-types";
import AdminHeader from "@/app/components/AdminHeader";

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
        }),
      });
      const result = (await response.json()) as { user?: ManagedAdminUser; temporaryPassword?: string; message?: string };
      if (!response.ok || !result.user || !result.temporaryPassword) throw new Error(result.message || "Unable to create administrator.");
      setUsers((current) => [...current, result.user!]);
      setTemporaryPassword(result.temporaryPassword);
      form.reset();
      setNewRole("admin");
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

  return (
    <main id="main-content" className="admin-shell admin-management-shell">
      <AdminHeader name={signedInName} role={signedInRole} />
      <section className="admin-welcome"><p className="section-kicker">Access control</p><h1>ADMIN USERS</h1><p>Create individual accounts. Temporary passwords are displayed once and must be changed at first sign-in.</p></section>
      {notice && <p className="admin-notice" role="status">{notice}</p>}
      {temporaryPassword && <section className="admin-sensitive-result"><strong>Temporary password</strong><code>{temporaryPassword}</code><p>Copy it now. It is not stored or shown again.</p></section>}
      <section className="admin-panel">
        <div className="admin-panel-heading"><div><p className="section-kicker">New account</p><h2>Create an administrator</h2></div></div>
        <form className="admin-form-grid" onSubmit={createUser}>
          <label><span>Name</span><input name="name" minLength={2} maxLength={120} required /></label>
          <label><span>Email</span><input name="email" type="email" maxLength={160} required /></label>
          <label><span>Role</span><select name="role" value={newRole} onChange={(event) => setNewRole(event.target.value as "admin" | "super_admin")}><option value="admin">Admin</option><option value="super_admin">Super Admin</option></select></label>
          {newRole === "super_admin" ? <label className="full-field"><span>Confirm Super Admin email</span><input name="confirmation" type="email" required placeholder="Type the new Super Admin email exactly" /></label> : null}
          <div className="modal-actions"><button className="admin-primary" type="submit" disabled={busy === "create"}>{busy === "create" ? "Creating…" : "Create administrator"}</button></div>
        </form>
      </section>
      <section className="admin-panel">
        <div className="admin-panel-heading"><div><p className="section-kicker">Named accounts</p><h2>Administrator access</h2></div></div>
        <div className="admin-user-list">
          {users.map((user) => (
            <article className="admin-user-row" key={user.id}>
              <div><strong>{user.name}</strong><span>{user.email}</span><small>Created {formatDate(user.createdAt)} · Last login {formatDate(user.lastLoginAt)}</small></div>
              <div><span className={`admin-role-pill ${user.role}`}>{user.role === "super_admin" ? "Super Admin" : "Admin"}</span><span className={user.active ? "status-pill ready" : "status-pill cancelled"}>{user.active ? "Active" : "Inactive"}</span>{user.mustChangePassword && <small>Temporary password pending</small>}</div>
              <div className="admin-row-actions">
                <button type="button" disabled={busy === user.id} onClick={() => void updateUser(user, { operation: "set_active", active: !user.active }, user.active ? "Deactivate" : "Activate")}>{user.active ? "Deactivate" : "Activate"}</button>
                <button type="button" disabled={busy === user.id} onClick={() => void updateUser(user, { operation: "set_role", role: user.role === "admin" ? "super_admin" : "admin" }, user.role === "admin" ? "Promote" : "Demote")}>{user.role === "admin" ? "Promote" : "Demote"}</button>
                <button type="button" disabled={busy === user.id || !user.active} onClick={() => void resetAccess(user)}>Reset access</button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
