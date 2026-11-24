ALTER TABLE "account_sessions"
  ADD COLUMN "loginIpAddress" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "lastIpAddress" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "loginUserAgent" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "lastUserAgent" TEXT NOT NULL DEFAULT '';

-- Preserve the most recent values available for existing sessions. The original
-- login IP/user-agent cannot be reconstructed because older refreshes overwrote them.
UPDATE "account_sessions"
SET "lastIpAddress" = "ipAddress",
    "lastUserAgent" = "userAgent";
