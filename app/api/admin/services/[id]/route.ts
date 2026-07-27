import { getAdminUser } from "@/lib/admin-auth";
import { deleteService, updateService } from "@/lib/data";
import { parseServiceInput } from "@/lib/validation";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  if (!(await getAdminUser())) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const service = await updateService(
      id,
      parseServiceInput(await request.json()),
    );
    if (!service) {
      return Response.json({ message: "Service not found." }, { status: 404 });
    }
    return Response.json({ service });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update service.";
    return Response.json({ message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  if (!(await getAdminUser())) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  const deleted = await deleteService(id);
  return deleted
    ? Response.json({ ok: true })
    : Response.json({ message: "Service not found." }, { status: 404 });
}
