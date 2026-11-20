# Persian commerce deployment and operations

This guide describes the PostgreSQL/Prisma runtime in the `feat/computer-hardware-store` branch. The branch creates a fresh PostgreSQL database and deliberately does not import MongoDB demo data, customers, catalogue records, or historical orders.

## Local prerequisites

- Node.js 22 and npm.
- PostgreSQL 16 or newer.
- Redis (refresh tokens, cache, and distributed rate limiting remain Redis-backed).
- Cloudinary credentials for product/category/campaign images.
- Zarinpal sandbox credentials for payment testing.

## Configure the backend

Copy `backend/.env.example` to `backend/.env`. Set at least:

```dotenv
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/mern_ecommerce?schema=public
REDIS_URL=redis://127.0.0.1:6379
ACCESS_TOKEN_SECRET=replace_with_a_long_random_secret
REFRESH_TOKEN_SECRET=replace_with_a_different_long_random_secret
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
ZARINPAL_MERCHANT_ID=your_sandbox_merchant_id
ZARINPAL_SANDBOX=true
IRT_CATALOG_PRICES_CONFIRMED=false
API_URL=http://localhost:5000
CLIENT_URL=http://localhost:3000
CRON_SECRET=replace_with_a_long_random_secret
```

The frontend uses its own `frontend/.env.local`; use `NEXT_PUBLIC_API_URL` only when the API is hosted on a separate origin. Never expose `DATABASE_URL`, Redis credentials, JWT secrets, Cloudinary secrets, Zarinpal credentials, or `CRON_SECRET` through a `NEXT_PUBLIC_*` variable.

## Initialize PostgreSQL

Use a new, empty database. The current migration is a schema creation migration, not a copy of legacy MongoDB collections.

```bash
npm install --prefix backend
npm run db:validate --prefix backend
npm run db:generate --prefix backend
npm run db:migrate:deploy --prefix backend
```

The migration creates all 13 persistence model families and relational constraints. IDs remain 24-character hexadecimal strings so existing API contracts and route validation continue to work.

## Create the first Admin

A new Admin must be created directly in PostgreSQL. Do not promote an existing customer. Set the following environment variables temporarily:

```dotenv
ALLOW_ADMIN_BOOTSTRAP=true
ADMIN_NAME=Store Administrator
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=use_a_unique_strong_password
```

Then run:

```bash
npm run db:admin:create --prefix backend
```

The bootstrap is one-time and guarded: it refuses to proceed when an Admin already exists, and refuses to change the role of an account that already uses the requested email. Set `ALLOW_ADMIN_BOOTSTRAP=false` and remove the temporary credentials after success.

## Application startup and readiness

Start the API and storefront separately:

```bash
npm run dev --prefix backend
npm run dev:frontend
```

`GET /api/health` confirms that the API process responds. `GET /api/ready` actively checks PostgreSQL and Redis and returns HTTP 503 when a required dependency is unavailable. PostgreSQL connection strings must remain private and the database should accept connections only from the API and approved administration hosts.

## Currency and payment readiness

- `IRT` / Toman is the only application currency.
- Zarinpal is the only payment provider.
- Catalog, shipping, coupon, and order amounts are whole-Toman values; conversion to Rial occurs only at the Zarinpal API boundary.
- Keep `ZARINPAL_SANDBOX=true` while testing request, redirect, callback verification, timeout, rejected payment, duplicate callback, and reconciliation paths.
- Keep `IRT_CATALOG_PRICES_CONFIRMED=false` until an authorized operator reviews every sellable product price and shipping setting. Enable it only after that review.
- Do not fabricate historical orders or silently convert old amounts. Historical financial data is outside this fresh-database cutover.

## Inventory and operational audit

Unknown product/variant stock is not unlimited stock. Checkout requires explicit non-negative integer inventory. Once the schema has been migrated, the read-only PostgreSQL inventory audit can be run with:

```bash
npm run audit:inventory --prefix backend
```

The report does not mutate stock. An authorized operator must review each finding against actual stock and set an explicit quantity.

## Payment reconciliation

The scheduled endpoint is `GET /api/payments/reconcile-pending` and requires `Authorization: Bearer <CRON_SECRET>`. Run it approximately every five minutes using one scheduler only. The repository includes `.github/workflows/reconcile-payments.yml`; configure `PAYMENTS_API_URL` and `CRON_SECRET` in repository Actions secrets. Self-hosted installations can schedule `backend/scripts/reconcile-pending-payments.mjs`.

## Tests

Run unit tests with:

```bash
npm test --prefix backend
```

PostgreSQL integration tests run only when `RUN_POSTGRES_INTEGRATION_TESTS=true` and `DATABASE_URL` points to a dedicated disposable database. The tests exercise stock reservation/rollback and coupon capacity. Never target a production database. GitHub Actions provisions PostgreSQL 16 and applies the checked-in Prisma migration before the integration suite.

## Production checklist

- Apply Prisma migrations using `npm run db:migrate:deploy --prefix backend`.
- Keep PostgreSQL and Redis private; use TLS where traffic leaves a trusted private network.
- Configure connection capacity for the total number of API instances, not just one process.
- Configure regular PostgreSQL backups and test restores.
- Store all secrets in the hosting provider's secret manager.
- Configure exact `CLIENT_URL` and `CORS_ALLOWED_ORIGINS` values and serve the storefront/API over HTTPS.
- Validate all Zarinpal sandbox paths before enabling live credentials.
- Enable `IRT_CATALOG_PRICES_CONFIRMED=true` only after the real catalogue has been reviewed in Toman.
- Monitor API errors, PostgreSQL capacity/latency, Redis availability, payment reconciliation failures, and backup status.
