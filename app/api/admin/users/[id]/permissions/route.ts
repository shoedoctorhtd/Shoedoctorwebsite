import { requireAdminApi } from "@/lib/admin-auth";
import { getManagedAdminUser } from "@/lib/admin-users";
import { replaceAdminPermissions } from "@/lib/admin-permissions";
import { deliverOwnerAlertEvent } from "@/lib/owner-alerts";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Context) {
  const auth = await requireAdminApi(request, { action: "ADMIN_PERMISSIONS_VIEW", roles: ["super_admin"] });
  if (auth.response) return auth.response;
  const user = await getManagedAdminUser((await params).id);
  return user ? Response.json({ user }, { headers: { "Cache-Control": "private, no-store" } })
    : Response.json({ message: "Administrator not found." }, { status: 404 });
}

export async function PUT(request: Request, { params }: Context) {
  const id = (await params).id;
  const auth = await requireAdminApi(request, { action: "ADMIN_PERMISSIONS_UPDATED", roles: ["super_admin"], mutation: true, entityType: "admin_user", entityId: id });
  if (auth.response) return auth.response;
  try {
    const body = await request.json() as Record<string, unknown>;
    const result = await replaceAdminPermissions(id, body.permissions, auth.user, body.updatedAt);
    if (result.kind === "not_found") return Response.json({ message: "Administrator not found." }, { status: 404 });
    if (result.kind === "super_admin") return Response.json({ message: "Super Admins automatically have all access." }, { status: 409 });
    if (result.kind === "conflict") return Response.json({ message: "This account changed. Reopen Manage Access to load its current permissions." }, { status: 409 });
    // Durable grants and audit are already committed. Email failure is best-effort.
    if (result.kind === "updated") {
      try { await deliverOwnerAlertEvent(result.ownerAlertEventId); }
      catch { console.error("Permission alert remains queued for retry."); }
    }
    return Response.json({ permissions: result.permissions, updatedAt: result.updatedAt }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update access.";
    return Response.json({ message }, { status: message.startsWith("Forbidden") ? 403 : 400 });
  }
}
