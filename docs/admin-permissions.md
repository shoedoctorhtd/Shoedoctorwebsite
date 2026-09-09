# Admin access permissions

Super Admin → Admin Management → **Manage Access** opens the existing account's permissions. The same grouped fields appear when creating an Admin. **Select All**, **Clear All**, and **Save Permissions** operate on the shared permission catalogue. Super Admins always inherit every permission; no grant row can restrict them.

## Existing modules and keys

| Screen / feature | Permission keys |
| --- | --- |
| Dashboard `/admin` | `dashboard`; only assigned module data appears |
| Bookings `/admin/bookings`, booking detail | `bookings` |
| Counter booking `/admin/bookings/new` | `counter_booking` |
| Counter Product Inventory and sale history/detail | `counter_inventory` |
| Recording counter sales | `counter_inventory` + `record_offline_sales` |
| Reversing a counter sale | `counter_inventory` + `cancel_product_orders` |
| Products `/admin/products` | `view_products`; existing actions retain `manage_products`, `change_product_prices`, `manage_product_images` |
| Inventory `/admin/inventory` | `view_inventory`; stock writes retain `adjust_inventory` |
| Product orders | `view_product_orders`; actions retain `manage_product_orders`, `cancel_product_orders`, `verify_product_payments`, `record_offline_sales` |
| Services `/admin/services` | `services` |
| CSR / Donations, drives, stories, website updates, impact statistics | `donations` |
| Full administrator activity | `audit_logs` |
| Notification retries | `notifications` plus access to the originating Bookings, Donations or Activity screen |
| Admin Management | `admin_management` allows viewing accounts; all account/access/role mutations remain Super Admin-only |

Bookings and Services reuse the original dashboard component through separate guarded entry points. `/admin/product-access` redirects to Admin Management. Customer details remain part of their existing bookings, orders and donation records. There are no new standalone Customers, Reports or Website Content systems.

Assign both a product module's view permission and the actions that person needs. Selecting an action selects its required module; clearing a module clears dependent actions unless another assigned module can use them. Backend checks enforce these dependencies even if a manually submitted grant list contains an action alone. The original fine-grained product action keys are retained, including read-only combinations. Booking deletion/restoration, protected booking-detail/service reassignment, and permanent product deletion remain Super Admin-only.

An Admin without Dashboard access lands on their first permitted screen. An Admin with no module access can still sign out and change their password, and sees Access Denied. Restricted links, dashboard data and action controls are omitted. Server pages redirect to Access Denied before loading restricted records; protected API handlers return 403.

## Storage, audit and refresh

`0018_granular_admin_permissions.sql` extends the product grants into `admin_permissions`, keyed by `(admin_user_id, permission_key)`, with grantor and timestamps. It preserves accounts, passwords, sessions and existing product grants, adding prerequisite view grants for any legacy product action that lacked its module. Existing normal Admins receive explicit one-time grants for the operations they already had: Dashboard, Bookings, Counter Booking, Counter Inventory and recording counter sales. New accounts start with only the permissions selected by their creator.

The old `admin_product_permissions` name becomes a read-only compatibility view of the same rows. The former product-permission API delegates to the unified writer and requires `updatedAt`; stale clients must reopen Manage Access. There is one permission store and one editor.

Permission saves check the target account revision, revalidate the acting Super Admin session in the mutation, and batch the account revision, grant additions/removals, immutable audit row and existing owner-email outbox event atomically. Concurrent changes return 409 without partial grants or a success audit. Unchanged saves create no duplicate audit/mail. Existing grants keep their original grantor/time. Creation audits include initial permissions.

Permission-change audits include the target name/email/id, added and removed permission labels, acting Super Admin and session, and timestamp. **Admin Access Updated** notifications reuse the current owner email transport and durable retry queue. Email failure cannot roll back saved access. This audit schema records session/request IDs; it does not introduce a new raw IP store.

Every authenticated request reads current grants from D1. No cookie or browser-supplied permission list is authoritative. Existing sessions receive additions/removals on the next request. Reloading or returning focus to the browser refreshes navigation; permission changes remount the shared dashboard to discard stale module state.

## Rollout and validation

Apply migrations before deploying the new Worker. Once production rollout is authorized, use the existing D1 migration command:

```powershell
npm.cmd exec -- wrangler d1 migrations apply shoe-doctor-db --remote
```

Until the Worker update is active, old permission readers continue to work through the compatibility view. Use the new Admin Management editor after deployment; old product-permission writes are intentionally not supported during that short transition. Local validation does not run remote migrations, deploy a Worker or send live email.

The repository documents automatic deployment on pushes to `main`. If new code deploys before migration 0018, existing accounts retain their pre-migration operations and verified product grants. This fallback requires the original physical `admin_product_permissions` table; it is unavailable after migration replaces that table with a view. Account creation and permission saves are blocked with an explicit migration message until 0018 exists. Once migrated, absent or unreadable permission storage fails closed and cannot restore previous access.

Local checks:

```powershell
npm.cmd test
npm.cmd exec -- wrangler d1 migrations apply shoe-doctor-db --local --persist-to .wrangler/permissions-validation
```

The regression suite exercises real SQLite migrations and production auth/permission handlers with only framework/database transport/email replaced. It covers all protected API handlers with a no-access session, required account combinations, direct page denial, unrestricted Super Admin, stock writes and revocation, account creation, immutable audit/outbox persistence, stale/racing updates, email failure and same-session refresh. Existing booking, payment, inventory and counter-sale regression suites remain enabled.

Browser discovery exposed no browser in this environment, so desktop/mobile visual interaction and live email delivery still require rollout acceptance checks. Standalone TypeScript checking with generated Worker types reports existing CSR request-body, product-validation and Worker image-binding diagnostics; the new permission code passes the build and scoped lint.
