import assert from "node:assert/strict";
import test from "node:test";

import {
  BOOKING_REFERENCE_ALPHABET,
  buildPublicBookingReference,
  generatePublicBookingReference,
  generateSecureReferenceSuffix,
  getNepalDateCode,
  getPairReference,
  getPhysicalPairTag,
  isPublicReferenceCollision,
  normalizeBookingReferenceSearch,
} from "../lib/booking-reference.ts";

test("uses the Nepal calendar day at the UTC midnight boundary", () => {
  assert.equal(
    getNepalDateCode(new Date("2026-08-24T18:30:00.000Z")),
    "260825",
  );
  assert.equal(
    getNepalDateCode(new Date("2026-08-24T18:14:59.000Z")),
    "260824",
  );
});

test("builds the compact SD-YYMMDD-XX form with the handwriting-safe alphabet", () => {
  assert.equal(buildPublicBookingReference("260824", "K7"), "SD-260824-K7");

  for (let index = 0; index < 100; index += 1) {
    const suffix = generateSecureReferenceSuffix();
    assert.match(suffix, /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{2}$/u);
    assert.equal(suffix.includes("0"), false);
    assert.equal(suffix.includes("O"), false);
    assert.equal(suffix.includes("1"), false);
    assert.equal(suffix.includes("I"), false);
    for (const character of suffix) {
      assert.ok(BOOKING_REFERENCE_ALPHABET.includes(character));
    }
  }
});

test("allows a suffix to repeat on another Nepal date but not the full reference", async () => {
  const persisted = new Set();
  const tryPersist = async (candidate) => {
    if (persisted.has(candidate)) return false;
    persisted.add(candidate);
    return true;
  };

  const first = await generatePublicBookingReference({
    date: new Date("2026-08-24T08:00:00.000Z"),
    generateSuffix: () => "K7",
    tryPersist,
  });
  const second = await generatePublicBookingReference({
    date: new Date("2026-08-25T08:00:00.000Z"),
    generateSuffix: () => "K7",
    tryPersist,
  });

  assert.equal(first, "SD-260824-K7");
  assert.equal(second, "SD-260825-K7");
  assert.equal(await tryPersist(first), false);
});

test("retries a same-day collision with another two-character suffix first", async () => {
  const attempts = [];
  const suffixes = ["K7", "M8"];
  const result = await generatePublicBookingReference({
    date: new Date("2026-08-24T08:00:00.000Z"),
    generateSuffix: (length) => {
      attempts.push(length);
      return suffixes.shift() ?? "P4";
    },
    tryPersist: async (candidate) => candidate !== "SD-260824-K7",
  });

  assert.equal(result, "SD-260824-M8");
  assert.deepEqual(attempts, [2, 2]);
});

test("expands only after repeated collisions and resets to two characters for the next booking", async () => {
  const firstLengths = [];
  const expanded = await generatePublicBookingReference({
    date: new Date("2026-08-24T08:00:00.000Z"),
    attemptsPerSuffixLength: 2,
    maxSuffixLength: 3,
    generateSuffix: (length) => {
      firstLengths.push(length);
      return length === 2 ? "K7" : "K7M";
    },
    tryPersist: async (candidate) => candidate.endsWith("K7M"),
  });
  const secondLengths = [];
  const reset = await generatePublicBookingReference({
    date: new Date("2026-08-25T08:00:00.000Z"),
    generateSuffix: (length) => {
      secondLengths.push(length);
      return "P4";
    },
    tryPersist: async () => true,
  });

  assert.equal(expanded, "SD-260824-K7M");
  assert.deepEqual(firstLengths, [2, 2, 3]);
  assert.equal(reset, "SD-260825-P4");
  assert.deepEqual(secondLengths, [2]);
});

test("derives full pair references and privacy-safe physical shoe tags", () => {
  const reference = "SD-260824-K7";
  assert.deepEqual(
    [1, 2, 3, 4].map((pairNumber) => getPairReference(reference, pairNumber)),
    [
      "SD-260824-K7-1",
      "SD-260824-K7-2",
      "SD-260824-K7-3",
      "SD-260824-K7-4",
    ],
  );
  assert.deepEqual(
    [1, 2, 3, 4].map((pairNumber) => getPhysicalPairTag(reference, pairNumber)),
    ["260824-K7-1", "260824-K7-2", "260824-K7-3", "260824-K7-4"],
  );
});

test("normalizes full references, optional SD prefixes, and physical pair tags", () => {
  assert.deepEqual(normalizeBookingReferenceSearch("SD-260824-K7"), {
    publicReference: "SD-260824-K7",
    pairNumber: null,
  });
  assert.deepEqual(normalizeBookingReferenceSearch("sd-260824-k7"), {
    publicReference: "SD-260824-K7",
    pairNumber: null,
  });
  assert.deepEqual(normalizeBookingReferenceSearch("260824-k7"), {
    publicReference: "SD-260824-K7",
    pairNumber: null,
  });
  assert.deepEqual(normalizeBookingReferenceSearch("260824-k7-2"), {
    publicReference: "SD-260824-K7",
    pairNumber: 2,
  });
  assert.equal(normalizeBookingReferenceSearch("260824-IO-2"), null);
  assert.equal(normalizeBookingReferenceSearch("260824-K7-0"), null);
});

test("recognizes only the public-reference unique constraint as retryable", () => {
  assert.equal(
    isPublicReferenceCollision(
      new Error("D1_ERROR: UNIQUE constraint failed: bookings.public_reference"),
    ),
    true,
  );
  assert.equal(
    isPublicReferenceCollision(
      new Error("UNIQUE constraint failed: booking_items.booking_id, booking_items.pair_number"),
    ),
    false,
  );
});
