import { requireAdminApi } from "@/lib/admin-auth";
import { listAuditLogs } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdminApi(request, {
    action: "AUDIT_LOG_LIST",
    permission: "audit_logs",
    entityType: "audit_log",
  });
  if (auth.response) return auth.response;
  const params = new URL(request.url).searchParams;
  const page = Number(params.get("page"));
  const result = await listAuditLogs({
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
    administrator: params.get("administrator"),
    bookingReference: params.get("bookingReference"),
    action: params.get("action"),
    entityType: params.get("entityType"),
    from: params.get("from"),
    to: params.get("to"),
  });
  return Response.json(result, { headers: { "Cache-Control": "private, no-store" } });
}
