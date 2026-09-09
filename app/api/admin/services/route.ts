import { requireAdminApi } from "@/lib/admin-auth";
import { createService, listServices } from "@/lib/data";
import { parseServiceInput } from "@/lib/validation";
import { deliverOwnerAlertEvent } from "@/lib/owner-alerts";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdminApi(request, { action: "SERVICE_LIST", permission: "services" });
  if (auth.response) return auth.response;
  return Response.json({ services: await listServices(true) }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const auth = await requireAdminApi(request, {
    action: "SERVICE_CREATE",
    mutation: true,
    permission: "services",
    entityType: "service",
  });
  if (auth.response) return auth.response;

  try {
    const service = await createService(
      parseServiceInput(await request.json()),
      auth.user,
    );
    if (service.ownerAlertEventId) await deliverOwnerAlertEvent(service.ownerAlertEventId);
    return Response.json({ service }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to add service.";
    return Response.json({ message }, { status: 400 });
  }
}
