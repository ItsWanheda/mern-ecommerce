# Storefront Performance Optimization

This branch adds incremental performance improvements while preserving the existing MongoDB, Redis, Express and storefront API contracts.

## Search index and effective-price backfill

Before relying on indexed search or effective-price range queries in production, run the one-time backfill against the intended database:

```bash
cd backend
npm run migrate:performance
```

The command:
1. Processes products in batches and writes `searchTextNormalized`, `searchTokens` and `effectivePrice`.
2. Creates indexes declared by the Product and Category models using `createIndexes()`; it does not drop unrelated indexes.

Run this during a low-traffic window and take a backup before a production data migration. The backfill is repeatable and can be run again after interruption.

Until all existing catalogue records are backfilled, search retains a compatibility branch for documents without `searchTokens`, and price range/bounds queries retain a fallback for documents without `effectivePrice`. Price sorting also temporarily falls back to the legacy calculation while any matching documents are missing `effectivePrice`.

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
