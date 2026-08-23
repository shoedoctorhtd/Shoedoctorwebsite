import {
  clearCustomerSessionCookie,
  getCustomerSession,
} from "@/lib/customers";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getCustomerSession(request);
    const response = Response.json(
      { ok: true, customer: session.customer },
      { headers: { "Cache-Control": "no-store" } },
    );
    if (session.shouldClearCookie) {
      response.headers.append("Set-Cookie", clearCustomerSessionCookie());
    }
    return response;
  } catch {
    // A saved profile is strictly optional. The booking form must stay usable
    // when D1 or an optional session lookup is temporarily unavailable.
    console.error("Unable to load the returning customer session.");
    return Response.json(
      { ok: true, customer: null },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}
