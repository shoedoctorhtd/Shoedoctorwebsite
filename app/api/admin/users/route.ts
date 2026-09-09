import { requireAdminApi } from "@/lib/admin-auth";
import { createManagedAdmin, listAdminUsers } from "@/lib/admin-users";
import { deliverOwnerAlertEvent } from "@/lib/owner-alerts";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdminApi(request, {
    action: "ADMIN_USER_LIST",
    permission: "admin_management",
    entityType: "admin_user",
  });
  if (auth.response) return auth.response;
  return Response.json({ users: await listAdminUsers() }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const auth = await requireAdminApi(request, {
    action: "ADMIN_USER_CREATE",
    mutation: true,
    roles: ["super_admin"],
    entityType: "admin_user",
  });
  if (auth.response) return auth.response;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const result = await createManagedAdmin(
      { name: body.name, email: body.email, role: body.role, confirmation: body.confirmation, permissions: body.permissions },
      auth.user,
    );
    try { await deliverOwnerAlertEvent(result.ownerAlertEventId); }
    catch { console.error("Administrator creation alert remains queued for retry."); }
    return Response.json(
      { user: result.user, temporaryPassword: result.temporaryPassword },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return Response.json({ message: error instanceof Error ? error.message : "Unable to create administrator." }, { status: 400 });
  }
}
