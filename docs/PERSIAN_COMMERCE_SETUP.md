# Persian commerce configuration

This guide configures the Persian RTL storefront for **Toman (IRT)** pricing and Zarinpal checkout. Stripe remains available only as an explicitly configured USD option.

## Currency model

The application uses these currency codes:

| Code | Meaning in the storefront | Intended payment flow |
| --- | --- | --- |
| IRT | Whole Toman amounts; shown to shoppers as تومان | Zarinpal |
| IRR | Whole Rial amounts; shown as ریال | Display/storage compatibility; not the configured Zarinpal checkout currency |
| USD | US dollars | Stripe |

New code defaults to STORE_CURRENCY=IRT, VITE_STORE_CURRENCY=IRT, and PAYMENT_PROVIDER=zarinpal. Explicit environment variables still override code defaults, including on Vercel. Set the backend and frontend currency to the same value.

**Important:** product prices and shipping amounts are numeric values; product documents do not carry an individual currency field. Changing the currency setting does not convert any stored value. Do not display an old USD amount as Toman or apply an assumed exchange rate.

## Required migration before switching a live catalogue

Do this before enabling IRT in the production environment:

1. Take a verified backup of MongoDB and retain a rollback plan.
2. Prepare the real retail price in whole Toman for every sellable product. Update each Product.price from an approved price list—do not automatically multiply the current amount by an exchange rate.
3. Review existing StoreSettings.flatRate and StoreSettings.freeShippingThreshold values. Set both to the correct whole-Toman amounts in **Admin → Shipping settings** after switching the backend currency.
4. Clear/rebuild persisted guest carts and ask signed-in customers to refresh their carts after prices are migrated. Client-side cart data can otherwise show stale price snapshots; checkout still revalidates prices and inventory from the database.
5. Configure sandbox payment credentials, deploy both apps from the same branch, and run end-to-end checkout tests before enabling live payments.
6. Keep IRT_CATALOG_PRICES_CONFIRMED=false until the catalogue and shipping values have been reviewed and updated to real whole-Toman amounts. Only then set it to true in the backend Production environment. The backend will refuse to initialize/accept Zarinpal checkout while this confirmation is missing.

Historical order currency values are preserved; do not rewrite old USD orders as IRT. Admin sales analytics only sums paid orders recorded in the currently configured currency, so older orders with USD or missing currency records are not mixed into Toman revenue totals.

## Production environment

### Backend (Vercel API project)

~~~dotenv
STORE_CURRENCY=IRT
PAYMENT_PROVIDER=zarinpal
ZARINPAL_MERCHANT_ID=replace_with_your_merchant_id
ZARINPAL_SANDBOX=true
IRT_CATALOG_PRICES_CONFIRMED=false
API_URL=https://your-api.example
CLIENT_URL=https://your-store.example
DEFAULT_SHIPPING_FEE=0
FREE_SHIPPING_THRESHOLD=0
~~~

Keep the existing required database, authentication, and upload environment variables. API_URL is the backend origin only (no /api suffix); the application adds /api/payments/zarinpal/verify to form the callback URL. CLIENT_URL is the frontend origin only.

For the local frontend, set VITE_API_URL to the API base URL including /api if you are not using the development proxy.

The backend reconciliation job uses a separate `CRON_SECRET` environment variable. Generate a long random value (at least 32 characters), configure it only in the backend project, and keep it private. The endpoint returns HTTP 503 until this secret is configured. Never expose it through a `VITE_` variable.

### Frontend (Vercel client project)

~~~dotenv
VITE_STORE_CURRENCY=IRT
VITE_API_URL=https://your-api.example/api
~~~

Zarinpal does not require VITE_STRIPE_PUBLISHABLE_KEY. Never expose STRIPE_SECRET_KEY, database credentials, or ZARINPAL_MERCHANT_ID as frontend variables.

**Vercel note:** changing source defaults does not override variables already defined in Vercel. Update STORE_CURRENCY, PAYMENT_PROVIDER, and VITE_STORE_CURRENCY in the appropriate backend/frontend Production environment scopes, then redeploy both projects. Keep the currencies aligned or checkout intentionally remains disabled.

Keep ZARINPAL_SANDBOX=true while validating the integration. Keep IRT_CATALOG_PRICES_CONFIRMED=false until after price migration; this independent safety gate prevents checkout from charging unconverted USD-number prices as Toman. Set it to false only after merchant onboarding, callback/domain verification, and successful end-to-end sandbox tests. Check current Zarinpal merchant documentation for your account's callback allowlist, request/verification response codes, and settlement procedures. The implementation uses the Zarinpal v4 request/verify endpoints; a reference sample is available at https://github.com/ZarinPal-Lab/Zarinpal-RestAPI-Sample-php/blob/master/Request.php.

## Optional legacy Stripe configuration (USD only)

Stripe checkout is still supported when deliberately configured. Stripe must use USD; it must not be used to charge Toman amounts.

Backend:

~~~dotenv
PAYMENT_PROVIDER=stripe
STORE_CURRENCY=USD
STRIPE_SECRET_KEY=sk_test_replace_with_your_key
CLIENT_URL=https://your-store.example
DEFAULT_SHIPPING_FEE=0
FREE_SHIPPING_THRESHOLD=0
~~~

Frontend:

~~~dotenv
VITE_STORE_CURRENCY=USD
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_replace_with_your_publishable_key
~~~

Use keys from the same Stripe account. The publishable key belongs on the frontend; never put STRIPE_SECRET_KEY there. Do not combine PAYMENT_PROVIDER=stripe with STORE_CURRENCY=IRT; the server rejects that configuration.

## Price and shipping validation

- New IRT/IRR product prices must be non-negative whole numbers. New Toman prices are validated on the server as well as using integer-step inputs in the admin form.
- IRT/IRR shipping fee and free-shipping threshold values must be whole numbers. A zero free-shipping threshold disables free shipping.
- Zarinpal checkout requires STORE_CURRENCY=IRT and whole-Toman product prices; the gateway request converts Toman to Rial by multiplying the payable total by 10.
- Existing catalogue price and saved shipping values are not automatically converted. Review them before accepting orders.
- Existing products with stock=null are treated as having untracked stock. Enter opening stock for sellable products from **Admin → Products and inventory** before relying on stock validation.
- Zarinpal reserves tracked inventory while a payment is pending. The backend includes a protected reconciliation endpoint that verifies expired payments before releasing inventory and retries incomplete cleanup. Configure `CRON_SECRET` in the backend Production environment and monitor scheduled job logs. The bundled Vercel Hobby schedule is daily; for production recovery every 5 minutes, use Vercel Pro or a trusted external scheduler to call `GET /api/payments/reconcile-pending` with `Authorization: Bearer <CRON_SECRET>`. Gateway timeouts and unrecognized verification errors remain pending for retry rather than being treated as failed payments.

## Orders and MongoDB indexes

The order schema supports both historical USD/Stripe orders and IRT/Zarinpal orders. New orders use the configured provider/currency, while existing records keep their recorded values.

The previous Stripe-only schema may have created a non-sparse unique stripeSessionId index. That can prevent multiple Zarinpal orders from being inserted because they do not have a Stripe session ID. Before enabling Zarinpal on an existing database:

1. Back up the database and inspect db.orders.getIndexes().
2. Only if you confirm stripeSessionId_1 exists as a non-sparse unique index, replace it during a maintenance window. Do not run the commands blindly.

~~~javascript
db.orders.dropIndex("stripeSessionId_1");
db.orders.createIndex({ stripeSessionId: 1 }, { unique: true, sparse: true });
db.orders.createIndex({ zarinpalAuthority: 1 }, { unique: true, sparse: true });
~~~

If the indexes already have the required options, do not drop them. Verify repeated test order creation before enabling production traffic.

## Product discovery

The public search endpoint is GET /api/products/search. Supported query parameters:

- q: search product name, description, or category
- category: category slug
- minPrice, maxPrice: inclusive range in the configured store currency
- sort: newest, oldest, priceAsc, priceDesc, nameAsc
- page, limit: pagination (limit capped at 48)

Newest products are available at GET /api/products/newest?limit=8.

## Final pre-production checklist

1. Confirm backend STORE_CURRENCY=IRT, backend PAYMENT_PROVIDER=zarinpal, and frontend VITE_STORE_CURRENCY=IRT in Vercel. Keep IRT_CATALOG_PRICES_CONFIRMED=false until prices/shipping are migrated; set it to true only after review and backup.
2. Back up the database and verify every live product price and saved shipping setting has the correct whole-Toman amount.
3. Test the payment request, redirect, successful callback, cancelled payment, failed/expired request, duplicate callback, and stock-race cases using sandbox credentials.
4. Verify the public callback is reachable and allowed for the Zarinpal merchant.
5. Verify legacy order indexes and confirm existing Stripe order history is preserved.
6. Run frontend npm run lint and npm run build, backend syntax checks, and a deployed staging checkout. Editing remote files is not evidence that these checks passed.
