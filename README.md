<h1 align="center">E-Commerce Store 🛒</h1>

![Demo App](/frontend/public/screenshot-for-readme.png)

[Video Tutorial on Youtube](https://youtu.be/sX57TLIPNx8)

About This Course:

-   🚀 Project Setup
-   🗄️ MongoDB & Redis Integration
-   💳 Stripe Payment Setup
-   🔐 Robust Authentication System
-   🔑 JWT with Refresh/Access Tokens
-   📝 User Signup & Login
-   🛒 E-Commerce Core
-   📦 Product & Category Management
-   🛍️ Shopping Cart Functionality
-   💰 Checkout with Stripe
-   🏷️ Coupon Code System
-   👑 Admin Dashboard
-   📊 Sales Analytics
-   🎨 Design with Tailwind
-   🛒 Cart & Checkout Process
-   🔒 Security
-   🛡️ Data Protection
-   🚀Caching with Redis
-   ⌛ And a lot more...

### Setup .env file

```bash
PORT=5000
MONGO_URI=your_mongo_uri

UPSTASH_REDIS_URL=your_redis_url

ACCESS_TOKEN_SECRET=your_access_token_secret
REFRESH_TOKEN_SECRET=your_refresh_token_secret

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Persian storefront defaults: Toman (IRT) + Zarinpal
STORE_CURRENCY=IRT
PAYMENT_PROVIDER=zarinpal
ZARINPAL_MERCHANT_ID=your_zarinpal_merchant_id
ZARINPAL_SANDBOX=true
IRT_CATALOG_PRICES_CONFIRMED=false
API_URL=https://your-public-api.example
CLIENT_URL=https://your-store.example
DEFAULT_SHIPPING_FEE=0
FREE_SHIPPING_THRESHOLD=0

# Optional legacy Stripe checkout (USD only; use instead of the Zarinpal settings)
# STORE_CURRENCY=USD
# PAYMENT_PROVIDER=stripe
# STRIPE_SECRET_KEY=your_stripe_secret_key

NODE_ENV=development
```

### Persian storefront currency and payments

The Persian storefront defaults to **IRT (تومان)** with Zarinpal. Configure the matching frontend variables:

```dotenv
VITE_STORE_CURRENCY=IRT
VITE_API_URL=https://your-public-api.example/api
```

Before deploying IRT to an existing database, set every product price and saved shipping value to its approved whole-Toman amount. Currency environment variables change how amounts are interpreted; they do not convert existing data. Keep IRT_CATALOG_PRICES_CONFIRMED=false until that migration is verified, then set it to true in the backend Production environment to unlock checkout. Follow the [Persian commerce setup and migration guide](docs/PERSIAN_COMMERCE_SETUP.md) for Vercel variables, sandbox checkout tests, and the optional USD/Stripe configuration.

### Run this app locally

```shell
npm run build
```

### Start the app

```shell
npm run start
```
