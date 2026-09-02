import type { Metadata } from "next";
import SiteMotion from "../components/SiteMotion";
import { SiteFooter, SiteHeader } from "../components/SiteChrome";

export const metadata: Metadata = {
  title: { absolute: "Shipping & Delivery | Shoe Doctor" },
  description:
    "How Shoe Doctor confirms product collection, delivery, QR payment and Cash on Delivery details.",
  alternates: { canonical: "/shipping-delivery" },
};

export default function ShippingDeliveryPage() {
  return (
    <main id="main-content" className="public-site inner-site privacy-policy-page">
      <SiteMotion />
      <SiteHeader />

      <section className="sd-page-hero privacy-policy-hero">
        <p className="sd-kicker">Product orders, clearly handled</p>
        <h1>
          SHIPPING &amp;
          <br />
          <span>DELIVERY.</span>
        </h1>
        <div className="sd-page-hero-bottom">
          <p>
            This page explains the delivery and collection information Shoe
            Doctor currently publishes for product orders.
          </p>
        </div>
      </section>

      <section className="privacy-policy sd-section" aria-labelledby="shipping-summary">
        <div className="privacy-policy__grid">
          <aside className="privacy-policy__summary" data-reveal>
            <p className="sd-kicker">At a glance</p>
            <h2 id="shipping-summary">CONFIRM THE DETAILS FIRST.</h2>
            <p>
              Choose collection or delivery at checkout. Shoe Doctor confirms
              the fulfilment details directly when a public schedule or fee is
              not listed.
            </p>
            <a href="mailto:shoedoctorhtd@gmail.com">Ask about an order</a>
          </aside>

          <div className="privacy-policy__content">
            <section className="privacy-policy__section" data-reveal>
              <p className="privacy-policy__number">01</p>
              <div>
                <h2>Collection or delivery</h2>
                <p>
                  Product checkout lets you choose Shop collection or Delivery.
                  When you choose Delivery, Shoe Doctor asks for a delivery
                  address so the order can be reviewed and fulfilled.
                </p>
              </div>
            </section>

            <section className="privacy-policy__section" data-reveal>
              <p className="privacy-policy__number">02</p>
              <div>
                <h2>Coverage, charges and timing</h2>
                <p>
                  Shoe Doctor has not published a general delivery-coverage
                  map, delivery-fee schedule or delivery-time promise on this
                  website. Availability, any delivery charge and timing are
                  confirmed with you for the specific order before fulfilment.
                </p>
              </div>
            </section>

            <section className="privacy-policy__section" data-reveal>
              <p className="privacy-policy__number">03</p>
              <div>
                <h2>Payment choices</h2>
                <p>
                  The current checkout supports QR online payment and Cash on
                  Delivery. QR orders are followed by a receipt-submission step
                  for Shoe Doctor to review. For Cash on Delivery, payment is
                  collected during delivery or collection.
                </p>
              </div>
            </section>

            <section className="privacy-policy__section" data-reveal>
              <p className="privacy-policy__number">04</p>
              <div>
                <h2>Order updates</h2>
                <p>
                  Keep your order reference and contact details available when
                  you get in touch. If you need help with collection, delivery
                  or payment, contact Shoe Doctor before assuming an unlisted
                  delivery arrangement or timing.
                </p>
              </div>
            </section>

            <section className="privacy-policy__section privacy-policy__section--contact" data-reveal>
              <p className="privacy-policy__number">05</p>
              <div>
                <h2>Contact Shoe Doctor</h2>
                <address>
                  <strong>Shoe Doctor Pvt. Ltd.</strong>
                  <span>Hetauda-4, Makwanpur, Nepal</span>
                  <a href="tel:+9779761716743">+977 9761716743</a>
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
