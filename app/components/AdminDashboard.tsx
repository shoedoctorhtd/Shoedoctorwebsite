"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type {
  Booking,
  BookingStatus,
  Service,
  ServiceInput,
} from "@/lib/data";

const statusOptions: Array<{ value: BookingStatus; label: string }> = [
  { value: "new", label: "New" },
  { value: "confirmed", label: "Confirmed" },
  { value: "in_progress", label: "In progress" },
  { value: "ready", label: "Ready" },
  { value: "completed", label: "Completed" },
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
  }).format(new Date(value));
}

export default function AdminDashboard({
  initialServices,
  initialBookings,
  ownerName,
}: AdminDashboardProps) {
  const [tab, setTab] = useState<"services" | "bookings">("services");
  const [services, setServices] = useState(initialServices);
  const [bookings, setBookings] = useState(initialBookings);
  const [bookingFilter, setBookingFilter] = useState<"all" | BookingStatus>(
    "all",
  );
  const [editor, setEditor] = useState<{
    id: string | null;
    value: ServiceInput;
  } | null>(null);
  const [featuresText, setFeaturesText] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const filteredBookings = useMemo(
    () =>
      bookingFilter === "all"
        ? bookings
        : bookings.filter((booking) => booking.status === bookingFilter),
    [bookings, bookingFilter],
  );

  const newBookings = bookings.filter(
    (booking) => booking.status === "new",
  ).length;
  const activeServices = services.filter((service) => service.active).length;

  function openNewService() {
    setEditor({
      id: null,
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
    setEditor({ id: service.id, value: toInput(service) });
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
          body: JSON.stringify({ ...toInput(service), active: !service.active }),
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
        { method: "DELETE" },
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
          body: JSON.stringify({ status }),
        },
      );
      const result = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(result.message || "Unable to update booking.");
      }
      setBookings((current) =>
        current.map((item) =>
          item.id === booking.id ? { ...item, status } : item,
        ),
      );
      setNotice(`${booking.reference} marked ${status.replace("_", " ")}.`);
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Unable to update booking.",
      );
    } finally {
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
            <small>Owner dashboard</small>
          </div>
        </Link>
        <div className="admin-owner">
          <span>Signed in as {ownerName}</span>
          <a href="/api/admin/logout">Sign out</a>
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
        <button
          className={tab === "services" ? "active" : ""}
          onClick={() => setTab("services")}
          role="tab"
          aria-selected={tab === "services"}
        >
          Services & pricing
        </button>
        <button
          className={tab === "bookings" ? "active" : ""}
          onClick={() => setTab("bookings")}
          role="tab"
          aria-selected={tab === "bookings"}
        >
          Bookings {newBookings > 0 && <span>{newBookings}</span>}
        </button>
        <Link
          className="admin-csr-nav-link"
          href="/admin/csr-donations"
          aria-label="Open CSR and Donations"
        >
          <CsrDonationsIcon />
          <span>CSR &amp; Donations</span>
        </Link>
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

      {tab === "services" ? (
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

          <div className="admin-booking-list">
            {filteredBookings.length === 0 ? (
              <div className="empty-state">
                <span>◎</span>
                <strong>No bookings here yet.</strong>
                <p>New customer requests will appear automatically.</p>
              </div>
            ) : (
              filteredBookings.map((booking) => (
                <article className="admin-booking-card" key={booking.id}>
                  <div className="booking-card-top">
                    <div>
                      <span className={`status-pill ${booking.status}`}>
                        {booking.status.replace("_", " ")}
                      </span>
                      <small>{formatDate(booking.createdAt)}</small>
                    </div>
                    <strong>{booking.reference}</strong>
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
                      <small>Requested service</small>
                      <strong>{booking.serviceName}</strong>
                      <span>
                        {booking.shoeType}
                        {booking.shoeBrand ? ` · ${booking.shoeBrand}` : ""}
                      </span>
                      {booking.expressRequested && <em>Express requested</em>}
                    </div>
                    <div>
                      <small>Pickup / drop-off</small>
                      <strong>
                        {booking.fulfillmentMethod === "pickup_delivery"
                          ? "Pickup & drop-off"
                          : "Self drop & pickup"}
                      </strong>
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
                      {booking.notes && <p>{booking.notes}</p>}
                    </div>
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
                  </div>
                </article>
              ))
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
