import { getAdminUser } from "@/lib/admin-auth";
import { createService, listServices } from "@/lib/data";
import { parseServiceInput } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await getAdminUser())) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }
  return Response.json({ services: await listServices(true) });
}

export async function POST(request: Request) {
  if (!(await getAdminUser())) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const service = await createService(
      parseServiceInput(await request.json()),
    );
    return Response.json({ service }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to add service.";
    return Response.json({ message }, { status: 400 });
  }
}
