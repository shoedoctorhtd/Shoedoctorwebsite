import type { ReactNode } from "react";
import type { Metadata } from "next";
import { getAdminUser } from "@/lib/admin-auth";
import AdminAccessProvider from "@/app/components/AdminAccessProvider";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getAdminUser();
  return <AdminAccessProvider access={{ role: user?.role ?? "admin", permissions: user?.permissions ?? [] }}>{children}</AdminAccessProvider>;
}
