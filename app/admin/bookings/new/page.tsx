import CounterBookingForm from "@/app/components/CounterBookingForm";
import { requireAdminUser } from "@/lib/admin-auth";
import { listServices } from "@/lib/data";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function NewCounterBookingPage() {
  const user = await requireAdminUser("/admin/bookings/new");
  if (user.mustChangePassword) redirect("/admin/change-password");
  return <CounterBookingForm services={await listServices(false)} name={user.name} role={user.role} />;
}
