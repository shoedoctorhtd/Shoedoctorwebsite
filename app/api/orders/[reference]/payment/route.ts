import { getPublicQrPaymentOrder, submitProductPaymentReceipt } from "@/lib/product-payments";
import { parsePaymentAccessToken, parsePaymentReceiptSubmission } from "@/lib/product-validation";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ reference: string }> };

/** This route never accepts the public order reference as sufficient proof.
 * Every read and upload also needs the bearer token held by the customer. */
export async function GET(request: Request, { params }: Params) {
  try {
    const token = parsePaymentAccessToken(request.headers.get("x-payment-access-token"));
    const order = await getPublicQrPaymentOrder((await params).reference, token);
    return order
      ? Response.json({ order }, { headers: { "Cache-Control": "private, no-store" } })
      : hiddenNotFound();
  } catch {
    return hiddenNotFound();
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const token = parsePaymentAccessToken(request.headers.get("x-payment-access-token"));
    const form = await request.formData();
    const file = form.get("receipt");
    if (!file || typeof file === "string" || typeof file.arrayBuffer !== "function") {
      return Response.json({ message: "Choose a payment receipt to upload." }, { status: 400 });
    }
    const metadata = parsePaymentReceiptSubmission({
      transactionReference: form.get("transactionReference"),
      idempotencyKey: form.get("idempotencyKey"),
    });
    const reference = (await params).reference;
    const origin = new URL(request.url).origin;
    const result = await submitProductPaymentReceipt({
      reference,
      accessToken: token,
      ...metadata,
      file,
      // This is a protected admin list/search route and never contains an
      // internal D1 ID or a customer bearer token.
      adminOrderUrl: `${origin}/admin/product-orders?search=${encodeURIComponent(reference)}`,
    });
    if (result.kind === "not_found") return hiddenNotFound();
    if (result.kind === "invalid_submission") {
      return Response.json({ message: "This receipt submission could not be verified. Please start again." }, { status: 409 });
    }
    if (result.kind === "in_progress") {
      return Response.json({ message: "This receipt is already being sent. Please wait before trying again." }, { status: 409 });
    }
    if (result.kind === "email_failed") {
      return Response.json({ message: result.message }, { status: 502, headers: { "Cache-Control": "no-store" } });
    }
    if (result.kind === "not_uploadable") {
      return Response.json({ message: "This order is not currently accepting payment receipts." }, { status: 409 });
    }
    const order = await getPublicQrPaymentOrder(reference, token);
    if (!order) return hiddenNotFound();
    return Response.json({
      order,
      duplicate: result.kind === "duplicate",
      message: result.kind === "duplicate"
        ? "This payment receipt was already submitted. Shoe Doctor will verify it."
        : "Payment receipt submitted. Shoe Doctor will verify your payment.",
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return Response.json({
      message: error instanceof Error ? error.message : "Unable to submit this payment receipt.",
    }, { status: 400 });
  }
}

function hiddenNotFound() {
  return Response.json({ message: "Order payment page not found." }, { status: 404, headers: { "Cache-Control": "private, no-store" } });
}
