import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import AdminLoginForm from "../../components/AdminLoginForm";
import { getAdminUser, safeReturnPath } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Administrator Login",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getAdminUser();
  const { next } = await searchParams;
  const nextPath = safeReturnPath(next);
  if (user) redirect(nextPath);

  return (
    <main id="main-content" className="admin-login-page">
      <section className="admin-login-card">
        <Link className="admin-login-brand" href="/">
          <span>SD+</span>
          <strong>Shoe Doctor</strong>
        </Link>
        <p className="section-kicker">Private administrator area</p>
        <h1>SECURE<br />OPERATIONS.</h1>
        <p className="admin-login-intro">
          Sign in to manage services, prices and customer bookings. Your
          password is checked securely on Cloudflare and is never stored in
          this website’s source code.
        </p>
        <AdminLoginForm nextPath={nextPath} />
        <Link className="admin-login-back" href="/">
          ← Return to public website
        </Link>
      </section>
    </main>
  );
}
