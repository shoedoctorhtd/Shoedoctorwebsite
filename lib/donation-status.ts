/**
 * Canonical donor-facing lifecycle values. The original CSR table keeps its
 * legacy operational `status` column for deployed-D1 compatibility; new code
 * reads and writes this canonical workflow independently.
 */
export const DONATION_STATUSES = [
  "submitted",
  "received",
  "cleaning_restoration",
  "ready_for_donation",
  "donated",
  "cancelled",
] as const;

export type DonationStatus = (typeof DONATION_STATUSES)[number];

export const DONATION_STATUS_LABELS: Record<DonationStatus, string> = {
  submitted: "Donation Registered",
  received: "Shoes Received",
  cleaning_restoration: "Cleaning / Restoration",
  ready_for_donation: "Ready for Donation",
  donated: "Donated",
  cancelled: "Cancelled",
};

const LEGACY_STATUS_TO_WORKFLOW: Record<string, DonationStatus> = {
  new: "submitted",
  contacted: "submitted",
  pickup_scheduled: "submitted",
  collected: "received",
  under_restoration: "cleaning_restoration",
  ready_for_donation: "ready_for_donation",
  donated: "donated",
  rejected: "cancelled",
};

const WORKFLOW_TO_LEGACY_STATUS: Record<DonationStatus, string> = {
  submitted: "new",
  received: "collected",
  cleaning_restoration: "under_restoration",
  ready_for_donation: "ready_for_donation",
  donated: "donated",
  cancelled: "rejected",
};

export function isDonationStatus(value: unknown): value is DonationStatus {
  return (
    typeof value === "string" &&
    (DONATION_STATUSES as readonly string[]).includes(value)
  );
}

/** Uses a legacy value only when a migrated row has not been backfilled yet. */
export function normalizeDonationStatus(
  workflowStatus: unknown,
  legacyStatus: unknown,
): DonationStatus {
  if (isDonationStatus(workflowStatus)) return workflowStatus;
  const legacy = String(legacyStatus ?? "").trim();
  return LEGACY_STATUS_TO_WORKFLOW[legacy] ?? "submitted";
}

/** Keeps the legacy checked column valid while the app uses canonical values. */
export function legacyDonationStatusFor(status: DonationStatus) {
  return WORKFLOW_TO_LEGACY_STATUS[status];
}

/** One durable event per donation lifecycle email. */
export function donationNotificationKey(status: DonationStatus) {
  return status === "submitted" ? "registration" : `status:${status}`;
}

/**
 * Submission is transactional. Later lifecycle messages require an opt-in;
 * cancellation additionally requires a deliberate admin choice because it is
 * not always helpful to contact the donor about one.
 */
export function canNotifyDonationStatus(
  status: DonationStatus,
  emailUpdatesConsent: boolean,
  notifyCancellation = false,
) {
  return (
    status === "submitted" ||
    (emailUpdatesConsent && (status !== "cancelled" || notifyCancellation))
  );
}
