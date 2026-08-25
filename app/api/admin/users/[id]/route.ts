import { normalizeEmail, requireAdminApi } from "@/lib/admin-auth";
import {
  changeManagedAdminRole,
  getManagedAdminUser,
  setManagedAdminActive,
} from "@/lib/admin-users";
import { deliverOwnerAlertEvent } from "@/lib/owner-alerts";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdminApi(request, {
    action: "ADMIN_USER_CHANGE",
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
      return Response.json({ message: "Type the target administrator email to confirm this sensitive change." }, { status: 400 });
    }
    if (body.operation === "set_active" && typeof body.active === "boolean") {
      const result = await setManagedAdminActive(
        id,
        body.active,
        auth.user,
        typeof body.updatedAt === "string" ? body.updatedAt : null,
      );
      if (result.kind === "not_found") return Response.json({ message: "Administrator not found." }, { status: 404 });
      if (result.kind === "final_super_admin") return Response.json({ message: "The final active Super Admin cannot be deactivated." }, { status: 409 });
      if (result.kind === "self_protected") return Response.json({ message: "You cannot deactivate your own account." }, { status: 409 });
      if (result.kind === "conflict") return Response.json({ message: "This administrator changed. Refresh and try again." }, { status: 409 });
      if (result.kind === "updated") await deliverOwnerAlertEvent(result.ownerAlertEventId);
      return Response.json({ ok: true, user: result.user, unchanged: result.kind === "unchanged" });
    }
    if (body.operation === "set_role" && (body.role === "admin" || body.role === "super_admin")) {
      const result = await changeManagedAdminRole(
        id,
        body.role,
        auth.user,
        typeof body.updatedAt === "string" ? body.updatedAt : null,
      );
      if (result.kind === "not_found") return Response.json({ message: "Administrator not found." }, { status: 404 });
      if (result.kind === "final_super_admin") return Response.json({ message: "The final active Super Admin cannot be demoted." }, { status: 409 });
      if (result.kind === "self_protected") return Response.json({ message: "You cannot change your own role." }, { status: 409 });
      if (result.kind === "conflict") return Response.json({ message: "This administrator changed. Refresh and try again." }, { status: 409 });
      if (result.kind === "updated") await deliverOwnerAlertEvent(result.ownerAlertEventId);
      return Response.json({ ok: true, user: result.user, unchanged: result.kind === "unchanged" });
    }
    return Response.json({ message: "Choose a valid administrator change." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update administrator.";
    return Response.json({ message }, { status: /final active super admin/i.test(message) ? 409 : 400 });
  }
}
