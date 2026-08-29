import { createOnlineProductOrder } from "@/lib/product-inventory";
import { parseOnlineProductOrder } from "@/lib/product-validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const result = await createOnlineProductOrder(parseOnlineProductOrder(await request.json()));
    if (result.kind === "stock_conflict") {
      return Response.json({ message: result.message, code: "stock_changed" }, { status: 409 });
    }
    return Response.json(
      { order: toPublicOrderConfirmation(result.order), duplicate: result.kind === "duplicate" },
      { status: result.kind === "created" ? 201 : 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to place this order.";
    return Response.json({ message }, { status: 400 });
  }
}

function toPublicOrderConfirmation(order: { publicReference: string; status: string; paymentStatus: string }) {
  return {
    publicReference: order.publicReference,
    status: order.status,
    paymentStatus: order.paymentStatus,
  };
}
