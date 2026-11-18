# PostgreSQL / Prisma foundation

This directory defines the PostgreSQL data contract for the 13 persistence models currently present in `backend/models`.

## Important migration boundary

The application still uses Mongoose at runtime in this foundation commit. The Express readiness route, controllers, payment workflows, and scheduled reconciliation must remain on the existing adapter until their Prisma replacements and PostgreSQL integration tests are complete. Do not remove `mongoose`, `MONGO_URI`, or the current MongoDB CI service in this stage.

No MongoDB collection data is copied. The planned cutover creates a fresh PostgreSQL schema and then creates a new initial Admin account with the one-time bootstrap script below.

## Setup

1. Install the backend dependencies with `npm install --prefix backend` after checking the updated package manifest.
2. Copy `backend/.env.example` to `backend/.env` and set `DATABASE_URL` to a PostgreSQL database. Keep `REDIS_URL` and the existing Redis configuration unchanged.
3. Generate Prisma Client with `npm run db:generate --prefix backend`.
4. Validate the schema with `npm run db:validate --prefix backend`.
5. During development, review and apply migrations with `npm run db:migrate:dev --prefix backend`. Do not run this against production until the migration has been reviewed and backed up.

## Create the first Admin

Set `ALLOW_ADMIN_BOOTSTRAP=true`, `ADMIN_NAME`, `ADMIN_EMAIL`, and a strong `ADMIN_PASSWORD` only in the local process environment or a protected secret store. Run:

```bash
npm run db:admin:create --prefix backend
```

The script refuses to run unless explicitly enabled, refuses to create another Admin when one already exists, refuses to promote an existing customer by email, hashes the password with bcrypt, and never prints the password. Disable `ALLOW_ADMIN_BOOTSTRAP` immediately after successful creation. Two-factor authentication should then be enrolled through the normal account-security flow.

## Schema compatibility notes

- Nested, flexible Mongoose documents (addresses, cart snapshots, order line snapshots, product attributes/variants, event histories, and metadata) are represented as PostgreSQL `jsonb` through Prisma `Json` fields.
- Prices and payment amounts use `Decimal` with whole-Toman precision. The API layer must explicitly serialize Decimal values to the current numeric response contract during the controller migration.
- Prisma IDs currently use `cuid()`. Existing Mongo ObjectId validation helpers and any API `_id` aliases must be replaced/normalized as part of the controller migration before this schema is activated. Do not switch the live adapter while those validators remain.
- Search tokens and category ancestry are indexed with PostgreSQL GIN indexes.
- The 13 current model families are represented: User, AccountSession, SecurityNotification, AuditLog, Campaign, Category, Coupon, NewsletterSubscriber, Order, ProductReview, Product, ServiceCase, and StoreSettings.

## Cutover order

1. Port authentication and account security.
2. Port catalogue, inventory, coupons, cart validation, and reviews.
3. Port order creation, Zarinpal transitions, and reconciliation using serializable/atomic PostgreSQL transactions.
4. Port analytics, campaigns, support, audit, newsletter, and store settings.
5. Run API contract, PostgreSQL integration, payment idempotency, inventory concurrency, and Admin authorization tests.
6. Switch readiness/server startup to PostgreSQL, then remove Mongoose and MongoDB configuration/CI only after no runtime or script imports remain.
