# Storefront Performance Optimization

This branch uses MongoDB schema indexes, normalized product search tokens, stored effective prices, Redis category caching and resilient request limiting.

## Product search and effective price

No product-data migration or backfill is required.

Every product created or updated through the backend's Mongoose document flow automatically generates these internal fields before validation completes:

- `searchTextNormalized`: normalized searchable product text.
- `searchTokens`: unique normalized words used by token-prefix search.
- `effectivePrice`: the product price after its percentage discount.

Search, price filtering, price sorting and price-bound queries use these fields directly. There is no branch for older documents missing either field. Future products are handled the same way from their first save.

Product indexes are declared on the Product schema. The MongoDB connection explicitly enables Mongoose schema index creation with `autoIndex: true`; index creation does not rewrite or migrate product documents.

## MongoDB connection pool

The pool remains conservative by default: `MONGO_MAX_POOL_SIZE=5` and `MONGO_MIN_POOL_SIZE=0`. More storefront users do not imply that the pool should be increased automatically; each process or serverless instance can own a separate pool.

| Variable | Default | Accepted range |
| --- | ---: | ---: |
| `MONGO_MAX_POOL_SIZE` | 5 | 1–20 |
| `MONGO_MIN_POOL_SIZE` | 0 | 0–max pool size |
| `MONGO_MAX_CONNECTING` | 2 | 1–max pool size |
| `MONGO_WAIT_QUEUE_TIMEOUT_MS` | 5000 | 100–30000 |
| `MONGO_SERVER_SELECTION_TIMEOUT_MS` | 5000 | 1000–30000 |
| `MONGO_CONNECT_TIMEOUT_MS` | 10000 | 1000–30000 |
| `MONGO_MAX_IDLE_TIME_MS` | 30000 | 1000–300000 |
| `MONGO_POOL_DIAGNOSTICS` | false | Set to `true` for pool lifecycle and checkout-failure logs |

Use measured checkout failures, query latency, total MongoDB connections and database capacity before testing pool sizes 10 or 15. For serverless deployments, estimate peak aggregate connections across all instances first.

The backend exports an internal `getMongoPoolMetrics()` snapshot for diagnostics. It is not exposed as a public API endpoint.

## Redis rate-limit resilience

Rate limiting continues to use an atomic Redis counter. After three consecutive Redis command failures, the process-local circuit breaker skips Redis requests for five seconds and uses the existing bounded in-memory fallback. After the cooldown, only one request probes Redis; a successful probe closes the circuit.

The fallback is per-instance and best-effort, not globally coordinated. Apply an additional edge/WAF or reverse-proxy rule at the hosting layer for public traffic. Keep authentication and checkout limits stricter than the general API limit.

## Cache behavior

The visible category tree is cached in Redis for three minutes and invalidated after category creation, update/move and deletion. If Redis is unavailable, reads fall back to MongoDB. Product price-bound entries use a generation key, so product-price or category-tree changes invalidate global and category-specific bounds without scanning Redis keys.
