# Storefront performance optimization

The backend uses PostgreSQL indexes, Prisma queries, normalized product search tokens, stored effective prices, Redis category caching, and resilient request limiting.

## Product search and effective price

Every product created or saved through the Prisma model adapter updates these internal fields:

- `searchTextNormalized`: normalized searchable product text.
- `searchTokens`: unique normalized words used by token-prefix search.
- `effectivePrice`: price after the percentage discount.

Search, price filtering, price sorting, and price-bound queries use these fields. Product indexes are declared in `backend/prisma/schema.prisma` and created by the checked-in PostgreSQL migration.

## PostgreSQL connection capacity

Prisma manages database connections through its PostgreSQL connector. Size the database connection limit for the aggregate number of API instances and workers, not for a single local process. In serverless deployments, avoid allowing each short-lived instance to open an unbounded pool; use the hosting provider's supported pooler when the deployment topology requires one. Keep `DATABASE_URL` private and do not log credentials.

`PRISMA_QUERY_LOGGING=true` can be used temporarily in a controlled development environment to inspect query behavior. Leave it disabled in production unless a specific diagnostic session requires it.

## Redis rate-limit resilience

Rate limiting continues to use an atomic Redis counter. After repeated Redis command failures, the process-local circuit breaker temporarily skips Redis requests and uses the existing bounded in-memory fallback. The fallback is per instance and best-effort, not globally coordinated. Apply an additional edge/WAF or reverse-proxy rule at the hosting layer for public traffic. Keep authentication and checkout limits stricter than the general API limit.

## Cache behavior

The visible category tree is cached in Redis for three minutes and invalidated after category creation, update/move, and deletion. If Redis is unavailable, reads fall back to PostgreSQL. Product price-bound entries use a generation key, so product-price or category-tree changes invalidate global and category-specific bounds without scanning Redis keys.
