import { requireAdminApi } from "@/lib/admin-auth";
import { listCounterSales } from "@/lib/counter-sales";
import { parsePage } from "@/lib/product-validation";

export async function GET(request: Request) {
  const auth = await requireAdminApi(request, { action: "COUNTER_HISTORY_VIEW", productPermission: "view_product_orders" });
  if (auth.response) return auth.response;
  return Response.json(await listCounterSales(parsePage(new URL(request.url).searchParams.get("page"))), { headers: { "Cache-Control": "private, no-store" } });
}
