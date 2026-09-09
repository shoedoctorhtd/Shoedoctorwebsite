import AdminDashboard from "./AdminDashboard";
import { requireAdminUser } from "@/lib/admin-auth";
import { hasAdminPermission } from "@/lib/admin-permission-policy";
import { listBookings, listServices } from "@/lib/data";

/** The existing bookings/services dashboard, shared across permission-scoped entry points. */
export default async function AdminHome({ section = "dashboard" }: { section?: "dashboard" | "bookings" | "services" }) {
  const user = await requireAdminUser(section === "dashboard" ? "/admin" : `/admin/${section}`);
  const canBook = hasAdminPermission(user, "bookings");
  const canService = hasAdminPermission(user, "services");
  const [services, bookings] = await Promise.all([
    canService ? listServices(true) : Promise.resolve([]),
    canBook ? listBookings() : Promise.resolve([]),
  ]);
  return <AdminDashboard key={`${user.role}:${user.permissions?.join(",")}:${section}`} initialServices={services} initialBookings={bookings} ownerName={user.name} ownerRole={user.role}
    initialTab={section === "services" || (section === "dashboard" && canService) ? "services" : "bookings"} />;
}
