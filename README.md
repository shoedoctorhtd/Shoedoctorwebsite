# Shoe Doctor — GitHub + Cloudflare

This repository contains the complete Shoe Doctor website, booking system and
owner dashboard. It runs as one Cloudflare Worker:

- public website: `/`
- services, about, blog and contact pages
- customer booking API
- private graphical owner dashboard: `/admin`
- Cloudflare D1 database for services and bookings

The owner dashboard does **not** use ChatGPT or OpenAI sign-in. It uses the
owner email and a password stored as encrypted Cloudflare runtime secrets.

## Requirements

- A GitHub account
- A free Cloudflare account
- Node.js 22 or newer only if you want to test or deploy from your computer

## 1. Upload to GitHub

Create a new empty GitHub repository named `shoe-doctor`, then upload every
file and folder from this project. Keep the default branch named `main`.

Do not upload `.env`, `.dev.vars`, `node_modules`, `dist` or `.wrangler`.

## 2. Create the Cloudflare D1 database

In Cloudflare:

1. Open **Workers & Pages → D1 SQL Database → Create database**.
2. Name it `shoe-doctor-db`.
3. Copy the database ID.
4. Open `wrangler.jsonc` in GitHub.
5. Replace `00000000-0000-4000-8000-000000000000` with the copied database ID.
6. Commit the change.

Create the database tables using either method:

### Dashboard method

Open the `shoe-doctor-db` database, choose **Console**, copy everything from
`migrations/0001_initial.sql`, paste it into the console and run it.

### Command-line method

```bash
npm install
npx wrangler login
npm run db:migrate
```

The website automatically inserts the initial Shoe Doctor service menu when the
database is first used.

> The new Cloudflare D1 database starts with the service menu but no historical
> bookings. Bookings stored in the previous ChatGPT-hosted database are not
> copied automatically.

## 3. Connect GitHub to Cloudflare Workers

1. Open **Workers & Pages** in Cloudflare.
2. Create a Worker named `shoe-doctor`.
3. Open that Worker and go to **Settings → Builds → Connect**.
4. Connect GitHub and select the `shoe-doctor` repository.
5. Use these build settings:

| Setting | Value |
|---|---|
| Production branch | `main` |
| Root directory | `/` |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |

Every later push to `main` will automatically rebuild and publish the website.

## 4. Configure the private owner login

Open the Worker in Cloudflare and go to:

**Settings → Variables and Secrets → Add**

Add both values as **Secret**, not plain-text variables:

| Secret name | Value |
|---|---|
| `ADMIN_PASSWORD` | A strong private password with at least 12 characters |
| `SESSION_SECRET` | A long random value |

Generate a safe session secret locally with:

```bash
npm run auth:secret
```

Copy the generated value into `SESSION_SECRET`. Do not put either secret in
GitHub. The owner email is configured as `shoedoctorhtd@gmail.com` in
`wrangler.jsonc`.

These legacy values are only a migration bridge for the existing shared login.
Do not create or share employee credentials with them. The role-aware system
uses individual D1-backed accounts and opaque server-side sessions.

### First named Super Admin rollout

Use this order for an existing production Worker. Do not deploy the new code
before the migration and named account exist, and do not sign out of the
existing owner session until the deployment step has completed.

1. Apply the additive migration while the existing Worker is still live:

   ```bash
   npx wrangler d1 migrations apply shoe-doctor-db --remote
   ```

2. On a trusted local machine, set `SUPER_ADMIN_PASSWORD` only for the current
   shell and run the one-time local bootstrap. It prompts for the name and
   email; it never creates a public bootstrap route or writes the password to
   disk:

   ```bash
   npm run admin:bootstrap -- --remote
   ```

   The script refuses to run when a named account already exists. It creates
   the first `super_admin` and atomically disables the old shared-login
   fallback.

3. Deploy the role-aware Worker immediately after bootstrap:

   ```bash
   npx wrangler deploy
   ```

4. Open a fresh private-browser session and verify that the named account can
   sign in at `/admin`. The first named login also claims the bootstrap owner
   alert. Do not use the old shared login after bootstrap.

After bootstrap, `ADMIN_PASSWORD` no longer grants application access. Keep
the old secret only until the rollout is verified, then remove it from the
Worker. Retain `SESSION_SECRET` until every legacy cookie has expired; it is no
longer used for named sessions.

The named admin login is then available at:

```text
https://YOUR-WORKER.workers.dev/admin
```

## 5. Receive each booking by email

The Worker is configured to send every new booking to
`shoedoctorhtd@gmail.com` through Cloudflare Email Service. This does not
require your Gmail password or an access token.

Before deployment, set it up in Cloudflare:

1. Go to **Compute â†’ Email Service â†’ Email Routing â†’ Destination
   Addresses**.
2. Add `shoedoctorhtd@gmail.com`, then open the verification email in Gmail and
   verify it.
3. Onboard the domain that will send booking emails in **Compute â†’ Email
   Service**, and let Cloudflare add the required DNS records.
4. In `wrangler.jsonc`, replace `bookings@YOUR-DOMAIN` with an address on that
   onboarded domain, such as `bookings@shoedoctor.com`.

The email binding is restricted to the verified Gmail recipient, so booking
details cannot be sent to another address by this Worker.

## 6. Send each booking to WhatsApp

Every booking is always saved to the admin dashboard first. To receive the
same booking details on WhatsApp, connect a WhatsApp Business Platform (Cloud
API) sender in Meta Business Suite, then create and get approval for a utility
template named `new_booking_alert` with this body:

```text
New Shoe Doctor booking
Reference: {{1}}
Customer: {{2}}
Phone: {{3}}
Service: {{4}}
Footwear: {{5}}
Brand: {{6}}
Preferred date: {{7}}
Collection: {{8}}
Address: {{9}}
Map: {{10}}
Express: {{11}}
Notes: {{12}}
```

In the Workerâ€™s **Settings â†’ Variables and Secrets**, add these values:

| Name | Type | Value |
|---|---|---|
| `WHATSAPP_ACCESS_TOKEN` | Secret | A permanent Meta system-user access token with WhatsApp messaging permission |
| `WHATSAPP_PHONE_NUMBER_ID` | Variable | The Phone Number ID of the WhatsApp Business sender |

The included configuration sends alerts to `+977 9761716743`, uses the
`new_booking_alert` template, and uses `en_US`. Change the non-secret
`WHATSAPP_BOOKING_RECIPIENT`, `WHATSAPP_TEMPLATE_NAME`,
`WHATSAPP_TEMPLATE_LANGUAGE`, or `WHATSAPP_API_VERSION` variables in
Cloudflare if your approved template or language differs. Never put the access
token in GitHub.

## 7. Connect your domain

The domain must be active in the same Cloudflare account.

1. Open the `shoe-doctor` Worker.
2. Go to **Settings → Domains & Routes → Add → Custom Domain**.
3. Enter the domain or subdomain you want to use.

Cloudflare creates the DNS record and SSL certificate. The public website,
booking system and `/admin` dashboard will all run on that one domain.

## Local development

Copy `.dev.vars.example` to `.dev.vars`, then replace the example values:

```text
ADMIN_EMAIL=shoedoctorhtd@gmail.com
ADMIN_PASSWORD=your-local-test-password
SESSION_SECRET=replace-with-a-random-value-at-least-32-characters
```

Then run:

```bash
npm install
npm run dev
```

Apply the D1 migration to the local database when needed:

```bash
npx wrangler d1 migrations apply shoe-doctor-db --local
```

## Product image storage

Product images use the existing D1 database only; no R2 bucket or additional
storage subscription is required. Administrators can upload up to three JPEG,
PNG, or WebP images per product. The browser resizes and compresses uploads to
500 KB or less, and the Worker repeats signature, dimensions, size, count, and
50 MB application-cap checks before storing a BLOB. The Admin Products page
shows current image count and approximate application-cap usage.

Payment receipts are different: they are validated in Worker memory and sent
as Gmail attachments to `shoedoctorhtd@gmail.com`. The website stores receipt
metadata only, never the receipt binary.

## Useful commands

```bash
npm run lint
npm run build
npm run deploy
npm run db:migrate
npm run auth:secret
```

## Security notes

- The password and session secret are never committed to GitHub.
- Named administrator passwords use a per-account Workers Web Crypto PBKDF2
  hash. Raw passwords, hashes, session tokens, OAuth credentials, and cookies
  are excluded from audit logs.
- Named login uses an HTTP-only, secure, same-site opaque cookie backed by a
  D1 session that is checked, expires, and can be revoked server-side.
- Every admin mutation checks same-origin request metadata and the verified
  server-side role. Do not trust browser-supplied actor identity or role.
- `super_admin` is the only role allowed to manage accounts, change global
  services/pricing, export CSR data, view audit/deleted data, alter protected
  booking details, or soft-delete/restore a booking. `admin` can run active
  booking operations, status changes, pair work, counter bookings, and
  append-only operational notes.
- Apply D1 migrations before deployment; the application never performs the
  new security schema migration at request time.
