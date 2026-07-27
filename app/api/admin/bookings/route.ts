import { getAdminUser } from "@/lib/admin-auth";
import { listBookings } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await getAdminUser())) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }
  return Response.json({ bookings: await listBookings() });
}
