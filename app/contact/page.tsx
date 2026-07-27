/* eslint-disable @next/next/no-html-link-for-pages */
import SiteMotion from "../components/SiteMotion";
import {
  ArrowUpRight,
  SiteFooter,
  SiteHeader,
} from "../components/SiteChrome";

export const dynamic = "force-dynamic";

export default function ContactPage() {
  return (
    <main className="public-site inner-site">
      <SiteMotion />
      <SiteHeader />

      <section className="sd-page-hero contact-hero">
        <p className="sd-kicker">Talk to the Doctor</p>
        <h1>
          LET’S SAVE
          <br />
          <span>YOUR SOLES.</span>
        </h1>
        <div className="sd-page-hero-bottom">
          <p>
            Send a photo and short condition note, or book online. We’ll
            recommend the right treatment and confirm the final price before
            work begins.
          </p>
          <a className="sd-primary-button" href="https://wa.me/9779761716743">
            WhatsApp now <ArrowUpRight />
          </a>
        </div>
      </section>

      <section className="sd-contact-grid sd-section" data-reveal>
        <article>
          <span>Call / WhatsApp</span>
          <a href="tel:+9779761716743">+977 9761716743</a>
          <p>The same number is active on WhatsApp.</p>
        </article>
        <article>
          <span>Email</span>
          <a href="mailto:shoedoctorhtd@gmail.com">
            shoedoctorhtd@gmail.com
          </a>
          <p>For quotes, partnerships and business enquiries.</p>
        </article>
        <article>
          <span>Visit</span>
          <strong>Hetauda, Nepal</strong>
          <p>The exact studio address is confirmed with your booking.</p>
        </article>
        <article>
          <span>Instagram & TikTok</span>
          <strong>Shoe Doctor</strong>
          <p>Follow Shoe Doctor on both platforms.</p>
        </article>
      </section>

      <section className="sd-handover-panel" data-reveal>
        <div>
          <p className="sd-kicker">Choose your handover</p>
          <h2>DROP IT OFF.<br />OR WE’LL COME TO YOU.</h2>
        </div>
        <div className="sd-handover-options">
          <article>
            <span>01</span>
            <h3>Self drop & pickup</h3>
            <p>
              Bring the pair to the studio and collect it after we confirm
              treatment is complete.
            </p>
          </article>
          <article>
            <span>02</span>
            <h3>Pickup & delivery</h3>
            <p>
              Share your address and map location during booking. Availability
              and delivery charge depend on the area.
            </p>
          </article>
        </div>
      </section>

      <section className="sd-page-cta">
        <p>Online booking takes about two minutes.</p>
        <h2>READY WHEN<br />YOUR PAIR IS.</h2>
        <a className="sd-primary-button" href="/#book">
          Book your pair <ArrowUpRight />
        </a>
      </section>

      <SiteFooter />
    </main>
  );
}
