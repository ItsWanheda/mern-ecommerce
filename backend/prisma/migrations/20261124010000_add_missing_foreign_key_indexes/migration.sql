-- Add indexes for foreign-key columns used in relation filters, cleanup,
-- and admin lookups. This migration is additive and does not alter records.
CREATE INDEX "campaigns_createdById_idx" ON "campaigns"("createdById");
CREATE INDEX "coupons_createdById_idx" ON "coupons"("createdById");
CREATE INDEX "product_reviews_userId_idx" ON "product_reviews"("userId");
CREATE INDEX "product_reviews_orderId_idx" ON "product_reviews"("orderId");
CREATE INDEX "product_reviews_moderatedById_idx" ON "product_reviews"("moderatedById");
CREATE INDEX "store_settings_updatedById_idx" ON "store_settings"("updatedById");
