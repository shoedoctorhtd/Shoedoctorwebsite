"use client";

import { ADMIN_PERMISSION_GROUPS, ADMIN_PERMISSIONS, toggleAdminPermission, type AdminPermission } from "@/lib/admin-permission-policy";
import styles from "./AdminPermissions.module.css";

export default function AdminPermissionFields({ value, onChange, disabled = false }: { value: readonly AdminPermission[]; onChange: (value: AdminPermission[]) => void; disabled?: boolean }) {
  return <div className={styles.fields}>
    <div className={styles.heading}><h3>Access Permissions</h3><div className={styles.actions}>
      <button type="button" disabled={disabled} onClick={() => onChange([...ADMIN_PERMISSIONS])}>Select All</button>
      <button type="button" disabled={disabled} onClick={() => onChange([])}>Clear All</button>
    </div></div>
    <p className={styles.hint}>Assign only the access this administrator needs. Select a module and its required actions. Customer details stay within Bookings, Orders and Donations; community content uses the existing Donations module.</p>
    <div className={styles.groups}>{ADMIN_PERMISSION_GROUPS.map((group) => <fieldset key={group.label} disabled={disabled}>
      <legend>{group.label}</legend>
      {group.permissions.map((permission) => <label key={permission.key}>
        <input type="checkbox" checked={value.includes(permission.key)} onChange={(event) => onChange(toggleAdminPermission(value, permission.key, event.target.checked))} />
        <span><strong>{permission.label}</strong>{"description" in permission && <small>{permission.description}</small>}</span>
      </label>)}
    </fieldset>)}</div>
  </div>;
}
