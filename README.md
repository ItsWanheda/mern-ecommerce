# Persian Commerce Store

A full-stack e-commerce storefront focused on Iranian customers, Persian RTL presentation, whole-Toman prices, and Zarinpal checkout.

## Features

- Persian-first, right-to-left storefront and product discovery
- Toman (IRT) price display and whole-Toman product/shipping validation
- Zarinpal sandbox/live checkout and server-side payment verification
- Inventory reservation, idempotent order finalization, and recovery of unresolved payments
- Redis-backed rate limiting with a bounded best-effort fallback
- MongoDB product catalogue, cart, coupons, campaigns, shipping settings, and admin analytics
- Configurable Cloudinary product media

## Stack

React, Vite, Tailwind CSS, Node.js, Express, MongoDB/Mongoose, Redis, and Zarinpal.

## Configuration

Configure the backend environment before running the application:

```dotenv
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/mern-ecommerce
REDIS_URL=redis://127.0.0.1:6379
ACCESS_TOKEN_SECRET=replace_with_a_long_random_secret
REFRESH_TOKEN_SECRET=replace_with_a_different_long_random_secret
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
ZARINPAL_MERCHANT_ID=your_merchant_id
ZARINPAL_SANDBOX=true
IRT_CATALOG_PRICES_CONFIRMED=false
API_URL=https://your-public-api.example
CLIENT_URL=https://your-store.example
DEFAULT_SHIPPING_FEE=0
FREE_SHIPPING_THRESHOLD=0
CRON_SECRET=replace_with_a_long_random_secret
```

The frontend can use a public API base URL through `VITE_API_URL`; use `http://localhost:5000/api` for a local API or your production API URL. The storefront currency is fixed to IRT (Toman), so no currency-switching environment variable is needed.

**Do not enable checkout** until the catalogue and shipping settings contain verified whole-Toman amounts. Keep `IRT_CATALOG_PRICES_CONFIRMED=false` until that migration is reviewed. For a payment-provider callback to work, `API_URL` must resolve to the publicly reachable backend origin.

See [Persian commerce setup](docs/PERSIAN_COMMERCE_SETUP.md) for deployment, database migration, and scheduled payment recovery.

## Local development

Install and build from the repository root:

```bash
npm install
npm install --prefix frontend
npm run build
```

Start the backend with `npm run dev`. Start the frontend in a separate terminal with `npm run dev --prefix frontend`.

## Production guidance

Back up the database before deployment, run the migration checklist, verify sandbox checkout end to end, and configure a scheduler to call the payment reconciliation endpoint. Source-level syntax checks alone do not establish production readiness.
