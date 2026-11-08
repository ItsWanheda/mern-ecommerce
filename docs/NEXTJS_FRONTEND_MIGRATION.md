# Next.js Frontend Migration — Tik Boutique

**Status:** Preparation branch  
**Branch:** `feat/nextjs-frontend-migration`  
**Base:** `master` at `e3a914930ca4700fb8b4983dcfabfe5a2b4fb012`  
**Scope:** Frontend framework migration only. The Express API and commerce backend are out of scope.

## Non-negotiable compatibility rules

- Preserve the current storefront UI: Persian copy, RTL layout, sage/ivory palette, dark theme, spacing, typography, responsive behavior, and existing component behavior.
- Do not rewrite or restructure `backend/`, database models, routes, controllers, payment logic, Redis integration, or scheduled reconciliation.
- Preserve public URLs and route semantics.
- Preserve HTTP-only cookie authentication. Browser API requests must continue to send credentials.
- Preserve the same-origin `/api` contract in production. A public API origin remains an explicit deployment option, not a reason to expose secrets.
- Do not remove the Vite frontend until the Next.js implementation has passed the acceptance gates below.
- Work only on this feature branch. Do not push migration commits to `master` or merge automatically.

## Repository baseline observed

The existing frontend is a React 18.3.1 + Vite 5 application using React Router 6, Zustand, Axios, Tailwind CSS 3, Framer Motion, GSAP, Lenis, Recharts, Lucide, and React Hot Toast.

The current frontend contains storefront, customer-account, checkout-result, campaign, and admin routes. Shared layout and behavior are concentrated in `frontend/src/App.jsx`, `Navbar.jsx`, `StoreFooter.jsx`, the page components, Zustand stores, and `frontend/src/index.css`.

The Express API is separately defined in `backend/app.js` and `backend/routes/`. The frontend currently uses `/api` by default and Axios `withCredentials: true`. Authentication is based on HTTP-only cookies and a refresh flow. This contract must remain unchanged.

The deployment currently includes root-level Vercel rewrites and serverless SEO helpers in `api/` and `seo/`. These serve page shells, social previews, robots, and sitemaps. They must not be deleted or bypassed until equivalent Next.js metadata and crawler behavior are verified.

## Recommended migration approach

Use a staged Vite-to-Next migration rather than a full rewrite.

### Phase 0 — Baseline and compatibility inventory

- Record the existing page routes, query parameters, redirects, public/private route behavior, and SEO metadata.
- Inventory browser-only APIs, Vite environment-variable references, CSS imports, static assets, and code that assumes a browser at module evaluation time.
- Record the current build/test commands and retain them as a baseline until Next.js checks replace them.
- Keep a clean copy of the original Vite entry point and route implementation on this branch during the transition.

### Phase 1 — Add Next.js without redesigning the UI

- Introduce the Next.js App Router under `frontend/src/app/`.
- First mount the existing React application as a client-side compatibility bridge. Keep React Router and existing pages temporarily, following the official incremental Vite migration strategy.
- Keep the legacy React pages/components and their CSS intact. Do not bulk-convert components to Server Components.
- Set the document language and direction to `fa` and `rtl`.
- Preserve the early theme initialization so the saved dark theme does not flash the light theme on page load.
- Make the Next.js shell load the existing CSS, Lenis styles, and public assets without changing their appearance.

### Phase 2 — Runtime and API compatibility

- Replace Vite-only environment access with a small shared runtime configuration that works under Next.js. Public browser variables should use the `NEXT_PUBLIC_` prefix; backend secrets must never use it.
- Preserve Axios `withCredentials: true`, the auth refresh coordinator, and HTTP-only cookie semantics.
- Keep `/api` as the default API base path. Verify same-origin rewrites, CORS, cookie domain/path/SameSite/Secure attributes, and payment-return URLs against the actual deployment topology.
- Preserve current static asset URLs and avoid converting image loading behavior until its impact has been tested.

### Phase 3 — Migrate routing and rendering incrementally

Move route groups to App Router one at a time while reusing existing page components where possible. Preserve all current paths:

- `/`, `/shop`, `/new-arrivals`, `/bestsellers`, `/featured-products`
- `/looks/[slug]`, `/campaigns`, `/campaign/[campaignId]`
- `/signup`, `/login`, `/forgot-password`, `/reset-password`
- `/secret-dashboard`, `/categories`, `/category/[slug]`, `/product/[productId]`
- `/cart`, `/wishlist`, `/profile`, `/orders`
- `/shipping-policy`, `/returns-policy`, `/support`, `/faq`, `/privacy-policy`, `/terms-of-use`
- `/newsletter-unsubscribe`, `/purchase-success`, `/purchase-cancel`

Do not change route access rules, login return destinations, cart initialization/guest-cart merge behavior, or checkout callback expectations.

### Phase 4 — SEO and deployment cutover

- Replace the current Vercel page-shell/share-preview rewrites only after equivalent Next.js metadata is available for home, products, categories, campaigns, collections, and private pages.
- Preserve canonical URLs, noindex rules, filtered-listing behavior, Open Graph/Twitter previews, `robots.txt`, and all sitemap endpoints.
- Update the Vercel build configuration for a Next.js deployment only after the Next app and serverless API/SEO endpoints have been verified together.
- Keep the backend deployment and its environment variables unchanged.

## Acceptance gates before removing Vite

- Frontend dependency installation is reproducible from the committed lockfile.
- Next.js production build succeeds, and the existing backend build/tests still pass.
- Direct URL navigation and refresh work for every route in the list above.
- Sign-up, login, logout, refresh-token rotation, profile, saved addresses, guest cart, cart merge, wishlist, and admin authorization behave as before.
- Product/category browsing, filters, search normalization, variants, inventory display, and customer reviews behave as before.
- Zarinpal checkout, success/cancel returns, and order status verification continue to use the existing backend.
- Light/dark theme, mobile navigation, RTL layout, dialogs, focus behavior, and responsive breakpoints are visually compared with the Vite baseline.
- API cookies and credentials work in local development and on the deployed preview domain.
- SEO metadata, canonical URLs, social previews, robots, and sitemap responses are verified.
- No backend files, schema, routes, or payment logic have changed as part of this frontend migration.

## Current implementation note

This preparation commit intentionally documents the migration boundary before changing runtime files. The repository's frontend lockfile must be regenerated by a real dependency installation when Next.js is introduced; hand-editing or leaving a stale lockfile would make `npm ci --prefix frontend` unreliable. The current tool session can inspect and commit repository files but cannot execute the project's dependency installation or browser/runtime test suite. Do not claim the migration is complete until those checks have actually run.
