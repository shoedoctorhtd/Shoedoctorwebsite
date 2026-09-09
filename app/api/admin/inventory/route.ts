import { requireAdminApi } from "@/lib/admin-auth";
import { listInventoryMovements } from "@/lib/product-inventory";
import { parsePage } from "@/lib/product-validation";
import { listAdminProducts } from "@/lib/product-data";

export const dynamic = "force-dynamic";

/** Paginated global history. Product-specific history remains under its product route. */
export async function GET(request: Request) {
  const auth = await requireAdminApi(request, {
    action: "PRODUCT_INVENTORY_VIEW",
    productPermission: "view_inventory",
  });
  if (auth.response) return auth.response;
  if (new URL(request.url).searchParams.get("catalogue") === "1") {
    return Response.json({ products: await listAdminProducts() }, { headers: { "Cache-Control": "private, no-store" } });
  }
  const page = parsePage(new URL(request.url).searchParams.get("page"));
  return Response.json(
    await listInventoryMovements(undefined, { page }),
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
