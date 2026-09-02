import type { Metadata } from "next";
import SiteMotion from "../components/SiteMotion";
import { SiteFooter, SiteHeader } from "../components/SiteChrome";

export const metadata: Metadata = {
  title: {
    absolute: "Privacy Policy | Shoe Doctor",
  },
  description:
    "How Shoe Doctor collects, uses and protects customer and Google-authorised data.",
  alternates: { canonical: "/privacy-policy" },
};

export default function PrivacyPolicyPage() {
  return (
    <main id="main-content" className="public-site inner-site privacy-policy-page">
      <SiteMotion />
      <SiteHeader />

      <section className="sd-page-hero privacy-policy-hero">
        <p className="sd-kicker">Your information, handled with care</p>
        <h1>
          PRIVACY
          <br />
          <span>POLICY.</span>
        </h1>
        <div className="sd-page-hero-bottom">
          <p>
            This policy explains what Shoe Doctor collects, why we use it and
            the choices you have about your information.
          </p>
          <p className="privacy-policy-updated">Last updated: 25 August 2026</p>
        </div>
      </section>

      <section
        className="privacy-policy sd-section"
        aria-labelledby="privacy-summary"
      >
        <div className="privacy-policy__grid">
          <aside className="privacy-policy__summary" data-reveal>
            <p className="sd-kicker">At a glance</p>
            <h2 id="privacy-summary">CLEAR CARE FOR YOUR DATA.</h2>
            <p>
              We collect only the details needed to care for your shoes,
              arrange service and keep the business running responsibly.
            </p>
            <a href="mailto:shoedoctorhtd@gmail.com">
              Questions about privacy? Email us
            </a>
          </aside>

          <div className="privacy-policy__content">
            <section className="privacy-policy__section" data-reveal>
              <p className="privacy-policy__number">01</p>
              <div>
                <h2>Who we are</h2>
                <p>
                  Shoe Doctor Pvt. Ltd., Hetauda-4, Makwanpur, Nepal (&quot;Shoe
                  Doctor&quot;, &quot;we&quot;, &quot;us&quot; or &quot;our&quot;) operates this website and its
                  booking and shoe-donation services. This Privacy Policy
                  applies to information collected through those services and
                  our customer communications.
                </p>
              </div>
            </section>

            <section className="privacy-policy__section" data-reveal>
              <p className="privacy-policy__number">02</p>
              <div>
                <h2>Information we collect</h2>
                <p>
                  When you book a service or donate shoes, we may collect the
                  information you provide, including your name, email address,
                  phone number, location or pickup/drop address, shoe and
                  service details, and booking reference. Shoe and service
                  details can include footwear type, brand, condition, the
                  treatment requested and special instructions.
                </p>
                <p>
                  For donation requests, we may also collect details needed to
                  arrange a safe handover and, if you choose to receive them,
                  confirmation or impact updates. We may keep records of our
                  communications and service activity so we can support you.
                </p>
              </div>
            </section>

            <section className="privacy-policy__section" data-reveal>
              <p className="privacy-policy__number">03</p>
              <div>
                <h2>How we use your information</h2>
                <p>We use personal information only where it is needed to:</p>
                <ul>
                  <li>process bookings and donation requests;</li>
                  <li>arrange pickup, drop-off and delivery services;</li>
                  <li>send booking confirmations and shoe-status notifications;</li>
                  <li>answer questions and provide customer support;</li>
                  <li>help prevent fraud, misuse and security issues; and</li>
                  <li>maintain accurate business, service and legal records.</li>
                </ul>
              </div>
            </section>

            <section className="privacy-policy__section" data-reveal>
              <p className="privacy-policy__number">04</p>
              <div>
                <h2>Google OAuth and the Gmail API</h2>
                <p>
                  Shoe Doctor uses Google OAuth and the Gmail API only to send
                  transactional booking and status-notification emails,
                  including donation confirmations and status messages, from
                  its authorised business Gmail account.
                </p>
                <p>
                  Our application does not read, download, analyse, sell or
                  delete messages in the Gmail inbox. Google-authorised data
                  is not sold or used for advertising. It is used only to
                  provide the email-notification functionality requested by
                  Shoe Doctor.
                </p>
                <p>
                  Shoe Doctor&apos;s use and transfer of information received from
                  Google APIs complies with the Google API Services User Data
                  Policy, including the Limited Use requirements.
                </p>
              </div>
            </section>

            <section className="privacy-policy__section" data-reveal>
              <p className="privacy-policy__number">05</p>
              <div>
                <h2>Storage, security and retention</h2>
                <p>
                  We store information in systems used to operate the website,
                  booking service and customer communications. We use
                  reasonable safeguards designed to protect information,
                  including limited access to business records and secure
                  handling of service credentials. No method of online storage
                  or transmission is completely secure, so we cannot guarantee
                  absolute security.
                </p>
                <p>
                  We retain information only for as long as reasonably needed
                  to provide our services, maintain business records, resolve
                  issues, meet legal obligations or enforce our agreements.
                  When information is no longer needed, we delete or anonymise
                  it using reasonable operational practices, unless the law
                  requires us to keep it longer.
                </p>
              </div>
            </section>

            <section className="privacy-policy__section" data-reveal>
              <p className="privacy-policy__number">06</p>
              <div>
                <h2>When information is shared</h2>
                <p>
                  We do not sell your personal information. We share it only
                  with service providers when necessary to operate the booking
                  service, such as providers that support website hosting,
                  data storage, email delivery or pickup and delivery. We may
                  also share information when required by law or to protect
                  the rights, safety and security of Shoe Doctor, our customers
                  or others.
                </p>
              </div>
            </section>

            <section className="privacy-policy__section" data-reveal>
              <p className="privacy-policy__number">07</p>
              <div>
                <h2>Your choices and rights</h2>
                <p>
                  You may ask us to access, correct or delete personal
                  information we hold about you. To make a request, email{" "}
                  <a href="mailto:shoedoctorhtd@gmail.com">
                    shoedoctorhtd@gmail.com
                  </a>
                  . We may need to verify your identity before completing a
                  request, and some information may need to be retained where
                  required by law or for legitimate business records.
                </p>
              </div>
            </section>

            <section className="privacy-policy__section" data-reveal>
              <p className="privacy-policy__number">08</p>
              <div>
                <h2>Cookies and essential technologies</h2>
                <p>
                  We use essential cookies and similar website technologies to
                  keep the site secure, support account or returning-customer
                  functions when you choose to use them, and make the booking
                  service work. These technologies are not used to run
                  advertising or third-party behavioural tracking.
                </p>
              </div>
            </section>

            <section className="privacy-policy__section" data-reveal>
              <p className="privacy-policy__number">09</p>
              <div>
                <h2>Children&apos;s privacy</h2>
                <p>
                  Our services are not directed to children. If you believe a
                  child has provided personal information to us without a
                  parent or guardian&apos;s permission, please email us and we will
                  take reasonable steps to review and delete it.
                </p>
              </div>
            </section>

            <section className="privacy-policy__section" data-reveal>
              <p className="privacy-policy__number">10</p>
              <div>
                <h2>Changes to this policy</h2>
                <p>
                  We may update this Privacy Policy when our services or legal
                  obligations change. We will post the updated version on this
                  page and change the &quot;Last updated&quot; date above. Please review
                  this page periodically for the latest information.
                </p>
              </div>
            </section>

            <section
              className="privacy-policy__section privacy-policy__section--contact"
              data-reveal
            >
              <p className="privacy-policy__number">11</p>
              <div>
                <h2>Contact us</h2>
                <address>
                  <strong>Shoe Doctor Pvt. Ltd.</strong>
                  <span>Hetauda-4, Makwanpur, Nepal</span>
                  <a href="mailto:shoedoctorhtd@gmail.com">
                    shoedoctorhtd@gmail.com
                  </a>
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
