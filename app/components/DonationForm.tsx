"use client";

import { useMemo, useState, type FormEvent } from "react";

type DonationMethod = "dropoff" | "pickup";

/**
 * Client-side donation request form. Submission is intentionally local for now
 * so it can later be connected to an email service, spreadsheet, database, or
 * dashboard without changing the page experience.
 */
export default function DonationForm() {
  const [donationMethod, setDonationMethod] =
    useState<DonationMethod>("dropoff");
  const [submitted, setSubmitted] = useState(false);
  const minimumPickupDate = useMemo(
    () => new Date().toISOString().slice(0, 10),
    [],
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    form.reset();
    setDonationMethod("dropoff");
    setSubmitted(true);
  }

  function chooseDonationMethod(method: DonationMethod) {
    setDonationMethod(method);
    setSubmitted(false);
  }

  return (
    <form className="donation-form" onSubmit={handleSubmit}>
      <div className="donation-form__intro">
        <span className="donation-form__eyebrow">DONATION REQUEST</span>
        <h3>Donate a pair. Make a difference.</h3>
        <p>
          Share a few details about your footwear and how you would like to
          pass it forward.
        </p>
      </div>

      <div className="donation-form__grid">
        <label className="donation-form__field" htmlFor="donation-name">
          <span>Full name <b aria-hidden="true">*</b></span>
          <input
            id="donation-name"
            name="fullName"
            type="text"
            autoComplete="name"
            maxLength={80}
            required
            placeholder="Your name"
            onChange={() => setSubmitted(false)}
          />
        </label>

        <label className="donation-form__field" htmlFor="donation-phone">
          <span>Phone number <b aria-hidden="true">*</b></span>
          <input
            id="donation-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            maxLength={30}
            required
            placeholder="+977 98XXXXXXXX"
            onChange={() => setSubmitted(false)}
          />
        </label>

        <label className="donation-form__field" htmlFor="donation-email">
          <span>Email <small>(optional)</small></span>
          <input
            id="donation-email"
            name="email"
            type="email"
            autoComplete="email"
            maxLength={120}
            placeholder="you@example.com"
            onChange={() => setSubmitted(false)}
          />
        </label>

        <label className="donation-form__field" htmlFor="donation-pairs">
          <span>Number of pairs <b aria-hidden="true">*</b></span>
          <input
            id="donation-pairs"
            name="pairCount"
            type="number"
            inputMode="numeric"
            min="1"
            max="99"
            required
            placeholder="1"
            onChange={() => setSubmitted(false)}
          />
        </label>

        <label className="donation-form__field" htmlFor="donation-shoe-type">
          <span>Shoe type <b aria-hidden="true">*</b></span>
          <select
            id="donation-shoe-type"
            name="shoeType"
            defaultValue=""
            required
            onChange={() => setSubmitted(false)}
          >
            <option value="" disabled>
              Select a type
            </option>
            <option value="sneakers">Sneakers</option>
            <option value="school-shoes">School shoes</option>
            <option value="sandals-slippers">Sandals or slippers</option>
            <option value="boots">Boots</option>
            <option value="sports-shoes">Sports shoes</option>
            <option value="other">Other wearable footwear</option>
          </select>
        </label>

        <fieldset className="donation-form__choice-group">
          <legend>Shoe condition <b aria-hidden="true">*</b></legend>
          <div className="donation-form__choice-options">
            <label className="donation-form__choice" htmlFor="condition-ready">
              <input
                id="condition-ready"
                name="shoeCondition"
                type="radio"
                value="ready-to-wear"
                required
                onChange={() => setSubmitted(false)}
              />
              <span>Ready to wear</span>
            </label>
            <label className="donation-form__choice" htmlFor="condition-cleaning">
              <input
                id="condition-cleaning"
                name="shoeCondition"
                type="radio"
                value="needs-cleaning"
                onChange={() => setSubmitted(false)}
              />
              <span>Needs cleaning</span>
            </label>
            <label className="donation-form__choice" htmlFor="condition-repair">
              <input
                id="condition-repair"
                name="shoeCondition"
                type="radio"
                value="needs-minor-repair"
                onChange={() => setSubmitted(false)}
              />
              <span>Needs minor repair</span>
            </label>
          </div>
        </fieldset>

        <fieldset className="donation-form__choice-group donation-form__choice-group--wide">
          <legend>Donation method <b aria-hidden="true">*</b></legend>
          <div className="donation-form__method-options">
            <label
              className={
                donationMethod === "dropoff"
                  ? "donation-form__method donation-form__method--selected"
                  : "donation-form__method"
              }
              htmlFor="donation-dropoff"
            >
              <input
                id="donation-dropoff"
                name="donationMethod"
                type="radio"
                value="dropoff"
                checked={donationMethod === "dropoff"}
                required
                onChange={() => chooseDonationMethod("dropoff")}
              />
              <span>
                <strong>I will drop off at Shoe Doctor</strong>
                <small>Bring your pair to our Hetauda shop.</small>
              </span>
            </label>
            <label
              className={
                donationMethod === "pickup"
                  ? "donation-form__method donation-form__method--selected"
                  : "donation-form__method"
              }
              htmlFor="donation-pickup"
            >
              <input
                id="donation-pickup"
                name="donationMethod"
                type="radio"
                value="pickup"
                checked={donationMethod === "pickup"}
                onChange={() => chooseDonationMethod("pickup")}
              />
              <span>
                <strong>I need pickup support</strong>
                <small>We will contact you to confirm availability.</small>
              </span>
            </label>
          </div>
        </fieldset>

        {donationMethod === "pickup" ? (
          <div className="donation-form__pickup-fields donation-form__wide-field">
            <label className="donation-form__field" htmlFor="donation-location">
              <span>Pickup address / location <b aria-hidden="true">*</b></span>
              <textarea
                id="donation-location"
                name="pickupLocation"
                rows={3}
                maxLength={300}
                required
                placeholder="Area, tole, landmark, or a Google Maps link"
                onChange={() => setSubmitted(false)}
              />
            </label>

            <label className="donation-form__field" htmlFor="donation-pickup-date">
              <span>Preferred pickup date <b aria-hidden="true">*</b></span>
              <input
                id="donation-pickup-date"
                name="preferredPickupDate"
                type="date"
                min={minimumPickupDate}
                required
                onChange={() => setSubmitted(false)}
              />
            </label>
          </div>
        ) : (
          <aside className="donation-form__dropoff-note donation-form__wide-field">
            <strong>Drop off at Shoe Doctor</strong>
            <p>
              Bring clean, dry, wearable shoes to our Hetauda shop. Our team
              will inspect each pair with care before restoring and sharing it.
            </p>
          </aside>
        )}

        <label className="donation-form__field donation-form__wide-field" htmlFor="donation-message">
          <span>Message or special note <small>(optional)</small></span>
          <textarea
            id="donation-message"
            name="message"
            rows={4}
            maxLength={800}
            placeholder="Anything we should know about the shoes or collection?"
            onChange={() => setSubmitted(false)}
          />
        </label>

        <label className="donation-form__confirmation donation-form__wide-field" htmlFor="donation-confirmation">
          <input
            id="donation-confirmation"
            name="safeForDonation"
            type="checkbox"
            required
            onChange={() => setSubmitted(false)}
          />
          <span>
            I confirm these shoes are safe and suitable for donation.
          </span>
        </label>
      </div>

      {submitted && (
        <div className="donation-form__success" role="status" aria-live="polite">
          <strong>Thank you for giving your shoes a second journey.</strong>
          <span>Shoe Doctor will contact you soon.</span>
        </div>
      )}

      <button className="donation-form__submit" type="submit">
        Submit Donation Request
        <span aria-hidden="true">→</span>
      </button>

      <p className="donation-form__privacy-note">
        Your request stays with Shoe Doctor until a future donation system is
        connected.
      </p>
    </form>
  );
}
