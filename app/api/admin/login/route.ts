import {
  adminSessionCookie,
  createAdminSession,
  createLegacyAdminSessionToken,
  legacyAdminSessionCookie,
  safeReturnPath,
  verifyAdminCredentials,
} from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    return Response.json({ message: "Invalid login request." }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ message: "Invalid login request." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password || password.length > 256) {
    return Response.json(
      { message: "Enter your administrator email and password." },
      { status: 400 },
    );
  }

  const result = await verifyAdminCredentials(email, password, request);
  if (!result.ok) {
    const status = result.reason === "configuration" ? 503 : result.reason === "rate_limited" ? 429 : 401;
    const message =
      result.reason === "configuration"
        ? "Administrator login is not configured yet."
        : result.reason === "rate_limited"
          ? "Too many attempts. Please wait before trying again."
          : "The email or password is incorrect.";
    return Response.json({ message }, { status, headers: { "Cache-Control": "no-store" } });
  }

  let token: string;
  let redirectTo: string;
  let namedSession = false;
  if (result.kind === "named") {
    const session = await createAdminSession(result.user);
    if (!session) {
      return Response.json(
        { message: "The administrator account is no longer active." },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
    }
    token = session.token;
    namedSession = true;
    redirectTo = session.user.mustChangePassword
      ? "/admin/change-password"
      : safeReturnPath(typeof body.next === "string" ? body.next : "/admin");
  } else {
    token = await createLegacyAdminSessionToken(result.email, result.sessionSecret);
    redirectTo = safeReturnPath(typeof body.next === "string" ? body.next : "/admin");
  }
  const response = Response.json(
    { ok: true, redirectTo },
    { headers: { "Cache-Control": "no-store" } },
  );
  response.headers.append(
    "Set-Cookie",
    namedSession ? adminSessionCookie(token) : legacyAdminSessionCookie(token),
  );
  return response;
}
