# Persian commerce platform overview

The `feat/computer-hardware-store` branch is a Persian-first RTL ecommerce application with a Next.js storefront, Express API, PostgreSQL/Prisma persistence, Redis, Cloudinary media storage, and Zarinpal payments.

## Core behavior

- IRT/Toman is the only currency. Whole-Toman prices are checked by the backend and converted to Rial only when calling Zarinpal.
- Zarinpal is the only payment provider. Pending and uncertain states are reconciled server-side.
- PostgreSQL holds user accounts, sessions, products, categories, inventory, coupons, orders, payment metadata, reviews, campaigns, service cases, store settings, and audit logs.
- Redis remains in use for refresh-token storage, caching, and rate limiting.
- The initial PostgreSQL migration creates an empty schema. No MongoDB demo data, customer records, catalogue records, or historic orders are imported.
- A new Admin account is created through the guarded bootstrap script; an existing customer is never promoted by the migration.

## Setup

Follow [Persian commerce setup](PERSIAN_COMMERCE_SETUP.md) for environment variables, PostgreSQL migration deployment, one-time Admin bootstrap, payment readiness, inventory audit, and operations.

Required backend configuration includes `DATABASE_URL`, Redis connection settings, authentication secrets, Cloudinary credentials, Zarinpal credentials, exact CORS origins, `API_URL`, `CLIENT_URL`, and `CRON_SECRET`.
