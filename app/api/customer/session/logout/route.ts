import {
  clearCustomerSessionCookie,
  revokeCustomerSession,
} from "@/lib/customers";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    await revokeCustomerSession(request);
  } catch {
    // The device cookie is still cleared below, even if the server-side
    // revocation cannot be recorded during a temporary D1 failure.
    console.error("Unable to revoke the returning customer session.");
  }

  const response = Response.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } },
  );
  response.headers.append("Set-Cookie", clearCustomerSessionCookie());
  return response;
}
