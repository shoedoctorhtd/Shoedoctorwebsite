# Shoe Doctor SEO changes

Validated locally on 2026-09-16. This report covers the scoped SEO delivery; production deployment is a separate step.

## Improvements

- Homepage title: **Shoe Doctor Hetauda | Shoe Cleaning & Repair in Nepal**. Its existing hero headline remains the single H1; the supporting sentence now explicitly names shoe cleaning, repair, restoration, Hetauda and Nepal.
- Important public pages have distinct titles and descriptions, self-referencing HTTPS www canonicals, Open Graph tags and Twitter cards. Product metadata continues to respect the existing admin-managed SEO fields and product images. The existing logo is the social-image fallback.
- Homepage JSON-LD now contains one LocalBusiness identity and a linked WebSite. LocalBusiness also represents the organization, avoiding a second conflicting business entity. This follows [Google's LocalBusiness guidance](https://developers.google.com/search/docs/appearance/structured-data/local-business).
- Business address: **Opposite the main gate of Huprachaur, Hetauda-4, Makwanpur, Nepal**. Hours: **Sunday–Friday 08:00–19:00; Saturday 14:00–19:00**. Both the contact page and schema use the owner's confirmed information.
- Published product schema uses database names, descriptions, images, SKUs, NPR prices and stock. Zero stock is OutOfStock; unknown stock does not assert InStock. Draft, archived and absent/deleted records produce no Product schema.
- The four existing journal guides share their original content and product recommendations with new individual routes. Each has unique metadata, a canonical, article social tags and BlogPosting JSON-LD. Existing journal headings now link to the guides; relevant service/product links use existing text.
- Sitemap includes static public pages, published products, published guides and existing published donation content. It excludes internal, transaction, draft and archived URLs, deduplicates entries, and uses persisted modification dates only.
- Robots allows normal crawling and public product-image APIs while restricting internal routes. Admin pages inherit noindex/nofollow; internal HTML and redirects also receive an X-Robots-Tag header.
- The Worker upgrades the two production hostnames to HTTPS www, preserving paths and queries. Local development and preview hosts retain their existing behavior. No Cloudflare configuration change or database migration was made.
- The brand image has meaningful alt text. Existing lazy loading, styling, animations, booking flow and product/admin behavior are preserved.

## Verification

| Check | Result |
| --- | --- |
| Production build | Passed through `npm.cmd test` |
| Existing regression suite plus SEO tests | 129 passed; 0 failed |
| Targeted ESLint | Passed, no errors or warnings |
| `git diff --check` | Passed |
| Initial HTML metadata and H1 checks | Passed for 12 public static pages, four guide routes and representative product pages |
| Public titles, descriptions and canonicals | Unique across tested public pages; one canonical per page; no public noindex |
| LocalBusiness and WebSite | JSON parsed from homepage response; one business identity with confirmed address and hours |
| Product schema | Rendered against an in-memory SQLite database using the real product migrations; published, sold-out, draft, archived and missing records checked |
| BlogPosting | Parsed from all four article responses; missing articles return 404 without article schema |
| Sitemap | Correct XML declaration/namespace, complete HTTPS www URLs, no empty or duplicate locations; published database products and guides included |
| Robots and internal noindex | Public product images remain crawlable; admin, cart, checkout, confirmation and payment pages/redirects checked |
| Host redirects | Local Worker test passes for HTTP/non-www; preserves paths and queries without redirecting preview hosts |
| Full `tsc --noEmit` | Does not pass: 148 existing diagnostics, primarily missing Cloudflare runtime types and resulting untyped D1 calls, plus existing nullability errors. No diagnostics in the new SEO/blog modules or public page code |

The development server's Miniflare runtime failed to start in this environment. Verification used the built Worker response and SQLite-backed integration tests; browser screenshots, interactive browser flows, real customer transactions and Google's live Rich Results Test were not run.

On 2026-09-15, a read-only live check confirmed that HTTPS non-www redirects to www with the path and query intact. HTTP www returned 200 without an HTTPS upgrade; the new Worker redirect addresses that after deployment. New metadata and schema have only been verified locally.

The legacy Sites manifest resolves to a public `chatgpt.site` project with no custom domains attached. It is not a verified deployment target for `www.shoedoctor.com.np`; the requested production hostname was not changed.

## Missing real information

- Original publication and later revision dates for the four existing guides. TODOs are in `lib/blog-data.ts`; unknown dates are omitted from metadata, schema and sitemap, rather than replaced with build dates. Dates are recommended properties, and may be omitted when unavailable under [Google's Article guidance](https://developers.google.com/search/docs/appearance/structured-data/article).
- Official social-profile URLs once the owner creates them. `sameAs` is intentionally absent, with a TODO in `lib/seo.ts`.
- Postal code, if confirmed later. It is optional and omitted. No ratings, reviews, geographic coordinates or fixed business price range were invented.

## Article routes

- `/blog/everyday-shoe-cleaning`
- `/blog/shoe-travel-and-storage`
- `/blog/suede-shoe-care`
- `/blog/at-home-sneaker-cleaning`

## Files changed for this task

Shared SEO and data:

- `lib/seo.ts` (new)
- `lib/blog-data.ts` (new)
- `lib/product-data.ts` (adds the publication-filtered sitemap query)
- `app/layout.tsx`
- `app/sitemap.ts`
- `app/robots.ts`
- `app/admin/layout.tsx`
- `worker/index.ts`

Public pages:

- `app/page.tsx`
- `app/about/page.tsx`
- `app/services/page.tsx`
- `app/steam-cleaning/page.tsx`
- `app/products/page.tsx`
- `app/products/[slug]/page.tsx`
- `app/blog/page.tsx`
- `app/blog/[slug]/page.tsx` (new)
- `app/contact/page.tsx`
- `app/shoe-donation/page.tsx`
- `app/shoe-donation/updates/[slug]/page.tsx`
- `app/shoe-donation/restorations/[slug]/page.tsx`
- `app/privacy-policy/page.tsx`
- `app/shipping-delivery/page.tsx`
- `app/returns-refunds/page.tsx`
- `app/terms/page.tsx`

Components, checks and documentation:

- `app/components/StructuredData.tsx` (new)
- `app/components/ProductStructuredData.tsx`
- `app/components/BlogGuideContent.tsx` (new; extracted existing journal content)
- `app/components/SiteChrome.tsx` (logo alt only)
- `tests/seo.test.mjs` (new)
- `tests/products.test.mjs` (existing assertions updated for moved SEO helpers)
- `package.json` (adds SEO tests to the existing test command)
- `docs/seo-validation.md` (this report)

The checkout already contained unrelated modifications. Those edits, including existing changes within `lib/product-data.ts`, `tests/products.test.mjs` and `package.json`, were preserved. This task did not edit stylesheets or add dependencies.
