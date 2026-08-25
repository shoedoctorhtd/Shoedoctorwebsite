import { requireAdminApi } from "@/lib/admin-auth";
import { changeOwnAdminPassword } from "@/lib/admin-users";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireAdminApi(request, {
    action: "ADMIN_PASSWORD_CHANGE",
    mutation: true,
    entityType: "admin_user",
  });
  if (auth.response) return auth.response;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
    const nextPassword = typeof body.nextPassword === "string" ? body.nextPassword : "";
    const result = await changeOwnAdminPassword(auth.user, currentPassword, nextPassword);
    if (result.kind === "not_found") return Response.json({ message: "Administrator account is unavailable." }, { status: 401 });
    if (result.kind === "credentials") return Response.json({ message: "The current password is incorrect." }, { status: 401 });
    if (result.kind === "conflict") return Response.json({ message: "Your account changed. Sign in again and retry." }, { status: 409 });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ message: error instanceof Error ? error.message : "Unable to change password." }, { status: 400 });
  }
}
