"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import Link from "next/link";
import type { Service } from "@/lib/data";
import {
  calculateBookingTotals,
  calculatePickupDeliveryFee,
  formatNprPrice,
  getExactNprPrice,
  pickupAreaLabel,
  qualifiesForFreeHetaudaDelivery,
  type PickupArea,
} from "@/lib/booking-pricing";
import styles from "./BookingExperience.module.css";

const MAXIMUM_PAIR_COUNT = 20;

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

type BookingLevelValues = {
  customerName: string;
  phone: string;
  email: string;
  preferredDate: string;
  pickupAddress: string;
  locationUrl: string;
  notes: string;
};

type PairDraft = {
  id: string;
  serviceId: string;
  footwearType: string;
  brand: string;
  specialRequest: string;
};

type BookingFieldName =
  | keyof Omit<BookingLevelValues, "notes">
  | "items"
  | "pickupArea";
type PairFieldName = "serviceId" | "footwearType";
type ItemFieldKey = `item:${string}:${PairFieldName}`;
type FieldName = BookingFieldName | ItemFieldKey;
type FieldErrors = Partial<Record<FieldName, string>>;

const emptyBookingLevelValues: BookingLevelValues = {
  customerName: "",
  phone: "",
  email: "",
  preferredDate: "",
  pickupAddress: "",
  locationUrl: "",
  notes: "",
};

function createPairDraft(id: string, serviceId = ""): PairDraft {
  return {
    id,
    serviceId,
    footwearType: "",
    brand: "",
    specialRequest: "",
  };
}

function itemFieldKey(itemId: string, field: PairFieldName): ItemFieldKey {
  return `item:${itemId}:${field}`;
}

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
  values: BookingLevelValues,
  items: PairDraft[],
  fulfillmentMethod: "self_dropoff" | "pickup_delivery",
  pickupArea: PickupArea | "",
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
  if (items.length < 1) {
    errors.items = "Add at least one pair.";
  }
  if (items.length > MAXIMUM_PAIR_COUNT) {
    errors.items = `You can book up to ${MAXIMUM_PAIR_COUNT} pairs at once.`;
  }
  items.forEach((item, index) => {
    if (!item.serviceId) {
      errors[itemFieldKey(item.id, "serviceId")] = `Choose a service for Pair ${index + 1}.`;
    }
    if (!item.footwearType.trim()) {
      errors[itemFieldKey(item.id, "footwearType")] = `Enter the footwear type for Pair ${index + 1}.`;
    }
  });
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
  if (fulfillmentMethod === "pickup_delivery" && !pickupArea) {
    errors.pickupArea = "Choose Hetauda City or Other city.";
  }
  if (
    values.locationUrl.trim() &&
    !/^https?:\/\//i.test(values.locationUrl.trim())
  ) {
    errors.locationUrl = "Enter a valid map location link.";
  }

  return errors;
}

function fieldForServerMessage(
  message: string,
  items: PairDraft[],
): FieldName | undefined {
  const normalized = message.toLowerCase();
  const firstItem = items[0];
  if (normalized.includes("full name")) return "customerName";
  if (normalized.includes("phone") || normalized.includes("whatsapp")) {
    return "phone";
  }
  if (normalized.includes("email")) return "email";
  if (normalized.includes("footwear")) {
    return firstItem ? itemFieldKey(firstItem.id, "footwearType") : "items";
  }
  if (normalized.includes("service")) {
    return firstItem ? itemFieldKey(firstItem.id, "serviceId") : "items";
  }
  if (normalized.includes("pair") || normalized.includes("item")) return "items";
  if (normalized.includes("preferred date")) return "preferredDate";
  if (normalized.includes("pickup area") || normalized.includes("hetauda")) {
    return "pickupArea";
  }
  if (normalized.includes("pickup") || normalized.includes("drop-off address")) {
    return "pickupAddress";
  }
  if (normalized.includes("map location")) return "locationUrl";
  return undefined;
}

function classNames(...names: Array<string | false | undefined>) {
  return names.filter(Boolean).join(" ");
}

function pairCountLabel(pairCount: number) {
  return `${pairCount} ${pairCount === 1 ? "pair" : "pairs"} selected`;
}

export default function BookingForm({
  services,
  initialServiceId,
  whatsappUrl,
}: BookingFormProps) {
  const defaultServiceId =
    initialServiceId && services.some((service) => service.id === initialServiceId)
      ? initialServiceId
      : services[0]?.id ?? "";
  const [state, setState] = useState<SubmitState>({ type: "idle" });
  const [formValues, setFormValues] = useState<BookingLevelValues>(
    emptyBookingLevelValues,
  );
  const [items, setItems] = useState<PairDraft[]>(() => [
    createPairDraft("pair-1", defaultServiceId),
  ]);
  const [fulfillmentMethod, setFulfillmentMethod] = useState<
    "self_dropoff" | "pickup_delivery"
  >("self_dropoff");
  const [pickupArea, setPickupArea] = useState<PickupArea | "">("");
  const [expressRequested, setExpressRequested] = useState(false);
  const [locationStatus, setLocationStatus] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [hasInteracted, setHasInteracted] = useState(false);
  const successHeadingRef = useRef<HTMLHeadingElement>(null);
  const nextPairId = useRef(2);
  const minimumDate = useMemo(() => getNepalCalendarDate(), []);
  const startAnotherBooking = useCallback(() => {
    setState({ type: "idle" });
    setHasInteracted(false);
  }, []);

  const selectedServices = useMemo(
    () =>
      items.map(
        (item) => services.find((service) => service.id === item.serviceId) ?? null,
      ),
    [items, services],
  );
  const expressService = services.find(
    (service) => service.id === "express-wash-dry",
  );
  const pairCount = items.length;
  const hasExpressAsPrimaryService = Boolean(
    expressService && items.some((item) => item.serviceId === expressService.id),
  );
  const servicePrices = selectedServices.map((service) =>
    service ? getExactNprPrice(service.priceLabel) : null,
  );
  const pickupPricing = calculatePickupDeliveryFee(
    fulfillmentMethod,
    pickupArea,
    pairCount,
  );
  const freeDeliveryEligible = qualifiesForFreeHetaudaDelivery(
    pairCount,
    pickupArea,
  );
  const expressServicePrice =
    expressRequested && !hasExpressAsPrimaryService
      ? expressService
        ? getExactNprPrice(expressService.priceLabel)
        : null
      : 0;
  const { serviceSubtotal, total } = calculateBookingTotals(
    servicePrices,
    pickupPricing.deliveryFee,
    expressServicePrice,
  );
  const hasTotalPrice = total !== null;
  const pickupAreaName = pickupArea ? pickupAreaLabel(pickupArea) : null;
  const validationErrors = getValidationErrors(
    formValues,
    items,
    fulfillmentMethod,
    pickupArea,
    minimumDate,
  );
  const isReadyToSubmit =
    services.length > 0 && Object.keys(validationErrors).length === 0;

  useEffect(() => {
    if (state.type === "success") {
      successHeadingRef.current?.focus();
    }
  }, [state]);

  useEffect(() => {
    if (state.type !== "success") return;

    function restartFromBookingLink(event: MouseEvent) {
      if (
        event.button !== 0 ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        !(event.target instanceof Element)
      ) {
        return;
      }

      const link = event.target.closest<HTMLAnchorElement>("a[href]");
      if (!link || link.target === "_blank" || link.hasAttribute("download")) {
        return;
      }

      const destination = new URL(link.href, window.location.href);
      if (
        destination.origin === window.location.origin &&
        destination.pathname === "/" &&
        destination.hash === "#book"
      ) {
        startAnotherBooking();
      }
    }

    document.addEventListener("click", restartFromBookingLink);
    return () => document.removeEventListener("click", restartFromBookingLink);
  }, [startAnotherBooking, state.type]);

  function clearSubmissionError() {
    if (state.type === "error") setState({ type: "idle" });
  }

  function clearFieldError(field: FieldName) {
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function updateValue<K extends keyof BookingLevelValues>(
    key: K,
    value: BookingLevelValues[K],
  ) {
    setFormValues((current) => ({ ...current, [key]: value }));
    setHasInteracted(true);
    clearSubmissionError();
    if (key !== "notes") clearFieldError(key);
  }

  function updatePairValue<K extends keyof Omit<PairDraft, "id">>(
    itemId: string,
    key: K,
    value: PairDraft[K],
  ) {
    setItems((current) =>
      current.map((item) =>
        item.id === itemId ? { ...item, [key]: value } : item,
      ),
    );
    setHasInteracted(true);
    clearSubmissionError();
    if (key === "serviceId" || key === "footwearType") {
      clearFieldError(itemFieldKey(itemId, key));
    }
  }

  function handleTextChange(
    event: ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) {
    const key = event.target.name as keyof BookingLevelValues;
    updateValue(key, event.target.value);
  }

  function validateField(field: FieldName) {
    const error = getValidationErrors(
      formValues,
      items,
      fulfillmentMethod,
      pickupArea,
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
      document
        .querySelector<HTMLElement>(`[data-booking-field="${field}"]`)
        ?.focus();
    });
  }

  function selectPairService(itemId: string, serviceId: string) {
    updatePairValue(itemId, "serviceId", serviceId);
    if (serviceId === expressService?.id) setExpressRequested(false);
  }

  function addAnotherPair() {
    if (items.length >= MAXIMUM_PAIR_COUNT) return;

    const itemId = `pair-${nextPairId.current++}`;
    setItems((current) => [...current, createPairDraft(itemId)]);
    setHasInteracted(true);
    clearSubmissionError();
    clearFieldError("items");
  }

  function removePair(itemId: string) {
    if (items.length <= 1) return;

    setItems((current) => current.filter((item) => item.id !== itemId));
    setFieldErrors((current) => {
      const next = { ...current };
      Object.keys(next).forEach((field) => {
        if (field.startsWith(`item:${itemId}:`)) {
          delete next[field as FieldName];
        }
      });
      return next;
    });
    setHasInteracted(true);
    clearSubmissionError();
  }

  function selectFulfillment(method: "self_dropoff" | "pickup_delivery") {
    setFulfillmentMethod(method);
    setHasInteracted(true);
    clearSubmissionError();
    if (method === "self_dropoff") {
      setFieldErrors((current) => {
        const next = { ...current };
        delete next.pickupArea;
        delete next.pickupAddress;
        delete next.locationUrl;
        return next;
      });
    }
  }

  function selectPickupArea(area: PickupArea | "") {
    setPickupArea(area);
    setHasInteracted(true);
    clearSubmissionError();
    clearFieldError("pickupArea");
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setLocationStatus("Location is not available on this device.");
      return;
    }

    setLocationStatus("Finding your location...");
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
      items,
      fulfillmentMethod,
      pickupArea,
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
      preferredDate: formValues.preferredDate,
      fulfillmentMethod,
      pickupArea,
      pickupAddress: formValues.pickupAddress,
      locationUrl: formValues.locationUrl,
      notes: formValues.notes,
      expressRequested: expressRequested && !hasExpressAsPrimaryService,
      items: items.map(({ serviceId, footwearType, brand, specialRequest }) => ({
        serviceId,
        footwearType,
        brand,
        specialRequest,
      })),
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
        pairCount?: number;
        serviceSubtotal?: number | null;
        deliveryFee?: number;
        freeDeliveryApplied?: boolean;
        expressFee?: number | null;
        total?: number | null;
      };
      if (!response.ok || !result.reference) {
        throw new Error(result.message || "Unable to send your booking.");
      }

      setState({
        type: "success",
        reference: result.reference,
        message: result.message || "Your booking request has been received.",
      });
      setFormValues(emptyBookingLevelValues);
      setItems([createPairDraft("pair-1", defaultServiceId)]);
      nextPairId.current = 2;
      setFulfillmentMethod("self_dropoff");
      setPickupArea("");
      setExpressRequested(false);
      setLocationStatus("");
      setFieldErrors({});
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to send your booking. Please try again.";
      const serverField = fieldForServerMessage(message, items);
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
          Your shoes are in good hands.
        </h3>
        <p>{state.message}</p>
        <p className={styles.successReference}>
          Your reference is <strong>{state.reference}</strong>.
        </p>
        <p>
          We will review your request and contact you about any treatment
          details and pickup or drop-off time.
        </p>
        <div className={styles.successActions}>
          <Link href="/" onClick={startAnotherBooking}>Return home</Link>
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
        <h3 className={styles.formTitle}>Tell Us About Your Shoes.</h3>
        <p className={styles.formIntro}>
          Send us the details below. We will review your shoes and contact you
          about any treatment details and pickup or drop-off time.
        </p>
      </header>

      <div className={styles.compactFields}>
        <label className={styles.field}>
          <span>Full name <b aria-hidden="true">*</b></span>
          <input
            aria-describedby={fieldErrors.customerName ? "customerName-error" : undefined}
            aria-invalid={Boolean(fieldErrors.customerName)}
            autoComplete="name"
            className={classNames(styles.input, fieldErrors.customerName && styles.invalid)}
            data-booking-field="customerName"
            id="customerName"
            maxLength={80}
            name="customerName"
            onBlur={() => validateField("customerName")}
            onChange={handleTextChange}
            placeholder="Your name"
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
            data-booking-field="phone"
            id="phone"
            inputMode="tel"
            maxLength={30}
            name="phone"
            onBlur={() => validateField("phone")}
            onChange={handleTextChange}
            placeholder="+977 98XXXXXXXX"
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
            data-booking-field="email"
            id="email"
            maxLength={120}
            name="email"
            onBlur={() => validateField("email")}
            onChange={handleTextChange}
            placeholder="you@example.com"
            type="email"
            value={formValues.email}
          />
          {fieldErrors.email && (
            <span className={styles.fieldError} id="email-error" role="alert">
              {fieldErrors.email}
            </span>
          )}
        </label>

        <section
          aria-labelledby="your-shoes-heading"
          className={classNames(styles.shoesSection, styles.compactFull)}
        >
          <header className={styles.shoesHeading}>
            <div>
              <span className={styles.formKicker}>Your shoes</span>
              <h4 id="your-shoes-heading">Add each pair for this booking.</h4>
            </div>
            <span aria-live="polite" className={styles.pairCounter}>
              {pairCountLabel(pairCount)}
            </span>
          </header>

          <div className={styles.pairList}>
            {items.map((item, index) => {
              const serviceField = itemFieldKey(item.id, "serviceId");
              const footwearField = itemFieldKey(item.id, "footwearType");
              const pairId = `booking-${item.id}`;

              return (
                <section
                  aria-labelledby={`${pairId}-heading`}
                  className={styles.pairCard}
                  key={item.id}
                >
                  <header className={styles.pairCardHeading}>
                    <h5 id={`${pairId}-heading`}>Pair {index + 1}</h5>
                    {index > 0 && (
                      <button
                        aria-label={`Remove Pair ${index + 1}`}
                        className={styles.removePairButton}
                        onClick={() => removePair(item.id)}
                        type="button"
                      >
                        Remove pair
                      </button>
                    )}
                  </header>

                  <div className={styles.pairFields}>
                    <label className={styles.field}>
                      <span>Service <b aria-hidden="true">*</b></span>
                      {services.length > 0 ? (
                        <select
                          aria-describedby={fieldErrors[serviceField] ? `${pairId}-service-error` : undefined}
                          aria-invalid={Boolean(fieldErrors[serviceField])}
                          className={classNames(styles.input, fieldErrors[serviceField] && styles.invalid)}
                          data-booking-field={serviceField}
                          id={`${pairId}-service`}
                          name={`items.${index}.serviceId`}
                          onBlur={() => validateField(serviceField)}
                          onChange={(event) => selectPairService(item.id, event.target.value)}
                          required
                          value={item.serviceId}
                        >
                          <option value="">Choose a service</option>
                          {services.map((service) => (
                            <option key={service.id} value={service.id}>
                              {service.name} — {service.priceLabel}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className={styles.unavailableServices} role="status">
                          Services are temporarily unavailable. Please use WhatsApp for help.
                        </span>
                      )}
                      {fieldErrors[serviceField] && (
                        <span className={styles.fieldError} id={`${pairId}-service-error`} role="alert">
                          {fieldErrors[serviceField]}
                        </span>
                      )}
                    </label>

                    <label className={styles.field}>
                      <span>Footwear type <b aria-hidden="true">*</b></span>
                      <input
                        aria-describedby={fieldErrors[footwearField] ? `${pairId}-footwear-error` : undefined}
                        aria-invalid={Boolean(fieldErrors[footwearField])}
                        className={classNames(styles.input, fieldErrors[footwearField] && styles.invalid)}
                        data-booking-field={footwearField}
                        id={`${pairId}-footwear`}
                        maxLength={80}
                        name={`items.${index}.footwearType`}
                        onBlur={() => validateField(footwearField)}
                        onChange={(event) => updatePairValue(item.id, "footwearType", event.target.value)}
                        placeholder="Sneakers, boots, heels..."
                        required
                        type="text"
                        value={item.footwearType}
                      />
                      {fieldErrors[footwearField] && (
                        <span className={styles.fieldError} id={`${pairId}-footwear-error`} role="alert">
                          {fieldErrors[footwearField]}
                        </span>
                      )}
                    </label>

                    <label className={styles.field}>
                      <span>Brand <em className={styles.optional}>Optional</em></span>
                      <input
                        className={styles.input}
                        id={`${pairId}-brand`}
                        maxLength={80}
                        name={`items.${index}.brand`}
                        onChange={(event) => updatePairValue(item.id, "brand", event.target.value)}
                        placeholder="Brand name"
                        type="text"
                        value={item.brand}
                      />
                    </label>

                    <label className={classNames(styles.field, styles.fieldWide)}>
                      <span>Condition / special request <em className={styles.optional}>Optional</em></span>
                      <textarea
                        className={styles.input}
                        id={`${pairId}-special-request`}
                        maxLength={800}
                        name={`items.${index}.specialRequest`}
                        onChange={(event) => updatePairValue(item.id, "specialRequest", event.target.value)}
                        placeholder="Stains, damage, material concerns or care requests for this pair."
                        rows={3}
                        value={item.specialRequest}
                      />
                    </label>
                  </div>
                </section>
              );
            })}
          </div>

          <div className={styles.pairActions}>
            <button
              aria-describedby={fieldErrors.items ? "items-error" : undefined}
              className={styles.addPairButton}
              data-booking-field="items"
              disabled={pairCount >= MAXIMUM_PAIR_COUNT}
              onClick={addAnotherPair}
              type="button"
            >
              <span aria-hidden="true">+</span>
              Add another pair
            </button>
            <p className={styles.pairLimit}>
              Add up to {MAXIMUM_PAIR_COUNT} pairs in one booking.
            </p>
          </div>
          {fieldErrors.items && (
            <p className={styles.fieldError} id="items-error" role="alert">
              {fieldErrors.items}
            </p>
          )}
        </section>

        <label className={styles.field}>
          <span>Preferred service date <em className={styles.optional}>Optional</em></span>
          <input
            aria-describedby={fieldErrors.preferredDate ? "preferredDate-error" : undefined}
            aria-invalid={Boolean(fieldErrors.preferredDate)}
            className={classNames(styles.input, fieldErrors.preferredDate && styles.invalid)}
            data-booking-field="preferredDate"
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

        <div className={classNames(styles.field, styles.compactExpressField)}>
          <span>Express service <em className={styles.optional}>Optional</em></span>
          {hasExpressAsPrimaryService ? (
            <div className={classNames(styles.expressOption, styles.selected)}>
              <span className={styles.expressOptionText}>
                <strong>{expressService?.name ?? "Express service"}</strong>
                <small>This is already selected as a service for one of your pairs.</small>
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
                  setHasInteracted(true);
                  clearSubmissionError();
                }}
                type="checkbox"
              />
              <span className={styles.expressOptionText}>
                <strong>Request express service</strong>
                <small>
                  {expressService?.priceLabel
                    ? "Available from " + expressService.priceLabel + " when a slot is open."
                    : "We will confirm availability and any extra charge."}
                </small>
              </span>
            </label>
          )}
        </div>

        <fieldset className={classNames(styles.collectionGroup, styles.compactFull)}>
          <legend>How should we receive and return the shoes? *</legend>
          <div className={styles.deliveryOptions}>
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
                <small>Bring and collect your shoes from our Hetauda studio.</small>
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
                <small>
                  {pickupPricing.freeDeliveryApplied
                    ? "4+ pair Hetauda offer applied."
                    : "FREE pickup & return for 4+ pairs within Hetauda."}
                </small>
              </span>
              <span className={styles.deliveryPrice}>
                {pickupPricing.freeDeliveryApplied ? "Free" : "Rs 200–300"}
              </span>
            </label>
          </div>
          {fulfillmentMethod === "pickup_delivery" && (
            <p
              aria-live="polite"
              className={classNames(
                styles.deliveryPromotion,
                pickupPricing.freeDeliveryApplied && styles.deliveryPromotionSuccess,
              )}
            >
              {pickupPricing.freeDeliveryApplied ? (
                <>
                  <span aria-hidden="true">🎉</span>
                  <strong>FREE Pickup &amp; Return unlocked</strong>
                  <span>4+ pairs within Hetauda qualify for free delivery.</span>
                </>
              ) : pairCount >= 4 && !pickupArea ? (
                <>
                  <strong>4+ pairs qualify for FREE Pickup &amp; Return within Hetauda.</strong>
                  <span>Choose Hetauda City to apply the offer automatically.</span>
                </>
              ) : pairCount >= 4 && !freeDeliveryEligible ? (
                <>
                  <strong>FREE Pickup &amp; Return is available for 4+ pairs within Hetauda.</strong>
                  <span>Other-city pickup keeps the regular delivery charge.</span>
                </>
              ) : (
                <>
                  <strong>FREE pickup &amp; return for 4+ pairs within Hetauda.</strong>
                  <span>Add more pairs to unlock the offer.</span>
                </>
              )}
            </p>
          )}
        </fieldset>

        <div
          aria-hidden={fulfillmentMethod !== "pickup_delivery"}
          className={classNames(styles.pickupDetails, styles.compactFull)}
          data-open={fulfillmentMethod === "pickup_delivery"}
        >
          <label className={styles.field}>
            <span>Pickup area <b aria-hidden="true">*</b></span>
            <select
              aria-describedby={fieldErrors.pickupArea ? "pickupArea-error" : undefined}
              aria-invalid={Boolean(fieldErrors.pickupArea)}
              className={classNames(styles.input, fieldErrors.pickupArea && styles.invalid)}
              data-booking-field="pickupArea"
              disabled={fulfillmentMethod !== "pickup_delivery"}
              id="pickupArea"
              name="pickupArea"
              onBlur={() => validateField("pickupArea")}
              onChange={(event) =>
                selectPickupArea(event.target.value as PickupArea | "")
              }
              required={fulfillmentMethod === "pickup_delivery"}
              value={pickupArea}
            >
              <option value="">Choose an area</option>
              <option value="hetauda_city">Hetauda City — Rs 200</option>
              <option value="other_city">Other city — Rs 300</option>
            </select>
            {fieldErrors.pickupArea && (
              <span className={styles.fieldError} id="pickupArea-error" role="alert">
                {fieldErrors.pickupArea}
              </span>
            )}
          </label>

          <label className={styles.field}>
            <span>Pickup and drop-off address <b aria-hidden="true">*</b></span>
            <textarea
              aria-describedby={fieldErrors.pickupAddress ? "pickupAddress-error" : undefined}
              aria-invalid={Boolean(fieldErrors.pickupAddress)}
              autoComplete="street-address"
              className={classNames(styles.input, fieldErrors.pickupAddress && styles.invalid)}
              data-booking-field="pickupAddress"
              id="pickupAddress"
              maxLength={300}
              name="pickupAddress"
              onBlur={() => validateField("pickupAddress")}
              onChange={handleTextChange}
              placeholder="Area, street or tole, building and a nearby landmark"
              required={fulfillmentMethod === "pickup_delivery"}
              rows={3}
              disabled={fulfillmentMethod !== "pickup_delivery"}
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
                data-booking-field="locationUrl"
                id="locationUrl"
                maxLength={500}
                name="locationUrl"
                onBlur={() => validateField("locationUrl")}
                onChange={handleTextChange}
                placeholder="Paste a Google Maps link"
                type="url"
                disabled={fulfillmentMethod !== "pickup_delivery"}
                value={formValues.locationUrl}
              />
              <button
                disabled={fulfillmentMethod !== "pickup_delivery"}
                onClick={useCurrentLocation}
                type="button"
              >
                Use my location
              </button>
            </span>
            {fieldErrors.locationUrl && (
              <span className={styles.fieldError} id="locationUrl-error" role="alert">
                {fieldErrors.locationUrl}
              </span>
            )}
            {locationStatus && (
              <small className={styles.locationStatus} id="location-status">
                {locationStatus}
              </small>
            )}
          </label>
          <p>
            Pickup &amp; return is Rs 200 within Hetauda City and Rs 300 for
            other cities. Hetauda pickup &amp; return is free for 4 or more pairs.
          </p>
        </div>

        <label className={classNames(styles.field, styles.compactFull, styles.compactNotes)}>
          <span>Additional booking notes <em className={styles.optional}>Optional</em></span>
          <textarea
            className={styles.input}
            id="notes"
            maxLength={800}
            name="notes"
            onChange={handleTextChange}
            placeholder="Anything else we should know about this booking?"
            rows={3}
            value={formValues.notes}
          />
        </label>
      </div>

      <section aria-labelledby="booking-summary-heading" className={styles.summary}>
        <div className={styles.summaryHeading}>
          <div>
            <h4 id="booking-summary-heading">Your Booking Summary</h4>
            <span>{pairCountLabel(pairCount)}</span>
          </div>
          <span aria-hidden="true">✓</span>
        </div>
        <dl className={styles.summaryRows}>
          {items.map((item, index) => {
            const service = selectedServices[index];
            return (
              <div className={styles.summaryPair} key={item.id}>
                <dt>Pair {index + 1}</dt>
                <dd>
                  <span>{service?.name ?? "Choose a service"}</span>
                  <strong>{service?.priceLabel ?? "Not selected"}</strong>
                </dd>
              </div>
            );
          })}
          <div className={styles.summaryRow}>
            <dt>Services subtotal</dt>
            <dd>
              {serviceSubtotal === null
                ? "Quote after review"
                : formatNprPrice(serviceSubtotal)}
            </dd>
          </div>
          <div className={styles.summaryRow}>
            <dt>Collection method</dt>
            <dd>
              {fulfillmentMethod === "pickup_delivery"
                ? "Pickup & Return Delivery"
                : "Self Drop & Pickup"}
            </dd>
          </div>
          {fulfillmentMethod === "pickup_delivery" && (
            <div className={styles.summaryRow}>
              <dt>Pickup area</dt>
              <dd>{pickupAreaName ?? "Choose an area"}</dd>
            </div>
          )}
          <div className={styles.summaryRow}>
            <dt>Pickup &amp; return</dt>
            <dd>
              {fulfillmentMethod === "self_dropoff"
                ? "Free"
                : pickupPricing.deliveryFee === null
                  ? "Choose an area"
                  : pickupPricing.freeDeliveryApplied
                    ? "FREE — 4+ pair Hetauda offer"
                    : formatNprPrice(pickupPricing.deliveryFee)}
            </dd>
          </div>
          <div className={styles.summaryRow}>
            <dt>Express service</dt>
            <dd>
              {hasExpressAsPrimaryService
                ? "Selected as a pair service"
                : expressRequested
                  ? expressService?.priceLabel
                    ? "Requested — " + expressService.priceLabel
                    : "Requested — confirmed when available"
                  : "Not selected"}
            </dd>
          </div>
        </dl>
        <div className={styles.summaryTotal}>
          <span>{hasTotalPrice ? "Total" : "Price status"}</span>
          <strong>{hasTotalPrice ? formatNprPrice(total) : "Quote after review"}</strong>
        </div>
        <p className={styles.summaryNotice}>
          {hasTotalPrice
            ? pickupPricing.freeDeliveryApplied
              ? "Pickup & return is free through the 4+ pair Hetauda offer. Local-brand eligibility may adjust the service price."
              : fulfillmentMethod === "pickup_delivery"
                ? "Includes pickup and return delivery. Local-brand eligibility may adjust the service price."
                : "Standard service price. Local-brand eligibility may adjust the service price."
            : "We will review your footwear and share the suitable treatment, quote and turnaround time."}
        </p>
      </section>

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
        {state.type === "sending" ? "Sending Your Request..." : "Request My Booking"}
      </button>
      {hasInteracted && !isReadyToSubmit && state.type !== "sending" && (
        <p className={styles.summaryNotice}>
          Complete the required details to request your booking.
        </p>
      )}
      <p className={styles.summaryNotice}>
        No payment is required now.
      </p>
    </form>
  );
}
