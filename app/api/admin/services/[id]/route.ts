import { requireAdminApi } from "@/lib/admin-auth";
import { deleteService, updateService } from "@/lib/data";
import { parseAdminUpdatedAt, parseServiceInput } from "@/lib/validation";
import { deliverOwnerAlertEvent } from "@/lib/owner-alerts";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdminApi(request, {
    action: "SERVICE_UPDATE",
    mutation: true,
    permission: "services",
    entityType: "service",
  });
  if (auth.response) return auth.response;

  try {
    const { id } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;
    const result = await updateService(
      id,
      parseServiceInput(body),
      auth.user,
      parseAdminUpdatedAt(body.updatedAt, "service"),
    );
    if (result.kind === "not_found") {
      return Response.json({ message: "Service not found." }, { status: 404 });
    }
    if (result.kind === "conflict") {
      return Response.json({ message: "This service changed. Refresh and try again.", service: result.service }, { status: 409 });
    }
    if (result.service.ownerAlertEventId) await deliverOwnerAlertEvent(result.service.ownerAlertEventId);
    return Response.json({ service: result.service });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update service.";
    return Response.json({ message }, { status: 400 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await requireAdminApi(request, {
    action: "SERVICE_DELETE",
    mutation: true,
    permission: "services",
    entityType: "service",
  });
  if (auth.response) return auth.response;
  try {
    const { id } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;
    const result = await deleteService(id, auth.user, parseAdminUpdatedAt(body.updatedAt, "service"));
    if (result.kind === "not_found") return Response.json({ message: "Service not found." }, { status: 404 });
    if (result.kind === "conflict") return Response.json({ message: "This service changed. Refresh and try again.", service: result.service }, { status: 409 });
    if (result.ownerAlertEventId) await deliverOwnerAlertEvent(result.ownerAlertEventId);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ message: error instanceof Error ? error.message : "Unable to delete service." }, { status: 400 });
  }
}
