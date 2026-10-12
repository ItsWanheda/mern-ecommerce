# MERN E-Commerce Store

A full-stack e-commerce application built with MongoDB, Express, React, and Node.js. It includes a product storefront, account authentication, a persistent shopping cart, coupon support, Stripe Checkout, and an admin dashboard with product management and sales analytics.

## Features

### Storefront and shopping
- Browse featured products, product categories, product details, and recommendations.
- View product images hosted through Cloudinary.
- Add products to a user-specific cart, remove items, and update quantities.
- Apply and validate eligible coupon codes.
- Complete checkout through Stripe Checkout and view success or cancellation pages.

### Accounts and administration
- Sign up, log in, and log out.
- JWT access and refresh tokens stored in HTTP-only cookies.
- Refresh-token storage in Redis.
- Role-protected admin dashboard.
- Create and delete products, toggle featured status, and review sales metrics.
- View aggregate sales and revenue data with daily sales data for the last seven days.

New accounts receive the `customer` role by default. Access to admin-only features requires a trusted administrator to assign the `admin` role in the database; the application does not provide a public role-elevation endpoint.

## Technology stack

| Area | Technologies |
| --- | --- |
| Frontend | React 18, Vite, React Router, Zustand, Tailwind CSS, Axios |
| UI and charts | Lucide React, Framer Motion, React Hot Toast, Recharts |
| Backend | Node.js, Express 4, MongoDB, Mongoose |
| Authentication | JSON Web Tokens, HTTP-only cookies, bcryptjs |
| Cache and token storage | Upstash Redis via ioredis |
| Product images | Cloudinary |
| Payments | Stripe Checkout |

## Project structure

```text
mern-ecommerce/
├── backend/
│   ├── api/
│   │   └── index.js             # Serverless API entry point
│   ├── controllers/             # Authentication, products, cart, payments, analytics
│   ├── lib/                     # MongoDB, Redis, Cloudinary, Stripe setup
│   ├── middleware/              # Authentication and role checks
│   ├── models/                  # User, product, order, and coupon schemas
│   ├── routes/                  # Express API routes
│   ├── app.js
│   ├── server.js                # Local Express server
│   └── package.json
├── frontend/
│   ├── public/                  # Static assets and README screenshot
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── stores/              # Zustand state stores
│   │   └── lib/                 # Axios client
│   ├── package.json
│   └── vite.config.js           # Local /api proxy to port 5000
├── vercel.json                  # Frontend build and API rewrites
├── package.json
└── README.md
```

## Requirements

- Node.js 18 or newer and npm.
- A MongoDB database (for example, MongoDB Atlas).
- An Upstash Redis database.
- A Cloudinary account for product image uploads.
- A Stripe account and API secret for checkout.

MongoDB, Redis, Cloudinary, and Stripe credentials must be configured for the features that use those services.

## Run locally

### 1. Clone and install dependencies

```bash
git clone https://github.com/ItsWanheda/mern-ecommerce.git
cd mern-ecommerce

npm install
npm install --prefix frontend
```

### 2. Configure backend environment variables

Create a `.env` file in the repository root. Use your own credentials and keep this file out of version control.

```dotenv
PORT=5000
NODE_ENV=development

MONGO_URI=your_mongodb_connection_string
UPSTASH_REDIS_URL=your_upstash_redis_url

ACCESS_TOKEN_SECRET=replace_with_a_long_random_secret
REFRESH_TOKEN_SECRET=replace_with_another_long_random_secret

CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
CLIENT_URL=http://localhost:5173
```

| Variable | Purpose |
| --- | --- |
| `PORT` | Local Express port; defaults to `5000`. |
| `NODE_ENV` | Set to `production` in production so authentication cookies use the secure flag. |
| `MONGO_URI` | MongoDB connection string. |
| `UPSTASH_REDIS_URL` | Redis connection URL for refresh-token storage and featured-product caching. |
| `ACCESS_TOKEN_SECRET` | Secret used to sign access tokens. |
| `REFRESH_TOKEN_SECRET` | Secret used to sign refresh tokens. |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Cloudinary credentials for product image uploads. |
| `STRIPE_SECRET_KEY` | Stripe secret API key used to create and verify Checkout sessions. Use a test key for local development. |
| `CLIENT_URL` | Frontend origin used for Stripe's success and cancel redirects. |

### 3. Start the backend

From the repository root:

```bash
npm run dev
```

The API listens on `http://localhost:5000` by default. Its health endpoint is `http://localhost:5000/api/health`.

### 4. Start the frontend

In a second terminal, from the repository root:

```bash
npm run dev --prefix frontend
```

Vite serves the frontend at `http://localhost:5173` and proxies `/api` requests to the local backend. Leave `VITE_API_URL` unset for this default local setup.

### 5. Build and lint

```bash
# Build the frontend
npm run build

# Run the frontend linter
npm run lint --prefix frontend
```

The root `npm run start` command starts the Express backend only; it does not serve the Vite-built frontend. In production, deploy the frontend and backend using the hosting setup described below, or configure a web server to serve the frontend build separately.

## Deployment

The repository is configured for a Vercel frontend build and includes a serverless entry point at `backend/api/index.js` for the backend.

### Frontend on Vercel
- Configure the frontend project to use the repository root, where `vercel.json` is located.
- The repository's Vercel configuration runs `npm run build` and uses `frontend/dist` as the output directory.
- The frontend Axios client uses `/api` by default. The Vercel rewrite forwards those requests to the backend, so verify that the rewrite destination points to your **currently active backend deployment** before deploying. The committed `vercel.json` currently references `mern-ecommerce-api-wanhedas-projects.vercel.app`; replace that host if it is no longer the active API domain.

### Backend on Vercel
- Deploy the `backend` directory as the backend project's root directory.
- Configure the backend environment variables from the table above in the Vercel project settings. Do not commit real secrets.
- Set `CLIENT_URL` to the exact deployed frontend origin (for example, `https://your-store.vercel.app`) so Stripe returns to the correct site.
- After changing the backend domain, update the frontend's `vercel.json` rewrite destination and redeploy the frontend.

### Important API-origin and cookie note
The Axios client sends credentials and defaults to the same-origin `/api` path. The current Express application does not configure cross-origin CORS headers, so using `VITE_API_URL` to call a separate API origin directly requires adding strict, credentialed CORS configuration on the backend for the frontend's exact origin. The existing same-origin rewrite is the intended configuration unless that backend CORS setup is added.

## API overview

All routes are under `/api`. Routes marked **authenticated** require a valid session; **admin** routes additionally require the user's `admin` role.

| Route | Purpose |
| --- | --- |
| `GET /health` | Health check. |
| `POST /auth/signup`, `POST /auth/login`, `POST /auth/logout` | Account registration and session management. |
| `POST /auth/refresh-token`, `GET /auth/profile` | Refresh tokens and retrieve the signed-in profile. |
| `GET /products/featured`, `GET /products/category/:category`, `GET /products/recommendations`, `GET /products/:id` | Storefront product data. |
| `GET /products`, `POST /products`, `PATCH /products/:id`, `DELETE /products/:id` | Admin product listing and management. |
| `GET /cart`, `POST /cart`, `PUT /cart/:id`, `DELETE /cart` | Authenticated shopping-cart operations. |
| `GET /coupons`, `POST /coupons/validate` | Retrieve and validate a user's coupon. |
| `POST /payments/create-checkout-session`, `POST /payments/checkout-success` | Start Stripe Checkout and confirm a paid session. |
| `GET /analytics` | Admin sales and revenue analytics. |

## Payments and currency

The current checkout implementation uses **Stripe Checkout with card payments and USD-denominated prices**. Product prices are read from MongoDB and sent to Stripe as USD amounts. Changing only the currency label in the interface will not convert stored prices or change the amount charged.

An Iranian payment gateway or a different currency is **not** configured out of the box. Supporting another provider or currency requires backend checkout, amount/currency handling, and payment-confirmation changes—not just a frontend setting.

## Security notes

- Keep all secrets in environment variables and rotate any credential that has been exposed.
- Do not expose `STRIPE_SECRET_KEY`, Cloudinary API secrets, token-signing secrets, or database connection strings in frontend code.
- Use HTTPS in production and set `NODE_ENV=production`.
- Restrict database/network access to the hosts and services that need it.
- Admin access is controlled by the role stored on the user record; do not provide public ways to promote accounts.

