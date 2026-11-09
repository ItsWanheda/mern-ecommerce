# Next.js Frontend Migration — Tik Boutique

**Branch:** `feat/nextjs-frontend-migration`  
**Base:** `master` at `e3a914930ca4700fb8b4983dcfabfe5a2b4fb012`  
**Scope:** Frontend framework migration only. The Express API and commerce backend remain separate.

## Implementation status

- [x] Add Next.js App Router at the repository root.
- [x] Reuse the existing React storefront through a client-only compatibility bridge.
- [x] Preserve existing pages, components, Zustand stores, theme tokens, CSS and responsive UI.
- [x] Move shared public assets to root `public/`; retain Vite as a temporary fallback.
- [x] Map Vite public variables to Next.js `NEXT_PUBLIC_*` variables.
- [x] Preserve same-origin `/api` and add a local Next.js API proxy.
- [x] Add server metadata for static pages, products, categories, campaigns and collections.
- [x] Preserve private-route noindex and canonical URL rules.
- [x] Return real HTTP 404 responses for unsupported paths, reusing the Persian 404 UI.
- [x] Leave Express, MongoDB, Redis, authentication, payments and order logic unchanged.
- [x] Move the six public store-information routes into explicit App Router page files.
- [x] Keep the existing shared store shell, Navbar, footer, theme, auth initialization and guest-cart initialization during the transition.
- [x] Mirror legacy React Router navigation into native App Router routes while the rest of the storefront is being migrated.
- [x] Migrate Login, Signup, Forgot Password and Reset Password to explicit App Router routes.
- [x] Preserve post-login destinations across the route bridge using validated same-origin `next` paths.
- [x] Retain the existing auth store, API calls, password policy and account-page presentation.
- [x] Migrate Profile, Orders and Wishlist to native App Router customer routes.
- [x] Preserve authentication guards for Profile and Orders while keeping Wishlist available to guests.
- [x] Reuse the current customer pages, Navbar/footer, order service-request tools and local-storage wishlist.
- [ ] Verify browser-level authentication cookies, cart, checkout and visual regression.
- [ ] Verify live login, signup, password-recovery email and reset-token flows against the preview API.
- [ ] Verify Vercel preview, proxy/cookies, social previews, robots and sitemap endpoints.
- [ ] Remove the Vite fallback only after all acceptance gates pass.

## Current structure

```text
mern-ecommerce/
├── app/                      # Next.js App Router
│   ├── (account)/             # Native login, signup and password-recovery routes
│   ├── (customer)/            # Native profile, orders and wishlist routes
│   ├── (store-info)/          # Native public policy/help route group
│   ├── layout.jsx            # Persian RTL document and global metadata
│   ├── page.jsx              # Home
│   ├── [...slug]/page.jsx    # Existing URL compatibility route
│   ├── not-found.jsx         # Existing Persian 404 UI with HTTP 404
│   └── legacy-client.jsx     # Existing React app mounted in the browser
├── lib/next-metadata.js      # Server-side route metadata and canonical rules
├── public/                   # Shared static assets
├── frontend/src/             # Existing React pages, components and stores
├── backend/                  # Existing Express API — unchanged
├── api/                      # Existing robots, sitemap and legacy preview handlers
└── seo/                      # Existing SEO helpers
```

## Compatibility decisions

The first migration step intentionally keeps the current UI intact. The App Router shell loads the existing stylesheet and assets, then mounts the React application after hydration. This prevents components that directly read browser APIs during render from being evaluated on the server. This is a compatibility bridge, not the final Server Component conversion.

React Router remains active inside the bridge, preserving existing paths and route-state redirects. Individual route groups can move to native App Router pages after browser-level acceptance tests.

The backend remains unchanged. Axios continues to use `withCredentials: true`, HTTP-only cookies and the existing refresh-token coordinator. The default API base remains `/api`. Vercel rewrites that path to the separate Express API; local development proxies it to `http://localhost:5000`.

The existing frontend Vercel project has a project-level Output Directory override of `frontend/dist`, which is still needed by the current Vite-based `master` branch. This migration branch sets Next.js `distDir` to the same path so its preview build can coexist without changing shared Vercel project settings. The Vite fallback defines `NEXT_PUBLIC_*` aliases from its original `VITE_*` variables.

Use `NEXT_PUBLIC_*` only for browser-visible storefront settings. Backend secrets must never use that prefix. Legacy `VITE_*` values are temporarily mapped to Next.js variable names.

Metadata uses shared SEO helpers and the existing public API. Canonicals remain suppressed until a verified production origin is configured; private and filtered routes remain noindex. Existing robots and sitemap rewrites remain. The old page-shell/share-preview handlers are retained but are no longer used as page rewrites.

## Development

```bash
npm ci
```

Terminal 1 — Express API:

```bash
npm run dev
```

Terminal 2 — Next.js storefront:

```bash
npm run dev:frontend
```

Open `http://localhost:3000`. The old Vite runner remains temporarily available with `npm run dev --prefix frontend`.

## Store-information route migration

The six public guidance routes now have explicit App Router page files and use the existing shared `StoreInfoPage` UI component. The route-specific page modules call the server metadata helper, so title, description, robots and canonical behavior are generated by Next.js. The existing Navbar, StoreFooter, SmoothScroll, toast layer, auth initialization and guest-cart initialization are retained in the shared route-group shell.

A small route-sync component bridges React Router navigation from not-yet-migrated pages into the new App Router pages. It is intentionally temporary: as more route groups are migrated, the bridge will be narrowed and then removed. Direct page refreshes and links between the six information routes resolve through explicit App Router page modules. The shared information-page content remains a client component for this phase (it still reads shipping settings from the existing API); Next.js owns the route matching and server-generated metadata. Converting this content to server components is a later optimization.

## Authentication route migration

The four authentication URLs now have explicit App Router page modules under `app/(account)/`. The account shell intentionally keeps the existing account-page presentation (no store Navbar or footer) while retaining the Zustand user/cart stores, auth-state check, guest-cart initialization/merge, toast layer and smooth scrolling.

The existing Login and Signup forms remain the source of truth for their UI and client-side validation. Forgot Password and Reset Password continue to call the same API endpoints, and reset-token query strings are preserved. The route bridge carries a protected page's intended destination into a validated same-origin `next` query parameter so it is not lost when Next.js takes over navigation. Authenticated users are redirected away from Login/Signup to that destination or the home page, matching the previous guard behavior.

No authentication controllers, middleware, database models, JWT handling, refresh-token coordination, cookies, environment variables or payment code were changed. Live login, signup, recovery-email delivery, reset-token acceptance and cookie behavior still require browser/API acceptance testing.

## Customer account route migration

Profile, Orders and Wishlist now have explicit App Router page files under `app/(customer)/`. The customer route group reuses the existing storefront chrome: Navbar, footer, theme, SmoothScroll, toast notifications, auth initialization, and cart-session initialization/merge. Existing customer page components are reused as client components; their data requests, forms, address management, order history, support/return request flow, and product cards have not been rewritten.

Access behavior is deliberate: Profile and Orders require an authenticated user and redirect guests to Login with the intended route preserved in a validated same-origin `next` parameter. Wishlist remains guest-accessible, matching the previous React app, and continues to use the existing browser local-storage wishlist store. All three routes retain their existing private/noindex metadata.

No backend routes, controllers, data models, payment logic or authentication endpoints were changed. Real account-data and browser-navigation behavior remain acceptance tests against the protected preview environment.

## Validation performed

- Next.js 16.4.5 production build: passed.
- Frontend unit tests: passed, including exact route matching and auth return-path safety tests.
- Backend syntax/build checks and unit tests: 47 passed.
- Production smoke test: home, signup, shop, category and product paths returned HTTP 200; unsupported paths returned HTTP 404; favicon returned HTTP 200; signup metadata included `noindex, nofollow`.
- Next.js reports React 18 support is deprecated in version 16 and will be removed in Next.js 17. React has not been upgraded in this compatibility phase to avoid combining two major migrations.

Build and unit tests do not prove live API connectivity, authentication cookies, checkout, visual parity or production SEO. Browser-level testing remains a release gate.

## Backend invariants

No files under `backend/`, database models, API routes, controllers, middleware, MongoDB/Redis configuration, Zarinpal payment logic, reconciliation or backend environment variables should change as part of this frontend migration.
