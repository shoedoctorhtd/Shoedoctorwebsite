# CSR & Donations deployment setup

The CSR module uses the existing Cloudflare D1 database. Apply the included
`0002_csr_donations.sql` migration before using the new portal:

```bash
npx wrangler d1 migrations apply shoe-doctor-db --remote
```

## Secure image uploads

CSR images are stored in a private Cloudflare R2 bucket. The application never
exposes R2 object keys: draft previews require the admin session, and public
images are served only when an attached drive, story, or community update is
published.

`wrangler.jsonc` already declares a private `CSR_MEDIA` binding to a bucket
named `shoe-doctor-csr-media`. Create that exact bucket before deploying:

```bash
npx wrangler r2 bucket create shoe-doctor-csr-media
```

If you prefer another bucket name, update the existing top-level binding in
`wrangler.jsonc` before deployment:

```jsonc
"r2_buckets": [
  {
    "binding": "CSR_MEDIA",
    "bucket_name": "shoe-doctor-csr-media"
  }
],
```

Redeploy the Worker. Until the binding exists, the admin gives a clear upload
configuration error while all text-only CSR content and donation requests
continue to work.
