# Next.js Frontend Migration — Tik Boutique

**Branch:** `feat/nextjs-frontend-migration`  
**Base:** `master` at `e3a914930ca4700fb8b4983dcfabfe5a2b4fb012`  
**Scope:** Frontend framework migration only. The Express API and commerce backend remain separate.

## Implementation status

- [x] Add Next.js App Router inside the standalone `frontend/` application directory.
- [x] Reuse the existing React storefront components inside native App Router pages and route-group layouts.
- [x] Preserve existing pages, components, Zustand stores, theme tokens, CSS and responsive UI.
- [x] Move shared public assets to `frontend/public/` for Next.js.
- [x] Use Next.js `NEXT_PUBLIC_*` variables for public storefront configuration.
- [x] Preserve same-origin `/api` and add a local Next.js API proxy.
- [x] Add server metadata for static pages, products, categories, campaigns and collections.
- [x] Preserve private-route noindex and canonical URL rules.
- [x] Return real HTTP 404 responses for unsupported paths, reusing the Persian 404 UI without a legacy catch-all route.
- [x] Leave Express, MongoDB, Redis, authentication, payments and order logic unchanged.
- [x] Move the six public store-information routes into explicit App Router page files.
- [x] Keep the existing shared store shell, Navbar, footer, theme, auth initialization and guest-cart initialization during the transition.
- [x] Retain the React Router provider/navigation bridge required by existing interactive storefront components.
- [x] Migrate Login, Signup, Forgot Password and Reset Password to explicit App Router routes.
- [x] Preserve post-login destinations across the route bridge using validated same-origin `next` paths.
- [x] Retain the existing auth store, API calls, password policy and account-page presentation.
- [x] Migrate Profile, Orders and Wishlist to native App Router customer routes.
- [x] Preserve authentication guards for Profile and Orders while keeping Wishlist available to guests.
- [x] Reuse the current customer pages, Navbar/footer, order service-request tools and local-storage wishlist.
- [x] Migrate Shop, Categories, Category details, Collections, Looks and Campaign routes to the App Router.
- [x] Migrate Product Details to an explicit App Router route with server-generated product metadata.
- [x] Migrate Cart and Zarinpal purchase-result routes to the App Router while retaining the existing checkout flow.
- [x] Migrate the permission-aware admin dashboard to an explicit App Router route with an admin-role gate.
- [x] Migrate the storefront home page and newsletter-unsubscribe page to explicit App Router routes.
- [x] Preserve the existing product gallery, variant availability, stock-aware cart, wishlist, reviews and related products.
- [x] Preserve filter/search query strings and pagination during route synchronization.
- [x] Add dynamic server metadata for category, campaign and named Look pages, including noindex for unknown resources.
- [ ] Verify browser-level authentication cookies, cart, checkout and visual regression.
- [ ] Verify live login, signup, password-recovery email and reset-token flows against the preview API.
- [ ] Verify Vercel preview, proxy/cookies, social previews, robots and sitemap endpoints.
- [x] Remove the Vite runtime, Vite entrypoint/configuration, nested frontend package manifest and old React SPA route table.

## Current structure

```text
mern-ecommerce/
├── backend/                  # Independent Express API package
│   ├── api/
│   ├── controllers/
│   ├── lib/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── tests/
│   ├── scripts/               # Database migrations and operational commands
│   ├── package.json
│   └── package-lock.json
├── frontend/                 # Standalone Next.js application root
│   ├── app/                  # Native App Router route groups and pages
│   ├── api/                  # Vercel robots and sitemap functions
│   ├── lib/                  # Next metadata and SEO server helpers
│   ├── public/               # Static storefront assets
│   ├── src/                  # Existing React components, pages, stores and helpers
│   ├── tests/
│   ├── next.config.js
│   ├── package.json
│   ├── package-lock.json
│   └── vercel.json
├── docs/
├── scripts/
├── .github/
└── package.json              # Root command runner; no app dependencies
```

## Compatibility decisions

The migration keeps the existing UI intact. App Router page modules import the existing interactive components as client components, while Next.js owns URL matching, route layouts, server metadata and HTTP status codes. This avoids rewriting the storefront UI or its commerce logic as part of the routing migration.

Next.js App Router is the only route matcher. React Router remains temporarily as a client-navigation adapter because existing interactive components still consume its `Link`, `NavLink`, `useNavigate`, `useLocation` and `useSearchParams` APIs. The route-scoped `BrowserRouter` provider and `NextRouteSync` hand client-side navigation back to Next.js. The old `Routes`/`Route` SPA table and catch-all mount have been removed; converting these remaining component APIs is a separate cleanup, not a second route system.

The backend remains unchanged. Axios continues to use `withCredentials: true`, HTTP-only cookies and the existing refresh-token coordinator. The default API base remains `/api`. Vercel rewrites that path to the separate Express API; local development proxies it to `http://localhost:5000`.

The existing frontend Vercel project still has its current repository-root settings and an Output Directory override of `frontend/dist`. This branch does not change shared project settings while `master` still uses the old layout. The Next.js project root is now `frontend/` and its local build directory is `frontend/dist` (`dist` relative to the app root). After this branch is merged, set the frontend Vercel project's Root Directory to `frontend` and its Output Directory to `dist`. The backend Vercel project should continue to use `backend/` as its independent root. The source reads only Next.js public environment variables; stale Vite-specific project variables are not deleted because they may still be used by `master` until merge.

Use `NEXT_PUBLIC_*` only for browser-visible storefront settings. Backend secrets must never use that prefix. The Next.js branch does not read `VITE_*` aliases.

Metadata uses shared SEO helpers and the existing public API. Canonicals remain suppressed until a verified production origin is configured; private and filtered routes remain noindex. The robots and sitemap Vercel functions now live inside `frontend/api/` and their rewrites are defined in `frontend/vercel.json`. The obsolete Vite HTML shell handlers were removed during Step 9.

## Development

```bash
npm ci --prefix backend
npm ci --prefix frontend
```

Terminal 1 — Express API:

```bash
npm run dev
```

Terminal 2 — Next.js storefront:

```bash
npm run dev:frontend
```

Open `http://localhost:3000`. The Next.js App Router is the only frontend runner; there is no nested frontend package or alternate Vite command.

## Store-information route migration

The six public guidance routes now have explicit App Router page files and use the existing shared `StoreInfoPage` UI component. The route-specific page modules call the server metadata helper, so title, description, robots and canonical behavior are generated by Next.js. The existing Navbar, StoreFooter, SmoothScroll, toast layer, auth initialization and guest-cart initialization are retained in the shared route-group shell.

The route-scoped React Router provider supports existing shared UI links and navigation hooks, while `NextRouteSync` transfers client-side history changes to the native App Router. Direct page refreshes and links between information routes resolve through explicit App Router page modules. The shared information-page content remains a client component for this phase (it still reads shipping settings from the existing API); Next.js owns the route matching and server-generated metadata. Converting this content to server components is a later optimization.

## Authentication route migration

The four authentication URLs now have explicit App Router page modules under `frontend/app/(account)/`. The account shell intentionally keeps the existing account-page presentation (no store Navbar or footer) while retaining the Zustand user/cart stores, auth-state check, guest-cart initialization/merge, toast layer and smooth scrolling.

The existing Login and Signup forms remain the source of truth for their UI and client-side validation. Forgot Password and Reset Password continue to call the same API endpoints, and reset-token query strings are preserved. The route bridge carries a protected page's intended destination into a validated same-origin `next` query parameter so it is not lost when Next.js takes over navigation. Authenticated users are redirected away from Login/Signup to that destination or the home page, matching the previous guard behavior.

No authentication controllers, middleware, database models, JWT handling, refresh-token coordination, cookies, environment variables or payment code were changed. Live login, signup, recovery-email delivery, reset-token acceptance and cookie behavior still require browser/API acceptance testing.

## Customer account route migration

Profile, Orders and Wishlist now have explicit App Router page files under `frontend/app/(customer)/`. The customer route group reuses the existing storefront chrome: Navbar, footer, theme, SmoothScroll, toast notifications, auth initialization, and cart-session initialization/merge. Existing customer page components are reused as client components; their data requests, forms, address management, order history, support/return request flow, and product cards have not been rewritten.

Access behavior is deliberate: Profile and Orders require an authenticated user and redirect guests to Login with the intended route preserved in a validated same-origin `next` parameter. Wishlist remains guest-accessible, matching the previous React app, and continues to use the existing browser local-storage wishlist store. All three routes retain their existing private/noindex metadata.

No backend routes, controllers, data models, payment logic or authentication endpoints were changed. Real account-data and browser-navigation behavior remain acceptance tests against the protected preview environment.

## Shopping route migration

The shopping discovery URLs now have explicit App Router page modules under `frontend/app/(shopping)/`:

- `/shop` — product search, filters, sorting and pagination.
- `/categories` — category hierarchy and category navigation.
- `/category/[slug]` — category products and the existing advanced filter experience.
- `/new-arrivals`, `/bestsellers`, `/featured-products` — curated product collections.
- `/looks/[slug]` — the three existing named Looks.
- `/campaigns` and `/campaign/[campaignId]` — campaign listing and campaign detail pages.

The route group reuses the existing storefront shell (Navbar, footer, auth/cart initialization, theme, SmoothScroll and toast notifications). Existing shopping pages remain client components and keep their product/category stores, API calls, ProductCard UI, and React Router search-param handling. The route-sync matcher now recognizes both the fixed shopping URLs and the three exact dynamic route shapes, allowing Next.js to own direct requests and route rendering without breaking in-page filter and navigation behavior.

Server metadata now provides titles/descriptions for Categories and Campaigns, resolves category and campaign detail metadata from the API, and supplies metadata for valid named Looks. Unknown category and Look slugs are marked noindex. Shop and category filter URLs continue to use the shared excluded-query noindex rules. Existing client-side PageMeta continues to provide the dynamic product-list and breadcrumb structured data after client data has loaded.

No product, category, campaign, search, inventory, payment or authentication backend code was changed. Live filtering, campaign click tracking, direct-refresh behavior, and category API data still need interactive testing against the protected preview.

## Product details route migration

The product URL now has an explicit App Router page at `frontend/app/(shopping)/product/[productId]/page.jsx`. The route passes the decoded ID into the existing ProductDetailsPage client component and uses the server metadata helper to resolve the current product name, description and image. Missing or invalid products receive noindex metadata.

The existing product experience is reused without rewriting its business logic: image gallery and keyboard-accessible zoom dialog, size/color combination availability, stock checks, add-to-cart with selected variant, guest wishlist, recently viewed products, related products, verified-purchase review eligibility and moderated review submission. The route-sync matcher now includes exactly one `/product/{id}` segment so existing ProductCard links enter the native route while deeper or incomplete paths remain unmatched.

The product page stays client-rendered in this compatibility phase because it relies on browser storage, Zustand stores and interactive dialogs. Server-generated metadata is available on the initial route request; the existing PageMeta continues to update product structured data after product data loads in the browser.

No product API, inventory, cart, review or payment backend code was changed. Product API response, add-to-cart and review behavior still require interactive acceptance testing against the protected preview.

## Validation performed

- Next.js 16.4.5 production build: passed.
- Frontend unit tests: passed, including exact route matching and auth return-path safety tests.
- Backend syntax/build checks and unit tests: 47 passed.
- Production smoke test: home, signup, shop, category and product paths returned HTTP 200; unsupported paths returned HTTP 404; favicon returned HTTP 200; signup metadata included `noindex, nofollow`.
- Next.js reports React 18 support is deprecated in version 16 and will be removed in Next.js 17. React has not been upgraded in this compatibility phase to avoid combining two major migrations.

Build and unit tests do not prove live API connectivity, authentication cookies, checkout, visual parity or production SEO. Browser-level testing remains a release gate.

## Backend invariants

The backend's runtime and commerce behavior must remain unchanged: API handlers, controllers, database models, middleware, routes, MongoDB/Redis configuration, Zarinpal payment logic, authentication and order processing are not part of this frontend migration. Only the operational script location and corresponding npm script paths were adjusted for the two-workspace layout.

## Cart and checkout route migration

The cart now has an explicit App Router route at `/cart`, and payment return pages are native routes at `/purchase-success` and `/purchase-cancel`. They reuse the existing client components and the shared shopping shell; the cart page still contains the current checkout form and order summary rather than introducing a second checkout implementation.

The existing checkout behavior is preserved: guest-cart persistence and account merge, stock-aware quantity changes, coupon validation, saved shipping addresses, Iranian phone/postal-code normalization, server-calculated shipping, IRT currency checks, Zarinpal checkout creation and HTTPS-only gateway redirect. The success page still verifies the order's payment status with the API before clearing the cart. The cancel page continues to distinguish a confirmed unpaid result from an uncertain callback/verification state and warns customers not to pay again while the result is unresolved.

These are frontend route/component changes only. No cart, shipping, coupon, order, Zarinpal, payment reconciliation or authentication backend code has been changed. Real checkout and payment return behavior must still be tested in a browser against the protected preview API before release.


## Admin dashboard route migration

The existing admin dashboard is now mounted at the native App Router URL `/secret-dashboard`. The route group reuses the shared storefront shell, including Navbar, footer, theme, auth/cart initialization, toast notifications and the route synchronization bridge. Its access guard waits for the existing `/auth/profile` check, sends guests to Login with the intended dashboard URL (including the selected tab) preserved as a validated same-origin return path, and sends authenticated non-admin users to the storefront.

The original `AdminPage` is reused as a client component. Its four navigation groups and 16 permission-filtered tabs remain intact, including the responsive mobile selector, keyboard-operable desktop tab navigation, order-packing count, lazy-loaded management panels, and `?tab=` deep links. The existing admin API requests and per-endpoint authorization remain unchanged. The dashboard receives private `noindex, nofollow` metadata from the shared server metadata helper.

No admin API route, controller, permission policy, user model, database code, or backend authorization logic was changed. The client guard is a navigation/UX layer only; protected backend endpoints remain responsible for enforcing authorization. Admin login, permissions, tab deep links, and responsive visual behavior still require browser-level acceptance testing against the protected preview.


## Storefront home and newsletter unsubscribe routes

The root storefront URL `/` now renders the existing `HomePage` component inside the shared storefront shell. This keeps the current hero, dynamically loaded campaigns, category cards, curated products, animations, mobile behavior, navigation, guest-cart setup, theme and footer. The component remains client-rendered because its product/category stores, animation setup and current links depend on browser-side React state. Its former client-managed `PageMeta` node has been removed; the App Router now generates the page metadata on the server.

The `/newsletter-unsubscribe` URL now has an explicit App Router page under the store-information route group. The existing email form, validation, inline success/error feedback and `POST /newsletter/unsubscribe` API call are reused unchanged. The server metadata helper marks this route private/noindex, and the route matcher recognizes only the exact URL.

No campaign, product, category, newsletter API, backend controller, database, or authentication behavior was changed. Home content loading and newsletter-unsubscribe submission still require browser-level verification against the protected preview API.


## Step 8 — Migration cleanup and release-readiness audit

### Route ownership and compatibility

Every supported storefront URL is now owned by an explicit App Router page: home, store information, newsletter unsubscribe, authentication, customer account, admin, shopping discovery, product/category/look/campaign details, cart, and payment results. The old catch-all page did not provide a unique route: every URL accepted by its static list or dynamic patterns is already handled by a more specific App Router route. It and the one-purpose legacy SPA mount have therefore been removed.

The Persian 404 page is now rendered directly by the App Router not-found boundary. Its existing React component is reused inside a small client-only BrowserRouter wrapper so its links and search action continue to work. The route-group layouts retain the React Router provider and the Next.js navigation synchronizer because existing Navbar, footer, store-information pages, product cards and forms still use React Router links/hooks. This provider bridge is not the old catch-all fallback and cannot yet be removed without a broader component-router conversion.

### SEO and metadata audit

The homepage metadata is server-generated by Next.js. Private routes (including the admin dashboard, checkout/customer pages and newsletter unsubscribe) remain noindex. Product/category/campaign/look details keep their resource metadata behavior, and unknown dynamic resources continue to receive noindex metadata. Duplicate `/campaigns` static metadata was removed so there is one unambiguous title/description entry. A regression test protects the intended campaign metadata and private-route entries.

### Framework cleanup

The redundant catch-all and legacy SPA entry were removed in Step 8. Step 9 removes the remaining Vite runtime, Vite entry HTML/configuration, nested frontend package manifest, Vite dependencies and Vite-only logo. The shared `frontend/src` folder remains the source location for existing React components and tests. The backend and frontend now each have an independent package manifest and lockfile. The root `package.json` is only a convenience command runner; it has no application dependencies.

### Release gates still open

- Test guest cart and signed-in cart merge, product variants, coupon/shipping totals, and checkout submission in a browser.
- Test Zarinpal redirect, callback and server-side payment result verification; never infer payment success from the browser return URL alone.
- Test login/signup/password recovery, refresh-cookie behavior and intended post-login redirects.
- Test admin and non-admin roles, permission-filtered tabs, keyboard navigation and mobile admin navigation.
- Test homepage, catalogue, product detail, policy pages and newsletter unsubscribe visually at mobile and desktop breakpoints.
- Test canonical/robots metadata, social previews, robots.txt, sitemap routes and the same-origin API proxy on an accessible preview.
- The Vite runtime and duplicate SPA route table are removed. The React Router component adapter remains only until all shared components have been converted to Next.js navigation APIs.

The audit does not change the Express API, database, authentication/payment controllers, Vercel environment variables, project settings or branch protection.


## Step 9 — Next.js-only frontend cutover

The frontend now has one build/runtime: Next.js App Router. Removed files include the Vite HTML entrypoint, Vite config, Vite React plugin and Vite package dependencies, the old `frontend/src/main.jsx` and `frontend/src/App.jsx` SPA entry/route table, and the unused Vite logo. Frontend tests are run by the frontend package; root scripts expose `npm run test:frontend` and `npm run build` for convenience.

The Vite-era `/api/share-preview` and `/api/page-shell` HTML shell handlers have also been removed. They fetched `/index.html` and wrote server-rendered content into a Vite `#root`; Next.js now supplies page HTML, metadata, canonical URLs, robots directives and HTTP 404 responses directly through App Router route modules. Their HTML-shell-only helper code and tests were removed. The robots and XML sitemap handlers remain and now use Next.js-compatible environment variables only.

The existing React components still use React Router navigation APIs. The route-group BrowserRouter provider and `NextRouteSync` are intentionally retained as a narrow client-navigation adapter; they do not define routes or mount a legacy SPA. Removing this final adapter requires converting those component imports to `next/link` and `next/navigation`, which is beyond removing Vite and the old SPA entrypoint. Backend APIs, data models, payment/authentication logic, shared Vercel project settings and the untouched `master` branch were not changed.

GitHub Actions validates the Next.js application independently of the previous repository-root layout. The existing Vercel preview project still has its old Root Directory setting, so its deployment is not an acceptance signal for this new layout. After merge, set the frontend Vercel project's Root Directory to `frontend` and Output Directory to `dist`. Live visual, cookie, admin, newsletter and Zarinpal browser tests remain a release gate; preview access remains protected.


## Step 10 — Frontend workspace consolidation

The Next.js application now lives entirely under `frontend/`: `frontend/app/`, `frontend/public/`, `frontend/api/`, `frontend/lib/`, its Next/PostCSS/Tailwind configuration, its package manifest, tests, and environment template. Existing UI code remains in `frontend/src/` without a redesign or rewrite.

All App Router imports that previously reached outside the frontend directory now use the `@/*` path alias, rooted at `frontend/`. The alias is configured in `frontend/jsconfig.json`. Tailwind content globs now scan `frontend/app/` and `frontend/src/`, and Next.js loads `frontend/next.config.js` with `distDir: "dist"`.

The Express application source (API entry point, controllers, models, middleware, routes, database integrations and payment logic) remains unchanged. Backend-specific database migrations and operational scripts now live under `backend/scripts/`, with their package commands updated to use paths relative to the backend workspace. The root package delegates convenience commands to the two applications; frontend and backend dependencies are installed and locked independently. Robots and sitemap Vercel functions moved with the frontend, so the frontend deployment no longer needs source files outside its application root.

**Deployment handoff:** after merge, configure the frontend Vercel project's Root Directory as `frontend` and Output Directory as `dist`. This project-level setting is intentionally not changed on the feature branch because it is shared with the existing `master` deployment. The backend project remains rooted at `backend`. Preview build readiness on the old frontend Vercel project is not a substitute for this post-merge settings change.
