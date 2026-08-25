"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getBookingItems } from "@/lib/booking-items.js";
import {
  BOOKING_REFERENCE_TIME_ZONE,
  getPhysicalPairTag,
  normalizeBookingReferenceSearch,
} from "@/lib/booking-reference";
import type {
  Booking,
  BookingItem,
  BookingNotification,
  BookingStatus,
  BookingStatusHistory,
  Service,
  ServiceInput,
} from "@/lib/data";

const statusOptions: Array<{ value: BookingStatus; label: string }> = [
  { value: "new", label: "Booking received" },
  { value: "confirmed", label: "Order accepted" },
  { value: "received", label: "Shoes received" },
  { value: "in_progress", label: "Cleaning" },
  { value: "completed", label: "Care completed" },
  { value: "ready", label: "Ready to go" },
  { value: "cancelled", label: "Cancelled" },
];

function CsrDonationsIcon() {
  return (
    <svg
      className="admin-csr-nav-link__icon"
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M16 17.4 8.6 10.6a5.3 5.3 0 0 1 7.4-7.6L16 3l.1-.1a5.3 5.3 0 0 1 7.3 7.7L16 17.4Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="m4.5 20 4.2-3.5 4.4 3.2 2.2-1.8a2.7 2.7 0 0 1 3.5 0l4.4 3.6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="m7.2 23.5 2.4 2.1a2.5 2.5 0 0 0 3.4 0l1.2-1 1.2 1a2.5 2.5 0 0 0 3.4 0l2.3-2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

const emptyService: ServiceInput = {
  name: "",
  category: "Cleaning",
  priceLabel: "",
  specialPriceLabel: null,
  turnaround: "",
  description: "",
  features: [],
  badge: null,
  tone: "lime",
  icon: "+",
  active: true,
  sortOrder: 0,
};

type AdminDashboardProps = {
  initialServices: Service[];
  initialBookings: Booking[];
  ownerName: string;
  ownerRole: "super_admin" | "admin";
};

function toInput(service: Service): ServiceInput {
  const {
    name,
    category,
    priceLabel,
    specialPriceLabel,
    turnaround,
    description,
    features,
    badge,
    tone,
    icon,
    active,
    sortOrder,
  } = service;
  return {
    name,
    category,
    priceLabel,
    specialPriceLabel,
    turnaround,
    description,
    features,
    badge,
    tone,
    icon,
    active,
    sortOrder,
  };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NP", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: BOOKING_REFERENCE_TIME_ZONE,
  }).format(new Date(value));
}

function statusLabel(status: BookingStatus) {
  return (
    statusOptions.find((option) => option.value === status)?.label ?? status
  );
}

function formatNpr(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "Quote after review";
  return `Rs ${new Intl.NumberFormat("en-NP", {
    maximumFractionDigits: 0,
  }).format(value)}`;
}

function itemPriceLabel(item: BookingItem) {
  return item.servicePrice === null
    ? item.servicePriceLabel
    : formatNpr(item.servicePrice);
}

function pairCountLabel(pairCount: number) {
  return `${pairCount} ${pairCount === 1 ? "pair" : "pairs"}`;
}

function normalizedPhone(value: string) {
  return value.replace(/\D/g, "");
}

function deliverySummary(booking: Booking) {
  if (booking.fulfillmentMethod !== "pickup_delivery") {
    return "Free — Self drop & pickup";
  }
  if (booking.freeDeliveryApplied) {
    return "FREE — 4+ Pair Hetauda Offer";
  }
  return formatNpr(booking.deliveryFee);
}

function latestStatusNotification(booking: Booking) {
  return booking.statusHistory[booking.statusHistory.length - 1]?.notification ?? null;
}

function notificationCopy(notification: BookingNotification | null) {
  if (!notification) return "No customer email is needed for this status.";
  if (notification.status === "sent") return "Email sent";
  if (notification.status === "pending") return "Email sending";
  if (notification.status === "failed") return "Email failed";
  if (notification.lastError === "customer_email_missing") {
    return "No email address available";
  }
  if (notification.lastError === "customer_email_invalid") {
    return "Customer email address is invalid";
  }
  if (notification.lastError === "status_not_customer_notifiable") {
    return "No customer email for this internal status";
  }
  return "Email skipped";
}

function mergeStatusUpdate(
  current: Booking,
  booking: Booking,
  history?: BookingStatusHistory,
  notification?: BookingNotification,
) {
  const nextHistory = history
    ? [
        ...current.statusHistory,
        { ...history, notification: notification ?? history.notification },
      ]
    : current.statusHistory;
  return { ...current, ...booking, statusHistory: nextHistory };
}

function mergeNotification(
  current: Booking,
  notification: BookingNotification,
) {
  return {
    ...current,
    statusHistory: current.statusHistory.map((history) =>
      history.id === notification.statusHistoryId
        ? { ...history, notification }
        : history,
    ),
  };
}

export default function AdminDashboard({
  initialServices,
  initialBookings,
  ownerName,
  ownerRole,
}: AdminDashboardProps) {
  const isSuperAdmin = ownerRole === "super_admin";
  const [tab, setTab] = useState<"services" | "bookings">(
    isSuperAdmin ? "services" : "bookings",
  );
  const [services, setServices] = useState(initialServices);
  const [bookings, setBookings] = useState(initialBookings);
  const [bookingFilter, setBookingFilter] = useState<"all" | BookingStatus>(
    "all",
  );
  const [bookingSearch, setBookingSearch] = useState("");
  const [referenceSearchResult, setReferenceSearchResult] = useState<{
    publicReference: string;
    bookings: Booking[];
  } | null>(null);
  const [editor, setEditor] = useState<{
    id: string | null;
    updatedAt: string | null;
    value: ServiceInput;
  } | null>(null);
  const [featuresText, setFeaturesText] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const bookingReferenceSearch = useMemo(
    () => normalizeBookingReferenceSearch(bookingSearch),
    [bookingSearch],
  );
  const referenceSearchKey = bookingReferenceSearch?.publicReference ?? null;

  useEffect(() => {
    if (!referenceSearchKey) return;

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      void (async () => {
        try {
          const response = await fetch(
            "/api/admin/bookings?reference=" +
              encodeURIComponent(referenceSearchKey),
            { signal: controller.signal },
          );
          const result = (await response.json()) as {
            bookings?: Booking[];
            message?: string;
          };
          if (!response.ok) {
            throw new Error(result.message || "Unable to search bookings.");
          }
          if (!controller.signal.aborted) {
            setReferenceSearchResult({
              publicReference: referenceSearchKey,
              bookings: result.bookings ?? [],
            });
          }
        } catch (error) {
          if (controller.signal.aborted) return;
          setReferenceSearchResult({
            publicReference: referenceSearchKey,
            bookings: [],
          });
          setNotice(
            error instanceof Error ? error.message : "Unable to search bookings.",
          );
        }
      })();
    }, 250);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [referenceSearchKey]);

  const filteredBookings = useMemo(() => {
    const textSearch = bookingSearch.trim().toLocaleLowerCase();
    const phoneSearch = normalizedPhone(bookingSearch);
    const serverReferenceBookings =
      referenceSearchResult?.publicReference === referenceSearchKey
        ? referenceSearchResult.bookings
        : null;
    const bookingsToFilter = bookingReferenceSearch
      ? (serverReferenceBookings ?? bookings)
      : bookings;

    return bookingsToFilter.filter((booking) => {
      if (bookingFilter !== "all" && booking.status !== bookingFilter) {
        return false;
      }
      if (!textSearch) return true;

      if (bookingReferenceSearch) {
        if (
          booking.publicReference !== bookingReferenceSearch.publicReference
        ) {
          return false;
        }
        return (
          bookingReferenceSearch.pairNumber === null ||
          getBookingItems(booking).some(
            (item) => item.pairNumber === bookingReferenceSearch.pairNumber,
          )
        );
      }

      return (
        booking.customerName.toLocaleLowerCase().includes(textSearch) ||
        (phoneSearch.length > 0 &&
          normalizedPhone(booking.phone).includes(phoneSearch))
      );
    });
  }, [
    bookings,
    bookingFilter,
    bookingReferenceSearch,
    bookingSearch,
    referenceSearchKey,
    referenceSearchResult,
  ]);

  const newBookings = bookings.filter(
    (booking) => booking.status === "new",
  ).length;
  const activeServices = services.filter((service) => service.active).length;

  function openNewService() {
    setEditor({
      id: null,
      updatedAt: null,
      value: {
        ...emptyService,
        sortOrder: services.length
          ? Math.max(...services.map((service) => service.sortOrder)) + 10
          : 10,
      },
    });
    setFeaturesText("");
    setNotice(null);
  }

  function openService(service: Service) {
    setEditor({ id: service.id, updatedAt: service.updatedAt, value: toInput(service) });
    setFeaturesText(service.features.join("\n"));
    setNotice(null);
  }

  function updateEditor<K extends keyof ServiceInput>(
    key: K,
    value: ServiceInput[K],
  ) {
    setEditor((current) =>
      current
        ? { ...current, value: { ...current.value, [key]: value } }
        : current,
    );
  }

  async function saveService(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor) return;

    setBusy("service");
    setNotice(null);
    const payload = {
      ...editor.value,
      ...(editor.id ? { updatedAt: editor.updatedAt } : {}),
      features: featuresText
        .split("\n")
        .map((feature) => feature.trim())
        .filter(Boolean),
    };

    try {
      const response = await fetch(
        editor.id
          ? `/api/admin/services/${encodeURIComponent(editor.id)}`
          : "/api/admin/services",
        {
          method: editor.id ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const result = (await response.json()) as {
        service?: Service;
        message?: string;
      };
      if (!response.ok || !result.service) {
        throw new Error(result.message || "Unable to save service.");
      }

      setServices((current) => {
        const next = editor.id
          ? current.map((service) =>
              service.id === result.service?.id ? result.service : service,
            )
          : [...current, result.service as Service];
        return next.sort((a, b) => a.sortOrder - b.sortOrder);
      });
      setEditor(null);
      setNotice(editor.id ? "Service updated." : "Service added.");
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Unable to save service.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function toggleService(service: Service) {
    setBusy(service.id);
    setNotice(null);
    try {
      const response = await fetch(
        `/api/admin/services/${encodeURIComponent(service.id)}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ...toInput(service), active: !service.active, updatedAt: service.updatedAt }),
        },
      );
      const result = (await response.json()) as {
        service?: Service;
        message?: string;
      };
      if (!response.ok || !result.service) {
        throw new Error(result.message || "Unable to change visibility.");
      }
      setServices((current) =>
        current.map((item) =>
          item.id === service.id ? (result.service as Service) : item,
        ),
      );
      setNotice(
        result.service.active
          ? `${service.name} is now visible.`
          : `${service.name} is now hidden.`,
      );
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Unable to change visibility.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function removeService(service: Service) {
    if (
      !window.confirm(
        `Delete “${service.name}”? Existing bookings will keep the service name, but this service cannot be restored.`,
      )
    ) {
      return;
    }

    setBusy(service.id);
    setNotice(null);
    try {
      const response = await fetch(
        `/api/admin/services/${encodeURIComponent(service.id)}`,
        {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ updatedAt: service.updatedAt }),
        },
      );
      const result = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(result.message || "Unable to delete service.");
      }
      setServices((current) =>
        current.filter((item) => item.id !== service.id),
      );
      setNotice(`${service.name} deleted.`);
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Unable to delete service.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function changeBookingStatus(
    booking: Booking,
    status: BookingStatus,
  ) {
    setBusy(booking.id);
    setNotice(null);
    try {
      const response = await fetch(
        `/api/admin/bookings/${encodeURIComponent(booking.id)}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status, recordVersion: booking.recordVersion }),
        },
      );
      const result = (await response.json()) as {
        booking?: Booking;
        history?: BookingStatusHistory;
        message?: string;
        notification?: BookingNotification;
        unchanged?: boolean;
      };
      if (!response.ok || !result.booking) {
        throw new Error(result.message || "Unable to update booking.");
      }
      setBookings((current) =>
        current.map((item) =>
          item.id === booking.id
            ? mergeStatusUpdate(
                item,
                result.booking as Booking,
                result.history,
                result.notification,
              )
            : item,
        ),
      );
      setReferenceSearchResult((current) =>
        current
          ? {
              ...current,
              bookings: current.bookings.map((item) =>
                item.id === booking.id
                  ? mergeStatusUpdate(
                      item,
                      result.booking as Booking,
                      result.history,
                      result.notification,
                    )
                  : item,
              ),
            }
          : null,
      );
      setNotice(
        result.unchanged
          ? (booking.publicReference ?? "This booking") +
            " is already " +
            statusLabel(status) +
            "."
          : (booking.publicReference ?? "This booking") +
            " marked " +
            statusLabel(status) +
            ". " +
            notificationCopy(result.notification ?? null),
      );
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Unable to update booking.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function retryStatusEmail(
    booking: Booking,
    notification: BookingNotification,
  ) {
    setBusy(`notification:${notification.id}`);
    setNotice(null);
    try {
      const response = await fetch(
        `/api/admin/bookings/${encodeURIComponent(booking.id)}/notifications/${encodeURIComponent(notification.id)}/retry`,
        { method: "POST" },
      );
      const result = (await response.json()) as {
        message?: string;
        notification?: BookingNotification;
      };
      if (!response.ok || !result.notification) {
        throw new Error(result.message || "Unable to retry customer email.");
      }
      setBookings((current) =>
        current.map((item) =>
          item.id === booking.id
            ? mergeNotification(item, result.notification as BookingNotification)
            : item,
        ),
      );
      setReferenceSearchResult((current) =>
        current
          ? {
              ...current,
              bookings: current.bookings.map((item) =>
                item.id === booking.id
                  ? mergeNotification(
                      item,
                      result.notification as BookingNotification,
                    )
                  : item,
              ),
            }
          : null,
      );
      setNotice(
        result.notification.status === "sent"
          ? "Customer email sent for " +
            (booking.publicReference ?? "this booking") +
            "."
          : "Customer email retry finished: " +
            notificationCopy(result.notification) +
            ".",
      );
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Unable to retry customer email.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function copyBookingValue(value: string, label: string) {
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard is unavailable.");
      }
      await navigator.clipboard.writeText(value);
      setNotice(label + " copied.");
    } catch {
      setNotice("Unable to copy " + label.toLocaleLowerCase() + ".");
    }
  }

  async function signOut() {
    setBusy("logout");
    try {
      const response = await fetch("/api/admin/logout", { method: "POST" });
      if (!response.ok) throw new Error("Unable to sign out.");
      window.location.assign("/");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to sign out.");
      setBusy(null);
    }
  }

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <Link className="admin-brand" href="/">
          <span>SD+</span>
          <div>
            <strong>Shoe Doctor</strong>
            <small>{isSuperAdmin ? "Super Admin dashboard" : "Operations dashboard"}</small>
          </div>
        </Link>
        <div className="admin-owner">
          <span>Signed in as {ownerName} · {isSuperAdmin ? "Super Admin" : "Admin"}</span>
          <button type="button" onClick={() => void signOut()} disabled={busy === "logout"}>
            {busy === "logout" ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </header>

      <section className="admin-welcome">
        <div>
          <p className="section-kicker">Business control room</p>
          <h1>RUN THE MENU.<br />TRACK THE PAIRS.</h1>
        </div>
        <div className="admin-stats">
          <article>
            <strong>{activeServices}</strong>
            <span>Visible services</span>
          </article>
          <article className={newBookings ? "attention" : ""}>
            <strong>{newBookings}</strong>
            <span>New bookings</span>
          </article>
        </div>
      </section>

      <div className="admin-tabs" role="tablist">
        {isSuperAdmin && (
          <button
            className={tab === "services" ? "active" : ""}
            onClick={() => setTab("services")}
            role="tab"
            aria-selected={tab === "services"}
          >
            Services & pricing
          </button>
        )}
        <button
          className={tab === "bookings" ? "active" : ""}
          onClick={() => setTab("bookings")}
          role="tab"
          aria-selected={tab === "bookings"}
        >
          Bookings {newBookings > 0 && <span>{newBookings}</span>}
        </button>
        <Link className="admin-view-site-link" href="/admin/bookings/new">
          + Counter booking
        </Link>
        {isSuperAdmin && (
          <>
            <Link className="admin-csr-nav-link" href="/admin/csr-donations" aria-label="Open CSR and Donations">
              <CsrDonationsIcon />
              <span>CSR &amp; Donations</span>
            </Link>
            <Link className="admin-view-site-link" href="/admin/users">Admin users</Link>
            <Link className="admin-view-site-link" href="/admin/activity">Admin activity</Link>
            <Link className="admin-view-site-link" href="/admin/deleted-bookings">Deleted bookings</Link>
          </>
        )}
        <Link
          className="admin-view-site-link"
          href="/"
          target="_blank"
          rel="noreferrer"
        >
          View website ↗
        </Link>
      </div>

      {notice && (
        <div className="admin-notice" role="status">
          {notice}
          <button onClick={() => setNotice(null)} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}

      {isSuperAdmin && tab === "services" ? (
        <section className="admin-panel">
          <div className="admin-panel-heading">
            <div>
              <p className="section-kicker">Live service menu</p>
              <h2>Change anything without code.</h2>
            </div>
            <button className="admin-primary" onClick={openNewService}>
              + Add service
            </button>
          </div>

          <div className="admin-service-list">
            {services.map((service) => (
              <article
                className={`admin-service-row ${service.active ? "" : "hidden-service"}`}
                key={service.id}
              >
                <span className={`service-swatch ${service.tone}`}>
                  {service.icon}
                </span>
                <div className="admin-service-info">
                  <small>
                    {service.category} · {service.turnaround}
                  </small>
                  <strong>{service.name}</strong>
                  <span>{service.priceLabel}</span>
                  {service.specialPriceLabel && (
                    <em>{service.specialPriceLabel}</em>
                  )}
                </div>
                <div className="admin-row-status">
                  <span className={service.active ? "live" : "hidden"}>
                    {service.active ? "Visible" : "Hidden"}
                  </span>
                  <small>Order {service.sortOrder}</small>
                </div>
                <div className="admin-row-actions">
                  <button onClick={() => openService(service)}>Edit</button>
                  <button
                    disabled={busy === service.id}
                    onClick={() => toggleService(service)}
                  >
                    {service.active ? "Hide" : "Show"}
                  </button>
                  <button
                    className="danger"
                    disabled={busy === service.id}
                    onClick={() => removeService(service)}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <section className="admin-panel">
          <div className="admin-panel-heading booking-heading">
            <div>
              <p className="section-kicker">Customer requests</p>
              <h2>Every booking in one place.</h2>
            </div>
            <div className="booking-filter-controls">
              <label className="booking-search">
                <span>Search</span>
                <input
                  type="search"
                  value={bookingSearch}
                  onChange={(event) => setBookingSearch(event.target.value)}
                  placeholder="Reference, tag, name, or phone"
                />
              </label>
              <label className="booking-filter">
                <span>Show</span>
                <select
                  value={bookingFilter}
                  onChange={(event) =>
                    setBookingFilter(
                      event.target.value as "all" | BookingStatus,
                    )
                  }
                >
                  <option value="all">All bookings</option>
                  {statusOptions.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="admin-booking-list">
            {filteredBookings.length === 0 ? (
              <div className="empty-state">
                <span>◎</span>
                <strong>No bookings here yet.</strong>
                <p>New customer requests will appear automatically.</p>
              </div>
            ) : (
              filteredBookings.map((booking) => {
                const items = getBookingItems(booking);
                const pairCount = items.length;
                const hasStoredItems = booking.items.length > 0;
                const notification = latestStatusNotification(booking);
                const publicReference = booking.publicReference;
                const matchedPairNumber =
                  publicReference &&
                  bookingReferenceSearch?.publicReference === publicReference
                    ? bookingReferenceSearch.pairNumber
                    : null;
                return (
                <article className="admin-booking-card" key={booking.id}>
                  <div className="booking-card-top">
                    <div className="booking-card-meta">
                      <span className={`status-pill ${booking.status}`}>
                        {statusLabel(booking.status)}
                      </span>
                      <small>{formatDate(booking.createdAt)}</small>
                      <small>{pairCountLabel(pairCount)}</small>
                      <small>
                        {booking.createdSource === "admin"
                          ? `Entered by ${booking.createdByAdminName ?? "Unknown"}`
                          : booking.createdSource === "legacy"
                            ? "Legacy/Unknown"
                            : "Customer/System"}
                      </small>
                      {matchedPairNumber !== null && (
                        <small className="booking-search-match">
                          Pair {matchedPairNumber} matched
                        </small>
                      )}
                    </div>
                    <div className="booking-card-reference">
                      <small>Booking reference</small>
                      {publicReference ? (
                        <span className="booking-reference-value">
                          <strong>{publicReference}</strong>
                          <button
                            type="button"
                            className="booking-copy-button"
                            onClick={() =>
                              void copyBookingValue(
                                publicReference,
                                "Booking reference",
                              )
                            }
                            aria-label={"Copy booking reference " + publicReference}
                          >
                            Copy
                          </button>
                        </span>
                      ) : (
                        <span className="booking-reference-unavailable">
                          Reference unavailable
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="booking-customer">
                    <div>
                      <small>Customer</small>
                      <strong>{booking.customerName}</strong>
                      <a href={`tel:${booking.phone}`}>{booking.phone}</a>
                      {booking.email && (
                        <a href={`mailto:${booking.email}`}>{booking.email}</a>
                      )}
                    </div>
                    <div>
                      <small>Pickup / drop-off</small>
                      <strong>
                        {booking.fulfillmentMethod === "pickup_delivery"
                          ? "Pickup & drop-off"
                          : "Self drop & pickup"}
                      </strong>
                      {booking.pickupArea && (
                        <span>
                          {booking.pickupArea === "hetauda_city"
                            ? "Hetauda City"
                            : "Other city"}
                          {` - ${deliverySummary(booking)} pickup & return`}
                        </span>
                      )}
                      {booking.freeDeliveryApplied && (
                        <em>4+ Pair Hetauda Offer</em>
                      )}
                      {booking.pickupAddress && <span>{booking.pickupAddress}</span>}
                      {booking.locationUrl && (
                        <a
                          href={booking.locationUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open map location ↗
                        </a>
                      )}
                    </div>
                    <div>
                      <small>Preferred date</small>
                      <strong>{booking.preferredDate || "Not selected"}</strong>
                      {booking.notes && hasStoredItems && (
                        <p>Booking note: {booking.notes}</p>
                      )}
                    </div>
                  </div>

                  <section
                    className="booking-status-history"
                    aria-label={
                      publicReference
                        ? "Shoes in booking " + publicReference
                        : "Shoes in this booking"
                    }
                  >
                    <div className="booking-status-history__heading">
                      <small>Shoe tags</small>
                      <span>{pairCountLabel(pairCount)}</span>
                    </div>
                    <ol>
                      {items.map((item) => {
                        const physicalTag = publicReference
                          ? getPhysicalPairTag(publicReference, item.pairNumber)
                          : null;
                        const isMatchedPair =
                          item.pairNumber === matchedPairNumber;

                        return (
                        <li
                          className={
                            isMatchedPair ? "booking-pair--matched" : undefined
                          }
                          key={item.id}
                        >
                          <small>
                            Pair {item.pairNumber}
                            {isMatchedPair ? " - Matched" : ""}
                          </small>
                          <div>
                            {physicalTag && (
                              <span className="booking-pair-tag">
                                <span>
                                  Tag <code>{physicalTag}</code>
                                </span>
                                <button
                                  type="button"
                                  className="booking-copy-button"
                                  onClick={() =>
                                    void copyBookingValue(
                                      physicalTag,
                                      "Shoe tag",
                                    )
                                  }
                                  aria-label={"Copy shoe tag " + physicalTag}
                                >
                                  Copy
                                </button>
                              </span>
                            )}
                            <strong>
                              {item.serviceName} · {itemPriceLabel(item)}
                            </strong>
                            <span>
                              {item.footwearType}
                              {item.brand ? ` · ${item.brand}` : ""}
                            </span>
                            {item.specialRequest && (
                              <span>Request: {item.specialRequest}</span>
                            )}
                          </div>
                        </li>
                        );
                      })}
                    </ol>
                  </section>

                  <section
                    className="booking-notification"
                    aria-label={
                      publicReference
                        ? "Order summary for " + publicReference
                        : "Order summary for this booking"
                    }
                  >
                    <div>
                      <small>Order summary</small>
                      <strong>Total: {formatNpr(booking.totalAmount)}</strong>
                      <span>Services: {formatNpr(booking.serviceSubtotal)}</span>
                      <span>Delivery: {deliverySummary(booking)}</span>
                      <span>
                        Express: {booking.expressRequested ? formatNpr(booking.expressFee) : "Rs 0"}
                      </span>
                      {booking.freeDeliveryApplied && (
                        <span>
                          Free delivery: {booking.freeDeliveryReason ?? "4+ pairs within Hetauda"}
                        </span>
                      )}
                    </div>
                  </section>

                  <div className="booking-status-meta">
                    <section className="booking-status-history" aria-label="Booking status history">
                      <div className="booking-status-history__heading">
                        <small>Status timeline</small>
                        <span>{booking.statusHistory.length} updates</span>
                      </div>
                      <ol>
                        <li>
                          <time>{formatDate(booking.createdAt)}</time>
                          <div>
                            <strong>Booking received</strong>
                            <span>Customer request created</span>
                          </div>
                        </li>
                        {booking.statusHistory.map((history) => (
                          <li key={history.id}>
                            <time>{formatDate(history.createdAt)}</time>
                            <div>
                              <strong>{statusLabel(history.newStatus)}</strong>
                              <span>
                                Changed from {statusLabel(history.previousStatus)}
                                {history.changedBy ? ` by ${history.changedBy}` : ""}
                              </span>
                            </div>
                          </li>
                        ))}
                      </ol>
                    </section>

                    <section className="booking-notification" aria-live="polite">
                      <div>
                        <small>Customer notification</small>
                        <strong className={`booking-notification__state ${notification?.status ?? "not-applicable"}`}>
                          {notificationCopy(notification)}
                        </strong>
                        {notification?.sentAt && (
                          <span>Sent {formatDate(notification.sentAt)}</span>
                        )}
                      </div>
                      {isSuperAdmin && notification?.status === "failed" && (
                        <button
                          className="admin-secondary booking-notification__retry"
                          type="button"
                          disabled={busy === `notification:${notification.id}`}
                          onClick={() => retryStatusEmail(booking, notification)}
                        >
                          {busy === `notification:${notification.id}`
                            ? "Retrying…"
                            : "Retry Email"}
                        </button>
                      )}
                    </section>
                  </div>

                  <div className="booking-card-actions">
                    <label>
                      <span>Update status</span>
                      <select
                        value={booking.status}
                        disabled={busy === booking.id}
                        onChange={(event) =>
                          changeBookingStatus(
                            booking,
                            event.target.value as BookingStatus,
                          )
                        }
                      >
                        {statusOptions.map((status) => (
                          <option key={status.value} value={status.value}>
                            {status.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <a href={`tel:${booking.phone}`}>Call customer</a>
                    <Link href={`/admin/bookings/${encodeURIComponent(booking.id)}`}>
                      View details
                    </Link>
                  </div>
                </article>
                );
              })
            )}
          </div>
        </section>
      )}

      {editor && (
        <div className="admin-modal-backdrop" role="presentation">
          <form className="admin-modal" onSubmit={saveService}>
            <div className="modal-heading">
              <div>
                <p className="section-kicker">
                  {editor.id ? "Edit service" : "New service"}
                </p>
                <h2>{editor.id ? "Update the menu card." : "Add to the menu."}</h2>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setEditor(null)}
                aria-label="Close editor"
              >
                ×
              </button>
            </div>

            <div className="admin-form-grid">
              <label>
                <span>Service name *</span>
                <input
                  value={editor.value.name}
                  onChange={(event) => updateEditor("name", event.target.value)}
                  required
                  maxLength={80}
                  placeholder="Example: Suede Care"
                />
              </label>

              <label>
                <span>Category *</span>
                <select
                  value={editor.value.category}
                  onChange={(event) =>
                    updateEditor(
                      "category",
                      event.target.value as ServiceInput["category"],
                    )
                  }
                >
                  <option>Cleaning</option>
                  <option>Repairs</option>
                  <option>Add-ons</option>
                </select>
              </label>

              <label>
                <span>Main price *</span>
                <input
                  value={editor.value.priceLabel}
                  onChange={(event) =>
                    updateEditor("priceLabel", event.target.value)
                  }
                  required
                  maxLength={40}
                  placeholder="Rs 499 or From Rs 499"
                />
              </label>

              <label>
                <span>Special price</span>
                <input
                  value={editor.value.specialPriceLabel ?? ""}
                  onChange={(event) =>
                    updateEditor(
                      "specialPriceLabel",
                      event.target.value || null,
                    )
                  }
                  maxLength={60}
                  placeholder="Made-in-Nepal: Rs 449"
                />
              </label>

              <label>
                <span>Turnaround *</span>
                <input
                  value={editor.value.turnaround}
                  onChange={(event) =>
                    updateEditor("turnaround", event.target.value)
                  }
                  required
                  maxLength={40}
                  placeholder="2–3 days"
                />
              </label>

              <label>
                <span>Display order</span>
                <input
                  type="number"
                  min="0"
                  max="9999"
                  value={editor.value.sortOrder}
                  onChange={(event) =>
                    updateEditor("sortOrder", Number(event.target.value))
                  }
                />
              </label>

              <label>
                <span>Card colour</span>
                <select
                  value={editor.value.tone}
                  onChange={(event) =>
                    updateEditor(
                      "tone",
                      event.target.value as ServiceInput["tone"],
                    )
                  }
                >
                  <option value="lime">Electric lime</option>
                  <option value="coral">Coral orange</option>
                  <option value="violet">Violet</option>
                  <option value="blue">Clinic blue</option>
                  <option value="cream">Warm cream</option>
                </select>
              </label>

              <label>
                <span>Icon</span>
                <input
                  value={editor.value.icon}
                  onChange={(event) => updateEditor("icon", event.target.value)}
                  maxLength={4}
                  placeholder="✦"
                />
              </label>

              <label className="full-field">
                <span>Description *</span>
                <textarea
                  rows={3}
                  value={editor.value.description}
                  onChange={(event) =>
                    updateEditor("description", event.target.value)
                  }
                  required
                  maxLength={280}
                  placeholder="A short, clear description of the treatment."
                />
              </label>

              <label className="full-field">
                <span>Included features — one per line</span>
                <textarea
                  rows={6}
                  value={featuresText}
                  onChange={(event) => setFeaturesText(event.target.value)}
                  placeholder={"Deep cleaning\nStain treatment\nDeodorizing"}
                />
              </label>

              <label>
                <span>Badge</span>
                <input
                  value={editor.value.badge ?? ""}
                  onChange={(event) =>
                    updateEditor("badge", event.target.value || null)
                  }
                  maxLength={40}
                  placeholder="Most popular"
                />
              </label>

              <label className="admin-check">
                <input
                  type="checkbox"
                  checked={editor.value.active}
                  onChange={(event) =>
                    updateEditor("active", event.target.checked)
                  }
                />
                <span>Show this service publicly</span>
              </label>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="admin-secondary"
                onClick={() => setEditor(null)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="admin-primary"
                disabled={busy === "service"}
              >
                {busy === "service"
                  ? "Saving…"
                  : editor.id
                    ? "Save changes"
                    : "Add service"}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
