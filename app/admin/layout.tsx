import type { ReactNode } from "react";
import { getAdminUser } from "@/lib/admin-auth";
import AdminAccessProvider from "@/app/components/AdminAccessProvider";

export const dynamic = "force-dynamic";
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getAdminUser();
  return <AdminAccessProvider access={{ role: user?.role ?? "admin", permissions: user?.permissions ?? [] }}>{children}</AdminAccessProvider>;
}
