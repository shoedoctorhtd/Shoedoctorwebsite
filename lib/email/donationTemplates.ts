import type { DonationStatus } from "../donation-status";

export type DonationEmailContent = {
  html: string;
  subject: string;
  text: string;
};

export type DonationEmailDonation = {
  donationMethod: "self_dropoff" | "pickup_support";
  donorName: string;
  distributionCampaign?: string | null;
  distributionDate?: string | null;
  distributionLocation?: string | null;
  impactNote?: string | null;
  numberOfPairs: number;
  pairsDistributed?: number | null;
  preferredPickupDate?: string | null;
  requestId: string;
  submittedAt: string;
};

type TemplateDetails = {
  heading: string;
  paragraphs: string[];
  subject: string;
};

/**
 * Donation messages intentionally contain only the donor's own contribution
 * and public campaign-level impact. They never include recipient details or
 * internal admin notes.
 */
export function buildDonationEmail(
  status: DonationStatus,
  donation: DonationEmailDonation,
): DonationEmailContent {
  const details = templateDetails(status);
  const donorName = textValue(donation.donorName) || "there";
  const method =
    donation.donationMethod === "pickup_support"
      ? "Pickup support"
      : "Self drop-off at Shoe Doctor";
  const donationFields = [
    { label: "Donation reference", value: textValue(donation.requestId) || "Not available" },
    { label: "Donated pairs", value: formatPairs(donation.numberOfPairs) },
    { label: "Donation date", value: formatDate(donation.submittedAt) },
    { label: "Method", value: method },
    ...(donation.donationMethod === "pickup_support" && donation.preferredPickupDate
      ? [{ label: "Preferred pickup date", value: formatDate(donation.preferredPickupDate) }]
      : []),
  ];
  const impactFields = status === "donated" ? donatedImpactFields(donation) : [];
  const sections = [
    { heading: "Your donation", fields: donationFields },
    ...(impactFields.length ? [{ heading: "Impact update", fields: impactFields }] : []),
  ];

  const text = [
    "SHOE DOCTOR",
    "We Diagnose. We Clean. We Restore.",
    "",
    `Hi ${donorName},`,
    "",
    ...details.paragraphs,
    "",
    ...sections.flatMap((section) => [
      section.heading.toUpperCase(),
      ...section.fields.map((field) => `${field.label}: ${field.value}`),
      "",
    ]),
    "Thank you for helping give good shoes a second life.",
    "Shoe Doctor",
  ].join("\n");

  const sectionHtml = sections
    .map(
      (section) =>
        '<section style="margin:24px 0 0;"><h2 style="color:#7b1738;font-size:13px;font-weight:700;letter-spacing:.1em;margin:0 0 8px;text-transform:uppercase;">' +
        escapeHtml(section.heading) +
        '</h2><table role="presentation" style="border-collapse:collapse;font-size:14px;line-height:1.5;width:100%;"><tbody>' +
        emailRows(section.fields) +
        "</tbody></table></section>",
    )
    .join("");

  return {
    subject: details.subject,
    text,
    html:
      '<!doctype html><html lang="en"><body style="margin:0;background:#f6f5f2;color:#151515;font-family:Arial,sans-serif;"><main style="box-sizing:border-box;margin:0 auto;max-width:600px;padding:28px 16px;"><section style="background:#ffffff;border:1px solid #dedbd4;border-radius:12px;overflow:hidden;"><div style="background:#7b1738;color:#ffffff;padding:24px 28px;"><p style="font-size:12px;font-weight:700;letter-spacing:.12em;margin:0 0 8px;text-transform:uppercase;">Shoe Doctor</p><h1 style="font-size:24px;line-height:1.25;margin:0;">' +
      escapeHtml(details.heading) +
      '</h1></div><div style="padding:26px 28px;"><p style="font-size:16px;line-height:1.6;margin:0 0 16px;">Hi ' +
      escapeHtml(donorName) +
      ',</p>' +
      details.paragraphs
        .map(
          (paragraph) =>
            '<p style="font-size:16px;line-height:1.6;margin:0 0 14px;">' +
            escapeHtml(paragraph) +
            "</p>",
        )
        .join("") +
      sectionHtml +
      '</div><footer style="border-top:1px solid #e7e4de;color:#5e5a55;font-size:13px;line-height:1.6;padding:20px 28px;"><strong style="color:#151515;">Shoe Doctor</strong><br />We Diagnose. We Clean. We Restore.<br />Thank you for helping give good shoes a second life.</footer></section></main></body></html>',
  };
}

function templateDetails(status: DonationStatus): TemplateDetails {
  switch (status) {
    case "submitted":
      return {
        heading: "Thank you for your donation",
        paragraphs: [
          "Thank you for choosing to give your shoes another life. We've successfully registered your donation.",
          "Our team will be in touch if we need anything else to arrange the next step.",
        ],
        subject: "Thank you for your donation | Shoe Doctor",
      };
    case "received":
      return {
        heading: "We received your donated shoes",
        paragraphs: [
          "Shoe Doctor has physically received your donated shoes.",
          "We will carefully assess and prepare them for their next chapter.",
        ],
        subject: "We received your donated shoes | Shoe Doctor",
      };
    case "cleaning_restoration":
      return {
        heading: "Your donated shoes are being restored",
        paragraphs: [
          "Your donated shoes are now being cleaned, sanitized, repaired, or restored as needed before donation.",
          "Thank you for making it possible to give wearable footwear a second life.",
        ],
        subject: "Your donated shoes are being restored | Shoe Doctor",
      };
    case "ready_for_donation":
      return {
        heading: "Your shoes are ready to help someone",
        paragraphs: [
          "Your footwear has completed preparation and is ready to be distributed through the Shoe Doctor Donation Program.",
          "We will share one final update once the donation has made its impact.",
        ],
        subject: "Your shoes are ready to help someone | Shoe Doctor",
      };
    case "donated":
      return {
        heading: "Your donation made an impact",
        paragraphs: [
          "Your donated shoes have now been cleaned, restored, and successfully distributed through the Shoe Doctor Donation Program.",
          "Thank you for helping us give good shoes a second life.",
        ],
        subject: "Your donation made an impact ❤️ | Shoe Doctor",
      };
    case "cancelled":
      return {
        heading: "An update about your donation",
        paragraphs: [
          "We are unable to continue this donation request at this time.",
          "Please contact Shoe Doctor if you would like to discuss another way to donate your shoes.",
        ],
        subject: "Donation update | Shoe Doctor",
      };
  }
}

function donatedImpactFields(donation: DonationEmailDonation) {
  const fields: Array<{ label: string; value: string }> = [];
  const location = textValue(donation.distributionLocation);
  const campaign = textValue(donation.distributionCampaign);
  const distributionDate = textValue(donation.distributionDate);
  const pairsDistributed = donation.pairsDistributed;
  const impactNote = textValue(donation.impactNote);
  if (location) fields.push({ label: "Distribution location", value: location });
  if (campaign) fields.push({ label: "Campaign", value: campaign });
  if (typeof pairsDistributed === "number" && pairsDistributed >= 0) {
    fields.push({ label: "Pairs distributed", value: formatPairs(pairsDistributed) });
  }
  if (distributionDate) {
    fields.push({ label: "Distribution date", value: formatDate(distributionDate) });
  }
  if (impactNote) fields.push({ label: "Impact note", value: impactNote });
  return fields;
}

function emailRows(fields: Array<{ label: string; value: string }>) {
  return fields
    .map(
      (field) =>
        '<tr><th scope="row" style="color:#5e5a55;font-size:12px;font-weight:700;padding:8px 0;text-align:left;vertical-align:top;width:42%;">' +
        escapeHtml(field.label) +
        '</th><td style="padding:8px 0;vertical-align:top;white-space:pre-wrap;">' +
        escapeHtml(field.value) +
        "</td></tr>",
    )
    .join("");
}

function formatPairs(value: number) {
  const count = Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
  return `${new Intl.NumberFormat("en-NP").format(count)} ${count === 1 ? "pair" : "pairs"}`;
}

function formatDate(value: string) {
  const date = new Date(value.length === 10 ? `${value}T00:00:00.000Z` : value);
  if (Number.isNaN(date.valueOf())) return textValue(value) || "Not available";
  return new Intl.DateTimeFormat("en-NP", { dateStyle: "medium" }).format(date);
}

function textValue(value: unknown) {
  return String(value ?? "").trim();
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };
    return entities[character];
  });
}
