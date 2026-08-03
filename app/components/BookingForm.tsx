"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import Link from "next/link";
import type { Service } from "@/lib/data";
import styles from "./BookingExperience.module.css";

type BookingFormProps = {
  services: Service[];
  initialServiceId?: string;
  whatsappUrl: string;
};

type SubmitState =
  | { type: "idle" }
  | { type: "sending" }
  | { type: "success"; reference: string; message: string }
  | { type: "error"; message: string };

type FormValues = {
  customerName: string;
  phone: string;
  email: string;
  shoeType: string;
  shoeBrand: string;
  preferredDate: string;
  pickupAddress: string;
  locationUrl: string;
  notes: string;
};

type FieldName = keyof Omit<FormValues, "shoeBrand" | "notes"> | "serviceId";
type FieldErrors = Partial<Record<FieldName, string>>;
type ProgressStep = 1 | 2 | 3 | 4;

const emptyFormValues: FormValues = {
  customerName: "",
  phone: "",
  email: "",
  shoeType: "",
  shoeBrand: "",
  preferredDate: "",
  pickupAddress: "",
  locationUrl: "",
  notes: "",
};

const progressSteps: Array<{ id: ProgressStep; label: string }> = [
  { id: 1, label: "Your details" },
  { id: 2, label: "Your pair" },
  { id: 3, label: "Service & delivery" },
  { id: 4, label: "Review & request" },
];

function getNepalCalendarDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Kathmandu",
    year: "numeric",
  }).formatToParts(new Date());
  const dateValues: Record<string, string> = {};
  parts.forEach((part) => {
    dateValues[part.type] = part.value;
  });

  return dateValues.year + "-" + dateValues.month + "-" + dateValues.day;
}

function getValidationErrors(
  values: FormValues,
  selectedService: string,
  fulfillmentMethod: "self_dropoff" | "pickup_delivery",
  minimumDate: string,
): FieldErrors {
  const errors: FieldErrors = {};
  const phoneDigits = values.phone.replace(/\D/g, "");

  if (values.customerName.trim().length < 2) {
    errors.customerName = "Enter your full name.";
  }
  if (phoneDigits.length < 7 || phoneDigits.length > 15) {
    errors.phone = "Enter a valid phone or WhatsApp number.";
  }
  if (
    values.email.trim() &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())
  ) {
    errors.email = "Enter a valid email address.";
  }
  if (!values.shoeType.trim()) {
    errors.shoeType = "Choose a footwear type.";
  }
  if (!selectedService) {
    errors.serviceId = "Select a service for your pair.";
  }
  if (
    values.preferredDate &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(values.preferredDate) ||
      values.preferredDate < minimumDate)
  ) {
    errors.preferredDate = "Choose a preferred date that is today or later.";
  }
  if (fulfillmentMethod === "pickup_delivery" && !values.pickupAddress.trim()) {
    errors.pickupAddress = "Enter the pickup and drop-off address.";
  }
  if (
    values.locationUrl.trim() &&
    !/^https?:\/\//i.test(values.locationUrl.trim())
  ) {
    errors.locationUrl = "Enter a valid map location link.";
  }

  return errors;
}

function fieldForServerMessage(message: string): FieldName | undefined {
  const normalized = message.toLowerCase();
  if (normalized.includes("full name")) return "customerName";
  if (normalized.includes("phone") || normalized.includes("whatsapp")) {
    return "phone";
  }
  if (normalized.includes("email")) return "email";
  if (normalized.includes("footwear")) return "shoeType";
  if (normalized.includes("service")) return "serviceId";
  if (normalized.includes("preferred date")) return "preferredDate";
  if (normalized.includes("pickup") || normalized.includes("drop-off address")) {
    return "pickupAddress";
  }
  if (normalized.includes("map location")) return "locationUrl";
  return undefined;
}

function classNames(...names: Array<string | false | undefined>) {
  return names.filter(Boolean).join(" ");
}

export default function BookingForm({
  services,
  initialServiceId,
  whatsappUrl,
}: BookingFormProps) {
  const [state, setState] = useState<SubmitState>({ type: "idle" });
  const [formValues, setFormValues] = useState<FormValues>(emptyFormValues);
  const [selectedService, setSelectedService] = useState(() => {
    if (initialServiceId && services.some((service) => service.id === initialServiceId)) {
      return initialServiceId;
    }
    return services[0]?.id ?? "";
  });
  const [fulfillmentMethod, setFulfillmentMethod] = useState<
    "self_dropoff" | "pickup_delivery"
  >("self_dropoff");
  const [expressRequested, setExpressRequested] = useState(false);
  const [locationStatus, setLocationStatus] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [activeProgress, setActiveProgress] = useState<ProgressStep>(1);
  const [hasInteracted, setHasInteracted] = useState(false);
  const successHeadingRef = useRef<HTMLHeadingElement>(null);
  const minimumDate = useMemo(() => getNepalCalendarDate(), []);

  const selected = services.find((service) => service.id === selectedService);
  const expressService = services.find(
    (service) => service.id === "express-wash-dry",
  );
  const validationErrors = getValidationErrors(
    formValues,
    selectedService,
    fulfillmentMethod,
    minimumDate,
  );
  const isReadyToSubmit =
    services.length > 0 && Object.keys(validationErrors).length === 0;

  useEffect(() => {
    if (state.type === "success") {
      successHeadingRef.current?.focus();
    }
  }, [state]);

  function clearSubmissionError() {
    if (state.type === "error") setState({ type: "idle" });
  }

  function activateProgress(step: ProgressStep) {
    setActiveProgress(step);
    setHasInteracted(true);
  }

  function updateValue<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setFormValues((current) => ({ ...current, [key]: value }));
    setHasInteracted(true);
    clearSubmissionError();
    if (key in fieldErrors) {
      setFieldErrors((current) => {
        const next = { ...current };
        delete next[key as FieldName];
        return next;
      });
    }
  }

  function handleTextChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    const key = event.target.name as keyof FormValues;
    updateValue(key, event.target.value);
  }

  function validateField(field: FieldName) {
    const error = getValidationErrors(
      formValues,
      selectedService,
      fulfillmentMethod,
      minimumDate,
    )[field];
    setFieldErrors((current) => {
      const next = { ...current };
      if (error) {
        next[field] = error;
      } else {
        delete next[field];
      }
      return next;
    });
  }

  function focusFirstInvalid(errors: FieldErrors) {
    const field = Object.keys(errors)[0] as FieldName | undefined;
    if (!field) return;

    window.requestAnimationFrame(() => {
      document.querySelector<HTMLElement>("[name='" + field + "']")?.focus();
    });
  }

  function selectService(serviceId: string) {
    setSelectedService(serviceId);
    if (serviceId === expressService?.id) setExpressRequested(false);
    setActiveProgress(3);
    setHasInteracted(true);
    clearSubmissionError();
    setFieldErrors((current) => {
      const next = { ...current };
      delete next.serviceId;
      return next;
    });
  }

  function selectFulfillment(method: "self_dropoff" | "pickup_delivery") {
    setFulfillmentMethod(method);
    setActiveProgress(3);
    setHasInteracted(true);
    clearSubmissionError();
    if (method === "self_dropoff") {
      setFieldErrors((current) => {
        const next = { ...current };
        delete next.pickupAddress;
        delete next.locationUrl;
        return next;
      });
    }
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setLocationStatus("Location is not available on this device.");
      return;
    }

    setLocationStatus("Finding your location…");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        updateValue(
          "locationUrl",
          "https://www.google.com/maps?q=" + coords.latitude + "," + coords.longitude,
        );
        setLocationStatus("Location added.");
      },
      () => setLocationStatus("Could not access location. Paste a map link instead."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function submitBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setHasInteracted(true);
    const clientErrors = getValidationErrors(
      formValues,
      selectedService,
      fulfillmentMethod,
      minimumDate,
    );

    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      setState({ type: "idle" });
      focusFirstInvalid(clientErrors);
      return;
    }

    setState({ type: "sending" });
    const website = new FormData(event.currentTarget).get("website");
    const payload = {
      customerName: formValues.customerName,
      phone: formValues.phone,
      email: formValues.email,
      serviceId: selectedService,
      shoeType: formValues.shoeType,
      shoeBrand: formValues.shoeBrand,
      preferredDate: formValues.preferredDate,
      fulfillmentMethod,
      pickupAddress: formValues.pickupAddress,
      locationUrl: formValues.locationUrl,
      notes: formValues.notes,
      expressRequested,
      website,
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
      setFormValues(emptyFormValues);
      setSelectedService(services[0]?.id ?? "");
      setFulfillmentMethod("self_dropoff");
      setExpressRequested(false);
      setLocationStatus("");
      setFieldErrors({});
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to send your booking. Please try again.";
      const serverField = fieldForServerMessage(message);
      if (serverField) {
        setFieldErrors((current) => ({ ...current, [serverField]: message }));
      }
      setState({ type: "error", message });
    }
  }

  if (state.type === "success") {
    return (
      <section className={classNames(styles.formShell, styles.successMessage)}>
        <span aria-hidden="true" className={styles.selectionMark}>✓</span>
        <p className={styles.formKicker}>Booking request received</p>
        <h3 className={styles.successHeading} ref={successHeadingRef} tabIndex={-1}>
          Your pair is in good hands.
        </h3>
        <p>{state.message}</p>
        <p className={styles.successReference}>
          Your reference is <strong>{state.reference}</strong>.
        </p>
        <p>
          We will review your request and contact you to confirm the treatment,
          final price and service time.
        </p>
        <div className={styles.successActions}>
          <Link href="/">Return home</Link>
          <a href={whatsappUrl} rel="noreferrer" target="_blank">
            WhatsApp the Doctor
          </a>
        </div>
      </section>
    );
  }

  return (
    <form className={styles.formShell} data-reveal noValidate onSubmit={submitBooking}>
      <header className={styles.formHeading}>
        <span className={styles.formKicker}>Booking request</span>
        <h3 className={styles.formTitle}>Tell Us About Your Pair.</h3>
        <p className={styles.formIntro}>
          Send us the details below. We will review your pair and contact you to
          confirm the treatment, final price and pickup or drop-off time.
        </p>
        <ol aria-label="Booking progress" className={styles.progress}>
          {progressSteps.map((step) => {
            const isActive = step.id === activeProgress;
            return (
              <li
                aria-current={isActive ? "step" : undefined}
                className={styles.progressItem}
                data-active={isActive}
                key={step.id}
              >
                <span className={styles.progressIndex}>{step.id}</span>
                <span className={styles.progressText}>{step.label}</span>
              </li>
            );
          })}
        </ol>
      </header>

      <section
        aria-labelledby="contact-details-heading"
        className={styles.formSection}
        onFocusCapture={() => activateProgress(1)}
      >
        <div className={styles.sectionHeading}>
          <h4 className={styles.sectionTitle} id="contact-details-heading">
            01 — Contact details
          </h4>
          <p className={styles.sectionCopy}>
            How should we contact you about the booking?
          </p>
        </div>
        <div className={styles.fieldGrid}>
          <label className={styles.field}>
            <span>Full name <b aria-hidden="true">*</b></span>
            <input
              aria-describedby={fieldErrors.customerName ? "customerName-error" : undefined}
              aria-invalid={Boolean(fieldErrors.customerName)}
              autoComplete="name"
              className={classNames(styles.input, fieldErrors.customerName && styles.invalid)}
              id="customerName"
              maxLength={80}
              name="customerName"
              onBlur={() => validateField("customerName")}
              onChange={handleTextChange}
              placeholder="e.g. Aashish Shrestha"
              required
              type="text"
              value={formValues.customerName}
            />
            {fieldErrors.customerName && (
              <span className={styles.fieldError} id="customerName-error" role="alert">
                {fieldErrors.customerName}
              </span>
            )}
          </label>

          <label className={styles.field}>
            <span>Phone / WhatsApp <b aria-hidden="true">*</b></span>
            <input
              aria-describedby={fieldErrors.phone ? "phone-error" : undefined}
              aria-invalid={Boolean(fieldErrors.phone)}
              autoComplete="tel"
              className={classNames(styles.input, fieldErrors.phone && styles.invalid)}
              id="phone"
              inputMode="tel"
              maxLength={30}
              name="phone"
              onBlur={() => validateField("phone")}
              onChange={handleTextChange}
              placeholder="e.g. +977 98XXXXXXXX"
              required
              type="tel"
              value={formValues.phone}
            />
            {fieldErrors.phone && (
              <span className={styles.fieldError} id="phone-error" role="alert">
                {fieldErrors.phone}
              </span>
            )}
          </label>

          <label className={styles.field}>
            <span>Email <em className={styles.optional}>Optional</em></span>
            <input
              aria-describedby={fieldErrors.email ? "email-error" : undefined}
              aria-invalid={Boolean(fieldErrors.email)}
              autoComplete="email"
              className={classNames(styles.input, fieldErrors.email && styles.invalid)}
              id="email"
              maxLength={120}
              name="email"
              onBlur={() => validateField("email")}
              onChange={handleTextChange}
              placeholder="e.g. you@example.com"
              type="email"
              value={formValues.email}
            />
            {fieldErrors.email && (
              <span className={styles.fieldError} id="email-error" role="alert">
                {fieldErrors.email}
              </span>
            )}
          </label>
        </div>
      </section>

      <section
        aria-labelledby="pair-details-heading"
        className={styles.formSection}
        onFocusCapture={() => activateProgress(2)}
      >
        <div className={styles.sectionHeading}>
          <h4 className={styles.sectionTitle} id="pair-details-heading">
            02 — About your pair
          </h4>
          <p className={styles.sectionCopy}>
            Tell us what type of footwear we will be treating.
          </p>
        </div>
        <div className={styles.fieldGrid}>
          <label className={styles.field}>
            <span>Footwear type <b aria-hidden="true">*</b></span>
            <input
              aria-describedby={fieldErrors.shoeType ? "shoeType-error" : undefined}
              aria-invalid={Boolean(fieldErrors.shoeType)}
              className={classNames(styles.input, fieldErrors.shoeType && styles.invalid)}
              id="shoeType"
              maxLength={80}
              name="shoeType"
              onBlur={() => validateField("shoeType")}
              onChange={handleTextChange}
              placeholder="e.g. Sneakers, boots or heels"
              required
              type="text"
              value={formValues.shoeType}
            />
            {fieldErrors.shoeType && (
              <span className={styles.fieldError} id="shoeType-error" role="alert">
                {fieldErrors.shoeType}
              </span>
            )}
          </label>

          <label className={styles.field}>
            <span>Brand <em className={styles.optional}>Optional</em></span>
            <input
              className={styles.input}
              id="shoeBrand"
              maxLength={80}
              name="shoeBrand"
              onChange={handleTextChange}
              placeholder="e.g. Nike, Goldstar or Caliber"
              type="text"
              value={formValues.shoeBrand}
            />
          </label>
        </div>
      </section>

      <section
        aria-labelledby="service-heading"
        className={styles.formSection}
        onFocusCapture={() => activateProgress(3)}
      >
        <div className={styles.sectionHeading}>
          <h4 className={styles.sectionTitle} id="service-heading">
            03 — Choose a service
          </h4>
          <p className={styles.sectionCopy}>
            Choose the service that best matches your pair. We will confirm the
            final treatment after diagnosis.
          </p>
        </div>
        {services.length === 0 ? (
          <p className={styles.sectionCopy} role="status">
            Services are temporarily unavailable. Please use WhatsApp for help
            with your booking.
          </p>
        ) : services.length <= 16 ? (
          <fieldset
            aria-describedby={fieldErrors.serviceId ? "serviceId-error" : undefined}
            className={styles.serviceList}
          >
            <legend className="sr-only">Choose a service</legend>
            {services.map((service) => {
              const isSelected = selectedService === service.id;
              return (
                <label
                  className={classNames(styles.serviceCard, isSelected && styles.selected)}
                  data-selected={isSelected}
                  key={service.id}
                >
                  <input
                    checked={isSelected}
                    name="serviceId"
                    onChange={() => selectService(service.id)}
                    required
                    type="radio"
                    value={service.id}
                  />
                  <span className={styles.serviceCardTop}>
                    <span>
                      <strong>{service.name}</strong>
                      {service.badge && <small>{service.badge}</small>}
                    </span>
                    <span className={styles.selectionMark} aria-hidden="true">✓</span>
                  </span>
                  <span className={styles.serviceMeta}>
                    <span>{service.description}</span>
                    <strong>{service.priceLabel}</strong>
                    <small>{service.turnaround}</small>
                  </span>
                </label>
              );
            })}
          </fieldset>
        ) : (
          <label className={classNames(styles.field, styles.fieldWide)}>
            <span>Select a service <b aria-hidden="true">*</b></span>
            <select
              aria-describedby={fieldErrors.serviceId ? "serviceId-error" : undefined}
              aria-invalid={Boolean(fieldErrors.serviceId)}
              className={classNames(styles.input, fieldErrors.serviceId && styles.invalid)}
              name="serviceId"
              onBlur={() => validateField("serviceId")}
              onChange={(event) => selectService(event.target.value)}
              required
              value={selectedService}
            >
              <option value="">Choose a service</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} — {service.priceLabel}
                </option>
              ))}
            </select>
          </label>
        )}
        {fieldErrors.serviceId && (
          <p className={styles.fieldError} id="serviceId-error" role="alert">
            {fieldErrors.serviceId}
          </p>
        )}
      </section>

      <section
        aria-labelledby="collection-heading"
        className={styles.formSection}
        onFocusCapture={() => activateProgress(3)}
      >
        <div className={styles.sectionHeading}>
          <h4 className={styles.sectionTitle} id="collection-heading">
            04 — Collection &amp; return
          </h4>
          <p className={styles.sectionCopy}>
            How should we receive and return your shoes?
          </p>
        </div>
        <fieldset className={styles.deliveryOptions}>
          <legend className="sr-only">Choose how we should receive and return your shoes</legend>
          <label
            className={classNames(
              styles.deliveryCard,
              fulfillmentMethod === "self_dropoff" && styles.selected,
            )}
            data-selected={fulfillmentMethod === "self_dropoff"}
          >
            <input
              checked={fulfillmentMethod === "self_dropoff"}
              name="fulfillmentMethod"
              onChange={() => selectFulfillment("self_dropoff")}
              required
              type="radio"
              value="self_dropoff"
            />
            <span className={styles.deliveryCardContent}>
              <strong>Self Drop &amp; Pickup</strong>
              <small>Bring and collect your pair from our Hetauda studio.</small>
            </span>
            <span className={styles.deliveryPrice}>Free</span>
          </label>
          <label
            className={classNames(
              styles.deliveryCard,
              fulfillmentMethod === "pickup_delivery" && styles.selected,
            )}
            data-selected={fulfillmentMethod === "pickup_delivery"}
          >
            <input
              checked={fulfillmentMethod === "pickup_delivery"}
              name="fulfillmentMethod"
              onChange={() => selectFulfillment("pickup_delivery")}
              required
              type="radio"
              value="pickup_delivery"
            />
            <span className={styles.deliveryCardContent}>
              <strong>Pickup &amp; Return Delivery</strong>
              <small>We collect and return the pair at your location.</small>
            </span>
            <span className={styles.deliveryPrice}>Area-based fee</span>
          </label>
        </fieldset>

        {fulfillmentMethod === "pickup_delivery" && (
          <div className={styles.pickupDetails} data-open="true">
            <div className={styles.fieldGrid}>
              <label className={classNames(styles.field, styles.fieldWide)}>
                <span>Pickup and drop-off address <b aria-hidden="true">*</b></span>
                <textarea
                  aria-describedby={fieldErrors.pickupAddress ? "pickupAddress-error" : undefined}
                  aria-invalid={Boolean(fieldErrors.pickupAddress)}
                  autoComplete="street-address"
                  className={classNames(styles.input, fieldErrors.pickupAddress && styles.invalid)}
                  id="pickupAddress"
                  maxLength={300}
                  name="pickupAddress"
                  onBlur={() => validateField("pickupAddress")}
                  onChange={handleTextChange}
                  placeholder="Area, street or tole, building and a nearby landmark"
                  required
                  rows={3}
                  value={formValues.pickupAddress}
                />
                {fieldErrors.pickupAddress && (
                  <span className={styles.fieldError} id="pickupAddress-error" role="alert">
                    {fieldErrors.pickupAddress}
                  </span>
                )}
              </label>

              <label className={classNames(styles.field, styles.fieldWide)}>
                <span>Map location link <em className={styles.optional}>Optional</em></span>
                <span className={styles.locationControl}>
                  <input
                    aria-describedby={[
                      fieldErrors.locationUrl ? "locationUrl-error" : "",
                      locationStatus ? "location-status" : "",
                    ].filter(Boolean).join(" ") || undefined}
                    aria-invalid={Boolean(fieldErrors.locationUrl)}
                    className={classNames(styles.input, fieldErrors.locationUrl && styles.invalid)}
                    id="locationUrl"
                    maxLength={500}
                    name="locationUrl"
                    onBlur={() => validateField("locationUrl")}
                    onChange={handleTextChange}
                    placeholder="Paste a Google Maps link"
                    type="url"
                    value={formValues.locationUrl}
                  />
                  <button onClick={useCurrentLocation} type="button">
                    Use my location
                  </button>
                </span>
                {fieldErrors.locationUrl && (
                  <span className={styles.fieldError} id="locationUrl-error" role="alert">
                    {fieldErrors.locationUrl}
                  </span>
                )}
                {locationStatus && <small id="location-status">{locationStatus}</small>}
              </label>
            </div>
            <p>
              Pickup and delivery charges are confirmed according to your area
              before the booking is accepted.
            </p>
          </div>
        )}
      </section>

      <section
        aria-labelledby="date-heading"
        className={styles.formSection}
        onFocusCapture={() => activateProgress(3)}
      >
        <div className={styles.sectionHeading}>
          <h4 className={styles.sectionTitle} id="date-heading">
            05 — Preferred date
          </h4>
          <p className={styles.sectionCopy}>
            Choose your preferred date. Final timing will be confirmed by our team.
          </p>
        </div>
        <label className={classNames(styles.field, styles.fieldWide)}>
          <span>Preferred service date <em className={styles.optional}>Optional</em></span>
          <input
            aria-describedby={fieldErrors.preferredDate ? "preferredDate-error" : undefined}
            aria-invalid={Boolean(fieldErrors.preferredDate)}
            className={classNames(styles.input, fieldErrors.preferredDate && styles.invalid)}
            id="preferredDate"
            min={minimumDate}
            name="preferredDate"
            onBlur={() => validateField("preferredDate")}
            onChange={handleTextChange}
            type="date"
            value={formValues.preferredDate}
          />
          {fieldErrors.preferredDate && (
            <span className={styles.fieldError} id="preferredDate-error" role="alert">
              {fieldErrors.preferredDate}
            </span>
          )}
        </label>
      </section>

      <section
        aria-labelledby="express-heading"
        className={styles.formSection}
        onFocusCapture={() => activateProgress(3)}
      >
        <div className={styles.sectionHeading}>
          <h4 className={styles.sectionTitle} id="express-heading">
            06 — Optional add-on
          </h4>
          <p className={styles.sectionCopy}>
            Add priority cleaning and drying when an express slot is available.
          </p>
        </div>
        {selectedService === expressService?.id ? (
          <div className={styles.expressOption}>
            <span className={styles.expressOptionText}>
              <strong>{expressService?.name ?? "Express Wash & Dry"}</strong>
              <small>This is already your selected primary service.</small>
            </span>
            <span className={styles.deliveryPrice}>Selected</span>
          </div>
        ) : (
          <label
            className={classNames(styles.expressOption, expressRequested && styles.selected)}
            data-selected={expressRequested}
          >
            <input
              checked={expressRequested}
              name="expressRequested"
              onChange={() => {
                setExpressRequested((current) => !current);
                activateProgress(3);
                clearSubmissionError();
              }}
              type="checkbox"
            />
            <span className={styles.expressOptionText}>
              <strong>{expressService?.name ?? "Express Wash & Dry"}</strong>
              <small>Availability must be confirmed by our team.</small>
            </span>
            {expressService?.priceLabel && (
              <span className={styles.deliveryPrice}>{expressService.priceLabel}</span>
            )}
            <span className={styles.selectionMark} aria-hidden="true">✓</span>
          </label>
        )}
      </section>

      <section
        aria-labelledby="condition-heading"
        className={styles.formSection}
        onFocusCapture={() => activateProgress(4)}
      >
        <div className={styles.sectionHeading}>
          <h4 className={styles.sectionTitle} id="condition-heading">
            07 — Condition &amp; request
          </h4>
          <p className={styles.sectionCopy}>
            Helpful details include stains, loose soles, tears, colour fading,
            odour or previous repair work.
          </p>
        </div>
        <label className={classNames(styles.field, styles.fieldWide)}>
          <span>Condition or special request <em className={styles.optional}>Optional</em></span>
          <textarea
            className={styles.input}
            id="notes"
            maxLength={800}
            name="notes"
            onChange={handleTextChange}
            placeholder="Tell us about stains, damage, material concerns or anything else we should know."
            rows={5}
            value={formValues.notes}
          />
        </label>
      </section>

      {selected && (
        <section
          aria-labelledby="booking-summary-heading"
          className={styles.summary}
          onFocusCapture={() => activateProgress(4)}
        >
          <div className={styles.summaryHeading}>
            <h4 id="booking-summary-heading">Your Booking Summary</h4>
            <span aria-hidden="true">✓</span>
          </div>
          <dl className={styles.summaryRows}>
            <div className={styles.summaryRow}>
              <dt>Selected service</dt>
              <dd>{selected.name}</dd>
            </div>
            <div className={styles.summaryRow}>
              <dt>Service price</dt>
              <dd>{selected.priceLabel}</dd>
            </div>
            {selected.specialPriceLabel && (
              <div className={styles.summaryRow}>
                <dt>Eligible local-brand price</dt>
                <dd>{selected.specialPriceLabel}</dd>
              </div>
            )}
            <div className={styles.summaryRow}>
              <dt>Collection method</dt>
              <dd>
                {fulfillmentMethod === "pickup_delivery"
                  ? "Pickup & Return Delivery"
                  : "Self Drop & Pickup"}
              </dd>
            </div>
            <div className={styles.summaryRow}>
              <dt>Delivery fee</dt>
              <dd>
                {fulfillmentMethod === "pickup_delivery"
                  ? "Confirmed after area review"
                  : "Free"}
              </dd>
            </div>
            <div className={styles.summaryRow}>
              <dt>Express service</dt>
              <dd>
                {expressRequested
                  ? expressService?.priceLabel && expressService.id !== selectedService
                    ? "Requested — " + expressService.priceLabel
                    : "Requested — confirmed when available"
                  : "Not selected"}
              </dd>
            </div>
          </dl>
          <div className={styles.summaryTotal}>
            <span>Final price</span>
            <strong>Confirmed after diagnosis</strong>
          </div>
          <p className={styles.summaryNotice}>
            Final treatment, price and turnaround time are confirmed after Shoe
            Doctor diagnoses your footwear.
          </p>
        </section>
      )}

      <label aria-hidden="true" className={styles.honeypot}>
        Website
        <input autoComplete="off" name="website" tabIndex={-1} type="text" />
      </label>

      {state.type === "error" && (
        <p className={classNames(styles.formMessage, styles.fieldError)} role="alert">
          {state.message}
        </p>
      )}

      <button
        aria-disabled={!isReadyToSubmit || state.type === "sending"}
        className={styles.submitButton}
        disabled={!isReadyToSubmit || state.type === "sending"}
        type="submit"
      >
        {state.type === "sending" && <span aria-hidden="true" className={styles.spinner} />}
        {state.type === "sending" ? "Sending Your Request…" : "Request My Booking"}
      </button>
      {hasInteracted && !isReadyToSubmit && state.type !== "sending" && (
        <p className={styles.summaryNotice}>
          Complete the required details to request your booking.
        </p>
      )}
      <p className={styles.summaryNotice}>
        No payment is required now. Your request does not confirm a final price.
      </p>
    </form>
  );
}
