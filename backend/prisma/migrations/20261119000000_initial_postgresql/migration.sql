-- Fresh PostgreSQL schema for Tik Boutique / MERN Ecommerce.
-- No MongoDB documents are imported. IDs retain the legacy 24-character hex format.
CREATE TABLE "users" (
  "id" VARCHAR(24) NOT NULL DEFAULT substring(replace(gen_random_uuid()::text, '-', ''), 1, 24),
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "password" TEXT NOT NULL,
  "passwordResetTokenHash" TEXT,
  "passwordResetExpiresAt" TIMESTAMP(3),
  "defaultShippingAddress" JSONB,
  "savedShippingAddresses" JSONB NOT NULL DEFAULT '[]',
  "cartItems" JSONB NOT NULL DEFAULT '[]',
  "role" TEXT NOT NULL DEFAULT 'customer',
  "permissions" JSONB,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "primaryPhone" TEXT NOT NULL DEFAULT '',
  "phoneVerifiedAt" TIMESTAMP(3),
  "emailVerifiedAt" TIMESTAMP(3),
  "emailVerificationTokenHash" TEXT,
  "emailVerificationExpiresAt" TIMESTAMP(3),
  "pendingEmail" TEXT NOT NULL DEFAULT '',
  "emailChangeTokenHash" TEXT,
  "emailChangeExpiresAt" TIMESTAMP(3),
  "wishlist" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "communicationPreferences" JSONB NOT NULL DEFAULT '{}',
  "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
  "twoFactorSecret" TEXT NOT NULL DEFAULT '',
  "deletionRequestedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "users_role_check" CHECK ("role" IN ('customer', 'admin'))
);
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "users_role_isActive_idx" ON "users"("role", "isActive");
CREATE INDEX "users_createdAt_idx" ON "users"("createdAt");

CREATE TABLE "account_sessions" (
  "id" VARCHAR(24) NOT NULL DEFAULT substring(replace(gen_random_uuid()::text, '-', ''), 1, 24),
  "userId" VARCHAR(24) NOT NULL,
  "tokenId" TEXT NOT NULL,
  "deviceName" TEXT NOT NULL DEFAULT 'دستگاه ناشناس',
  "userAgent" TEXT NOT NULL DEFAULT '',
  "ipAddress" TEXT NOT NULL DEFAULT '',
  "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "account_sessions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "account_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "account_sessions_tokenId_key" ON "account_sessions"("tokenId");
CREATE INDEX "account_sessions_userId_revokedAt_lastUsedAt_idx" ON "account_sessions"("userId", "revokedAt", "lastUsedAt" DESC);
CREATE INDEX "account_sessions_expiresAt_idx" ON "account_sessions"("expiresAt");

CREATE TABLE "security_notifications" (
  "id" VARCHAR(24) NOT NULL DEFAULT substring(replace(gen_random_uuid()::text, '-', ''), 1, 24),
  "userId" VARCHAR(24) NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "security_notifications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "security_notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "security_notifications_type_check" CHECK ("type" IN ('new_login','password_changed','email_changed','session_revoked','email_verified','account_deletion_requested','two_factor_changed'))
);
CREATE INDEX "security_notifications_userId_createdAt_idx" ON "security_notifications"("userId", "createdAt" DESC);

CREATE TABLE "audit_logs" (
  "id" VARCHAR(24) NOT NULL DEFAULT substring(replace(gen_random_uuid()::text, '-', ''), 1, 24),
  "actorId" VARCHAR(24),
  "actorName" TEXT NOT NULL DEFAULT 'Unknown admin',
  "actorRole" TEXT NOT NULL DEFAULT '',
  "action" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT NOT NULL DEFAULT '',
  "summary" TEXT NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "ip" TEXT NOT NULL DEFAULT '',
  "userAgent" TEXT NOT NULL DEFAULT '',
  "requestMethod" TEXT NOT NULL DEFAULT '',
  "requestPath" TEXT NOT NULL DEFAULT '',
  "requestId" TEXT NOT NULL DEFAULT '',
  "requestHost" TEXT NOT NULL DEFAULT '',
  "requestOrigin" TEXT NOT NULL DEFAULT '',
  "refererPath" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt" DESC);
CREATE INDEX "audit_logs_action_createdAt_idx" ON "audit_logs"("action", "createdAt" DESC);
CREATE INDEX "audit_logs_actorId_createdAt_idx" ON "audit_logs"("actorId", "createdAt" DESC);

CREATE TABLE "campaigns" (
  "id" VARCHAR(24) NOT NULL DEFAULT substring(replace(gen_random_uuid()::text, '-', ''), 1, 24),
  "title" TEXT NOT NULL,
  "slug" TEXT,
  "description" TEXT NOT NULL DEFAULT '',
  "image" TEXT NOT NULL DEFAULT '',
  "href" TEXT NOT NULL DEFAULT '/shop',
  "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "views" INTEGER NOT NULL DEFAULT 0,
  "clicks" INTEGER NOT NULL DEFAULT 0,
  "createdById" VARCHAR(24),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "campaigns_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "campaigns_counters_check" CHECK ("sortOrder" >= 0 AND "views" >= 0 AND "clicks" >= 0),
  CONSTRAINT "campaigns_href_check" CHECK (left("href", 1) = '/' AND left("href", 2) <> '//')
);
CREATE UNIQUE INDEX "campaigns_slug_key" ON "campaigns"("slug");
CREATE INDEX "campaigns_isActive_startsAt_endsAt_sortOrder_idx" ON "campaigns"("isActive", "startsAt", "endsAt", "sortOrder");

CREATE TABLE "categories" (
  "id" VARCHAR(24) NOT NULL DEFAULT substring(replace(gen_random_uuid()::text, '-', ''), 1, 24),
  "name" JSONB NOT NULL,
  "slug" TEXT NOT NULL,
  "parentId" VARCHAR(24),
  "ancestors" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "description" JSONB NOT NULL DEFAULT '{}',
  "image" TEXT NOT NULL DEFAULT '',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "showInNavigation" BOOLEAN NOT NULL DEFAULT true,
  "attributes" JSONB NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "categories_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "categories_sortOrder_check" CHECK ("sortOrder" >= 0)
);
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");
CREATE INDEX "categories_parentId_sortOrder_idx" ON "categories"("parentId", "sortOrder");
CREATE INDEX "categories_ancestors_idx" ON "categories" USING GIN ("ancestors");
CREATE INDEX "categories_isActive_showInNavigation_sortOrder_idx" ON "categories"("isActive", "showInNavigation", "sortOrder");

CREATE TABLE "coupons" (
  "id" VARCHAR(24) NOT NULL DEFAULT substring(replace(gen_random_uuid()::text, '-', ''), 1, 24),
  "code" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "discountPercentage" INTEGER NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "minOrderAmount" DECIMAL(18,0) NOT NULL DEFAULT 0,
  "maxDiscountAmount" DECIMAL(18,0),
  "usageLimit" INTEGER,
  "usageCount" INTEGER NOT NULL DEFAULT 0,
  "reservedCount" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdById" VARCHAR(24),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "coupons_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "coupons_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "coupons_discount_check" CHECK ("discountPercentage" BETWEEN 1 AND 100),
  CONSTRAINT "coupons_usage_check" CHECK ("usageCount" >= 0 AND "reservedCount" >= 0 AND ("usageLimit" IS NULL OR "usageLimit" >= 1)),
  CONSTRAINT "coupons_amount_check" CHECK ("minOrderAmount" >= 0 AND ("maxDiscountAmount" IS NULL OR "maxDiscountAmount" > 0))
);
CREATE UNIQUE INDEX "coupons_code_key" ON "coupons"("code");
CREATE INDEX "coupons_isActive_startsAt_expiresAt_idx" ON "coupons"("isActive", "startsAt", "expiresAt");

CREATE TABLE "newsletter_subscribers" (
  "id" VARCHAR(24) NOT NULL DEFAULT substring(replace(gen_random_uuid()::text, '-', ''), 1, 24),
  "email" TEXT NOT NULL,
  "isSubscribed" BOOLEAN NOT NULL DEFAULT true,
  "consentedAt" TIMESTAMP(3) NOT NULL,
  "unsubscribedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "newsletter_subscribers_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "newsletter_subscribers_email_key" ON "newsletter_subscribers"("email");
CREATE INDEX "newsletter_subscribers_isSubscribed_idx" ON "newsletter_subscribers"("isSubscribed");

CREATE TABLE "orders" (
  "id" VARCHAR(24) NOT NULL DEFAULT substring(replace(gen_random_uuid()::text, '-', ''), 1, 24),
  "userId" VARCHAR(24) NOT NULL,
  "products" JSONB NOT NULL,
  "shippingAddress" JSONB,
  "shipmentStatus" TEXT,
  "shippingCarrier" TEXT NOT NULL DEFAULT '',
  "trackingCode" TEXT NOT NULL DEFAULT '',
  "shippedAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "shipmentEvents" JSONB NOT NULL DEFAULT '[]',
  "totalAmount" DECIMAL(18,0) NOT NULL,
  "shippingFee" DECIMAL(18,0) NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'IRT',
  "paymentProvider" TEXT NOT NULL DEFAULT 'zarinpal',
  "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
  "paymentRequestStatus" TEXT NOT NULL DEFAULT 'not_started',
  "paymentRequestAttemptedAt" TIMESTAMP(3),
  "reconciliationAttempts" INTEGER NOT NULL DEFAULT 0,
  "reconciliationLastAttemptAt" TIMESTAMP(3),
  "reconciliationNextAttemptAt" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'pending',
  "subtotalAmount" DECIMAL(18,0) NOT NULL DEFAULT 0,
  "productDiscountAmount" DECIMAL(18,0) NOT NULL DEFAULT 0,
  "couponCode" TEXT NOT NULL DEFAULT '',
  "couponDiscountAmount" DECIMAL(18,0) NOT NULL DEFAULT 0,
  "couponDiscountPercentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
  "couponReservationStatus" TEXT NOT NULL DEFAULT 'none',
  "zarinpalAuthority" TEXT,
  "zarinpalRefId" TEXT NOT NULL DEFAULT '',
  "expiresAt" TIMESTAMP(3),
  "finalizedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "orders_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "orders_currency_provider_check" CHECK ("currency" = 'IRT' AND "paymentProvider" = 'zarinpal'),
  CONSTRAINT "orders_payment_status_check" CHECK ("paymentStatus" IN ('pending','paid','failed','expired')),
  CONSTRAINT "orders_request_status_check" CHECK ("paymentRequestStatus" IN ('not_started','in_flight','accepted','unknown','rejected','expired')),
  CONSTRAINT "orders_reservation_status_check" CHECK ("couponReservationStatus" IN ('none','reserved','redeemed','released')),
  CONSTRAINT "orders_amounts_check" CHECK ("totalAmount" >= 0 AND "shippingFee" >= 0 AND "subtotalAmount" >= 0 AND "productDiscountAmount" >= 0 AND "couponDiscountAmount" >= 0 AND "couponDiscountPercentage" BETWEEN 0 AND 100),
  CONSTRAINT "orders_reconciliation_attempts_check" CHECK ("reconciliationAttempts" >= 0)
);
CREATE UNIQUE INDEX "orders_zarinpalAuthority_key" ON "orders"("zarinpalAuthority");
CREATE INDEX "orders_userId_createdAt_idx" ON "orders"("userId", "createdAt" DESC);
CREATE INDEX "orders_paymentStatus_paymentProvider_createdAt_idx" ON "orders"("paymentStatus", "paymentProvider", "createdAt");
CREATE INDEX "orders_paymentProvider_paymentStatus_expiresAt_idx" ON "orders"("paymentProvider", "paymentStatus", "expiresAt");
CREATE INDEX "orders_paymentProvider_paymentRequestStatus_expiresAt_idx" ON "orders"("paymentProvider", "paymentRequestStatus", "expiresAt");
CREATE INDEX "orders_paymentProvider_paymentStatus_finalizedAt_idx" ON "orders"("paymentProvider", "paymentStatus", "finalizedAt");
CREATE INDEX "orders_paymentProvider_paymentStatus_reconciliationNextAttemptAt_createdAt_idx" ON "orders"("paymentProvider", "paymentStatus", "reconciliationNextAttemptAt", "createdAt");
CREATE INDEX "orders_paymentStatus_shipmentStatus_createdAt_idx" ON "orders"("paymentStatus", "shipmentStatus", "createdAt" DESC);

CREATE TABLE "products" (
  "id" VARCHAR(24) NOT NULL DEFAULT substring(replace(gen_random_uuid()::text, '-', ''), 1, 24),
  "name" TEXT NOT NULL,
  "brand" TEXT,
  "brandName" TEXT,
  "description" TEXT NOT NULL,
  "price" DECIMAL(18,0) NOT NULL,
  "discountPercent" INTEGER NOT NULL DEFAULT 0,
  "image" TEXT NOT NULL DEFAULT '',
  "images" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "category" TEXT NOT NULL,
  "categoryId" VARCHAR(24),
  "attributes" JSONB NOT NULL DEFAULT '{}',
  "customSpecifications" JSONB NOT NULL DEFAULT '[]',
  "searchTextNormalized" TEXT NOT NULL DEFAULT '',
  "searchTokens" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "effectivePrice" DECIMAL(18,0),
  "sizes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "colors" JSONB NOT NULL DEFAULT '[]',
  "variants" JSONB NOT NULL DEFAULT '[]',
  "fit" JSONB NOT NULL DEFAULT '{}',
  "sizeChart" JSONB NOT NULL DEFAULT '[]',
  "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  "stock" INTEGER,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "products_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "products_price_check" CHECK ("price" >= 0 AND ("effectivePrice" IS NULL OR "effectivePrice" >= 0)),
  CONSTRAINT "products_discount_check" CHECK ("discountPercent" BETWEEN 0 AND 99),
  CONSTRAINT "products_stock_check" CHECK ("stock" IS NULL OR "stock" >= 0)
);
CREATE INDEX "products_createdAt_idx" ON "products"("createdAt" DESC);
CREATE INDEX "products_category_price_createdAt_idx" ON "products"("category", "price", "createdAt" DESC);
CREATE INDEX "products_isActive_category_createdAt_id_idx" ON "products"("isActive", "category", "createdAt" DESC, "id" DESC);
CREATE INDEX "products_isActive_isFeatured_createdAt_id_idx" ON "products"("isActive", "isFeatured", "createdAt" DESC, "id" DESC);
CREATE INDEX "products_searchTokens_idx" ON "products" USING GIN ("searchTokens");
CREATE INDEX "products_isActive_effectivePrice_id_idx" ON "products"("isActive", "effectivePrice", "id");
CREATE INDEX "products_categoryId_effectivePrice_id_idx" ON "products"("categoryId", "effectivePrice", "id");
CREATE INDEX "products_category_effectivePrice_id_idx" ON "products"("category", "effectivePrice", "id");

CREATE TABLE "product_reviews" (
  "id" VARCHAR(24) NOT NULL DEFAULT substring(replace(gen_random_uuid()::text, '-', ''), 1, 24),
  "productId" VARCHAR(24) NOT NULL,
  "userId" VARCHAR(24) NOT NULL,
  "orderId" VARCHAR(24) NOT NULL,
  "rating" INTEGER NOT NULL,
  "comment" TEXT NOT NULL DEFAULT '',
  "displayName" TEXT NOT NULL,
  "verifiedPurchase" BOOLEAN NOT NULL DEFAULT true,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "moderatedById" VARCHAR(24),
  "moderatedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "product_reviews_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "product_reviews_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "product_reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "product_reviews_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "product_reviews_moderatedById_fkey" FOREIGN KEY ("moderatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "product_reviews_rating_check" CHECK ("rating" BETWEEN 1 AND 5),
  CONSTRAINT "product_reviews_status_check" CHECK ("status" IN ('pending','approved','rejected'))
);
CREATE UNIQUE INDEX "product_reviews_productId_userId_key" ON "product_reviews"("productId", "userId");
CREATE INDEX "product_reviews_productId_status_createdAt_idx" ON "product_reviews"("productId", "status", "createdAt" DESC);
CREATE INDEX "product_reviews_status_createdAt_idx" ON "product_reviews"("status", "createdAt" DESC);


CREATE TABLE "service_cases" (
  "id" VARCHAR(24) NOT NULL DEFAULT substring(replace(gen_random_uuid()::text, '-', ''), 1, 24),
  "userId" VARCHAR(24) NOT NULL,
  "orderId" VARCHAR(24),
  "type" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'open',
  "resolutionNote" TEXT NOT NULL DEFAULT '',
  "refundAmount" DECIMAL(18,0) NOT NULL DEFAULT 0,
  "refundStatus" TEXT NOT NULL DEFAULT 'not_applicable',
  "refundReference" TEXT NOT NULL DEFAULT '',
  "handledById" VARCHAR(24),
  "events" JSONB NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "service_cases_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "service_cases_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "service_cases_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "service_cases_handledById_fkey" FOREIGN KEY ("handledById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "service_cases_type_check" CHECK ("type" IN ('support','return','refund')),
  CONSTRAINT "service_cases_status_check" CHECK ("status" IN ('open','in_review','approved','rejected','resolved')),
  CONSTRAINT "service_cases_refund_status_check" CHECK ("refundStatus" IN ('not_applicable','requested','approved','processed','rejected')),
  CONSTRAINT "service_cases_refund_amount_check" CHECK ("refundAmount" >= 0)
);
CREATE INDEX "service_cases_userId_idx" ON "service_cases"("userId");
CREATE INDEX "service_cases_orderId_idx" ON "service_cases"("orderId");
CREATE INDEX "service_cases_type_status_idx" ON "service_cases"("type", "status");
CREATE INDEX "service_cases_createdAt_status_idx" ON "service_cases"("createdAt" DESC, "status");

CREATE TABLE "store_settings" (
  "id" VARCHAR(24) NOT NULL DEFAULT substring(replace(gen_random_uuid()::text, '-', ''), 1, 24),
  "key" TEXT NOT NULL DEFAULT 'default',
  "flatRate" DECIMAL(18,0) NOT NULL DEFAULT 0,
  "freeShippingThreshold" DECIMAL(18,0) NOT NULL DEFAULT 0,
  "updatedById" VARCHAR(24),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "store_settings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "store_settings_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "store_settings_amounts_check" CHECK ("flatRate" >= 0 AND "freeShippingThreshold" >= 0)
);
CREATE UNIQUE INDEX "store_settings_key_key" ON "store_settings"("key");

-- Prisma's implicit many-to-many relation for Campaign.products.
CREATE TABLE "_CampaignProducts" (
  "A" VARCHAR(24) NOT NULL,
  "B" VARCHAR(24) NOT NULL,
  CONSTRAINT "_CampaignProducts_A_fkey" FOREIGN KEY ("A") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "_CampaignProducts_B_fkey" FOREIGN KEY ("B") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "_CampaignProducts_AB_unique" ON "_CampaignProducts"("A", "B");
CREATE INDEX "_CampaignProducts_B_index" ON "_CampaignProducts"("B");
