import { requireAdminUser } from "@/lib/admin-auth";
import AdminHeader from "@/app/components/AdminHeader";

export const dynamic = "force-dynamic";
export default async function AccessDeniedPage() {
  const user = await requireAdminUser("/admin/access-denied");
  return <main id="main-content" className="admin-shell">
    <AdminHeader name={user.name} role={user.role} />
    <section className="admin-panel"><p className="section-kicker">Access denied</p><h1>Permission required</h1>
      <p>Your account does not have access to this section. A Super Admin can update your assigned permissions.</p>
    </section>
  </main>;
}
