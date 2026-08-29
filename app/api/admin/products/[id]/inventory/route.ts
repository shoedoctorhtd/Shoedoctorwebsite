import { requireAdminApi } from "@/lib/admin-auth";
import { adjustProductInventory, listInventoryMovements, setInitialProductStock } from "@/lib/product-inventory";
import { parseInitialProductStock, parseInventoryAdjustment, parsePage } from "@/lib/product-validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi(request, {
    action: "PRODUCT_INVENTORY_VIEW",
    productPermission: "view_inventory",
  });
  if (auth.response) return auth.response;
  const page = parsePage(new URL(request.url).searchParams.get("page"));
  return Response.json(
    await listInventoryMovements((await params).id, { page }),
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const auth = await requireAdminApi(request, {
    action: "PRODUCT_INVENTORY_ADJUSTED",
    mutation: true,
    entityType: "inventory_movement",
    entityId: id,
    productPermission: "adjust_inventory",
  });
  if (auth.response) return auth.response;
  try {
    const body = await request.json() as Record<string, unknown>;
    if (Object.prototype.hasOwnProperty.call(body, "initialStock")) {
      const input = parseInitialProductStock(body);
      const result = await setInitialProductStock(id, input.stockQuantity, auth.user, input.idempotencyKey);
      if (result.kind === "not_found") return Response.json({ message: "Product not found." }, { status: 404 });
      if (result.kind === "already_initialized") return Response.json({ message: "Initial stock has already been set. Use an inventory adjustment instead." }, { status: 409 });
      return Response.json({ initialized: true, duplicate: result.kind === "duplicate" }, { headers: { "Cache-Control": "private, no-store" } });
    }
    const result = await adjustProductInventory(id, parseInventoryAdjustment(body), auth.user);
    if (result.kind === "not_found") return Response.json({ message: "Product not found." }, { status: 404 });
    if (result.kind === "conflict") return Response.json({ message: result.message }, { status: 409 });
    return Response.json({ movement: result.movement, duplicate: result.kind === "duplicate" }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return Response.json({ message: error instanceof Error ? error.message : "Unable to adjust inventory." }, { status: 400 });
  }
}
