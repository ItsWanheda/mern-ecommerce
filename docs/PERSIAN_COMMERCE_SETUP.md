# Persian commerce configuration

This document explains how to run the Persian RTL storefront with search, catalog inventory, campaigns, shipping settings, and an optional Iranian payment provider.

## Currency must match the stored prices

The current catalog and the existing Stripe checkout default to **USD**. Do not change only the currency label in the UI: that would misrepresent existing prices and could change the amount charged.

Keep these values aligned:

| Setting | Purpose | Default |
| --- | --- | --- |
| Backend `STORE_CURRENCY` | Unit used for database prices, shipping rules, order totals | `USD` |
| Frontend `VITE_STORE_CURRENCY` | Matching price display in the Persian UI | `USD` |
| Backend `PAYMENT_PROVIDER` | `stripe` or `zarinpal` | `stripe` |

Price values are numeric amounts in the configured store currency. For the Iranian gateway, use **whole Toman amounts** in product prices and shipping settings; the Zarinpal request converts this amount to Rial for the gateway request. `IRT` is used as the application/order currency code for Toman. Do not treat existing USD values as Toman and do not apply an automatic exchange-rate conversion. Manually migrate/re-enter catalog prices before switching a real store to Toman.

## Stripe (existing/default flow)

Backend environment:

```dotenv
PAYMENT_PROVIDER=stripe
STORE_CURRENCY=USD
STRIPE_SECRET_KEY=sk_test_replace_with_your_key
CLIENT_URL=https://your-store.example
DEFAULT_SHIPPING_FEE=0
FREE_SHIPPING_THRESHOLD=0
```

Frontend environment:

```dotenv
VITE_STORE_CURRENCY=USD
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_replace_with_your_publishable_key
```

Use the publishable key from the same Stripe account as the backend secret key. The publishable key is intentionally a frontend environment variable; never put `STRIPE_SECRET_KEY` in the frontend.

## Zarinpal (Iran-based payment acceptance)

Use a real merchant account and confirm that the store's deployed API callback domain is registered/allowed for that merchant. Start with sandbox credentials and a test catalog; verify a full request → redirect → callback → server-side verification cycle before enabling production payments.

Backend environment:

```dotenv
PAYMENT_PROVIDER=zarinpal
STORE_CURRENCY=IRT
ZARINPAL_MERCHANT_ID=replace_with_your_merchant_id
ZARINPAL_SANDBOX=true
API_URL=https://your-api.example
CLIENT_URL=https://your-store.example
DEFAULT_SHIPPING_FEE=0
FREE_SHIPPING_THRESHOLD=0
```

Frontend environment:

```dotenv
VITE_STORE_CURRENCY=IRT
```

`API_URL` is the backend origin only (no `/api` suffix); the application appends the callback route. `CLIENT_URL` is the frontend origin only. Set `ZARINPAL_SANDBOX=false` only after successful sandbox tests and merchant onboarding. The implementation uses the Zarinpal v4 request/verification endpoints; use the current Zarinpal merchant documentation to validate credentials, allowed callback domain, API response codes, and payment settlement procedures for your account. See the current v4 sample for request/verify endpoint and success-code structure: https://github.com/ZarinPal-Lab/Zarinpal-RestAPI-Sample-php/blob/master/Request.php.

**Important:** the current catalog has historically used USD-style prices. Before setting `STORE_CURRENCY=IRT`, migrate all existing `Product.price` values to the correct whole-Toman retail price. Re-enter shipping rates and thresholds in Toman too. Do not multiply old USD values by an assumed exchange rate in production.

## Stock and fulfilment

- New products accept an integer stock count in the admin create form.
- Existing records have `stock: null` until stock is entered. This compatibility choice avoids treating every legacy product as sold out on deployment.
- Set an opening stock count for each sellable legacy product from **Admin → Products and inventory** before relying on stock validation.
- Cart updates, checkout creation, and final payment verification check tracked stock. Zarinpal reserves tracked stock while payment is pending; a production deployment should add a scheduled reconciliation process for abandoned pending payments and should monitor pending orders.
- Shipping settings are global: flat fee plus a free-shipping threshold. A threshold of zero disables the free-shipping rule. Region/district-specific shipping rates and courier integrations are not included yet.

## Campaigns

Admins can create active campaigns from **Admin → Campaigns**. Campaigns have a start/end time, optional image, order, and an internal path (for example `/shop` or `/category/jackets`). Public storefront results are limited to campaigns in their active date window.

## Product discovery

The public search endpoint is `GET /api/products/search`. Supported query parameters:

- `q`: search product name, description, or category
- `category`: category slug
- `minPrice`, `maxPrice`: inclusive range in the store currency
- `sort`: `newest`, `oldest`, `priceAsc`, `priceDesc`, `nameAsc`
- `page`, `limit`: pagination (limit capped at 48)

Newest products are available at `GET /api/products/newest?limit=8`.

## Before production

1. Confirm the backend and frontend currency settings match.
2. Re-enter catalog prices and shipping settings in the chosen units.
3. Use test merchant credentials and run successful, cancelled, expired, duplicate-callback, and stock-race payment scenarios.
4. Test callback reachability from the public internet and verify the Zarinpal merchant's registered domain.
5. Configure monitoring and a scheduled reconciliation/refund process for pending gateway transactions.
6. Run frontend `npm run lint` and `npm run build`, plus backend syntax checks and a deployed staging checkout. Remote file edits alone do not prove those checks passed.

## Existing MongoDB index migration before enabling Zarinpal

The previous Stripe-only order schema may have created a **non-sparse unique** `stripeSessionId` index. A non-sparse unique index can prevent multiple Zarinpal orders from being inserted because those orders do not have a Stripe session ID. Before enabling the new provider on an existing database:

1. Back up the database and inspect `db.orders.getIndexes()`.
2. During a maintenance window, replace any existing non-sparse `stripeSessionId_1` index with a sparse unique index. Only run the following after confirming the existing index name/options and after taking a backup:

```javascript
db.orders.dropIndex("stripeSessionId_1");
db.orders.createIndex({ stripeSessionId: 1 }, { unique: true, sparse: true });
db.orders.createIndex({ zarinpalAuthority: 1 }, { unique: true, sparse: true });
```

If the indexes already have the required options, do not drop them. Confirm the application starts cleanly and that repeated Zarinpal test orders can be created before enabling production traffic.

