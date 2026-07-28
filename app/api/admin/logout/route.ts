import { clearAdminSessionCookie } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const location = new URL("/", request.url).toString();
  const headers = new Headers({
    Location: location,
    "Set-Cookie": clearAdminSessionCookie(),
  });
  return new Response(null, { status: 303, headers });
}
