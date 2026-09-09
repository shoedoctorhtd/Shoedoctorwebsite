import { redirect } from "next/navigation";
import { requireSuperAdminUser } from "@/lib/admin-auth";
export const dynamic = "force-dynamic";
export default async function ProductAccessPage() {
  await requireSuperAdminUser("/admin/product-access");
  redirect("/admin/users");
}
