import AdminDashboard from "../components/AdminDashboard";
import { requireAdminUser } from "@/lib/admin-auth";
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

  let services: Service[];
  let bookings: Booking[];

  try {
    [services, bookings] = await Promise.all([
      listServices(true),
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
      ownerName={user.displayName}
    />
  );
}
