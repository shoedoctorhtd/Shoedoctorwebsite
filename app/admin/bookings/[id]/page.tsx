import { notFound, redirect } from "next/navigation";
import BookingDetailsDashboard from "@/app/components/BookingDetailsDashboard";
import { requireAdminUser } from "@/lib/admin-auth";
import { listBookingAuditLogs } from "@/lib/audit";
import { getBookingForAdmin, listServices } from "@/lib/data";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function BookingDetailsPage({ params }: Props) {
  const { id } = await params;
  const user = await requireAdminUser(`/admin/bookings/${encodeURIComponent(id)}`);
  if (user.mustChangePassword) redirect("/admin/change-password");
  const booking = await getBookingForAdmin(id, user.role === "super_admin");
  if (!booking) notFound();
  const audit = user.role === "super_admin"
    ? await listBookingAuditLogs(booking.id, booking.publicReference)
    : [];
  return <BookingDetailsDashboard initialBooking={booking} name={user.name} role={user.role} audit={audit} services={user.role === "super_admin" ? await listServices(true) : []} />;
}
