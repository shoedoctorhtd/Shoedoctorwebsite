import { requireAdminApi } from "@/lib/admin-auth";
import { PRODUCT_ADMIN_PERMISSIONS, isProductAdminPermission, listProductAdminPermissions, replaceProductAdminPermissions } from "@/lib/product-permissions";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi(request, { action: "PRODUCT_PERMISSION_VIEW", roles: ["super_admin"] });
  if (auth.response) return auth.response;
  const id = (await params).id;
  return Response.json({ permissions: await listProductAdminPermissions(id), available: PRODUCT_ADMIN_PERMISSIONS }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi(request, {
    action: "PRODUCT_PERMISSION_UPDATED",
    mutation: true,
    roles: ["super_admin"],
    entityType: "admin_user",
    entityId: (await params).id,
  });
  if (auth.response) return auth.response;
  try {
    const id = (await params).id;
    const body = await request.json() as { permissions?: unknown };
    if (!Array.isArray(body.permissions) || body.permissions.some((permission) => !isProductAdminPermission(permission))) {
      return Response.json({ message: "Choose only valid product permissions." }, { status: 400 });
    }
    const result = await replaceProductAdminPermissions(id, body.permissions, auth.user);
    return Response.json({ permissions: result.permissions }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return Response.json({ message: error instanceof Error ? error.message : "Unable to update permissions." }, { status: 400 });
  }
}
