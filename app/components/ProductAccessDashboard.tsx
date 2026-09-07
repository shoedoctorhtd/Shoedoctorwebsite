"use client";

import { useState } from "react";
import Link from "next/link";
import type { ManagedAdminUser } from "@/lib/admin-users";
import {
  PRODUCT_ADMIN_PERMISSIONS,
  type ProductAdminPermission,
} from "@/lib/product-permissions";
import styles from "./ProductAdmin.module.css";

const labels: Record<ProductAdminPermission, string> = {
  view_products: "View products",
  manage_products: "Manage products",
  change_product_prices: "Change prices",
  manage_product_images: "Manage images",
  view_inventory: "View inventory",
  adjust_inventory: "Adjust inventory",
  record_offline_sales: "Record offline sales",
  view_product_orders: "View product orders",
  manage_product_orders: "Manage product orders",
  cancel_product_orders: "Cancel product orders",
  verify_product_payments: "Verify product payments",
};

export default function ProductAccessDashboard({
  initialUsers,
  initialPermissions,
}: {
  initialUsers: ManagedAdminUser[];
  initialPermissions: Record<string, ProductAdminPermission[]>;
}) {
  const users = initialUsers.filter((user) => user.role === "admin");
  const [permissions, setPermissions] = useState(initialPermissions);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function toggle(userId: string, permission: ProductAdminPermission, checked: boolean) {
    setPermissions((current) => {
      const existing = new Set(current[userId] ?? []);
      if (checked) existing.add(permission);
      else existing.delete(permission);
      return { ...current, [userId]: PRODUCT_ADMIN_PERMISSIONS.filter((item) => existing.has(item)) };
    });
  }

  async function save(user: ManagedAdminUser) {
    setBusy(user.id);
    setNotice(null);
    setError(null);
    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(user.id)}/product-permissions`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ permissions: permissions[user.id] ?? [] }),
      });
      const result = await response.json() as { permissions?: ProductAdminPermission[]; message?: string };
      if (!response.ok || !result.permissions) throw new Error(result.message ?? "Unable to update product access.");
      setPermissions((current) => ({ ...current, [user.id]: result.permissions! }));
      setNotice(`${user.name}'s product permissions were updated.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to update product access.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <main id="main-content" className={styles.shell}>
      <nav className={styles.nav} aria-label="Administrator access navigation">
        <Link href="/admin">Dashboard</Link>
        <Link href="/admin/users">Admin users</Link>
      </nav>
      <section className={styles.intro}>
        <p className="section-kicker">Access control</p>
        <h1>PRODUCT ACCESS</h1>
        <p>Super Admins automatically have every product capability. Assign normal Admins only the product permissions they need.</p>
      </section>
      {notice ? <p className={styles.notice} role="status">{notice}</p> : null}
      {error ? <p className={`${styles.notice} ${styles.error}`} role="alert">{error}</p> : null}
      <section className={styles.panel}>
        <div className={styles.panelHead}><h2>Normal Administrators</h2><span>{users.length} account{users.length === 1 ? "" : "s"}</span></div>
        {users.length ? <div className={styles.permissionGrid}>{users.map((user) => <article className={styles.permissionRow} key={user.id}>
          <div><strong>{user.name}</strong><small>{user.email}</small><small>{user.active ? "Active" : "Inactive — permissions are retained until reactivated"}</small></div>
          <fieldset aria-label={`Product permissions for ${user.name}`}>
            <legend className="sr-only">Product permissions</legend>
            {PRODUCT_ADMIN_PERMISSIONS.map((permission) => <label key={permission}><input type="checkbox" checked={(permissions[user.id] ?? []).includes(permission)} onChange={(event) => toggle(user.id, permission, event.target.checked)} disabled={busy === user.id} /> {labels[permission]}</label>)}
          </fieldset>
          <button className={styles.primary} type="button" onClick={() => void save(user)} disabled={busy === user.id}>{busy === user.id ? "Saving…" : "Save access"}</button>
        </article>)}</div> : <p>No normal Admin accounts exist yet. Create one from Admin users, then assign its product access here.</p>}
      </section>
    </main>
  );
}
