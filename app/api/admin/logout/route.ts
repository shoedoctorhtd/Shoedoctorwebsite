import {
  clearAdminSessionCookie,
  clearLegacyAdminSessionCookie,
  logoutAdminSession,
  requireAdminApi,
} from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireAdminApi(request, {
    action: "ADMIN_LOGOUT",
    mutation: true,
  });
  if (auth.response) return auth.response;
  await logoutAdminSession(request);
  const response = Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  response.headers.append("Set-Cookie", clearAdminSessionCookie());
  response.headers.append("Set-Cookie", clearLegacyAdminSessionCookie());
  return response;
}
