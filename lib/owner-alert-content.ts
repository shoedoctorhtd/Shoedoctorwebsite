/**
 * Dependency-free rendering for persisted high-risk owner alerts. Keeping this
 * outside the database/mail delivery module makes the exact production output
 * testable without loading framework-only server dependencies.
 */
export type OwnerAlertAuditRecord = {
  actorType: string;
  administratorName: string | null;
  administratorRole: string | null;
  action: string;
  entityType: string;
  bookingReference: string | null;
  pairReference: string | null;
  previousValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  reason: string | null;
  createdAt: string;
};

export function buildOwnerAlertEmail(audit: OwnerAlertAuditRecord) {
  const actor = audit.administratorName
    ? `${audit.administratorName}${audit.administratorRole ? ` (${audit.administratorRole})` : ""}`
    : audit.actorType === "system"
      ? "System"
      : audit.actorType === "customer"
        ? "Customer"
        : "Legacy/Unknown";
  const target = [audit.bookingReference, audit.pairReference].filter(Boolean).join(" / ") || audit.entityType;
  const timestamp = formatNepalDate(audit.createdAt);
  const before = audit.previousValues ? formatValues(audit.previousValues) : "None";
  const after = audit.newValues ? formatValues(audit.newValues) : "None";
  const text = [
    "SHOE DOCTOR HIGH-RISK ACTIVITY",
    "",
    `Administrator: ${actor}`,
    `Action: ${audit.action}`,
    `Record: ${target}`,
    `When: ${timestamp}`,
    `Before: ${before}`,
    `After: ${after}`,
    `Reason: ${audit.reason ?? "Not provided"}`,
  ].join("\n");
  const rows = [
    ["Administrator", actor],
    ["Action", audit.action],
    ["Record", target],
    ["When", timestamp],
    ["Before", before],
    ["After", after],
    ["Reason", audit.reason ?? "Not provided"],
  ]
    .map(([label, value]) => `<tr><th scope="row" style="padding:8px;text-align:left;vertical-align:top;">${escapeHtml(label)}</th><td style="padding:8px;white-space:pre-wrap;">${escapeHtml(value)}</td></tr>`)
    .join("");
  return {
    subject: `Shoe Doctor security alert - ${headerValue(audit.action)}${audit.bookingReference ? ` - ${headerValue(audit.bookingReference)}` : ""}`,
    text,
    html: `<!doctype html><html lang="en"><body style="font-family:Arial,sans-serif;color:#171412"><h1 style="color:#7b1738">Shoe Doctor security alert</h1><table role="presentation" style="border-collapse:collapse">${rows}</table></body></html>`,
  };
}

function formatValues(values: Record<string, unknown>) {
  return Object.entries(values)
    .map(([key, value]) => `${key}: ${typeof value === "string" ? value : JSON.stringify(value)}`)
    .join("; ")
    .slice(0, 1800);
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
