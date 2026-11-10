# Customer Requirements Platform Upgrade — Execution Plan

**Working branch:** `feat/customer-requirements-platform`  
**Source branch:** `feat/nextjs-frontend-migration`  
**Source commit:** `d7c15a382e70b58e5f7aba7b3422d97b69a5ede9`  
**Scope:** Bring the existing Next.js + Node.js commerce platform up to the customer's specialist hardware-store requirements without discarding the existing storefront or weakening current commerce/payment safeguards.  
**Schedule baseline:** Preserve the customer's stated maximum delivery window of 12 weeks. The plan below is organized within that window; any schedule gain is reserved for verification, defect correction, load testing and release hardening.

---

## 1. Executive decision

The repository is not a blank project and the Next.js migration is not a reason to rewrite the storefront. The current source branch already contains a Next.js App Router frontend and a substantial Node.js commerce API.

The implementation strategy is therefore **evolve and harden, not rewrite everything at once**:

1. Preserve the Next.js App Router pages, current Persian RTL design, theme tokens, responsive behavior, SEO/GEO work, and existing customer/admin flows.
2. Keep Node.js as the backend runtime and retain Express for the first delivery. Express is already a Node.js framework and satisfies the customer's stated runtime requirement. A switch to Fastify is not a requirement and will only be considered if measured load tests demonstrate a material bottleneck that cannot be solved through query, connection-pool, caching, or application-level improvements.
3. Refactor the API into clearly bounded business modules using a Modular Monolith. Do not introduce distributed Microservices before there is evidence and an operational need.
4. Adopt PostgreSQL as the target system of record for relational commerce, inventory, payments and accounting data, with Prisma as the initial data-access layer. Migrate from MongoDB/Mongoose through a controlled, reversible data migration; do not perform a destructive in-place conversion or unverified production cutover.
5. Keep Redis for ephemeral state, distributed coordination, rate limiting, cache and background-job transport. Use BullMQ for durable/retriable asynchronous work.
6. Treat payment state, inventory, orders and accounting postings as correctness-critical. They must be transactionally safe and idempotent.
7. Treat the stated one-million-actions-per-day figure as a capacity requirement to validate, not as a proven traffic profile. Define what an “action” means and establish peak concurrency/RPS and latency objectives before promising capacity.

### 1.1 Architecture decisions and rationale

| Concern | Decision for this delivery | Rationale |
|---|---|---|
| Backend runtime | Node.js | Explicit customer requirement; already in use. |
| Backend framework | Existing Express, modularized | Avoids a risky framework rewrite that does not itself deliver accounting or data integrity. |
| Backend language | Gradual JavaScript ESM to TypeScript adoption | Better domain contracts and safer future development without blocking current functionality on a wholesale rewrite. |
| Frontend | Existing Next.js App Router | Already implemented on the source branch; continue native route ownership and server rendering. |
| Primary database | PostgreSQL | Strong relational constraints and ACID transactions suit orders, inventory, payment records and double-entry accounting. |
| Data access | Prisma | Typed schema/migrations and a maintainable repository layer. |
| Cache/coordination | Existing Redis | Continue using Redis for rate limiting, refresh-token coordination, cache and distributed locks. |
| Background jobs | BullMQ over Redis | Retryable bulk edits, notifications, reconciliation and reporting jobs. |
| Architecture | Modular Monolith | Strong module boundaries with one deployable backend; lower initial operational complexity than Microservices. |
| API contract | REST + OpenAPI | Maintain a stable API contract for the Next.js frontend and future integrations. |
| Observability | Structured logs, metrics, tracing and alerts | Required to diagnose latency, queue backlog, database saturation and payment failures. |

**Important database gate:** PostgreSQL is the target design, but the current application is MongoDB/Mongoose-based. Before cutover, inventory all collections, indexes, historical records, environment dependencies and operational scripts. If the data-migration window, budget or customer-approved downtime cannot safely support a full cutover within the agreed delivery window, do not improvise a hybrid transactional system. Raise the decision with the customer and agree a staged release that keeps the existing MongoDB source of truth until the PostgreSQL cutover can be completed and verified.

---

## 2. Current repository baseline

### 2.1 Existing application structure

The source branch currently has these principal areas:

- `backend/`: Node.js ESM + Express API.
- `backend/controllers/`: authentication, admin, analytics, campaigns, cart, categories, coupons, newsletter, orders, product reviews, products, service cases, shipping and Zarinpal payment controllers.
- `backend/models/`: Mongoose models for users, products, categories, orders, reviews, campaigns, coupons, settings, audit logs and service cases.
- `backend/routes/`: Express route modules for those domains.
- `backend/lib/`: MongoDB/Redis connection helpers, inventory reservation, Persian search, payment reconciliation, audit logging, coupon logic, security and other shared helpers.
- `backend/tests/`: Node test-runner suites for security, readiness, auth refresh, permissions, stock, coupons, currency policy, payment reconciliation and related flows.
- `frontend/app/`: Next.js App Router route groups for account, admin, customer, shopping and store-information pages.
- `frontend/src/components/`: existing shared storefront/admin components.
- `frontend/src/store-pages/`: existing page-level UI reused by App Router routes.
- `frontend/src/stores/`: Zustand stores for cart, categories, products, users and wishlist.
- `frontend/src/lib/`: API client, commerce helpers, route bridge, auth refresh coordinator, search and SEO utilities.
- `docs/`: existing Next.js migration, Persian commerce setup, SEO/GEO and admin expansion documentation.

### 2.2 What is already present and must be preserved

- Next.js App Router routes for the homepage, shop, products, categories, campaigns, collections, cart, purchase-result pages, account, profile, orders, wishlist and admin dashboard.
- Existing Persian RTL storefront, visual theme tokens, responsive page components and navigation.
- Server-generated metadata, public product metadata/structured data, canonical/noindex handling, robots and sitemap support.
- Existing authentication using JWT and HTTP-only cookies, refresh-token coordination and account permission checks.
- Product catalogue, dynamic category hierarchy, category-defined attributes, product variants and inventory fields.
- Cart, coupon, shipping, order and Zarinpal IRT/Toman checkout flow.
- Existing stock reservation/recovery logic and payment reconciliation mechanisms.
- Product reviews and moderation, audit logs, customer administration, operations metrics and support/service cases.
- Redis-backed controls and the existing CI/build/test workflows.

Do not replace these capabilities with placeholder implementations during the migration. Existing routes and behavior are the compatibility baseline.

### 2.3 Known gaps or unfinished verification

The current source and its documentation indicate the following work remains or needs a deeper audit:

- The Next.js migration checklist still identifies browser-level verification of auth cookies, cart, checkout and visual behavior as outstanding.
- Live login/signup/password recovery/reset flows and preview/proxy/cookie behavior still need end-to-end verification.
- Existing interactive components retain a React Router compatibility bridge; the Next.js App Router is already the route matcher, but the remaining component navigation APIs should be removed incrementally.
- The current data layer is MongoDB/Mongoose, not PostgreSQL.
- No complete double-entry general ledger/accounting module is identified in the current backend.
- Current support/refund documentation describes refund status as operational bookkeeping; it does not claim to execute a refund through Zarinpal.
- Current sales reporting is not sufficient to claim audited net revenue or profit. Existing gross paid-order totals must not be relabeled as profit.
- A bulk product-price operation with a preview, audited job execution, idempotency and safe reversal must be implemented or verified; it is not established by the current route inventory.
- Existing low-stock and operational metrics need defined thresholds, pagination/scale behavior and notification policy before being treated as a complete inventory-alerting system.
- The 1,000,000-actions/day target has no agreed definition of action, peak RPS, concurrent users or latency/error objective yet.

---

## 3. Target module boundaries

The backend remains one deployable Node.js application, but each domain owns its routes, validation, services, repositories, persistence mapping and tests.

Proposed structure after incremental refactoring:

```text
backend/
├── src/
│   ├── app.ts
│   ├── server.ts
│   ├── config/
│   │   ├── env.ts
│   │   └── database.ts
│   ├── modules/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── access-control/
│   │   ├── catalog/
│   │   ├── categories/
│   │   ├── pricing/
│   │   ├── inventory/
│   │   ├── cart/
│   │   ├── orders/
│   │   ├── payments/
│   │   ├── accounting/
│   │   ├── refunds/
│   │   ├── shipping/
│   │   ├── reviews/
│   │   ├── promotions/
│   │   ├── customer-support/
│   │   ├── reporting/
│   │   ├── notifications/
│   │   └── audit/
│   ├── infrastructure/
│   │   ├── postgres/
│   │   ├── redis/
│   │   ├── queue/
│   │   ├── storage/
│   │   ├── payments/
│   │   └── observability/
│   └── shared/
│       ├── errors/
│       ├── http/
│       ├── security/
│       └── types/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── tests/
└── package.json
```

This is the target organization, not a one-commit folder move. Move one bounded module at a time, retain route compatibility, and keep the existing backend tests running throughout. Do not create empty folders or move all files before there are tested domain boundaries.

### Module responsibilities

| Module | Responsibilities |
|---|---|
| Auth and users | Signup/login, password reset, sessions, addresses, customer profile and account lifecycle. |
| Access control | Roles, permissions, least privilege, last-admin safety and route/action authorization. |
| Catalog | Products, images, technical specifications, attributes and product variants. |
| Categories | Hierarchy, stable slugs, localized names, inherited attributes and filters. |
| Pricing | Base prices, price rules, promotions, bulk price jobs, price history and previews. |
| Inventory | Warehouses, stock balances, reservations, movements, adjustments and low-stock rules. |
| Cart | Guest/authenticated cart behavior and server-side cart validation. |
| Orders | Order lifecycle, immutable order-item snapshots and fulfillment state. |
| Payments | Zarinpal request, callback verification, payment attempts, transactions and reconciliation. |
| Accounting | Chart of accounts, journal entries, journal lines, postings, reconciliation and financial statements. |
| Refunds | Request/approval/execution state, provider reference, partial/full refund and ledger postings. |
| Shipping | Shipping methods, charges, carrier/tracking and delivery events. |
| Reviews | Verified-purchase eligibility, review submission, moderation and ratings. |
| Promotions | Coupons, campaign rules, eligibility, reservation and redemption. |
| Customer support | Support, returns and service cases with auditable history. |
| Reporting | Sales, inventory, order, payment, refund and accounting reports. |
| Notifications | Email/SMS/provider adapters and retryable notification jobs. |
| Audit | Immutable business/security event history and administrator actions. |

---

## 4. Database design and safe MongoDB-to-PostgreSQL migration

### 4.1 Target relational model

The final PostgreSQL model should include at least the following logical entities. Exact columns, constraints and indexes will be finalized from the audited current models and customer clarifications.

| Domain | Core tables |
|---|---|
| Identity | `users`, `roles`, `permissions`, `user_roles`, `role_permissions`, `addresses`, `sessions` (only if session ownership moves from Redis). |
| Catalogue | `products`, `product_variants`, `product_media`, `product_attributes`, `product_attribute_values`. |
| Categories | `categories`, `category_closure` or `category_paths`, `category_attributes`. |
| Pricing | `price_rules`, `price_history`, `bulk_price_jobs`, `bulk_price_job_items`, `promotions`, `coupons`. |
| Inventory | `warehouses`, `inventory_balances`, `inventory_reservations`, `stock_movements`, `inventory_adjustments`. |
| Shopping | `carts`, `cart_items`, `wishlists`, `wishlist_items`. |
| Orders | `orders`, `order_items`, `order_status_events`, `shipment_events`. |
| Payments | `payment_attempts`, `payment_transactions`, `payment_callbacks`, `reconciliation_runs`. |
| Refunds | `refund_requests`, `refund_transactions`, `refund_events`. |
| Accounting | `chart_of_accounts`, `fiscal_periods`, `journal_entries`, `journal_lines`, `accounting_dimensions`, `reconciliation_records`. |
| Customer interaction | `reviews`, `review_moderation_events`, `support_cases`, `support_case_events`. |
| Operations | `audit_events`, `outbox_events`, `background_jobs` (or BullMQ-managed job state), `store_settings`. |

Use database constraints for invariants whenever practical: unique identifiers, foreign keys, non-negative quantities, valid status values and unique idempotency keys. Use indexes based on measured query patterns, not indiscriminate indexing.

### 4.2 Money and currency rules

- Keep the store policy limited to IRT/Toman and Zarinpal unless the customer changes the requirement.
- Persist whole-Toman amounts as integer values with a range suitable for the store's expected values; use PostgreSQL `BIGINT` where appropriate rather than floating-point types.
- Convert Toman to Rial only at the Zarinpal API boundary, following the already documented conversion policy.
- Keep product price, discount, shipping fee, payment amount, refund amount and accounting amount semantics explicit.
- Never silently convert historical MongoDB order amounts. The current documentation explicitly preserves legacy order amounts and excludes records without explicit IRT/Zarinpal metadata from active financial totals until reconciled.
- Store timestamps in UTC and format Persian/Jalali dates at the presentation/reporting boundary.

### 4.3 Migration sequence — no destructive cutover

1. Inventory every MongoDB collection, document count, index, unique constraint, TTL index, reference, script and production query.
2. Produce a source-to-target field mapping. Include Mongo ObjectId mapping, legacy identifiers, password hashes, permission compatibility, historical orders, payment references, stock variants and audit history.
3. Create the PostgreSQL schema and Prisma migrations in a development environment.
4. Build repeatable, restartable ETL scripts with checkpoints, bounded batches, validation reports and a dry-run mode.
5. Migrate a sanitized database snapshot into a disposable PostgreSQL database.
6. Compare source and target record counts, totals, relations, unique keys, product variants, inventory totals, order/payment status distributions and historical financial sums.
7. Run application integration tests against PostgreSQL repositories while MongoDB remains the current production source of truth.
8. Perform a controlled final synchronization/cutover plan approved by the customer. Freeze relevant writes for the final delta unless a separately tested change-capture strategy is designed.
9. Keep a verified MongoDB backup and documented rollback procedure. Do not destroy or mutate the source database during the initial migration.
10. Switch traffic only after reconciliation checks pass. Keep rollback criteria, owner and decision window documented.

Do not casually dual-write a payment/order/inventory aggregate to both databases: that creates a distributed consistency problem. If a temporary dual-write or change-capture strategy is required to meet availability constraints, design it explicitly with outbox/reconciliation and failure recovery tests.

---

## 5. Transaction safety, inventory and payment correctness

### 5.1 Inventory

The target must prevent overselling under concurrent checkout. For PostgreSQL, use conditional updates and transaction-scoped row locks. A stock reservation succeeds only when available quantity is sufficient; the reservation and order/payment state must be coordinated.

Required behavior:

- Reserve the exact product variant and quantity within a database transaction.
- Reject stale carts and insufficient stock using current server-side prices and stock.
- Give reservations a bounded expiry and release expired reservations through a retryable worker.
- Record every stock change as an append-only movement with reason, actor/source, reference and timestamp.
- Do not treat unknown/untracked stock as zero or silently sell it; preserve the current explicit unknown-stock behavior until an administrator configures it.
- Make reservation creation/release idempotent so retries cannot double-decrement or double-release inventory.

### 5.2 Payments

Keep Zarinpal as the payment provider for this customer scope. Preserve the existing payment reconciliation safeguards while introducing a clear payment state machine.

Required behavior:

- Persist each payment attempt with an idempotency key and unique provider authority/reference constraints.
- Do not trust the browser success/cancel redirect as proof of payment.
- Verify provider callback data server-side.
- Make duplicate callbacks safe: the same successful callback must never create a second capture, order finalization or accounting posting.
- Treat ambiguous provider/network outcomes as pending/unknown until reconciled; do not mark them failed merely because the client timed out.
- Finalize the order, consume coupon reservation, update inventory and produce the accounting event once.
- Reconcile pending/unknown transactions using the existing scheduled process, with monitored retry limits and alerts.
- Keep provider secrets only on the backend.

### 5.3 Refunds

The current project documentation says the refund workflow is bookkeeping and does not issue provider refunds. The target must not claim automatic refunds until the exact Zarinpal capability, merchant access, API behavior and customer approval are verified.

Model refund stages separately:

1. Requested.
2. Reviewed/approved or rejected.
3. Submitted to payment provider (only if supported and enabled).
4. Confirmed by provider, or manually confirmed by an authorized operator with a reference.
5. Posted to the accounting ledger.
6. Closed with an audit event.

Support full and partial refunds only after the customer defines approval limits, return conditions, refund timing, shipping-fee policy and provider execution rules.

---

## 6. Advanced accounting and financial reporting

This is a distinct business module, not just a dashboard chart.

### 6.1 Required accounting foundation

Implement a double-entry ledger:

- Configurable chart of accounts.
- Fiscal periods and period close controls.
- Journal entries with balanced debit and credit lines.
- Immutable posted entries; corrections use reversing/adjusting entries rather than editing posted history.
- Source references linking entries to orders, payments, fees, discounts, refunds, returns and inventory cost events.
- User/administrator attribution and audit history.
- Trial balance and account ledger.
- Sales, payment, refund and settlement reconciliation.
- Exportable, date-filtered financial reports with explicit IRT/Toman units.

Every posted journal entry must balance: total debits equal total credits. Posting must be idempotent and occur in the same transaction as the business event or through a transactional outbox with safe retry and deduplication.

### 6.2 Profit-reporting limitation

Do not report gross paid order value as profit. Gross sales, discounts, shipping, provider fees, refunds, taxes (if applicable) and cost of goods sold must be separated.

A reliable gross-profit report requires product purchase cost and an agreed inventory valuation method (for example, weighted average or FIFO). The current product model does not establish a complete cost-accounting policy. Obtain the customer's confirmation before presenting net profit or tax reports.

### 6.3 Accounting acceptance tests

- Every posted entry balances.
- Duplicate payment callbacks produce no duplicate journal entry.
- Failed/expired payments do not create sales revenue postings.
- Full and partial refund postings reverse the correct components.
- A closed fiscal period cannot be silently modified.
- Trial balance totals reconcile to account ledger totals.
- Report totals reconcile to source orders, payment transactions and refund transactions.

---

## 7. Bulk catalogue and percentage price operations

Build a dedicated Pricing module and admin workflow; do not implement bulk price changes as a direct unbounded database update from an HTTP request.

The workflow must support:

1. Filter target products by category/subcategory, selected product IDs, attributes/variant criteria, active status and other agreed catalogue filters.
2. Preview affected-product count and a sample of before/after values before execution.
3. Configure percentage increase or decrease; define the rounding rule and minimum/maximum allowed price.
4. Require explicit administrator confirmation and an idempotency key.
5. Enqueue large jobs through BullMQ instead of holding an HTTP request open.
6. Process in bounded chunks with progress, retry and cancellation rules.
7. Record operator, filters, percentage, rounding rule, timestamp, job ID and before/after prices in an audit record.
8. Preserve a durable per-item change record to support a compensating rollback.
9. Revalidate current price/version before applying a delayed job so it does not overwrite a newer manual price change.
10. Invalidate affected product/category cache entries after successful writes.

Bulk jobs must be resumable and safe to retry. A cancelled or failed job must expose exactly which products were updated and which were not.

---

## 8. Next.js frontend completion

The frontend has a large amount of working UI. Keep the current layout, palette, Persian RTL direction and existing interaction patterns. The customer is buying a specialist store, not an unnecessary visual redesign.

### 8.1 Preserve and validate existing App Router routes

Audit every current route and map it to a route acceptance test:

- Homepage and store information/policies.
- Shop, category, nested category, product, campaign and collection pages.
- Product gallery, attributes, variant selection, stock status and reviews.
- Guest/authenticated cart and checkout.
- Zarinpal success, cancel, callback-return and uncertain-payment status pages.
- Signup, login, password recovery and reset.
- Profile and saved addresses, order history, wishlist.
- Permission-aware admin dashboard and all existing tabs.

### 8.2 Complete the Next.js migration bridge cleanup

- Keep App Router as the sole route matcher.
- Incrementally replace React Router `Link`, `NavLink`, `useNavigate`, `useLocation` and `useSearchParams` usage with Next.js navigation APIs.
- Remove the compatibility provider only after all consumers have been migrated and tests prove direct navigation, refresh, query parameters and browser back/forward work.
- Keep client components where interactive state/browser APIs require them; do not force every component into a Server Component.
- Move suitable public catalogue reads to server-side data access with explicit caching/revalidation policy.
- Keep all pricing, permissions, stock validation, payment and order authority in the backend.
- Keep private account/admin/checkout routes out of search indexes.
- Keep API access same-origin through `/api` where possible and preserve HTTP-only cookie behavior.

### 8.3 New admin workflows

Add the new accounting, pricing job and financial reporting screens within the existing admin shell. Reuse existing tabs, permission checks, tables, dialogs and design tokens. Add no broad redesign. Ensure permissions are enforced by the API, not merely by hiding frontend controls.

---

## 9. API contracts and compatibility

- Preserve the existing `/api` prefix and current route behavior during incremental module extraction.
- Publish OpenAPI documentation for request/response schemas, authorization, pagination, error formats and idempotency requirements.
- Standardize validation and error handling without leaking stack traces, provider secrets or database details.
- Keep browser cookies secure, HTTP-only and correctly scoped for the final deployment domain.
- Use explicit API versioning only where a breaking contract is unavoidable; do not break existing frontend behavior simply to rename endpoints.
- Add contract tests covering the Next.js client against the API.
- Add rate limits by endpoint class; checkout, login, password reset and public catalogue reads must not share one simplistic limit.

---

## 10. Performance, concurrency and scale

### 10.1 Interpret the volume target

One million actions per 24 hours is approximately **11.6 actions per second on average**, if “action” means one request/operation spread evenly across the day. The average does not describe peak traffic. If “action” instead means a click, internal database operation, page view or multiple API calls, the load profile is different.

Before capacity sign-off, the customer must define:

- What counts as an action.
- Expected peak RPS and concurrent users.
- Read/write mix and busiest business periods.
- Checkout/payment concurrency.
- Product/catalogue size and growth.
- P95/P99 response-time target and acceptable error rate.
- Availability, backup RPO and recovery-time RTO.

### 10.2 Engineering controls

- Profile critical endpoints and database queries before tuning.
- Add indexes that match actual filters, sort orders and joins.
- Use connection pooling and set hard limits for each application replica.
- Use Redis cache for suitable public catalogue/category/configuration reads with explicit invalidation.
- Never use cache as the source of truth for stock, payment state or accounting balances.
- Use cursor pagination for large/high-churn datasets where offset pagination becomes expensive.
- Move report generation, bulk price updates, media work and notifications to BullMQ workers.
- Use bounded worker concurrency and backpressure; do not allow unbounded queue growth.
- Use idempotency keys, unique constraints and transaction boundaries on all money/stock state transitions.
- Add request IDs, structured logs, metrics and tracing to identify slow API, DB and queue operations.
- Scale stateless API instances horizontally behind a reverse proxy/load balancer.
- Add PostgreSQL read replicas only when measurements justify them and only for queries that can tolerate replica lag.

### 10.3 Load-test scenarios

Create reproducible k6 (or equivalent) scenarios for:

- Anonymous homepage/category/product browsing.
- Search and filtered catalogue pagination.
- Authenticated profile/order reads.
- Cart add/update and stock contention.
- Checkout creation and duplicate submission.
- Payment callback duplicate/retry/reconciliation.
- Concurrent purchase of the last unit of a product variant.
- Bulk price job submission and worker processing.
- Admin reports over increasing date ranges.
- Mixed workload with queue and database saturation observation.

Record test data volume, duration, concurrency, RPS, p50/p95/p99 latency, error rate, database pool saturation, query latency, CPU, memory and queue backlog. Do not claim the one-million-actions/day target is met until the agreed peak profile passes.

---

## 11. Infrastructure and deployment

### 11.1 Initial host baseline

The customer's initial proposal lists 8 CPU cores and 32 GB RAM. Treat this as the starting capacity envelope, not a guarantee of all future peak traffic.

- Linux: supported Ubuntu Server LTS.
- Storage: NVMe SSD with monitoring and sufficient backup capacity.
- Containers: Docker with resource limits and health checks.
- Reverse proxy: Nginx or equivalent.
- Application: Next.js and Node.js API as independently deployable processes.
- Database: PostgreSQL, private network only, regular verified backups.
- Cache/queue: Redis, private network only.
- Media: existing Cloudinary integration or customer-approved object storage.
- Process supervision: container restart policies and health checks; use a managed orchestrator only when required by scale/operations.
- TLS: HTTPS for storefront, API, admin and payment callback.
- Secrets: host secret manager/environment injection; never commit credentials.

### 11.2 Recommended production topology

For the initial installation, services may be containerized on the supplied host only if load testing confirms adequate resource isolation. For a stable production system, separate the stateful database from the application host as soon as budget and hosting allow.

```text
Internet
   |
TLS / Nginx
   |
   +---- Next.js application replicas
   |
   +---- Node.js API replicas
              |
              +---- PostgreSQL (private)
              |
              +---- Redis (private)
              |
              +---- BullMQ workers
              |
              +---- Cloudinary / object storage
```

### 11.3 Production operations

- Liveness and readiness checks with dependency status.
- Centralized, redacted application logs.
- CPU, memory, disk, database connections, slow queries and queue-depth alerts.
- Automated PostgreSQL backups and tested restore drills.
- Backup retention and off-host copy.
- Documented rollback and incident runbooks.
- Staging environment using isolated test credentials and non-production payment mode.
- Payment reconciliation scheduler configured exactly once.
- Deployment and database migrations run as controlled release steps; schema changes must be backward-compatible with the running application during rollout.

---

## 12. Security requirements

- Enforce server-side authorization for every admin operation.
- Preserve least-privilege permissions and last-administrator safety.
- Use secure password hashing and password-reset token handling.
- Keep access credentials and provider/API secrets out of browser bundles and Git.
- Validate and normalize request data at the API boundary.
- Apply rate limits and abuse controls to auth, checkout, search and other exposed endpoints.
- Protect against CSRF according to the final cookie/origin deployment model; preserve explicit origin/CORS allowlisting.
- Use TLS, secure cookie attributes and trusted-proxy configuration.
- Keep audit trails for permission changes, price changes, inventory adjustments, order/payment/refund actions and accounting postings.
- Redact personal data and secrets from logs.
- Review file uploads, image URLs, payload size limits and spreadsheet exports.
- Run dependency/security scanning and a focused authorization regression suite before release.

---

## 13. Execution roadmap — 12-week delivery window

The sequence is designed to keep the existing storefront usable while the backend foundation is improved. Some workstreams can run in parallel after the API/data contracts are agreed.

| Week | Phase | Deliverables and exit gate |
|---|---|---|
| 1 | Baseline and requirements lock | Route/API/data inventory, acceptance criteria, traffic definitions, accounting/refund questions, current CI/build baseline, release risk register. |
| 2 | Architecture and data design | Module boundaries, OpenAPI contract baseline, PostgreSQL ERD, Mongo-to-Postgres mapping, infrastructure and rollback design approved. |
| 3 | Platform foundation | TypeScript adoption foundation, environment validation, logging/metrics/request IDs, Prisma/PostgreSQL development environment, Redis/BullMQ worker foundation. |
| 4 | Data migration rehearsal | Repeatable ETL, dry-run report, data reconciliation, legacy-ID mapping, test/rollback rehearsal. No production cutover without signed acceptance. |
| 5 | Core domain refactor | Auth/users/access, catalogue/categories, API repositories and contract tests; compatibility with Next.js route flows maintained. |
| 6 | Inventory and order correctness | Variant inventory, reservation/release, stock movements, order lifecycle and concurrency regression tests. |
| 7 | Payment hardening | Zarinpal attempt/transaction state machine, idempotent callbacks, reconciliation, payment/order integration tests. |
| 8 | Pricing and admin operations | Filtered bulk price preview/jobs, audit trail, cancellation/retry and compensating rollback; admin UI integrated without redesign. |
| 9 | Accounting and reporting | Chart of accounts, double-entry postings, financial reconciliation, trial balance and agreed sales/refund reports. |
| 10 | Frontend integration and feature completion | App Router bridge cleanup where safe, route/SEO/auth/cart/checkout/admin integration, responsive/accessibility regressions. |
| 11 | Performance, security and defect correction | Mixed workload/load tests, query/index tuning, security review, recovery/backup restore exercise, bug fixes. |
| 12 | Release and handover | Production deployment rehearsal, acceptance evidence, runbooks, source/API/DB documentation, training and handover. |

**Scope control:** The three-month commitment depends on the customer resolving accounting policy, cost accounting, refund execution, peak-load definitions, and hosting access early. Any unresolved scope that changes the data model or payment lifecycle must be recorded as a decision/change request rather than silently absorbed.

---

## 14. Acceptance checklist

A capability is complete only when its implementation, tests and operational behavior are evidenced.

### Storefront and Next.js
- [ ] All existing public and private routes have direct-navigation and refresh tests.
- [ ] Persian RTL and current UI behavior are preserved.
- [ ] Product/category metadata, canonical URLs, robots and sitemap work on the deployed origin.
- [ ] Authentication cookies, refresh, logout, password reset and protected routes pass browser tests.
- [ ] Cart, guest-to-user cart behavior, checkout and purchase-result pages pass end-to-end tests.
- [ ] React Router bridge is removed only after all consumers have been migrated and verified.

### Catalogue and administration
- [ ] Products support agreed hardware-specific specifications and variant combinations.
- [ ] Category hierarchy and attribute/filter rules work with the agreed catalogue scale.
- [ ] Bulk percentage changes support dry-run preview, confirmation, audit, progress, idempotent retry and compensating rollback.
- [ ] Role/permission enforcement is server-side and regression-tested.

### Inventory, order and payment
- [ ] Concurrent last-unit checkout cannot oversell.
- [ ] Reservation expiry and recovery are tested.
- [ ] Duplicate checkout/payment callbacks cannot duplicate orders, stock changes or postings.
- [ ] Zarinpal sandbox lifecycle and reconciliation pass.
- [ ] Refund handling matches the specifically approved manual/automatic execution policy.

### Accounting
- [ ] Posted journal entries always balance.
- [ ] Payment, discount, shipping and refund entries reconcile to source transactions.
- [ ] Trial balance and account ledger reconcile.
- [ ] Revenue, net sales and profit are clearly distinguished.
- [ ] Profit reporting is disabled or explicitly qualified until cost and inventory valuation rules are approved.

### Scale and operations
- [ ] One million actions/day is tested using the agreed definition and peak profile.
- [ ] Latency/error objectives are measured and accepted.
- [ ] Database pool, CPU/memory and queue backlog remain within approved limits under test.
- [ ] Backup restoration and application rollback are demonstrated.
- [ ] Monitoring and actionable alerts are configured.

---

## 15. Customer decisions required before implementation is considered scope-complete

These are not implementation assumptions; they require customer confirmation.

1. **Traffic:** Does one action mean an HTTP request, page view, user interaction or internal operation? What peak concurrent users and peak RPS are expected?
2. **Hardware catalogue:** Approximate number of products, variants, categories, attributes, warehouses and expected yearly growth?
3. **Accounting depth:** Does “advanced accounting” mean sales/expense reporting or a full general ledger with chart of accounts, journal vouchers, trial balance, fiscal periods, tax and cost of goods sold?
4. **Costing:** Will purchase cost be recorded per product/batch, and which inventory valuation method is required?
5. **Refunds:** Must the system execute refunds through Zarinpal, or only track approval and an operator-completed refund?
6. **Returns:** What is the return window, eligible condition, partial-refund rule and shipping-fee policy?
7. **Pricing:** What rounding rule, price floor/ceiling, approval requirement and rollback expectation apply to percentage price updates?
8. **Warehouses:** Is the first version single-warehouse or multi-warehouse?
9. **Infrastructure:** Is the 8-core/32-GB server the only permitted host, or can PostgreSQL/Redis be hosted separately?
10. **Availability/recovery:** What uptime, backup RPO and recovery RTO does the customer require?

---

## 16. Change-safety rules for this branch

- Work only on `feat/customer-requirements-platform` until review and an explicit merge decision.
- Do not commit to or push changes directly to `master`.
- Do not merge the source Next.js branch into `master` as part of this work.
- Preserve the existing Next.js UI, Persian RTL layout and semantic theme tokens unless a specific defect requires a narrowly scoped fix.
- Preserve current API behavior while module boundaries are introduced.
- Never run schema/data migrations against production before backup, dry-run, reconciliation, approval and rollback preparation.
- Never change live currency/provider settings or claim catalogue prices are verified without evidence.
- Do not replace payment/inventory/accounting safeguards with mocks or frontend-only checks.
- Keep changes small enough to review and test; each phase must have a clear acceptance gate.
- Record every schema, environment, route or deployment setting change in the relevant documentation.

## 17. Immediate next actions

1. Complete the detailed current-state audit of routes, models, indexes, env variables, tests and the remaining Next.js migration checklist.
2. Add the agreed traffic/accounting/refund assumptions to an Architecture Decision Record.
3. Build the PostgreSQL ERD and source-to-target Mongo mapping before changing persistence code.
4. Establish a reproducible local/staging environment and baseline CI.
5. Begin the first vertical slice only after the schema and compatibility contract are reviewed: catalogue read path first, then one transactional domain at a time.

**Definition of done:** The customer receives a working, tested Next.js storefront backed by a Node.js API with reliable catalogue, inventory, order, payment, accounting and administrative workflows; evidence-based capacity validation; reproducible deployment; and complete technical handover. A successful build alone is not production readiness.
