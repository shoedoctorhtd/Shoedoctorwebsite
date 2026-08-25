import { normalizeEmail, requireAdminApi } from "@/lib/admin-auth";
import { getManagedAdminUser, resetManagedAdminAccess } from "@/lib/admin-users";
import { deliverOwnerAlertEvent } from "@/lib/owner-alerts";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAdminApi(request, {
    action: "ADMIN_ACCESS_RESET",
    mutation: true,
    roles: ["super_admin"],
    entityType: "admin_user",
  });
  if (auth.response) return auth.response;
  try {
    const { id } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;
    const target = await getManagedAdminUser(id);
    if (!target) return Response.json({ message: "Administrator not found." }, { status: 404 });
    if (normalizeEmail(body.confirmation) !== target.email) {
      return Response.json({ message: "Type the target administrator email to confirm the reset." }, { status: 400 });
    }
    const result = await resetManagedAdminAccess(
      id,
      auth.user,
      typeof body.updatedAt === "string" ? body.updatedAt : null,
    );
    if (result.kind === "not_found") return Response.json({ message: "Administrator not found." }, { status: 404 });
    if (result.kind === "inactive") return Response.json({ message: "Reactivate this administrator before resetting access." }, { status: 409 });
    if (result.kind === "conflict") return Response.json({ message: "This administrator changed. Refresh and try again." }, { status: 409 });
    await deliverOwnerAlertEvent(result.ownerAlertEventId);
    return Response.json({ ok: true, user: result.user, temporaryPassword: result.temporaryPassword }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ message: error instanceof Error ? error.message : "Unable to reset administrator access." }, { status: 400 });
  }
}
