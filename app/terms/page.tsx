import type { Metadata } from "next";
import SiteMotion from "../components/SiteMotion";
import { SiteFooter, SiteHeader } from "../components/SiteChrome";

export const metadata: Metadata = {
  title: { absolute: "Terms | Shoe Doctor" },
  description:
    "Terms for using Shoe Doctor's website, product ordering, shoe-care bookings and customer communications.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <main className="public-site inner-site privacy-policy-page">
      <SiteMotion />
      <SiteHeader />

      <section className="sd-page-hero privacy-policy-hero">
        <p className="sd-kicker">Clear expectations</p>
        <h1>
          TERMS OF
          <br />
          <span>USE.</span>
        </h1>
        <div className="sd-page-hero-bottom">
          <p>
            These terms describe the current website experience. They do not
            add an unlisted warranty, delivery promise, medical claim or
            product-use guarantee.
          </p>
        </div>
      </section>

      <section className="privacy-policy sd-section" aria-labelledby="terms-summary">
        <div className="privacy-policy__grid">
          <aside className="privacy-policy__summary" data-reveal>
            <p className="sd-kicker">Shoe Doctor online</p>
            <h2 id="terms-summary">USE THE RIGHT CARE FOR THE PAIR.</h2>
            <p>
              The website supports shoe-care bookings, product orders,
              donation requests and customer communication.
            </p>
            <a href="/contact">Talk to Shoe Doctor</a>
          </aside>

          <div className="privacy-policy__content">
            <section className="privacy-policy__section" data-reveal>
              <p className="privacy-policy__number">01</p>
              <div>
                <h2>Using this website</h2>
                <p>
                  Please provide accurate contact, order and booking details.
                  Do not misuse the website, attempt to access protected areas
                  or interfere with checkout, payment, booking or admin
                  systems.
                </p>
              </div>
            </section>

            <section className="privacy-policy__section" data-reveal>
              <p className="privacy-policy__number">02</p>
              <div>
                <h2>Product information and orders</h2>
                <p>
                  Public product information is shown only for products Shoe
                  Doctor has made available to order. Availability, price and
                  stock are checked again when an order is submitted; customer
                  browser totals are not the source of truth.
                </p>
              </div>
            </section>

            <section className="privacy-policy__section" data-reveal>
              <p className="privacy-policy__number">03</p>
              <div>
                <h2>Payment and fulfilment</h2>
                <p>
                  The current product checkout offers QR online payment and
                  Cash on Delivery. QR payment receipts are reviewed through
                  Shoe Doctor&apos;s existing payment process. Collection and
                  delivery details are handled as described in our
                  <a href="/shipping-delivery"> Shipping &amp; Delivery</a> page.
                </p>
              </div>
            </section>

            <section className="privacy-policy__section" data-reveal>
              <p className="privacy-policy__number">04</p>
              <div>
                <h2>Shoe-care services</h2>
                <p>
                  Shoe Doctor assesses material, condition and treatment needs
                  before work begins. A service card or booking request does
                  not promise that every stain, repair or restoration outcome
                  is possible for every pair. Final scope and pricing are
                  confirmed after diagnosis where applicable.
                </p>
              </div>
            </section>

            <section className="privacy-policy__section" data-reveal>
              <p className="privacy-policy__number">05</p>
              <div>
                <h2>Product use</h2>
                <p>
                  Follow any product-specific guidance, warnings and material
                  directions supplied with the product. If suitability is not
                  stated, do not assume a product is safe for a particular
                  material or condition; contact Shoe Doctor or seek
                  professional shoe-care advice first.
                </p>
              </div>
            </section>

            <section className="privacy-policy__section privacy-policy__section--contact" data-reveal>
              <p className="privacy-policy__number">06</p>
              <div>
                <h2>Questions</h2>
                <address>
                  <strong>Shoe Doctor Pvt. Ltd.</strong>
                  <span>Hetauda-4, Makwanpur, Nepal</span>
                  <a href="mailto:shoedoctorhtd@gmail.com">shoedoctorhtd@gmail.com</a>
                </address>
              </div>
            </section>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
