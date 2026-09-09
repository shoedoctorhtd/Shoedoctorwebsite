import { requireAdminApi } from "@/lib/admin-auth";
import { getCounterInventory } from "@/lib/counter-sales";
import { recordOfflineProductSale } from "@/lib/product-inventory";
import { parseOfflineSale, parsePage } from "@/lib/product-validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdminApi(request, { action: "COUNTER_INVENTORY_VIEW" });
  if (auth.response) return auth.response;
  const query = new URL(request.url).searchParams;
  return Response.json(await getCounterInventory(query.get("search") ?? "", parsePage(query.get("page"))), { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const auth = await requireAdminApi(request, { action: "COUNTER_SALE_CREATED", mutation: true, entityType: "product_order" });
  if (auth.response) return auth.response;
  try {
    const body = await request.json() as Record<string, unknown>;
    const input = parseOfflineSale({ items: body.items, idempotencyToken: body.idempotencyToken, paymentStatus: "paid" });
    const prices = body.expectedPrices as Record<string, number> | undefined;
    if (!prices || typeof prices !== "object" || Array.isArray(prices)
      || input.items.some((item) => !Number.isSafeInteger(prices[item.productSlug]) || prices[item.productSlug] <= 0)) {
      throw new Error("Refresh the products and confirm their selling prices.");
    }
    const result = await recordOfflineProductSale(input, auth.user, prices);
    if (result.kind === "stock_conflict") return Response.json({ message: result.message }, { status: 409 });
    return Response.json({ order: result.order, duplicate: result.kind === "duplicate" }, { status: result.kind === "created" ? 201 : 200, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return Response.json({ message: error instanceof Error ? error.message : "Unable to record counter sale." }, { status: 400 });
  }
}
