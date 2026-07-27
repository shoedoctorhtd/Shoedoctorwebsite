import {
  adminSessionCookie,
  createAdminSessionToken,
  safeReturnPath,
  verifyAdminCredentials,
} from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
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
      { message: "Enter your owner email and password." },
      { status: 400 },
    );
  }

  const result = await verifyAdminCredentials(email, password);
  if (!result.ok) {
    const status = result.reason === "configuration" ? 503 : 401;
    const message =
      result.reason === "configuration"
        ? "Admin login is not configured yet. Add the Cloudflare secrets first."
        : "The email or password is incorrect.";
    return Response.json({ message }, { status });
  }

  const token = await createAdminSessionToken(
    result.email,
    result.sessionSecret,
  );
  const response = Response.json({
    ok: true,
    redirectTo: safeReturnPath(
      typeof body.next === "string" ? body.next : "/admin",
    ),
  });
  response.headers.append("Set-Cookie", adminSessionCookie(token));
  return response;
}
