# Tik Boutique — Frontend

This directory is the **standalone Next.js application root**.

## Layout

- `app/` — Next.js App Router pages, route groups, and layouts.
- `src/components/`, `src/store-pages/`, `src/stores/`, `src/lib/` — existing storefront UI and client-side business state.
- `api/` — Vercel serverless handlers for robots.txt and the XML sitemap endpoints.
- `lib/` — Next.js server metadata and SEO handler helpers.
- `public/` — static assets served from the site root.
- `next.config.js`, `postcss.config.js`, `tailwind.config.js` — frontend build configuration.

The `@/*` alias resolves from this directory. For example, `@/src/components/Navbar.jsx` points to `frontend/src/components/Navbar.jsx`.

## Development

From the repository root:

```bash
npm ci --prefix frontend
npm run dev:frontend
```

Run the Express API in another terminal:

```bash
npm ci --prefix backend
npm run dev
```

When running the frontend on port 3000, its development rewrite proxies `/api/*` to `http://localhost:5000/api/*`.

You can also work from this directory directly:

```bash
npm ci
npm run dev
npm test
npm run build
npm start
```

Copy `.env.example` to `.env.local` **inside this directory**. Next.js reads frontend environment files from its application root.

## Deployment

The frontend Vercel project must use `frontend` as its Root Directory. Its Next.js build output is `dist/` relative to this directory. The matching `vercel.json` and all frontend serverless SEO handlers live here so the project does not need files outside its root.
