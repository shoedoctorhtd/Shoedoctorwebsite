"use client";

/* eslint-disable @next/next/no-img-element */

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  DONATION_STATUSES,
  DONATION_STATUS_LABELS,
  type DonationStatus,
} from "@/lib/donation-status";

export const donationRequestStatuses = DONATION_STATUSES;

export const donationDriveStatuses = [
  "draft",
  "upcoming",
  "active",
  "completed",
] as const;

export const restorationCategories = [
  "sneaker_restoration",
  "donated_shoe_restoration",
  "cleaning_repair",
  "community_impact",
] as const;

type DonationRequestStatus = DonationStatus;
type DonationDriveStatus = (typeof donationDriveStatuses)[number];
type RestorationCategory = (typeof restorationCategories)[number];

export type DonationRequest = {
  id: string;
  requestId: string;
  donorName: string;
  phone: string;
  email: string | null;
  emailUpdatesConsent: boolean;
  location: string;
  numberOfPairs: number;
  shoeType: string | null;
  shoeCondition: string;
  donationMethod: "self_dropoff" | "pickup_support";
  pickupAddress: string | null;
  preferredPickupDate: string | null;
  donorNotes: string | null;
  status: DonationRequestStatus;
  internalNotes: string | null;
  distributionLocation: string | null;
  distributionCampaign: string | null;
  distributionDate: string | null;
  pairsDistributed: number | null;
  impactNote: string | null;
  lastEmailEvent: DonationEmailEvent | null;
  lastEmailSentAt: string | null;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type DonationEmailEvent = {
  id: string;
  deliveryStatus: "pending" | "sent" | "failed" | "skipped";
  emailType: DonationRequestStatus;
  errorSummary: string | null;
  sentAt: string | null;
};

type DonationNotification = {
  event: DonationEmailEvent | null;
  reason?: "cancellation_email_not_requested";
  status: "sent" | "failed" | "skipped" | "already_recorded" | "pending";
};

type DonationRequestEditorInput = {
  distributionCampaign: string;
  distributionDate: string;
  distributionLocation: string;
  impactNote: string;
  internalNotes: string;
  notifyDonor: boolean;
  pairsDistributed: string;
  status: DonationRequestStatus;
};

export type DonationDrive = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  fullStory: string;
  coverImageUrl: string | null;
  driveDate: string;
  location: string;
  partnerOrganization: string | null;
  goalPairs: number;
  pairsCollected: number;
  pairsRestored: number;
  pairsDonated: number;
  status: DonationDriveStatus;
  isPublished: boolean;
  ctaText: string | null;
  ctaLink: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RestorationStory = {
  id: string;
  slug: string;
  title: string;
  category: RestorationCategory;
  beforeImageUrl: string | null;
  afterImageUrl: string | null;
  description: string;
  restorationWork: string;
  storyDate: string;
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CommunityUpdate = {
  id: string;
  slug: string;
  title: string;
  coverImageUrl: string | null;
  galleryImageUrls: string[];
  updateDate: string;
  location: string;
  recipientOrganization: string;
  shoesDonated: number;
  story: string;
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DonationImpactStats = {
  totalPairsCollected: number;
  totalPairsRestored: number;
  totalPairsDonated: number;
  donationDrivesCompleted: number;
  partnerOrganizations: number;
  communitiesReached: number;
  updatedAt: string;
};

export type CsrDashboardSummary = {
  donationRequestsReceived: number;
  upcomingDonationDrives: number;
  pairsCollected: number;
  pairsRestored: number;
  pairsDonated: number;
  publishedCommunityUpdates: number;
};

type CsrDonationsDashboardProps = {
  initialRequests: DonationRequest[];
  initialDrives: DonationDrive[];
  initialStories: RestorationStory[];
  initialUpdates: CommunityUpdate[];
  initialImpactStats: DonationImpactStats | null;
  initialSummary: CsrDashboardSummary;
  ownerName: string;
  initialLoadError?: string | null;
};

type CsrTab =
  | "overview"
  | "requests"
  | "drives"
  | "stories"
  | "community"
  | "impact";

type DeleteTarget =
  | { kind: "request"; item: DonationRequest }
  | { kind: "drive"; item: DonationDrive }
  | { kind: "story"; item: RestorationStory }
  | { kind: "update"; item: CommunityUpdate };

const requestStatusLabels: Record<DonationRequestStatus, string> =
  DONATION_STATUS_LABELS;

const driveStatusLabels: Record<DonationDriveStatus, string> = {
  draft: "Draft",
  upcoming: "Upcoming",
  active: "Active",
  completed: "Completed",
};

const categoryLabels: Record<RestorationCategory, string> = {
  sneaker_restoration: "Sneaker Restoration",
  donated_shoe_restoration: "Donated Shoe Restoration",
  cleaning_repair: "Cleaning & Repair",
  community_impact: "Community Impact",
};

function formatDate(value: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-NP", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

function formatDateTime(value: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-NP", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function emailDeliveryLabel(event: DonationEmailEvent | null) {
  if (!event) return "No email recorded";
  switch (event.deliveryStatus) {
    case "sent":
      return "Email sent";
    case "pending":
      return "Email delivery pending";
    case "failed":
      return "Email could not be sent";
    case "skipped":
      return event.errorSummary === "email_updates_not_requested"
        ? "Updates not requested"
        : "No eligible email";
  }
  return "No email recorded";
}

function notificationNotice(
  request: DonationRequest,
  notification: DonationNotification | null,
  statusChanged: boolean,
) {
  if (!statusChanged) return `${request.requestId} updated.`;
  if (!notification) return "Status updated.";
  switch (notification.status) {
    case "sent":
      return "Status updated · Email sent";
    case "pending":
      return "Status updated · Email delivery pending";
    case "failed":
      return "Status updated · Email could not be sent";
    case "already_recorded":
      return "Status updated · Email already recorded";
    case "skipped":
      if (notification.reason === "cancellation_email_not_requested") {
        return "Status updated · Cancellation email not requested";
      }
      return notification.event?.errorSummary === "email_updates_not_requested"
        ? "Status updated · Email updates not requested"
        : "Status updated · No eligible email";
  }
  return "Status updated.";
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-NP").format(value);
}

async function responseJson<T>(response: Response): Promise<T> {
  const result = (await response.json()) as T & { message?: string };
  if (!response.ok) {
    throw new Error(result.message || "Something went wrong. Please try again.");
  }
  return result;
}

const donationRequestsPageSize = 50;
const emptyImpactStatsUpdatedAt = new Date(0).toISOString();

function CsvDownload({ filters }: { filters: string }) {
  function exportCsv() {
    const link = document.createElement("a");
    link.href = `/api/admin/csr-donations/requests/export${filters ? `?${filters}` : ""}`;
    link.click();
  }

  return (
    <button className="admin-secondary" type="button" onClick={exportCsv}>
      Export CSV
    </button>
  );
}

function ImageSourceNote({ gallery = false }: { gallery?: boolean }) {
  return (
    <small className="csr-image-source-note">
      Direct image uploads are temporarily disabled. Use an image URL or a website image path.
      {gallery ? " Add one URL or path per line." : ""}
    </small>
  );
}

function imageUrlList(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(/\r?\n/u)
    .map((item) => item.trim())
    .filter(Boolean);
}

function ConfirmationDialog({
  title,
  description,
  onCancel,
  onConfirm,
  busy,
}: {
  title: string;
  description: string;
  onCancel: () => void;
  onConfirm: () => void;
  busy: boolean;
}) {
  return (
    <div className="admin-modal-backdrop" role="presentation">
      <section
        className="admin-modal csr-confirmation-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="csr-confirm-title"
      >
        <div className="modal-heading">
          <div>
            <p className="section-kicker">Confirm action</p>
            <h2 id="csr-confirm-title">{title}</h2>
          </div>
        </div>
        <p>{description}</p>
        <div className="modal-actions">
          <button className="admin-secondary" type="button" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="admin-primary csr-danger-button"
            type="button"
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? "Deleting…" : "Delete permanently"}
          </button>
        </div>
      </section>
    </div>
  );
}

type DonationDriveInput = Omit<
  DonationDrive,
  "id" | "slug" | "publishedAt" | "createdAt" | "updatedAt"
>;

type RestorationStoryInput = Omit<
  RestorationStory,
  "id" | "slug" | "publishedAt" | "createdAt" | "updatedAt"
>;

type CommunityUpdateInput = Omit<
  CommunityUpdate,
  "id" | "slug" | "publishedAt" | "createdAt" | "updatedAt"
>;

function DriveEditor({
  drive,
  onClose,
  onSave,
}: {
  drive: DonationDrive | null;
  onClose: () => void;
  onSave: (input: DonationDriveInput) => Promise<void>;
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    setIsSaving(true);
    try {
      await onSave({
        title: String(form.get("title") ?? ""),
        shortDescription: String(form.get("shortDescription") ?? ""),
        fullStory: String(form.get("fullStory") ?? ""),
        coverImageUrl: String(form.get("coverImageUrl") ?? "").trim() || null,
        driveDate: String(form.get("driveDate") ?? ""),
        location: String(form.get("location") ?? ""),
        partnerOrganization: String(form.get("partnerOrganization") ?? "") || null,
        goalPairs: Math.max(0, Number(form.get("goalPairs") ?? 0)),
        pairsCollected: Math.max(0, Number(form.get("pairsCollected") ?? 0)),
        pairsRestored: Math.max(0, Number(form.get("pairsRestored") ?? 0)),
        pairsDonated: Math.max(0, Number(form.get("pairsDonated") ?? 0)),
        status: String(form.get("status") ?? "draft") as DonationDriveStatus,
        isPublished: form.get("isPublished") === "on",
        ctaText: String(form.get("ctaText") ?? "") || null,
        ctaLink: String(form.get("ctaLink") ?? "") || null,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save this drive.");
      setIsSaving(false);
    }
  }

  return (
    <div className="admin-modal-backdrop" role="presentation">
      <form className="admin-modal csr-editor-modal" onSubmit={submit}>
        <div className="modal-heading">
          <div>
            <p className="section-kicker">Donation drive</p>
            <h2>{drive ? "Edit donation drive." : "Create a donation drive."}</h2>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close donation drive editor"
          >
            ×
          </button>
        </div>
        <div className="admin-form-grid csr-form-grid">
          <label className="full-field">
            <span>Drive title *</span>
            <input name="title" required maxLength={120} defaultValue={drive?.title ?? ""} />
          </label>
          <label className="full-field">
            <span>Short description *</span>
            <textarea
              name="shortDescription"
              required
              maxLength={280}
              rows={3}
              defaultValue={drive?.shortDescription ?? ""}
            />
          </label>
          <label className="full-field">
            <span>Full story / update *</span>
            <textarea
              name="fullStory"
              required
              maxLength={6000}
              rows={7}
              defaultValue={drive?.fullStory ?? ""}
            />
          </label>
          <label className="full-field">
            <span>Cover image URL or path</span>
            <input
              name="coverImageUrl"
              type="text"
              inputMode="url"
              maxLength={500}
              defaultValue={drive?.coverImageUrl ?? ""}
              placeholder="https://example.com/drive.jpg or /images/drive.jpg"
            />
            <ImageSourceNote />
          </label>
          <label>
            <span>Drive date *</span>
            <input name="driveDate" type="date" required defaultValue={drive?.driveDate ?? ""} />
          </label>
          <label>
            <span>Location *</span>
            <input name="location" required maxLength={160} defaultValue={drive?.location ?? ""} />
          </label>
          <label>
            <span>Partner school / NGO / organization</span>
            <input name="partnerOrganization" maxLength={160} defaultValue={drive?.partnerOrganization ?? ""} />
          </label>
          <label>
            <span>Status *</span>
            <select name="status" defaultValue={drive?.status ?? "draft"}>
              {donationDriveStatuses.map((status) => (
                <option value={status} key={status}>{driveStatusLabels[status]}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Goal number of shoe pairs</span>
            <input name="goalPairs" type="number" min="0" max="1000000" defaultValue={drive?.goalPairs ?? 0} />
          </label>
          <label>
            <span>Pairs collected</span>
            <input name="pairsCollected" type="number" min="0" max="1000000" defaultValue={drive?.pairsCollected ?? 0} />
          </label>
          <label>
            <span>Pairs restored</span>
            <input name="pairsRestored" type="number" min="0" max="1000000" defaultValue={drive?.pairsRestored ?? 0} />
          </label>
          <label>
            <span>Pairs donated</span>
            <input name="pairsDonated" type="number" min="0" max="1000000" defaultValue={drive?.pairsDonated ?? 0} />
          </label>
          <label>
            <span>Optional CTA button text</span>
            <input name="ctaText" maxLength={60} defaultValue={drive?.ctaText ?? ""} placeholder="Read the full update" />
          </label>
          <label>
            <span>Optional CTA link</span>
            <input name="ctaLink" type="text" inputMode="url" maxLength={500} defaultValue={drive?.ctaLink ?? ""} placeholder="https://… or /shoe-donation" />
          </label>
          <label className="admin-check">
            <input name="isPublished" type="checkbox" defaultChecked={drive?.isPublished ?? false} />
            <span>Publish this drive on the donation page</span>
          </label>
        </div>
        {error && <p className="csr-form-error" role="alert">{error}</p>}
        <div className="modal-actions">
          <button className="admin-secondary" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="admin-primary" type="submit" disabled={isSaving}>
            {isSaving ? "Saving…" : drive ? "Save changes" : "Create drive"}
          </button>
        </div>
      </form>
    </div>
  );
}

function StoryEditor({
  story,
  onClose,
  onSave,
}: {
  story: RestorationStory | null;
  onClose: () => void;
  onSave: (input: RestorationStoryInput) => Promise<void>;
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    setIsSaving(true);
    try {
      await onSave({
        title: String(form.get("title") ?? ""),
        category: String(form.get("category") ?? "sneaker_restoration") as RestorationCategory,
        beforeImageUrl: String(form.get("beforeImageUrl") ?? "").trim() || null,
        afterImageUrl: String(form.get("afterImageUrl") ?? "").trim() || null,
        description: String(form.get("description") ?? ""),
        restorationWork: String(form.get("restorationWork") ?? ""),
        storyDate: String(form.get("storyDate") ?? ""),
        isPublished: form.get("isPublished") === "on",
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save this story.");
      setIsSaving(false);
    }
  }

  return (
    <div className="admin-modal-backdrop" role="presentation">
      <form className="admin-modal csr-editor-modal" onSubmit={submit}>
        <div className="modal-heading">
          <div>
            <p className="section-kicker">Restoration story</p>
            <h2>{story ? "Edit restoration story." : "Add a restoration story."}</h2>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close restoration story editor">×</button>
        </div>
        <div className="admin-form-grid csr-form-grid">
          <label className="full-field">
            <span>Story title *</span>
            <input name="title" required maxLength={120} defaultValue={story?.title ?? ""} />
          </label>
          <label>
            <span>Category *</span>
            <select name="category" defaultValue={story?.category ?? "sneaker_restoration"}>
              {restorationCategories.map((category) => (
                <option key={category} value={category}>{categoryLabels[category]}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Date *</span>
            <input name="storyDate" type="date" required defaultValue={story?.storyDate ?? ""} />
          </label>
          <label>
            <span>Before image URL or path</span>
            <input
              name="beforeImageUrl"
              type="text"
              inputMode="url"
              maxLength={500}
              defaultValue={story?.beforeImageUrl ?? ""}
              placeholder="https://example.com/before.jpg or /images/before.jpg"
            />
            <ImageSourceNote />
          </label>
          <label>
            <span>After image URL or path</span>
            <input
              name="afterImageUrl"
              type="text"
              inputMode="url"
              maxLength={500}
              defaultValue={story?.afterImageUrl ?? ""}
              placeholder="https://example.com/after.jpg or /images/after.jpg"
            />
            <ImageSourceNote />
          </label>
          <label className="full-field">
            <span>Description *</span>
            <textarea name="description" required maxLength={1200} rows={4} defaultValue={story?.description ?? ""} />
          </label>
          <label className="full-field">
            <span>Restoration work performed *</span>
            <textarea name="restorationWork" required maxLength={2400} rows={5} defaultValue={story?.restorationWork ?? ""} placeholder="Cleaning, repairs, repainting, sole work, sanitising…" />
          </label>
          <label className="admin-check">
            <input name="isPublished" type="checkbox" defaultChecked={story?.isPublished ?? false} />
            <span>Publish this story on the donation page</span>
          </label>
        </div>
        {error && <p className="csr-form-error" role="alert">{error}</p>}
        <div className="modal-actions">
          <button className="admin-secondary" type="button" onClick={onClose}>Cancel</button>
          <button className="admin-primary" type="submit" disabled={isSaving}>
            {isSaving ? "Saving…" : story ? "Save changes" : "Add story"}
          </button>
        </div>
      </form>
    </div>
  );
}

function CommunityUpdateEditor({
  update,
  onClose,
  onSave,
}: {
  update: CommunityUpdate | null;
  onClose: () => void;
  onSave: (input: CommunityUpdateInput) => Promise<void>;
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    setIsSaving(true);
    try {
      await onSave({
        title: String(form.get("title") ?? ""),
        coverImageUrl: String(form.get("coverImageUrl") ?? "").trim() || null,
        galleryImageUrls: imageUrlList(form.get("galleryImageUrls")),
        updateDate: String(form.get("updateDate") ?? ""),
        location: String(form.get("location") ?? ""),
        recipientOrganization: String(form.get("recipientOrganization") ?? ""),
        shoesDonated: Math.max(0, Number(form.get("shoesDonated") ?? 0)),
        story: String(form.get("story") ?? ""),
        isPublished: form.get("isPublished") === "on",
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save this community update.");
      setIsSaving(false);
    }
  }

  return (
    <div className="admin-modal-backdrop" role="presentation">
      <form className="admin-modal csr-editor-modal" onSubmit={submit}>
        <div className="modal-heading">
          <div>
            <p className="section-kicker">Community update</p>
            <h2>{update ? "Edit community update." : "Share a community update."}</h2>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close community update editor">×</button>
        </div>
        <div className="admin-form-grid csr-form-grid">
          <label className="full-field">
            <span>Update title *</span>
            <input name="title" required maxLength={120} defaultValue={update?.title ?? ""} />
          </label>
          <label className="full-field">
            <span>Cover image URL or path</span>
            <input
              name="coverImageUrl"
              type="text"
              inputMode="url"
              maxLength={500}
              defaultValue={update?.coverImageUrl ?? ""}
              placeholder="https://example.com/community-update.jpg or /images/update.jpg"
            />
            <ImageSourceNote />
          </label>
          <label className="full-field">
            <span>Gallery image URLs or paths</span>
            <textarea
              name="galleryImageUrls"
              maxLength={8000}
              rows={5}
              defaultValue={(update?.galleryImageUrls ?? []).join("\n")}
              placeholder={"https://example.com/photo-one.jpg\n/images/photo-two.jpg"}
            />
            <ImageSourceNote gallery />
          </label>
          <label>
            <span>Date *</span>
            <input name="updateDate" type="date" required defaultValue={update?.updateDate ?? ""} />
          </label>
          <label>
            <span>Location *</span>
            <input name="location" required maxLength={160} defaultValue={update?.location ?? ""} />
          </label>
          <label>
            <span>Recipient organization or school *</span>
            <input name="recipientOrganization" required maxLength={160} defaultValue={update?.recipientOrganization ?? ""} />
          </label>
          <label>
            <span>Number of shoes donated</span>
            <input name="shoesDonated" type="number" min="0" max="1000000" defaultValue={update?.shoesDonated ?? 0} />
          </label>
          <label className="full-field">
            <span>Written update / story *</span>
            <textarea name="story" required maxLength={6000} rows={8} defaultValue={update?.story ?? ""} />
          </label>
          <label className="admin-check">
            <input name="isPublished" type="checkbox" defaultChecked={update?.isPublished ?? false} />
            <span>Publish this update on the donation page</span>
          </label>
        </div>
        {error && <p className="csr-form-error" role="alert">{error}</p>}
        <div className="modal-actions">
          <button className="admin-secondary" type="button" onClick={onClose}>Cancel</button>
          <button className="admin-primary" type="submit" disabled={isSaving}>
            {isSaving ? "Saving…" : update ? "Save changes" : "Publish update"}
          </button>
        </div>
      </form>
    </div>
  );
}

function RequestDetailEditor({
  request,
  onClose,
  onRetry,
  onSave,
}: {
  request: DonationRequest;
  onClose: () => void;
  onRetry: (emailEventId: string) => Promise<void>;
  onSave: (input: DonationRequestEditorInput) => Promise<void>;
}) {
  const [selectedStatus, setSelectedStatus] = useState<DonationRequestStatus>(request.status);
  const [isSaving, setIsSaving] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    setIsSaving(true);
    try {
      await onSave({
        status: String(form.get("status")) as DonationRequestStatus,
        notifyDonor: form.get("notifyDonor") === "on",
        internalNotes: String(form.get("internalNotes") ?? ""),
        distributionLocation: String(form.get("distributionLocation") ?? ""),
        distributionCampaign: String(form.get("distributionCampaign") ?? ""),
        distributionDate: String(form.get("distributionDate") ?? ""),
        pairsDistributed: String(form.get("pairsDistributed") ?? ""),
        impactNote: String(form.get("impactNote") ?? ""),
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update this request.");
      setIsSaving(false);
    }
  }

  async function retryEmail() {
    const event = request.lastEmailEvent;
    if (!event || event.deliveryStatus !== "failed") return;
    setError(null);
    setIsRetrying(true);
    try {
      await onRetry(event.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to retry the donor email.");
      setIsRetrying(false);
    }
  }

  return (
    <div className="admin-modal-backdrop" role="presentation">
      <form className="admin-modal csr-request-modal" onSubmit={submit}>
        <div className="modal-heading">
          <div>
            <p className="section-kicker">Donation request {request.requestId}</p>
            <h2>{request.donorName}</h2>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close donation request details">×</button>
        </div>
        <dl className="csr-request-details">
          <div><dt>Donation reference</dt><dd>{request.requestId}</dd></div>
          <div><dt>Phone</dt><dd><a href={`tel:${request.phone}`}>{request.phone}</a></dd></div>
          <div><dt>Email</dt><dd>{request.email ? <a href={`mailto:${request.email}`}>{request.email}</a> : "Not provided"}</dd></div>
          <div><dt>Email updates</dt><dd>{request.emailUpdatesConsent ? "Allowed by donor" : "Not requested"}</dd></div>
          <div><dt>Last email sent</dt><dd>{request.lastEmailSentAt ? formatDateTime(request.lastEmailSentAt) : "—"}</dd></div>
          <div><dt>Email delivery</dt><dd>{emailDeliveryLabel(request.lastEmailEvent)}</dd></div>
          <div><dt>Location</dt><dd>{request.location}</dd></div>
          <div><dt>Pairs</dt><dd>{formatNumber(request.numberOfPairs)}</dd></div>
          <div><dt>Shoe type</dt><dd>{request.shoeType || "Not provided"}</dd></div>
          <div><dt>Shoe condition</dt><dd>{request.shoeCondition.replaceAll("-", " ")}</dd></div>
          <div><dt>Method</dt><dd>{request.donationMethod === "pickup_support" ? "Pickup support" : "Self drop-off"}</dd></div>
          <div><dt>Pickup address</dt><dd>{request.pickupAddress || "—"}</dd></div>
          <div><dt>Preferred pickup date</dt><dd>{request.preferredPickupDate ? formatDate(request.preferredPickupDate) : "—"}</dd></div>
          <div><dt>Donor note</dt><dd>{request.donorNotes || "—"}</dd></div>
          <div><dt>Submitted</dt><dd>{formatDateTime(request.submittedAt)}</dd></div>
        </dl>
        <div className="admin-form-grid csr-form-grid">
          <label>
            <span>Status</span>
            <select
              name="status"
              value={selectedStatus}
              onChange={(event) => setSelectedStatus(event.target.value as DonationRequestStatus)}
            >
              {donationRequestStatuses.map((status) => (
                <option key={status} value={status}>{requestStatusLabels[status]}</option>
              ))}
            </select>
          </label>
          {selectedStatus === "cancelled" && (
            <label className="admin-check full-field">
              <input name="notifyDonor" type="checkbox" />
              <span>Send a cancellation email to the donor when it is appropriate.</span>
            </label>
          )}
          <label className="full-field">
            <span>Internal notes</span>
            <textarea name="internalNotes" rows={5} maxLength={2000} defaultValue={request.internalNotes ?? ""} placeholder="Only the Shoe Doctor team can see these notes." />
          </label>
          <div className="full-field csr-impact-editor">
            <p>Optional impact details <small>Included only in the final donated email.</small></p>
            <div className="admin-form-grid csr-form-grid">
              <label>
                <span>Distribution location</span>
                <input name="distributionLocation" maxLength={180} defaultValue={request.distributionLocation ?? ""} />
              </label>
              <label>
                <span>Distribution campaign</span>
                <input name="distributionCampaign" maxLength={180} defaultValue={request.distributionCampaign ?? ""} />
              </label>
              <label>
                <span>Distribution date</span>
                <input name="distributionDate" type="date" defaultValue={request.distributionDate ?? ""} />
              </label>
              <label>
                <span>Pairs distributed</span>
                <input name="pairsDistributed" type="number" min="0" max="1000000" defaultValue={request.pairsDistributed ?? ""} />
              </label>
              <label className="full-field">
                <span>Donor-safe impact note</span>
                <textarea name="impactNote" rows={4} maxLength={1200} defaultValue={request.impactNote ?? ""} placeholder="For example: Distributed to students during our local school donation program." />
              </label>
            </div>
          </div>
        </div>
        {error && <p className="csr-form-error" role="alert">{error}</p>}
        <div className="modal-actions">
          <button className="admin-secondary" type="button" onClick={onClose}>Close</button>
          {request.lastEmailEvent?.deliveryStatus === "failed" && (
            <button className="admin-secondary" type="button" onClick={retryEmail} disabled={isRetrying || isSaving}>
              {isRetrying ? "Retrying email…" : "Retry email"}
            </button>
          )}
          <button className="admin-primary" type="submit" disabled={isSaving}>{isSaving ? "Saving…" : "Save request"}</button>
        </div>
      </form>
    </div>
  );
}

function toDriveInput(drive: DonationDrive): DonationDriveInput {
  return {
    title: drive.title,
    shortDescription: drive.shortDescription,
    fullStory: drive.fullStory,
    coverImageUrl: drive.coverImageUrl,
    driveDate: drive.driveDate,
    location: drive.location,
    partnerOrganization: drive.partnerOrganization,
    goalPairs: drive.goalPairs,
    pairsCollected: drive.pairsCollected,
    pairsRestored: drive.pairsRestored,
    pairsDonated: drive.pairsDonated,
    status: drive.status,
    isPublished: drive.isPublished,
    ctaText: drive.ctaText,
    ctaLink: drive.ctaLink,
  };
}

function toStoryInput(story: RestorationStory): RestorationStoryInput {
  return {
    title: story.title,
    category: story.category,
    beforeImageUrl: story.beforeImageUrl,
    afterImageUrl: story.afterImageUrl,
    description: story.description,
    restorationWork: story.restorationWork,
    storyDate: story.storyDate,
    isPublished: story.isPublished,
  };
}

function toUpdateInput(update: CommunityUpdate): CommunityUpdateInput {
  return {
    title: update.title,
    coverImageUrl: update.coverImageUrl,
    galleryImageUrls: update.galleryImageUrls,
    updateDate: update.updateDate,
    location: update.location,
    recipientOrganization: update.recipientOrganization,
    shoesDonated: update.shoesDonated,
    story: update.story,
    isPublished: update.isPublished,
  };
}

export default function CsrDonationsDashboard({
  initialRequests,
  initialDrives,
  initialStories,
  initialUpdates,
  initialImpactStats,
  initialSummary,
  ownerName,
  initialLoadError = null,
}: CsrDonationsDashboardProps) {
  const [tab, setTab] = useState<CsrTab>("overview");
  const [requests, setRequests] = useState(initialRequests);
  const [drives, setDrives] = useState(initialDrives);
  const [stories, setStories] = useState(initialStories);
  const [updates, setUpdates] = useState(initialUpdates);
  const [impactStats, setImpactStats] = useState(initialImpactStats);
  const [dashboardSummary, setDashboardSummary] = useState(initialSummary);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [requestSearch, setRequestSearch] = useState("");
  const [requestStatus, setRequestStatus] = useState<"all" | DonationRequestStatus>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [appliedRequestFilters, setAppliedRequestFilters] = useState("");
  const [requestPage, setRequestPage] = useState(0);
  const [requestTotal, setRequestTotal] = useState(initialSummary.donationRequestsReceived);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [driveEditor, setDriveEditor] = useState<DonationDrive | null | undefined>(undefined);
  const [storyEditor, setStoryEditor] = useState<RestorationStory | null | undefined>(undefined);
  const [updateEditor, setUpdateEditor] = useState<CommunityUpdate | null | undefined>(undefined);
  const [requestEditor, setRequestEditor] = useState<DonationRequest | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const requestFilterQuery = useMemo(() => {
    const params = new URLSearchParams();
    if (requestSearch.trim()) params.set("q", requestSearch.trim());
    if (requestStatus !== "all") params.set("status", requestStatus);
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", toDate);
    return params.toString();
  }, [fromDate, requestSearch, requestStatus, toDate]);

  const requestPageCount = Math.max(1, Math.ceil(requestTotal / donationRequestsPageSize));

  async function loadDonationRequests(
    page: number,
    filters = appliedRequestFilters,
  ) {
    const params = new URLSearchParams(filters);
    params.set("limit", String(donationRequestsPageSize));
    params.set("offset", String(page * donationRequestsPageSize));
    setRequestsLoading(true);
    try {
      const response = await fetch(
        `/api/admin/csr-donations/requests?${params.toString()}`,
      );
      const result = await responseJson<{ requests: DonationRequest[]; total: number }>(response);
      setRequests(result.requests);
      setRequestTotal(result.total);
      setRequestPage(page);
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Unable to load donation requests.",
      );
    } finally {
      setRequestsLoading(false);
    }
  }

  function applyRequestFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAppliedRequestFilters(requestFilterQuery);
    void loadDonationRequests(0, requestFilterQuery);
  }

  function clearRequestFilters() {
    setRequestSearch("");
    setRequestStatus("all");
    setFromDate("");
    setToDate("");
    setAppliedRequestFilters("");
    void loadDonationRequests(0, "");
  }

  const summary = useMemo(() => {
    return [
      { label: "Donation requests received", value: dashboardSummary.donationRequestsReceived, tone: "coral" },
      { label: "Upcoming donation drives", value: dashboardSummary.upcomingDonationDrives, tone: "blue" },
      { label: "Pairs collected", value: dashboardSummary.pairsCollected, tone: "lime" },
      { label: "Pairs restored", value: dashboardSummary.pairsRestored, tone: "violet" },
      { label: "Pairs donated", value: dashboardSummary.pairsDonated, tone: "cream" },
      { label: "Published community updates", value: dashboardSummary.publishedCommunityUpdates, tone: "teal" },
    ];
  }, [dashboardSummary]);

  async function saveDrive(input: DonationDriveInput) {
    const editing = driveEditor;
    setBusy("drive-save");
    try {
      const response = await fetch(
        editing
          ? `/api/admin/csr-donations/drives/${encodeURIComponent(editing.id)}`
          : "/api/admin/csr-donations/drives",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(
            editing ? { ...input, expectedUpdatedAt: editing.updatedAt } : input,
          ),
        },
      );
      const result = await responseJson<{ drive: DonationDrive }>(response);
      setDrives((current) =>
        editing
          ? current.map((drive) => (drive.id === result.drive.id ? result.drive : drive))
          : [result.drive, ...current],
      );
      setDashboardSummary((current) => ({
        ...current,
        upcomingDonationDrives:
          current.upcomingDonationDrives +
          (result.drive.status === "upcoming" ? 1 : 0) -
          (editing?.status === "upcoming" ? 1 : 0),
      }));
      setDriveEditor(undefined);
      setNotice(editing ? "Donation drive updated." : "Donation drive created.");
    } finally {
      setBusy(null);
    }
  }

  async function saveStory(input: RestorationStoryInput) {
    const editing = storyEditor;
    setBusy("story-save");
    try {
      const response = await fetch(
        editing
          ? `/api/admin/csr-donations/stories/${encodeURIComponent(editing.id)}`
          : "/api/admin/csr-donations/stories",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(
            editing ? { ...input, expectedUpdatedAt: editing.updatedAt } : input,
          ),
        },
      );
      const result = await responseJson<{ story: RestorationStory }>(response);
      setStories((current) =>
        editing
          ? current.map((story) => (story.id === result.story.id ? result.story : story))
          : [result.story, ...current],
      );
      setStoryEditor(undefined);
      setNotice(editing ? "Restoration story updated." : "Restoration story added.");
    } finally {
      setBusy(null);
    }
  }

  async function saveUpdate(input: CommunityUpdateInput) {
    const editing = updateEditor;
    setBusy("update-save");
    try {
      const response = await fetch(
        editing
          ? `/api/admin/csr-donations/updates/${encodeURIComponent(editing.id)}`
          : "/api/admin/csr-donations/updates",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(
            editing ? { ...input, expectedUpdatedAt: editing.updatedAt } : input,
          ),
        },
      );
      const result = await responseJson<{ update: CommunityUpdate }>(response);
      setUpdates((current) =>
        editing
          ? current.map((update) => (update.id === result.update.id ? result.update : update))
          : [result.update, ...current],
      );
      setDashboardSummary((current) => ({
        ...current,
        publishedCommunityUpdates:
          current.publishedCommunityUpdates +
          (result.update.isPublished ? 1 : 0) -
          (editing?.isPublished ? 1 : 0),
      }));
      setUpdateEditor(undefined);
      setNotice(editing ? "Community update saved." : "Community update created.");
    } finally {
      setBusy(null);
    }
  }

  async function saveRequest(input: DonationRequestEditorInput) {
    if (!requestEditor) return;
    setBusy(`request-${requestEditor.id}`);
    try {
      const response = await fetch(
        `/api/admin/csr-donations/requests/${encodeURIComponent(requestEditor.id)}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            ...input,
            expectedUpdatedAt: requestEditor.updatedAt,
          }),
        },
      );
      const result = await responseJson<{
        notification: DonationNotification | null;
        request: DonationRequest;
        statusChanged: boolean;
      }>(response);
      setRequests((current) =>
        current.map((request) => request.id === result.request.id ? result.request : request),
      );
      void loadDonationRequests(requestPage);
      setRequestEditor(null);
      setNotice(
        notificationNotice(
          result.request,
          result.notification,
          result.statusChanged,
        ),
      );
    } finally {
      setBusy(null);
    }
  }

  async function retryRequestEmail(request: DonationRequest, emailEventId: string) {
    setBusy(`request-email-${emailEventId}`);
    try {
      const response = await fetch(
        `/api/admin/csr-donations/requests/${encodeURIComponent(request.id)}/emails/${encodeURIComponent(emailEventId)}/retry`,
        { method: "POST" },
      );
      const result = await responseJson<{
        event: DonationEmailEvent;
        request: DonationRequest;
      }>(response);
      setRequests((current) =>
        current.map((item) => item.id === result.request.id ? result.request : item),
      );
      setRequestEditor(null);
      void loadDonationRequests(requestPage);
      setNotice(
        result.event.deliveryStatus === "sent"
          ? "Donor email retry sent."
          : result.event.deliveryStatus === "pending"
            ? "Donor email retry is still pending."
            : "Donor email retry could not be sent.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function toggleDrive(drive: DonationDrive) {
    setBusy(`drive-${drive.id}`);
    setNotice(null);
    try {
      const response = await fetch(
        `/api/admin/csr-donations/drives/${encodeURIComponent(drive.id)}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            ...toDriveInput(drive),
            isPublished: !drive.isPublished,
            expectedUpdatedAt: drive.updatedAt,
          }),
        },
      );
      const result = await responseJson<{ drive: DonationDrive }>(response);
      setDrives((current) => current.map((item) => item.id === drive.id ? result.drive : item));
      setDashboardSummary((current) => ({
        ...current,
        upcomingDonationDrives:
          current.upcomingDonationDrives +
          (result.drive.status === "upcoming" ? 1 : 0) -
          (drive.status === "upcoming" ? 1 : 0),
      }));
      setNotice(result.drive.isPublished ? "Donation drive published." : "Donation drive unpublished.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to update this drive.");
    } finally {
      setBusy(null);
    }
  }

  async function toggleStory(story: RestorationStory) {
    setBusy(`story-${story.id}`);
    setNotice(null);
    try {
      const response = await fetch(
        `/api/admin/csr-donations/stories/${encodeURIComponent(story.id)}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            ...toStoryInput(story),
            isPublished: !story.isPublished,
            expectedUpdatedAt: story.updatedAt,
          }),
        },
      );
      const result = await responseJson<{ story: RestorationStory }>(response);
      setStories((current) => current.map((item) => item.id === story.id ? result.story : item));
      setNotice(result.story.isPublished ? "Story published." : "Story unpublished.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to update this story.");
    } finally {
      setBusy(null);
    }
  }

  async function toggleUpdate(update: CommunityUpdate) {
    setBusy(`update-${update.id}`);
    setNotice(null);
    try {
      const response = await fetch(
        `/api/admin/csr-donations/updates/${encodeURIComponent(update.id)}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            ...toUpdateInput(update),
            isPublished: !update.isPublished,
            expectedUpdatedAt: update.updatedAt,
          }),
        },
      );
      const result = await responseJson<{ update: CommunityUpdate }>(response);
      setUpdates((current) => current.map((item) => item.id === update.id ? result.update : item));
      setDashboardSummary((current) => ({
        ...current,
        publishedCommunityUpdates:
          current.publishedCommunityUpdates +
          (result.update.isPublished ? 1 : 0) -
          (update.isPublished ? 1 : 0),
      }));
      setNotice(result.update.isPublished ? "Community update published." : "Community update unpublished.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to update this update.");
    } finally {
      setBusy(null);
    }
  }

  async function deleteItem() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setBusy(`delete-${target.kind}-${target.item.id}`);
    try {
      const response = await fetch(
        `/api/admin/csr-donations/${target.kind === "story" ? "stories" : target.kind === "update" ? "updates" : `${target.kind}s`}/${encodeURIComponent(target.item.id)}`,
        {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ expectedUpdatedAt: target.item.updatedAt }),
        },
      );
      await responseJson<{ ok: boolean }>(response);
      if (target.kind === "request") {
        setRequests((current) => current.filter((item) => item.id !== target.item.id));
        setRequestTotal((current) => Math.max(0, current - 1));
        setDashboardSummary((current) => ({
          ...current,
          donationRequestsReceived: Math.max(0, current.donationRequestsReceived - 1),
        }));
        const nextPage = requests.length === 1 && requestPage > 0 ? requestPage - 1 : requestPage;
        void loadDonationRequests(nextPage);
      } else if (target.kind === "drive") {
        setDrives((current) => current.filter((item) => item.id !== target.item.id));
        if (target.item.status === "upcoming") {
          setDashboardSummary((current) => ({
            ...current,
            upcomingDonationDrives: Math.max(0, current.upcomingDonationDrives - 1),
          }));
        }
      } else if (target.kind === "story") {
        setStories((current) => current.filter((item) => item.id !== target.item.id));
      } else {
        setUpdates((current) => current.filter((item) => item.id !== target.item.id));
        if (target.item.isPublished) {
          setDashboardSummary((current) => ({
            ...current,
            publishedCommunityUpdates: Math.max(0, current.publishedCommunityUpdates - 1),
          }));
        }
      }
      setNotice(`${target.kind === "story" ? "Restoration story" : target.kind === "update" ? "Community update" : target.kind === "drive" ? "Donation drive" : "Donation request"} deleted.`);
      setDeleteTarget(null);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to delete this item.");
    } finally {
      setBusy(null);
    }
  }

  async function saveImpactStats(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const readValue = (name: string) => Math.max(0, Number(form.get(name) ?? 0));
    setBusy("impact-save");
    setNotice(null);
    try {
      const response = await fetch("/api/admin/csr-donations/stats", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          totalPairsCollected: readValue("totalPairsCollected"),
          totalPairsRestored: readValue("totalPairsRestored"),
          totalPairsDonated: readValue("totalPairsDonated"),
          donationDrivesCompleted: readValue("donationDrivesCompleted"),
          partnerOrganizations: readValue("partnerOrganizations"),
          communitiesReached: readValue("communitiesReached"),
          expectedUpdatedAt:
            impactStats?.updatedAt ?? emptyImpactStatsUpdatedAt,
        }),
      });
      const result = await responseJson<{ stats: DonationImpactStats }>(response);
      setImpactStats(result.stats);
      setDashboardSummary((current) => ({
        ...current,
        pairsCollected: result.stats.totalPairsCollected,
        pairsRestored: result.stats.totalPairsRestored,
        pairsDonated: result.stats.totalPairsDonated,
      }));
      setNotice("Impact statistics saved and ready for the public donation page.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to save impact statistics.");
    } finally {
      setBusy(null);
    }
  }

  async function signOut() {
    setBusy("logout");
    setNotice(null);
    try {
      const response = await fetch("/api/admin/logout", { method: "POST" });
      if (!response.ok) throw new Error("Unable to sign out.");
      window.location.assign("/admin/login");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to sign out.");
      setBusy(null);
    }
  }

  const navigation: Array<{ id: CsrTab; label: string; count?: number }> = [
    { id: "overview", label: "Overview" },
    { id: "requests", label: "Donation Requests" },
    { id: "drives", label: "Donation Drives" },
    { id: "stories", label: "Restoration Stories" },
    { id: "community", label: "Community Updates" },
    { id: "impact", label: "Impact Statistics" },
  ];

  return (
    <main id="main-content" className="admin-shell csr-admin-shell">
      <header className="admin-header">
        <Link className="admin-brand" href="/">
          <span>SD+</span>
          <div>
            <strong>Shoe Doctor</strong>
            <small>Super Admin dashboard</small>
          </div>
        </Link>
        <div className="admin-owner">
          <span>Signed in as {ownerName} · Super Admin</span>
          <button type="button" onClick={() => void signOut()} disabled={busy === "logout"}>
            {busy === "logout" ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </header>

      <section className="csr-admin-intro">
        <div>
          <p className="section-kicker">Community care control room</p>
          <h1>CSR &amp;<br />DONATIONS.</h1>
          <p>Publish verified impact, run drives, and give every donated pair a next chapter.</p>
        </div>
        <Link className="admin-secondary" href="/shoe-donation" target="_blank" rel="noreferrer">
          View donation page ↗
        </Link>
      </section>

      <div className="csr-admin-workspace">
        <aside className="csr-admin-sidebar" aria-label="CSR and donations navigation">
          <Link href="/admin" className="csr-admin-back-link">← Main dashboard</Link>
          <Link href="/admin/csr-donations" className="csr-admin-module-link">
            <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <path d="M16 17.4 8.6 10.6a5.3 5.3 0 0 1 7.4-7.6L16 3l.1-.1a5.3 5.3 0 0 1 7.3 7.7L16 17.4Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              <path d="m4.5 20 4.2-3.5 4.4 3.2 2.2-1.8a2.7 2.7 0 0 1 3.5 0l4.4 3.6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              <path d="m7.2 23.5 2.4 2.1a2.5 2.5 0 0 0 3.4 0l1.2-1 1.2 1a2.5 2.5 0 0 0 3.4 0l2.3-2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
            <span>CSR &amp; Donations</span>
          </Link>
          <p>CSR &amp; Donations</p>
          <nav>
            {navigation.map((item) => (
              <button
                key={item.id}
                type="button"
                className={tab === item.id ? "active" : ""}
                onClick={() => setTab(item.id)}
              >
                <span>{item.label}</span>
                {item.count ? <b>{item.count}</b> : null}
              </button>
            ))}
          </nav>
        </aside>

        <div className="csr-admin-content">
          {initialLoadError && (
            <div className="csr-load-error" role="alert">
              <strong>CSR data needs attention.</strong>
              <span>{initialLoadError}</span>
            </div>
          )}
          {notice && (
            <div className="admin-notice" role="status">
              {notice}
              <button onClick={() => setNotice(null)} aria-label="Dismiss">×</button>
            </div>
          )}

          {tab === "overview" && (
            <section className="csr-overview">
              <div className="csr-summary-grid">
                {summary.map((item) => (
                  <article key={item.label} className={`csr-summary-card ${item.tone}`}>
                    <strong>{formatNumber(item.value)}</strong>
                    <span>{item.label}</span>
                  </article>
                ))}
              </div>
              <div className="csr-overview-grid">
                <section className="admin-panel csr-quick-actions">
                  <p className="section-kicker">Create an update</p>
                  <h2>Keep the community story moving.</h2>
                  <p>Publish the latest drive, a restoration before-and-after, or a school donation update.</p>
                  <div>
                    <button className="admin-primary" type="button" onClick={() => { setTab("drives"); setDriveEditor(null); }}>+ New drive</button>
                    <button className="admin-secondary" type="button" onClick={() => { setTab("stories"); setStoryEditor(null); }}>+ New story</button>
                    <button className="admin-secondary" type="button" onClick={() => { setTab("community"); setUpdateEditor(null); }}>+ Community update</button>
                  </div>
                </section>
                <section className="admin-panel csr-overview-list">
                  <div className="csr-mini-heading">
                    <div><p className="section-kicker">Latest requests</p><h2>Needs attention</h2></div>
                    <button type="button" className="csr-text-button" onClick={() => setTab("requests")}>View all →</button>
                  </div>
                  {requests.slice(0, 4).length ? requests.slice(0, 4).map((request) => (
                    <button className="csr-request-snippet" type="button" key={request.id} onClick={() => setRequestEditor(request)}>
                      <span className={`csr-status-pill ${request.status}`}>{requestStatusLabels[request.status]}</span>
                      <strong>{request.donorName}</strong>
                      <small>{request.numberOfPairs} pair{request.numberOfPairs === 1 ? "" : "s"} · {request.location}</small>
                    </button>
                  )) : <div className="empty-state csr-small-empty"><strong>No donation requests yet.</strong><p>New public donation requests will appear here automatically.</p></div>}
                </section>
              </div>
            </section>
          )}

          {tab === "requests" && (
            <section className="admin-panel csr-content-panel">
              <div className="admin-panel-heading csr-panel-heading">
                <div>
                  <p className="section-kicker">Public Shoe Donation form</p>
                  <h2>Donation requests.</h2>
                  <p>Search, follow up, and move every donated pair through its next step.</p>
                </div>
                <CsvDownload filters={appliedRequestFilters} />
              </div>
              <form className="csr-request-filters" onSubmit={applyRequestFilters}>
                <label>
                  <span>Search</span>
                  <input value={requestSearch} onChange={(event) => setRequestSearch(event.target.value)} placeholder="Donor name, phone, or location" />
                </label>
                <label>
                  <span>Status</span>
                  <select value={requestStatus} onChange={(event) => setRequestStatus(event.target.value as "all" | DonationRequestStatus)}>
                    <option value="all">All statuses</option>
                    {donationRequestStatuses.map((status) => <option key={status} value={status}>{requestStatusLabels[status]}</option>)}
                  </select>
                </label>
                <label>
                  <span>From</span>
                  <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
                </label>
                <label>
                  <span>To</span>
                  <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
                </label>
                <div className="csr-request-filter-actions">
                  <button className="admin-primary" type="submit" disabled={requestsLoading}>
                    {requestsLoading ? "Loading..." : "Apply filters"}
                  </button>
                  <button className="admin-secondary" type="button" onClick={clearRequestFilters} disabled={requestsLoading}>
                    Clear
                  </button>
                </div>
              </form>
              {requests.length ? (
                <div className="csr-table-scroll">
                  <table className="csr-request-table">
                    <thead>
                      <tr>
                        <th>Donation reference</th><th>Donor</th><th>Phone</th><th>Email</th><th>Location</th><th>Pairs</th><th>Condition</th><th>Method</th><th>Pickup date</th><th>Status</th><th>Updates</th><th>Last email</th><th>Delivery</th><th>Submitted</th><th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requests.map((request) => (
                        <tr key={request.id}>
                          <td><strong>{request.requestId}</strong></td>
                          <td>{request.donorName}</td>
                          <td><a href={`tel:${request.phone}`}>{request.phone}</a></td>
                          <td>{request.email ? <a href={`mailto:${request.email}`}>{request.email}</a> : "—"}</td>
                          <td>{request.location}</td>
                          <td>{request.numberOfPairs}</td>
                          <td>{request.shoeCondition.replaceAll("-", " ")}</td>
                          <td>{request.donationMethod === "pickup_support" ? "Pickup support" : "Self drop-off"}</td>
                          <td>{request.preferredPickupDate ? formatDate(request.preferredPickupDate) : "—"}</td>
                          <td><span className={`csr-status-pill ${request.status}`}>{requestStatusLabels[request.status]}</span></td>
                          <td>{request.emailUpdatesConsent ? "Allowed" : "Not requested"}</td>
                          <td>{request.lastEmailSentAt ? formatDateTime(request.lastEmailSentAt) : "—"}</td>
                          <td>{emailDeliveryLabel(request.lastEmailEvent)}</td>
                          <td>{formatDate(request.submittedAt)}</td>
                          <td>
                            <div className="csr-table-actions">
                              <button type="button" onClick={() => setRequestEditor(request)}>View / edit</button>
                              <button type="button" className="danger" onClick={() => setDeleteTarget({ kind: "request", item: request })}>Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state">
                  <span aria-hidden="true">♡</span>
                  <strong>No matching donation requests.</strong>
                  <p>New requests from the public donation form will appear here automatically.</p>
                </div>
              )}
              <div className="csr-pagination" aria-label="Donation request pagination">
                <p>
                  {requestTotal
                    ? `Showing ${requestPage * donationRequestsPageSize + 1}-${Math.min((requestPage + 1) * donationRequestsPageSize, requestTotal)} of ${formatNumber(requestTotal)} requests`
                    : "No donation requests found."}
                </p>
                <div>
                  <button
                    className="admin-secondary"
                    type="button"
                    disabled={requestsLoading || requestPage === 0}
                    onClick={() => void loadDonationRequests(requestPage - 1)}
                  >
                    Previous
                  </button>
                  <span>Page {requestPage + 1} of {requestPageCount}</span>
                  <button
                    className="admin-secondary"
                    type="button"
                    disabled={requestsLoading || requestPage + 1 >= requestPageCount}
                    onClick={() => void loadDonationRequests(requestPage + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            </section>
          )}

          {tab === "drives" && (
            <section className="admin-panel csr-content-panel">
              <div className="admin-panel-heading csr-panel-heading">
                <div>
                  <p className="section-kicker">Campaign management</p>
                  <h2>Donation drives.</h2>
                  <p>Create the announcements, goals, and verified impact updates your community can follow.</p>
                </div>
                <button className="admin-primary" type="button" onClick={() => setDriveEditor(null)}>+ Create drive</button>
              </div>
              {drives.length ? (
                <div className="csr-admin-card-grid">
                  {drives.map((drive) => {
                    const image = drive.coverImageUrl;
                    return (
                      <article className="csr-admin-content-card" key={drive.id}>
                        <div className="csr-admin-content-card__media">
                          {image ? <img src={image} alt="" /> : <span>Donation drive</span>}
                          <span className={`csr-status-pill ${drive.status}`}>{driveStatusLabels[drive.status]}</span>
                        </div>
                        <div className="csr-admin-content-card__body">
                          <div className="csr-card-meta"><span>{formatDate(drive.driveDate)}</span><span>{drive.location}</span></div>
                          <h3>{drive.title}</h3>
                          <p>{drive.shortDescription}</p>
                          <dl className="csr-drive-numbers"><div><dt>Goal</dt><dd>{formatNumber(drive.goalPairs)}</dd></div><div><dt>Collected</dt><dd>{formatNumber(drive.pairsCollected)}</dd></div><div><dt>Restored</dt><dd>{formatNumber(drive.pairsRestored)}</dd></div><div><dt>Donated</dt><dd>{formatNumber(drive.pairsDonated)}</dd></div></dl>
                          <div className="csr-card-actions">
                            <button type="button" onClick={() => setDriveEditor(drive)}>Edit</button>
                            <button type="button" disabled={busy === `drive-${drive.id}`} onClick={() => toggleDrive(drive)}>{drive.isPublished ? "Unpublish" : "Publish"}</button>
                            <button type="button" className="danger" onClick={() => setDeleteTarget({ kind: "drive", item: drive })}>Delete</button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-state"><span aria-hidden="true">▧</span><strong>No donation drives yet.</strong><p>Create a draft or publish your next collection campaign.</p><button className="admin-primary" type="button" onClick={() => setDriveEditor(null)}>Create first drive</button></div>
              )}
            </section>
          )}

          {tab === "stories" && (
            <section className="admin-panel csr-content-panel">
              <div className="admin-panel-heading csr-panel-heading">
                <div>
                  <p className="section-kicker">Before and after updates</p>
                  <h2>Restoration stories.</h2>
                  <p>Show the careful work that helps donated shoes start their next journey.</p>
                </div>
                <button className="admin-primary" type="button" onClick={() => setStoryEditor(null)}>+ Add story</button>
              </div>
              {stories.length ? (
                <div className="csr-admin-card-grid csr-story-admin-grid">
                  {stories.map((story) => (
                    <article className="csr-admin-content-card" key={story.id}>
                      <div className="csr-story-admin-images">
                        {story.beforeImageUrl ? <img src={story.beforeImageUrl} alt="" /> : <span>Before image</span>}
                        {story.afterImageUrl ? <img src={story.afterImageUrl} alt="" /> : <span>After image</span>}
                      </div>
                      <div className="csr-admin-content-card__body">
                        <div className="csr-card-meta"><span>{categoryLabels[story.category]}</span><span>{formatDate(story.storyDate)}</span></div>
                        <h3>{story.title}</h3>
                        <p>{story.description}</p>
                        <div className="csr-card-actions">
                          <button type="button" onClick={() => setStoryEditor(story)}>Edit</button>
                          <button type="button" disabled={busy === `story-${story.id}`} onClick={() => toggleStory(story)}>{story.isPublished ? "Unpublish" : "Publish"}</button>
                          <button type="button" className="danger" onClick={() => setDeleteTarget({ kind: "story", item: story })}>Delete</button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty-state"><span aria-hidden="true">◐</span><strong>No restoration stories yet.</strong><p>Add before-and-after images to create an honest record of the work.</p><button className="admin-primary" type="button" onClick={() => setStoryEditor(null)}>Add first story</button></div>
              )}
            </section>
          )}

          {tab === "community" && (
            <section className="admin-panel csr-content-panel">
              <div className="admin-panel-heading csr-panel-heading">
                <div>
                  <p className="section-kicker">Partner and school outcomes</p>
                  <h2>Community updates.</h2>
                  <p>Celebrate every school, NGO, and community that receives donated pairs.</p>
                </div>
                <button className="admin-primary" type="button" onClick={() => setUpdateEditor(null)}>+ Add update</button>
              </div>
              {updates.length ? (
                <div className="csr-admin-card-grid">
                  {updates.map((update) => {
                    const image = update.coverImageUrl ?? update.galleryImageUrls[0] ?? null;
                    return (
                      <article className="csr-admin-content-card" key={update.id}>
                        <div className="csr-admin-content-card__media">
                          {image ? <img src={image} alt="" /> : <span>Community update</span>}
                          <span className={`csr-status-pill ${update.isPublished ? "published" : "draft"}`}>{update.isPublished ? "Published" : "Draft"}</span>
                        </div>
                        <div className="csr-admin-content-card__body">
                          <div className="csr-card-meta"><span>{formatDate(update.updateDate)}</span><span>{update.location}</span></div>
                          <h3>{update.title}</h3>
                          <p>{update.recipientOrganization} · {formatNumber(update.shoesDonated)} pairs donated</p>
                          <div className="csr-card-actions">
                            <button type="button" onClick={() => setUpdateEditor(update)}>Edit</button>
                            <button type="button" disabled={busy === `update-${update.id}`} onClick={() => toggleUpdate(update)}>{update.isPublished ? "Unpublish" : "Publish"}</button>
                            <button type="button" className="danger" onClick={() => setDeleteTarget({ kind: "update", item: update })}>Delete</button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-state"><span aria-hidden="true">✦</span><strong>No community updates yet.</strong><p>Publish a card or gallery after shoes reach a partner school or organization.</p><button className="admin-primary" type="button" onClick={() => setUpdateEditor(null)}>Add first update</button></div>
              )}
            </section>
          )}

          {tab === "impact" && (
            <section className="admin-panel csr-content-panel">
              <div className="admin-panel-heading csr-panel-heading">
                <div>
                  <p className="section-kicker">Verified programme data</p>
                  <h2>Impact statistics.</h2>
                  <p>Only saved values are shown on the public donation page. Update these after you verify the programme totals.</p>
                </div>
              </div>
              <form className="csr-impact-form" onSubmit={saveImpactStats} key={impactStats?.updatedAt ?? "new"}>
                <label><span>Total pairs collected</span><input name="totalPairsCollected" type="number" min="0" max="100000000" defaultValue={impactStats?.totalPairsCollected ?? 0} required /></label>
                <label><span>Total pairs restored</span><input name="totalPairsRestored" type="number" min="0" max="100000000" defaultValue={impactStats?.totalPairsRestored ?? 0} required /></label>
                <label><span>Total pairs donated</span><input name="totalPairsDonated" type="number" min="0" max="100000000" defaultValue={impactStats?.totalPairsDonated ?? 0} required /></label>
                <label><span>Donation drives completed</span><input name="donationDrivesCompleted" type="number" min="0" max="100000000" defaultValue={impactStats?.donationDrivesCompleted ?? 0} required /></label>
                <label><span>Partner organizations</span><input name="partnerOrganizations" type="number" min="0" max="100000000" defaultValue={impactStats?.partnerOrganizations ?? 0} required /></label>
                <label><span>Communities reached</span><input name="communitiesReached" type="number" min="0" max="100000000" defaultValue={impactStats?.communitiesReached ?? 0} required /></label>
                <div className="csr-impact-form__footer">
                  <p>{impactStats ? `Last saved ${formatDateTime(impactStats.updatedAt)}.` : "No statistics have been saved yet. The public page will show an updates-coming-soon state."}</p>
                  <button className="admin-primary" type="submit" disabled={busy === "impact-save"}>{busy === "impact-save" ? "Saving…" : "Save verified statistics"}</button>
                </div>
              </form>
            </section>
          )}
        </div>
      </div>

      {driveEditor !== undefined && <DriveEditor key={driveEditor?.id ?? "new-drive"} drive={driveEditor} onClose={() => setDriveEditor(undefined)} onSave={saveDrive} />}
      {storyEditor !== undefined && <StoryEditor key={storyEditor?.id ?? "new-story"} story={storyEditor} onClose={() => setStoryEditor(undefined)} onSave={saveStory} />}
      {updateEditor !== undefined && <CommunityUpdateEditor key={updateEditor?.id ?? "new-update"} update={updateEditor} onClose={() => setUpdateEditor(undefined)} onSave={saveUpdate} />}
      {requestEditor && <RequestDetailEditor request={requestEditor} onClose={() => setRequestEditor(null)} onRetry={(emailEventId) => retryRequestEmail(requestEditor, emailEventId)} onSave={saveRequest} />}
      {deleteTarget && <ConfirmationDialog title={`Delete ${deleteTarget.kind === "story" ? "this restoration story" : deleteTarget.kind === "update" ? "this community update" : deleteTarget.kind === "drive" ? "this donation drive" : "this donation request"}?`} description="This permanently removes the record from the portal. This action cannot be undone." onCancel={() => setDeleteTarget(null)} onConfirm={deleteItem} busy={busy === `delete-${deleteTarget.kind}-${deleteTarget.item.id}`} />}
    </main>
  );
}
