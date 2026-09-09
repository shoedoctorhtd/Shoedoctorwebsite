"use client";

import { createContext, useContext, useEffect, type ReactNode, type ComponentProps } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ADMIN_MODULE_LINKS, canAccessAdminPath, hasAdminPermission, type AdminPermission } from "@/lib/admin-permission-policy";
import styles from "./AdminPermissions.module.css";

type Access = { role: string; permissions: readonly AdminPermission[] };
const AccessContext = createContext<Access>({ role: "admin", permissions: [] });

export default function AdminAccessProvider({ access, children }: { access: Access; children: ReactNode }) {
  const router = useRouter();
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === "visible") router.refresh(); };
    window.addEventListener("focus", refresh);
    window.addEventListener("pageshow", refresh);
    return () => { window.removeEventListener("focus", refresh); window.removeEventListener("pageshow", refresh); };
  }, [router]);
  return <AccessContext.Provider value={access}>{children}</AccessContext.Provider>;
}

export function useAdminAccess() {
  const access = useContext(AccessContext);
  return { ...access, can: (key: AdminPermission) => hasAdminPermission(access, key) };
}

/** Filter module and contextual navigation using the same path policy as the server. */
export function AdminLink(props: ComponentProps<typeof Link>) {
  const access = useContext(AccessContext);
  const href = typeof props.href === "string" ? props.href : props.href.pathname ?? "";
  if ((href === "/admin" || href.startsWith("/admin/")) && !canAccessAdminPath(access, href)) return null;
  return <Link {...props} />;
}

export function AdminModuleNav({ activeHref }: { activeHref?: string } = {}) {
  return <nav className={`admin-tabs ${styles.moduleNav}`} aria-label="Administrator modules">
    {ADMIN_MODULE_LINKS.map((link) => <AdminLink className={`admin-view-site-link${link.href === activeHref ? " active" : ""}`} aria-current={link.href === activeHref ? "page" : undefined} key={link.href} href={link.href}>{link.label}</AdminLink>)}
    <Link className="admin-view-site-link" href="/" target="_blank" rel="noreferrer">View website ↗</Link>
  </nav>;
}
