import { requireAdminUser } from "@/lib/admin-auth";
import AdminPasswordChangeForm from "@/app/components/AdminPasswordChangeForm";

export const dynamic = "force-dynamic";

export default async function ChangeAdminPasswordPage() {
  const user = await requireAdminUser("/admin/change-password");
  return <AdminPasswordChangeForm name={user.name} role={user.role} />;
}
