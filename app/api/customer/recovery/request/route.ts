import {
  CUSTOMER_RECOVERY_MESSAGE,
  requestCustomerRecovery,
} from "@/lib/customers";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: Record<string, unknown> = {};
  try {
    const parsed = await request.json();
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      body = parsed as Record<string, unknown>;
    }
    await requestCustomerRecovery({ phone: body.phone, request });
  } catch {
    // Always preserve the same public response so the route cannot reveal
    // whether a phone number has a saved customer profile.
    console.error("Unable to start customer profile recovery.");
  }

  return Response.json(
    { ok: true, message: CUSTOMER_RECOVERY_MESSAGE },
    { status: 202, headers: { "Cache-Control": "no-store" } },
  );
}
