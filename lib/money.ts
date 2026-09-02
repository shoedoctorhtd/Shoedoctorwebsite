/** Shared NPR display format for public commerce surfaces. Stored values remain
 * integer NPR amounts; this only controls how an already-authoritative amount
 * is presented. */
export function formatNpr(value: number) {
  return `Rs ${new Intl.NumberFormat("en-NP", {
    maximumFractionDigits: 0,
  }).format(value)}`;
}

export function formatNprOrPending(value: number | null | undefined) {
  return typeof value === "number" && Number.isSafeInteger(value) ? formatNpr(value) : "Price pending";
}
