import { clearAdminSessionCookie } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const response = Response.redirect(new URL("/", request.url), 303);
  response.headers.append("Set-Cookie", clearAdminSessionCookie());
  return response;
}
