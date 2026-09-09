import { redirect } from "next/navigation";
import AdminActivityDashboard from "@/app/components/AdminActivityDashboard";
import { requireAdminUser } from "@/lib/admin-auth";
import { listAuditLogs, type AuditLogPage } from "@/lib/audit";

export const dynamic = "force-dynamic";

type Search = Record<string, string | string[] | undefined>;
type Props = { searchParams: Promise<Search> };

function one(value: string | string[] | undefined) { return typeof value === "string" ? value : undefined; }

export default async function AdminActivityPage({ searchParams }: Props) {
  const user = await requireAdminUser("/admin/activity");
  if (user.mustChangePassword) redirect("/admin/change-password");
  const search = await searchParams;
  const filters = { administrator: one(search.administrator), bookingReference: one(search.bookingReference), action: one(search.action), entityType: one(search.entityType), from: one(search.from), to: one(search.to) };
  const rawPage = Number(one(search.page));
  let initial: AuditLogPage = { records: [], total: 0, page: 1, pageSize: 30 };
  let error: string | null = null;
  try {
    initial = await listAuditLogs({ ...filters, page: Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1 });
  } catch {
    error = "Activity records could not be loaded. Confirm migration 0011 is applied, then try again.";
  }
  return <AdminActivityDashboard initial={initial} filters={filters} name={user.name} role={user.role} error={error} />;
}
