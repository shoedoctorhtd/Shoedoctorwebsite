import { redirect } from "next/navigation";
import ProductAccessDashboard from "@/app/components/ProductAccessDashboard";
import { requireSuperAdminUser } from "@/lib/admin-auth";
import { listAdminUsers } from "@/lib/admin-users";
import { listProductAdminPermissions } from "@/lib/product-permissions";

export const dynamic = "force-dynamic";

export default async function ProductAccessPage() {
  const user = await requireSuperAdminUser("/admin/product-access");
  if (user.mustChangePassword) redirect("/admin/change-password");
  const users = await listAdminUsers();
  const normalUsers = users.filter((candidate) => candidate.role === "admin");
  const entries = await Promise.all(normalUsers.map(async (candidate) => [
    candidate.id,
    await listProductAdminPermissions(candidate.id),
  ] as const));
  return <ProductAccessDashboard initialUsers={users} initialPermissions={Object.fromEntries(entries)} />;
}
