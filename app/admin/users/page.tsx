import { requireSuperAdminUser } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import { listAdminUsers } from "@/lib/admin-users";
import AdminUsersDashboard from "@/app/components/AdminUsersDashboard";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const user = await requireSuperAdminUser("/admin/users");
  if (user.mustChangePassword) redirect("/admin/change-password");
  return <AdminUsersDashboard initialUsers={await listAdminUsers()} signedInName={user.name} signedInRole={user.role} />;
}
