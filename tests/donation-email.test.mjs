import assert from "node:assert/strict";
import test from "node:test";

const { buildDonationEmail } = await import(
  "../lib/email/donationTemplates.ts"
);
const {
  canNotifyDonationStatus,
  donationNotificationKey,
  normalizeDonationStatus,
} = await import("../lib/donation-status.ts");

const donation = {
  donationMethod: "pickup_support",
  donorName: "Asha <script>alert('x')</script>",
  distributionCampaign: "School <b>shoe</b> drive",
  distributionDate: "2026-08-24",
  distributionLocation: "Hetauda-4 <img src=x>",
  impactNote: "Delivered with care <script>alert('x')</script>",
  numberOfPairs: 2,
  pairsDistributed: 2,
  preferredPickupDate: "2026-08-23",
  requestId: "DON-7K3M2",
  submittedAt: "2026-08-22T04:00:00.000Z",
};

test("builds a branded, escaped donation email for every lifecycle status", () => {
  const expectedSubjects = {
    submitted: "Thank you for your donation | Shoe Doctor",
    received: "We received your donated shoes | Shoe Doctor",
    cleaning_restoration: "Your donated shoes are being restored | Shoe Doctor",
    ready_for_donation: "Your shoes are ready to help someone | Shoe Doctor",
    donated: "Your donation made an impact ❤️ | Shoe Doctor",
    cancelled: "Donation update | Shoe Doctor",
  };

  for (const [status, subject] of Object.entries(expectedSubjects)) {
    const message = buildDonationEmail(status, donation);
    assert.equal(message.subject, subject);
    assert.match(message.text, /^SHOE DOCTOR/m);
    assert.match(message.text, /We Diagnose\. We Clean\. We Restore\./);
    assert.match(message.html, /Shoe Doctor/);
  }

  const donated = buildDonationEmail("donated", donation);
  assert.match(donated.text, /Distribution location: Hetauda-4 <img src=x>/);
  assert.match(donated.text, /Pairs distributed: 2 pairs/);
  assert.match(
    donated.html,
    /Asha &lt;script&gt;alert\(&#39;x&#39;\)&lt;\/script&gt;/,
  );
  assert.match(donated.html, /Hetauda-4 &lt;img src=x&gt;/);
  assert.match(
    donated.html,
    /Delivered with care &lt;script&gt;alert\(&#39;x&#39;\)&lt;\/script&gt;/,
  );
  assert.doesNotMatch(donated.html, /<script>alert/);
});

test("keeps registration transactional but requires consent for later updates", () => {
  assert.equal(canNotifyDonationStatus("submitted", false), true);
  assert.equal(canNotifyDonationStatus("received", false), false);
  assert.equal(canNotifyDonationStatus("donated", false), false);
  assert.equal(canNotifyDonationStatus("received", true), true);
  assert.equal(canNotifyDonationStatus("cancelled", true), false);
  assert.equal(canNotifyDonationStatus("cancelled", true, true), true);
});

test("uses stable, distinct lifecycle event keys and maps historical statuses", () => {
  const statuses = [
    "submitted",
    "received",
    "cleaning_restoration",
    "ready_for_donation",
    "donated",
    "cancelled",
  ];
  const keys = statuses.map(donationNotificationKey);
  assert.equal(new Set(keys).size, statuses.length);
  assert.equal(donationNotificationKey("submitted"), "registration");
  assert.equal(normalizeDonationStatus(null, "collected"), "received");
  assert.equal(
    normalizeDonationStatus(null, "under_restoration"),
    "cleaning_restoration",
  );
  assert.equal(normalizeDonationStatus(null, "rejected"), "cancelled");
});
