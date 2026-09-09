import { requireAdminApi } from "@/lib/admin-auth";
import { retryOwnerAlertEvent } from "@/lib/owner-alerts";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAdminApi(request, {
    action: "OWNER_ALERT_RETRY",
    mutation: true,
    permissions: ["audit_logs", "notifications"],
    entityType: "owner_alert",
  });
  if (auth.response) return auth.response;
  try {
    const { id } = await context.params;
    const result = await retryOwnerAlertEvent(id, auth.user);
    if (result.kind === "not_found") return Response.json({ message: "Owner alert not found." }, { status: 404 });
    if (result.kind === "not_retryable") return Response.json({ message: "Only pending, failed, skipped, or expired in-progress owner alerts can be retried.", event: result.event }, { status: 409 });
    if (result.kind === "delivery_error") {
      return Response.json({ ok: true, message: "The retry was recorded. Delivery will remain visible for Super Admin follow-up." }, { status: 202 });
    }
    return Response.json({ ok: true, event: result.event });
  } catch (error) {
    return Response.json({ message: error instanceof Error ? error.message : "Unable to retry owner alert." }, { status: 400 });
  }
}
