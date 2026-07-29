# CSR & Donations deployment setup

The CSR module uses the existing Cloudflare D1 database and works on the
Cloudflare free plan. Apply the included migration before using the portal:

```bash
npx wrangler d1 migrations apply shoe-doctor-db --remote
```

## Images without object storage

Direct image uploads are intentionally disabled. In the CSR admin portal, use
either a public HTTPS image URL or a site-relative path to a file already in
`public/`, for example:

```text
https://example.org/donation-drive.jpg
/images/donations/donation-1.jpg
```

For a local project asset, place the file at
`public/images/donations/donation-1.jpg` and save it as
`/images/donations/donation-1.jpg`. Do not include `/public/` in the saved
path.

No paid media service, payment information, or additional storage binding is
required for the CSR module.
