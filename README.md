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

After saving the secrets, redeploy the latest Worker version. The admin login is
then available at:

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
- The login cookie is HTTP-only, secure and limited to the same site.
- Admin API routes verify the signed session on the server.
- Use a unique password that you do not reuse elsewhere.
