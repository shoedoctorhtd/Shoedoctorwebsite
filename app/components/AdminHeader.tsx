"use client";

import { useState } from "react";
import { useAdminAccess, AdminModuleNav, AdminLink as Link } from "./AdminAccessProvider";
import { adminLandingPath } from "@/lib/admin-permission-policy";
import type { AdminRole } from "@/lib/admin-types";

type Props = {
  name: string;
  role: AdminRole;
  backHref?: string;
  backLabel?: string;
};

export default function AdminHeader({
  name,
  role,
  backHref = "/admin",
  backLabel = "Dashboard",
}: Props) {
  const access = useAdminAccess();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signOut() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/logout", { method: "POST" });
      if (!response.ok) throw new Error("Unable to sign out.");
      window.location.assign("/admin/login");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to sign out.");
      setBusy(false);
    }
  }

  return (
    <>
      <header className="admin-header">
        <Link className="admin-brand" href={adminLandingPath(access)}>
          <span>SD+</span>
          <div>
            <strong>Shoe Doctor</strong>
            <small>{role === "super_admin" ? "Super Admin dashboard" : "Operations dashboard"}</small>
          </div>
        </Link>
        <div className="admin-owner">
          <span>Signed in as {name} · {role === "super_admin" ? "Super Admin" : "Admin"}</span>
          <Link href={backHref}>{backLabel}</Link>
          <button type="button" onClick={() => void signOut()} disabled={busy}>
            {busy ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </header>
      <AdminModuleNav />
      {error ? <p className="admin-notice admin-notice--error" role="alert">{error}</p> : null}
    </>
  );
}
