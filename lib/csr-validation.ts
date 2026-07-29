import {
  DONATION_DRIVE_STATUSES,
  DONATION_REQUEST_STATUSES,
  RESTORATION_STORY_CATEGORIES,
  type CommunityUpdateInput,
  type DonationDriveInput,
  type DonationImpactStatsInput,
  type DonationMethod,
  type DonationRequestInput,
  type DonationRequestListOptions,
  type DonationRequestStatus,
  type DonationRequestUpdateInput,
  type RestorationStoryInput,
} from "./csr-data";

function cleanText(value: unknown, maxLength: number) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function optionalText(value: unknown, maxLength: number) {
  const cleaned = cleanText(value, maxLength);
  return cleaned || null;
}

function requiredText(value: unknown, label: string, maxLength: number) {
  const cleaned = cleanText(value, maxLength);
  if (!cleaned) throw new Error(`${label} is required.`);
  return cleaned;
}

function requiredDate(value: unknown, label: string) {
  const date = requiredText(value, label, 10);
  if (!isIsoDate(date)) {
    throw new Error(`${label} must be a valid date.`);
  }
  return date;
}

function optionalDate(value: unknown, label: string) {
  const date = optionalText(value, 10);
  if (date && !isIsoDate(date)) {
    throw new Error(`${label} must be a valid date.`);
  }
  return date;
}

function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

function numberInRange(
  value: unknown,
  label: string,
  minimum: number,
  maximum = 1_000_000_000,
) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`${label} must be a whole number between ${minimum} and ${maximum}.`);
  }
  return parsed;
}

function booleanValue(value: unknown) {
  return value === true || value === "true" || value === 1 || value === "1";
}

function optionalMediaId(value: unknown) {
  const id = optionalText(value, 100);
  if (id && !/^[a-zA-Z0-9_-]+$/u.test(id)) {
    throw new Error("Choose a valid uploaded image.");
  }
  return id;
}

function optionalSlug(value: unknown) {
  const slug = optionalText(value, 120);
  if (slug && !/^[a-z0-9][a-z0-9-]*$/u.test(slug)) {
    throw new Error("Slug may only use lowercase letters, numbers and hyphens.");
  }
  return slug;
}

function optionalLink(value: unknown) {
  const link = optionalText(value, 500);
  if (!link) return null;
  if (!/^https?:\/\//iu.test(link) && !link.startsWith("/")) {
    throw new Error("CTA link must be a full http(s) URL or a site path.");
  }
  return link;
}

function inputRecord(value: unknown) {
  return (value ?? {}) as Record<string, unknown>;
}

export function parsePublicDonationRequest(value: unknown): DonationRequestInput {
  const input = inputRecord(value);
  const website = cleanText(input.website, 120);
  if (website) throw new Error("Unable to submit this donation request.");
  if (input.safeForDonation !== true && input.safeForDonation !== "on") {
    throw new Error("Please confirm the shoes are safe and suitable for donation.");
  }

  const donorName = requiredText(
    input.fullName ?? input.donorName,
    "Full name",
    80,
  );
  if (donorName.length < 2) throw new Error("Please enter your full name.");
  const phone = requiredText(input.phone, "Phone number", 30);
  const phoneDigits = phone.replace(/\D/g, "");
  if (phoneDigits.length < 7 || phoneDigits.length > 15) {
    throw new Error("Please enter a valid phone or WhatsApp number.");
  }
  const email = optionalText(input.email, 120);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) {
    throw new Error("Please enter a valid email address.");
  }

  const rawMethod = cleanText(input.donationMethod, 30);
  const donationMethod: DonationMethod =
    rawMethod === "pickup" || rawMethod === "pickup_support"
      ? "pickup_support"
      : rawMethod === "dropoff" || rawMethod === "self_dropoff"
        ? "self_dropoff"
        : (() => {
            throw new Error("Choose self drop-off or pickup support.");
          })();

  const pickupAddress = optionalText(input.pickupLocation ?? input.pickupAddress, 300);
  if (donationMethod === "pickup_support" && !pickupAddress) {
    throw new Error("Please enter the pickup address or location.");
  }

  const preferredPickupDate = optionalDate(
    input.preferredPickupDate,
    "Preferred pickup date",
  );
  if (donationMethod === "pickup_support" && !preferredPickupDate) {
    throw new Error("Please choose a preferred pickup date.");
  }
  if (
    preferredPickupDate &&
    preferredPickupDate < new Date().toISOString().slice(0, 10)
  ) {
    throw new Error("Preferred pickup date cannot be in the past.");
  }

  return {
    donorName,
    phone,
    email,
    location:
      pickupAddress ||
      optionalText(input.location, 300) ||
      "Shoe Doctor self drop-off",
    numberOfPairs: numberInRange(
      input.pairCount ?? input.numberOfPairs,
      "Number of pairs",
      1,
      999,
    ),
    shoeType: requiredText(input.shoeType, "Shoe type", 80),
    shoeCondition: requiredText(input.shoeCondition, "Shoe condition", 80),
    donationMethod,
    pickupAddress: donationMethod === "pickup_support" ? pickupAddress : null,
    preferredPickupDate:
      donationMethod === "pickup_support" ? preferredPickupDate : null,
    donorNotes: optionalText(input.message ?? input.donorNotes, 800),
  };
}

export function parseDonationRequestUpdate(value: unknown): DonationRequestUpdateInput {
  const input = inputRecord(value);
  const statusText = optionalText(input.status, 40);
  const status = statusText as DonationRequestStatus | null;
  if (status && !DONATION_REQUEST_STATUSES.includes(status)) {
    throw new Error("Choose a valid donation request status.");
  }
  if (!status && !("internalNotes" in input)) {
    throw new Error("Choose a status or provide internal notes to update this request.");
  }
  return {
    status: status ?? undefined,
    internalNotes:
      "internalNotes" in input ? optionalText(input.internalNotes, 2_000) : undefined,
  };
}

export function parseDonationRequestListOptions(
  url: URL,
): DonationRequestListOptions {
  const statusValue = url.searchParams.get("status");
  const status = statusValue
    ? (cleanText(statusValue, 40) as DonationRequestStatus)
    : undefined;
  if (status && !DONATION_REQUEST_STATUSES.includes(status)) {
    throw new Error("Choose a valid donation request status.");
  }
  const dateFrom = optionalDate(url.searchParams.get("from"), "Start date");
  const dateTo = optionalDate(url.searchParams.get("to"), "End date");
  if (dateFrom && dateTo && dateFrom > dateTo) {
    throw new Error("Start date cannot be after end date.");
  }
  const limitValue = url.searchParams.get("limit");
  const offsetValue = url.searchParams.get("offset");
  const parsedLimit = limitValue ? Number(limitValue) : undefined;
  const parsedOffset = offsetValue ? Number(offsetValue) : undefined;
  return {
    search: optionalText(url.searchParams.get("q"), 120) ?? undefined,
    status,
    dateFrom: dateFrom ?? undefined,
    dateTo: dateTo ?? undefined,
    limit:
      parsedLimit && Number.isFinite(parsedLimit)
        ? Math.max(1, Math.min(500, Math.floor(parsedLimit)))
        : undefined,
    offset:
      parsedOffset && Number.isFinite(parsedOffset)
        ? Math.max(0, Math.min(1_000_000, Math.floor(parsedOffset)))
        : undefined,
  };
}

export function parseDonationDriveInput(value: unknown): DonationDriveInput {
  const input = inputRecord(value);
  const status = cleanText(input.status, 30) as DonationDriveInput["status"];
  if (!DONATION_DRIVE_STATUSES.includes(status)) {
    throw new Error("Choose a valid donation drive status.");
  }
  return {
    slug: optionalSlug(input.slug),
    title: requiredText(input.title, "Drive title", 140),
    shortDescription: requiredText(input.shortDescription, "Short description", 300),
    fullStory: requiredText(input.fullStory, "Full story", 12_000),
    coverImageId: optionalMediaId(input.coverImageId),
    driveDate: requiredDate(input.driveDate, "Drive date"),
    location: requiredText(input.location, "Location", 180),
    partnerOrganization: optionalText(input.partnerOrganization, 180),
    goalPairs: numberInRange(input.goalPairs, "Goal number of shoe pairs", 0),
    pairsCollected: numberInRange(input.pairsCollected, "Pairs collected", 0),
    pairsRestored: numberInRange(input.pairsRestored, "Pairs restored", 0),
    pairsDonated: numberInRange(input.pairsDonated, "Pairs donated", 0),
    status,
    isPublished: booleanValue(input.isPublished),
    ctaText: optionalText(input.ctaText, 80),
    ctaLink: optionalLink(input.ctaLink),
  };
}

export function parseRestorationStoryInput(value: unknown): RestorationStoryInput {
  const input = inputRecord(value);
  const category = cleanText(
    input.category,
    40,
  ) as RestorationStoryInput["category"];
  if (!RESTORATION_STORY_CATEGORIES.includes(category)) {
    throw new Error("Choose a valid restoration story category.");
  }
  const isPublished = booleanValue(input.isPublished);
  const beforeImageId = optionalMediaId(input.beforeImageId);
  const afterImageId = optionalMediaId(input.afterImageId);
  if (isPublished && (!beforeImageId || !afterImageId)) {
    throw new Error("Published restoration stories need both before and after images.");
  }
  return {
    slug: optionalSlug(input.slug),
    title: requiredText(input.title, "Story title", 140),
    category,
    beforeImageId,
    afterImageId,
    description: requiredText(input.description, "Description", 2_000),
    restorationWork: requiredText(
      input.restorationWork,
      "Restoration work performed",
      4_000,
    ),
    storyDate: requiredDate(input.storyDate, "Date"),
    isPublished,
  };
}

export function parseCommunityUpdateInput(value: unknown): CommunityUpdateInput {
  const input = inputRecord(value);
  const rawGallery = Array.isArray(input.galleryImageIds)
    ? input.galleryImageIds
    : [];
  const galleryImageIds = rawGallery
    .map(optionalMediaId)
    .filter((id): id is string => Boolean(id))
    .slice(0, 16);
  return {
    slug: optionalSlug(input.slug),
    title: requiredText(input.title, "Update title", 140),
    coverImageId: optionalMediaId(input.coverImageId),
    galleryImageIds,
    updateDate: requiredDate(input.updateDate, "Date"),
    location: requiredText(input.location, "Location", 180),
    recipientOrganization: requiredText(
      input.recipientOrganization,
      "Recipient organization or school",
      180,
    ),
    shoesDonated: numberInRange(input.shoesDonated, "Number of shoes donated", 0),
    story: requiredText(input.story, "Written update", 12_000),
    isPublished: booleanValue(input.isPublished),
  };
}

export function parseDonationImpactStatsInput(
  value: unknown,
): DonationImpactStatsInput {
  const input = inputRecord(value);
  return {
    totalPairsCollected: numberInRange(
      input.totalPairsCollected,
      "Total pairs collected",
      0,
    ),
    totalPairsRestored: numberInRange(
      input.totalPairsRestored,
      "Total pairs restored",
      0,
    ),
    totalPairsDonated: numberInRange(
      input.totalPairsDonated,
      "Total pairs donated",
      0,
    ),
    donationDrivesCompleted: numberInRange(
      input.donationDrivesCompleted,
      "Donation drives completed",
      0,
    ),
    partnerOrganizations: numberInRange(
      input.partnerOrganizations,
      "Partner organizations",
      0,
    ),
    communitiesReached: numberInRange(
      input.communitiesReached,
      "Communities reached",
      0,
    ),
  };
}

export function parseCsrId(value: string, label = "record") {
  const id = cleanText(value, 100);
  if (!id || !/^[a-zA-Z0-9_-]+$/u.test(id)) {
    throw new Error(`Invalid ${label} identifier.`);
  }
  return id;
}
