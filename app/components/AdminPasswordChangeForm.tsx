"use client";

import { FormEvent, useState } from "react";
import AdminHeader from "@/app/components/AdminHeader";
import type { AdminRole } from "@/lib/admin-types";

type Props = { name: string; role: AdminRole };

export default function AdminPasswordChangeForm({ name, role }: Props) {
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nextPassword = String(form.get("nextPassword") ?? "");
    const confirmation = String(form.get("confirmation") ?? "");
    if (nextPassword !== confirmation) {
      setMessage("The new password and confirmation do not match.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/account/password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          currentPassword: form.get("currentPassword"),
          nextPassword,
        }),
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(result.message || "Unable to change password.");
      window.location.assign("/admin");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Unable to change password.");
      setBusy(false);
    }
  }

  return (
    <main id="main-content" className="admin-shell admin-management-shell">
      <AdminHeader name={name} role={role} />
      <section className="admin-welcome admin-welcome--compact">
        <div>
          <p className="section-kicker">First sign-in security</p>
          <h1>SET YOUR<br />PASSWORD.</h1>
          <p>Your temporary password can only be used to sign in. Choose a unique password before continuing.</p>
        </div>
      </section>
      {message ? <p className="admin-notice admin-notice--error" role="alert">{message}</p> : null}
      <section className="admin-panel">
        <form className="admin-form-grid admin-form-grid--narrow" onSubmit={submit}>
          <label className="full-field"><span>Temporary or current password</span><input name="currentPassword" type="password" autoComplete="current-password" required maxLength={256} /></label>
          <label><span>New password</span><input name="nextPassword" type="password" autoComplete="new-password" required minLength={12} maxLength={256} /></label>
          <label><span>Confirm new password</span><input name="confirmation" type="password" autoComplete="new-password" required minLength={12} maxLength={256} /></label>
          <p className="admin-form-help full-field">Use at least 12 characters. Do not reuse a customer-facing or shared password.</p>
          <div className="modal-actions full-field"><button className="admin-primary" type="submit" disabled={busy}>{busy ? "Saving…" : "Save secure password"}</button></div>
        </form>
      </section>
    </main>
  );
}
