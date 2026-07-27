"use client";

import { useMemo, useState } from "react";
import type { Service } from "@/lib/data";

type BookingFormProps = {
  services: Service[];
  initialServiceId?: string;
};

type SubmitState =
  | { type: "idle" }
  | { type: "sending" }
  | { type: "success"; reference: string; message: string }
  | { type: "error"; message: string };

export default function BookingForm({
  services,
  initialServiceId,
}: BookingFormProps) {
  const [state, setState] = useState<SubmitState>({ type: "idle" });
  const [selectedService, setSelectedService] = useState(
    initialServiceId ?? services[0]?.id ?? "",
  );
  const [fulfillmentMethod, setFulfillmentMethod] = useState<
    "self_dropoff" | "pickup_delivery"
  >("self_dropoff");
  const [locationUrl, setLocationUrl] = useState("");
  const [locationStatus, setLocationStatus] = useState("");
  const minimumDate = useMemo(
    () => new Date().toISOString().slice(0, 10),
    [],
  );

  async function submitBooking(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ type: "sending" });

    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      customerName: formData.get("customerName"),
      phone: formData.get("phone"),
      email: formData.get("email"),
      serviceId: formData.get("serviceId"),
      shoeType: formData.get("shoeType"),
      shoeBrand: formData.get("shoeBrand"),
      preferredDate: formData.get("preferredDate"),
      fulfillmentMethod,
      pickupAddress: formData.get("pickupAddress"),
      locationUrl: formData.get("locationUrl"),
      notes: formData.get("notes"),
      expressRequested: formData.get("expressRequested") === "on",
      website: formData.get("website"),
    };

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as {
        message?: string;
        reference?: string;
      };
      if (!response.ok || !result.reference) {
        throw new Error(result.message || "Unable to send your booking.");
      }

      setState({
        type: "success",
        reference: result.reference,
        message: result.message || "Your booking request has been received.",
      });
      form.reset();
      setSelectedService(services[0]?.id ?? "");
      setFulfillmentMethod("self_dropoff");
      setLocationUrl("");
      setLocationStatus("");
    } catch (error) {
      setState({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to send your booking. Please try again.",
      });
    }
  }

  const selected = services.find((service) => service.id === selectedService);

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setLocationStatus("Location is not available on this device.");
      return;
    }

    setLocationStatus("Finding your location…");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocationUrl(
          `https://www.google.com/maps?q=${coords.latitude},${coords.longitude}`,
        );
        setLocationStatus("Location added.");
      },
      () => setLocationStatus("Couldn’t access location. Paste a map link instead."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <form className="booking-form" onSubmit={submitBooking}>
      <div className="form-heading">
        <span className="form-step">BOOKING REQUEST</span>
        <h3>Tell us about your pair.</h3>
        <p>
          We’ll review the details and contact you to confirm the treatment,
          final price and pickup or drop-off time.
        </p>
      </div>

      <div className="form-grid">
        <label>
          <span>Full name *</span>
          <input
            name="customerName"
            type="text"
            autoComplete="name"
            maxLength={80}
            required
            placeholder="Your name"
          />
        </label>

        <label>
          <span>Phone / WhatsApp *</span>
          <input
            name="phone"
            type="tel"
            autoComplete="tel"
            maxLength={30}
            required
            placeholder="+977 98XXXXXXXX"
          />
        </label>

        <label>
          <span>Email</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            maxLength={120}
            placeholder="you@example.com"
          />
        </label>

        <label>
          <span>Service *</span>
          <select
            name="serviceId"
            required
            value={selectedService}
            onChange={(event) => setSelectedService(event.target.value)}
          >
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name} — {service.priceLabel}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Footwear type *</span>
          <input
            name="shoeType"
            type="text"
            maxLength={80}
            required
            placeholder="Sneakers, boots, heels…"
          />
        </label>

        <label>
          <span>Brand</span>
          <input
            name="shoeBrand"
            type="text"
            maxLength={80}
            placeholder="Nike, Goldstar, Caliber…"
          />
        </label>

        <label>
          <span>Preferred service date</span>
          <input name="preferredDate" type="date" min={minimumDate} />
        </label>

        <label className="checkbox-label">
          <input name="expressRequested" type="checkbox" />
          <span>
            Request express service
            <small>Extra charge applies when an express slot is available.</small>
          </span>
        </label>

        <fieldset className="fulfillment-choice full-field">
          <legend>How should we receive and return the shoes? *</legend>
          <label
            className={fulfillmentMethod === "self_dropoff" ? "selected" : ""}
          >
            <input
              type="radio"
              name="fulfillmentMethod"
              value="self_dropoff"
              checked={fulfillmentMethod === "self_dropoff"}
              onChange={() => setFulfillmentMethod("self_dropoff")}
            />
            <span>
              <strong>Self drop & pickup</strong>
              <small>You bring and collect the pair from our Hetauda studio.</small>
            </span>
            <em>Free</em>
          </label>
          <label
            className={fulfillmentMethod === "pickup_delivery" ? "selected" : ""}
          >
            <input
              type="radio"
              name="fulfillmentMethod"
              value="pickup_delivery"
              checked={fulfillmentMethod === "pickup_delivery"}
              onChange={() => setFulfillmentMethod("pickup_delivery")}
            />
            <span>
              <strong>Pickup & drop-off</strong>
              <small>We collect and return the pair at your location.</small>
            </span>
            <em>Area-based</em>
          </label>
        </fieldset>

        {fulfillmentMethod === "pickup_delivery" && (
          <div className="pickup-location full-field">
            <label>
              <span>Pickup and drop-off address *</span>
              <textarea
                name="pickupAddress"
                rows={3}
                maxLength={300}
                required
                placeholder="Area, street/tole, house or building, and a nearby landmark."
              />
            </label>
            <label>
              <span>Map location link</span>
              <div className="location-control">
                <input
                  name="locationUrl"
                  type="url"
                  maxLength={500}
                  value={locationUrl}
                  onChange={(event) => setLocationUrl(event.target.value)}
                  placeholder="Paste Google Maps link"
                />
                <button type="button" onClick={useCurrentLocation}>
                  Use my location
                </button>
              </div>
              {locationStatus && <small>{locationStatus}</small>}
            </label>
            <p>
              Pickup and delivery charge is confirmed according to your area
              before the booking is accepted.
            </p>
          </div>
        )}

        <label className="full-field">
          <span>Condition or special request</span>
          <textarea
            name="notes"
            rows={4}
            maxLength={800}
            placeholder="Tell us about stains, damage, material or anything we should know."
          />
        </label>

        <label className="website-field" aria-hidden="true">
          Website
          <input name="website" type="text" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {selected && (
        <div className="booking-summary">
          <span>{selected.category}</span>
          <strong>{selected.name}</strong>
          <em>{selected.priceLabel}</em>
          <small>
            {selected.turnaround}
            {selected.specialPriceLabel
              ? ` · ${selected.specialPriceLabel}`
              : ""}
            {fulfillmentMethod === "pickup_delivery"
              ? " · Pickup & drop-off requested"
              : " · Self drop & pickup"}
          </small>
        </div>
      )}

      {state.type === "error" && (
        <p className="form-message error" role="alert">
          {state.message}
        </p>
      )}

      {state.type === "success" && (
        <div className="form-message success" role="status">
          <strong>Request received — {state.reference}</strong>
          <span>{state.message}</span>
        </div>
      )}

      <button
        className="submit-booking"
        type="submit"
        disabled={state.type === "sending" || services.length === 0}
      >
        {state.type === "sending" ? "Sending…" : "Request my booking"}
        <span aria-hidden="true">↗</span>
      </button>

      <p className="booking-disclaimer">
        Submitting this form does not charge you. Final pricing is confirmed
        after Shoe Doctor diagnoses the footwear.
      </p>
    </form>
  );
}
