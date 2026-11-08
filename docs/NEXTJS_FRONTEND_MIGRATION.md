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
- [ ] Verify browser-level authentication cookies, cart, checkout and visual regression.
- [ ] Verify Vercel preview, proxy/cookies, social previews, robots and sitemap endpoints.
- [ ] Remove the Vite fallback only after all acceptance gates pass.

## Current structure

```text
mern-ecommerce/
├── app/                      # Next.js App Router
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

## Validation performed

- Next.js 16.4.5 production build: passed.
- Frontend unit tests: 28 passed.
- Backend syntax/build checks and unit tests: 47 passed.
- Production smoke test: home, signup, shop, category and product paths returned HTTP 200; unsupported paths returned HTTP 404; favicon returned HTTP 200; signup metadata included `noindex, nofollow`.
- Next.js reports React 18 support is deprecated in version 16 and will be removed in Next.js 17. React has not been upgraded in this compatibility phase to avoid combining two major migrations.

Build and unit tests do not prove live API connectivity, authentication cookies, checkout, visual parity or production SEO. Browser-level testing remains a release gate.

## Backend invariants

No files under `backend/`, database models, API routes, controllers, middleware, MongoDB/Redis configuration, Zarinpal payment logic, reconciliation or backend environment variables should change as part of this frontend migration.
