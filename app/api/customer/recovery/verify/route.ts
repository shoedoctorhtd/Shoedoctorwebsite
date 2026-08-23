import {
  customerSessionCookie,
  verifyCustomerRecovery,
} from "@/lib/customers";

export const dynamic = "force-dynamic";

const INVALID_CODE_MESSAGE =
  "That verification code is invalid or has expired. You can continue with a normal booking.";

export async function POST(request: Request) {
  let body: Record<string, unknown> = {};
  try {
    const parsed = await request.json();
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      body = parsed as Record<string, unknown>;
    }
    const result = await verifyCustomerRecovery({
      phone: body.phone,
      code: body.code,
      request,
    });
    if (!result.ok) {
      return Response.json(
        { ok: false, message: result.message },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const response = Response.json(
      {
        ok: true,
        customer: result.customer,
        message: "Your saved details are ready to use.",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
    response.headers.append(
      "Set-Cookie",
      customerSessionCookie(result.sessionToken),
    );
    return response;
  } catch {
    console.error("Unable to verify the customer recovery code.");
    return Response.json(
      { ok: false, message: INVALID_CODE_MESSAGE },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
}
