/**
 * Dependency-free rendering for persisted high-risk owner alerts. Keeping this
 * outside the database/mail delivery module makes the exact production output
 * testable without loading framework-only server dependencies.
 */
export type OwnerAlertAuditRecord = {
  actorType: string;
  administratorName: string | null;
  administratorRole: string | null;
  administratorEmail?: string | null;
  entityId?: string | null;
  action: string;
  entityType: string;
  bookingReference: string | null;
  pairReference: string | null;
  previousValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  reason: string | null;
  createdAt: string;
  saleItems?: Array<{ productName: string; sku: string; quantity: number; unitPriceNpr: number; lineTotalNpr: number }>;
  inventoryChanges?: Array<{ productName: string; previousStock: number; stockChange: number; resultingStock: number }>;
  adminUrl?: string | null;
};

export function buildOwnerAlertEmail(audit: OwnerAlertAuditRecord) {
  const actor = audit.administratorName
    ? `${audit.administratorName}${audit.administratorRole ? ` (${audit.administratorRole})` : ""}${audit.administratorEmail ? ` <${audit.administratorEmail}>` : ""}`
    : audit.actorType === "system"
      ? "System"
      : audit.actorType === "customer"
        ? "Customer"
        : "Legacy/Unknown";
  const target = [audit.bookingReference, audit.pairReference].filter(Boolean).join(" / ") || audit.entityType;
  const timestamp = formatNepalDate(audit.createdAt);
  const before = audit.previousValues ? formatValues(audit.previousValues) : "None";
  const after = audit.newValues ? formatValues(audit.newValues) : "None";
  const activity = audit.action === "COUNTER_SALE_CREATED" ? "Counter Product Sale"
    : audit.action === "COUNTER_SALE_REVERSED" ? "Counter Sale Reversed"
    : audit.action === "ADMIN_PERMISSIONS_UPDATED" ? "Admin Access Updated"
    : audit.action.replaceAll("_", " ");
  const products = audit.saleItems?.map((item) => `${item.productName} (${item.sku}) × ${item.quantity}\nRs ${item.unitPriceNpr} × ${item.quantity} = Rs ${item.lineTotalNpr}`).join("\n\n");
  const changes = audit.inventoryChanges?.map((item) => `${item.productName}: ${item.previousStock} → ${item.resultingStock} (${item.stockChange > 0 ? "+" : ""}${item.stockChange})`).join("\n");
  const details: string[][] = [
    ...(audit.action === "ADMIN_PERMISSIONS_UPDATED" ? [
      ["Admin", String(audit.newValues?.adminName ?? audit.entityId ?? "")],
      ["Granted", ((audit.newValues?.granted as string[]) ?? []).join(", ") || "None"],
      ["Removed", ((audit.newValues?.removed as string[]) ?? []).join(", ") || "None"],
    ] : []),
    ...(products ? [["Products", products], ["Total Sale", `Rs ${audit.saleItems!.reduce((sum, item) => sum + item.lineTotalNpr, 0)}`]] : []),
    ...(changes ? [["Inventory Changes", changes]] : []),
  ];
  const text = [
    "SHOE DOCTOR ADMIN ALERT",
    "",
    `Administrator: ${actor}`,
    `Action: ${audit.action}`,
    `Admin Activity: ${activity}`,
    `Record: ${target}`,
    `When: ${timestamp}`,
    `Before: ${before}`,
    `After: ${after}`,
    `Reason: ${audit.reason ?? "Not provided"}`,
    ...details.map(([label, value]) => `${label}:\n${value}`),
    ...(audit.adminUrl ? [`View in Admin: ${audit.adminUrl}`] : []),
  ].join("\n");
  const rows = [
    ["Administrator", actor],
    ["Action", audit.action],
    ["Admin Activity", activity],
    ["Record", target],
    ["When", timestamp],
    ["Before", before],
    ["After", after],
    ["Reason", audit.reason ?? "Not provided"],
    ...details,
  ]
    .map(([label, value]) => `<tr><th scope="row" style="padding:8px;text-align:left;vertical-align:top;">${escapeHtml(label)}</th><td style="padding:8px;white-space:pre-wrap;">${escapeHtml(value)}</td></tr>`)
    .join("");
  return {
    subject: `Shoe Doctor Admin Alert — ${audit.action === "COUNTER_SALE_CREATED" ? "Counter Sale" : headerValue(activity)}${audit.bookingReference ? ` ${headerValue(audit.bookingReference)}` : ""}`,
    text,
    html: `<!doctype html><html lang="en"><body style="font-family:Arial,sans-serif;color:#171412"><h1 style="color:#7b1738">Shoe Doctor Admin Alert</h1><table role="presentation" style="border-collapse:collapse">${rows}</table>${audit.adminUrl ? `<p><a href="${escapeHtml(audit.adminUrl)}">${audit.action.startsWith("COUNTER_SALE_") ? "View Counter Sale in Admin" : "View in Admin"}</a></p>` : ""}</body></html>`,
  };
}

function formatValues(values: Record<string, unknown>) {
  return Object.entries(values)
    .map(([key, value]) => `${key}: ${typeof value === "string" ? value : JSON.stringify(value)}`)
    .join("; ");
}

function formatNepalDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : `${new Intl.DateTimeFormat("en-NP", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Kathmandu",
      }).format(date)} NPT`;
}

function headerValue(value: string) {
  return value.replace(/[\r\n]+/gu, " ").replace(/\s+/gu, " ").trim().slice(0, 120);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/gu, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}
