import AdminDashboard from "../components/AdminDashboard";
import { requireAdminUser } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import {
  getSeedServices,
  listBookings,
  listServices,
  type Booking,
  type Service,
} from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await requireAdminUser("/admin");
  if (user.mustChangePassword) redirect("/admin/change-password");

  let services: Service[];
  let bookings: Booking[];

  try {
    [services, bookings] = await Promise.all([
      user.role === "super_admin" ? listServices(true) : Promise.resolve([]),
      listBookings(),
    ]);
  } catch {
    services = getSeedServices();
    bookings = [];
  }

  return (
    <AdminDashboard
      initialServices={services}
      initialBookings={bookings}
      ownerName={user.name}
      ownerRole={user.role}
    />
  );
}
