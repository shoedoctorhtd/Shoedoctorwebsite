import type { Metadata } from "next";
import SiteMotion from "../components/SiteMotion";
import { SiteFooter, SiteHeader } from "../components/SiteChrome";

export const metadata: Metadata = {
  title: { absolute: "Returns & Refunds | Shoe Doctor" },
  description:
    "How to contact Shoe Doctor about a damaged, wrong or missing product order without relying on an unlisted return promise.",
  alternates: { canonical: "/returns-refunds" },
};

export default function ReturnsRefundsPage() {
  return (
    <main id="main-content" className="public-site inner-site privacy-policy-page">
      <SiteMotion />
      <SiteHeader />

      <section className="sd-page-hero privacy-policy-hero">
        <p className="sd-kicker">Help for a product order</p>
        <h1>
          RETURNS &amp;
          <br />
          <span>REFUNDS.</span>
        </h1>
        <div className="sd-page-hero-bottom">
          <p>
            Contact Shoe Doctor promptly if an order needs attention. We do not
            publish a blanket return window, replacement promise or refund
            guarantee that may not fit every item or situation.
          </p>
        </div>
      </section>

      <section className="privacy-policy sd-section" aria-labelledby="returns-summary">
        <div className="privacy-policy__grid">
          <aside className="privacy-policy__summary" data-reveal>
            <p className="sd-kicker">Start with your order reference</p>
            <h2 id="returns-summary">LET US REVIEW THE ORDER.</h2>
            <p>
              Share the product, order reference and a clear explanation so
              Shoe Doctor can review the next step with you.
            </p>
            <a href="mailto:shoedoctorhtd@gmail.com">Contact Shoe Doctor</a>
          </aside>

          <div className="privacy-policy__content">
            <section className="privacy-policy__section" data-reveal>
              <p className="privacy-policy__number">01</p>
              <div>
                <h2>When to contact us</h2>
                <p>
                  Get in touch if the item appears damaged on arrival, the
                  wrong item was received, an item is missing, or you believe
                  there is another issue with the order. Keep the product,
                  packaging and order information available while Shoe Doctor
                  reviews the request.
                </p>
              </div>
            </section>

            <section className="privacy-policy__section" data-reveal>
              <p className="privacy-policy__number">02</p>
              <div>
                <h2>What to include</h2>
                <p>To help us identify the order, please provide:</p>
                <ul>
                  <li>your public order reference;</li>
                  <li>the product name and quantity involved;</li>
                  <li>a short description of the issue; and</li>
                  <li>clear photos where they help explain damage or an incorrect item.</li>
                </ul>
              </div>
            </section>

            <section className="privacy-policy__section" data-reveal>
              <p className="privacy-policy__number">03</p>
              <div>
                <h2>Review before a return</h2>
                <p>
                  Do not send an item back or assume a refund, replacement or
                  exchange before Shoe Doctor confirms the appropriate next
                  step. The website does not currently publish fixed return
                  eligibility, a return address, a refund period or a warranty
                  policy.
                </p>
              </div>
            </section>

            <section className="privacy-policy__section" data-reveal>
              <p className="privacy-policy__number">04</p>
              <div>
                <h2>Product condition</h2>
                <p>
                  If Shoe Doctor accepts a return for review, we will explain
                  any handling instructions and whether an item is suitable to
                  be returned. This keeps product condition, stock records and
                  customer communication accurate.
                </p>
              </div>
            </section>

            <section className="privacy-policy__section privacy-policy__section--contact" data-reveal>
              <p className="privacy-policy__number">05</p>
              <div>
                <h2>Contact Shoe Doctor</h2>
                <address>
                  <strong>Shoe Doctor Pvt. Ltd.</strong>
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
