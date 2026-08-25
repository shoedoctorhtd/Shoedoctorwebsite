import { redirect } from "next/navigation";
import DeletedBookingsDashboard from "@/app/components/DeletedBookingsDashboard";
import { requireSuperAdminUser } from "@/lib/admin-auth";
import { listDeletedBookings } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function DeletedBookingsPage() {
  const user = await requireSuperAdminUser("/admin/deleted-bookings");
  if (user.mustChangePassword) redirect("/admin/change-password");
  return <DeletedBookingsDashboard initialBookings={await listDeletedBookings()} name={user.name} role={user.role} />;
}
