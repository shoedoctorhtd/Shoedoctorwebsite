import { requireAdminApi } from "@/lib/admin-auth";
import { hasProductAdminPermission } from "@/lib/product-permissions";
import { createDraftProduct, getAdminProduct, listAdminProducts } from "@/lib/product-data";
import { setInitialProductStock } from "@/lib/product-inventory";
import { parseInitialStockQuantity, parseProductInput } from "@/lib/product-validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdminApi(request, { action: "PRODUCT_LIST", productPermission: "view_products" });
  if (auth.response) return auth.response;
  const search = new URL(request.url).searchParams;
  const status = search.get("status");
  const stock = search.get("stock");
  return Response.json({
    products: await listAdminProducts({
      search: search.get("search"),
      status: status === "draft" || status === "published" || status === "archived" ? status : null,
      stock: stock === "in_stock" || stock === "low_stock" || stock === "out_of_stock" ? stock : null,
    }),
  }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const auth = await requireAdminApi(request, {
    action: "PRODUCT_CREATED",
    mutation: true,
    entityType: "product",
    productPermission: "manage_products",
  });
  if (auth.response) return auth.response;
  try {
    const body = await request.json() as Record<string, unknown>;
    const input = parseProductInput(body);
    const hasInitialStock = body.initialStock !== undefined && body.initialStock !== "";
    const initialStock = hasInitialStock ? parseInitialStockQuantity(body.initialStock) : null;
    if (input.priceNpr !== null && !(await hasProductAdminPermission(auth.user, "change_product_prices"))) {
      return Response.json({ message: "You do not have permission to set product prices." }, { status: 403 });
    }
    if (hasInitialStock && !(await hasProductAdminPermission(auth.user, "adjust_inventory"))) {
      return Response.json({ message: "You do not have permission to set initial stock." }, { status: 403 });
    }
    const product = await createDraftProduct(input, auth.user);
    if (initialStock !== null) {
      const result = await setInitialProductStock(product.id, initialStock, auth.user, `create_stock_${product.id}`);
      if (result.kind !== "initialized") throw new Error("Unable to set the initial stock.");
    }
    return Response.json({ product: (await getAdminProduct(product.id)) ?? product }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return Response.json({ message: error instanceof Error ? error.message : "Unable to create product." }, { status: 400 });
  }
}
