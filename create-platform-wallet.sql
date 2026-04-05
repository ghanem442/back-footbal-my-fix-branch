-- Create PlatformTransactionType enum
DO $$ BEGIN
  CREATE TYPE "PlatformTransactionType" AS ENUM (
    'BOOKING_DEPOSIT',
    'BOOKING_REFUND',
    'ADMIN_WITHDRAWAL',
    'MANUAL_ADJUSTMENT'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create PlatformWallet table
CREATE TABLE IF NOT EXISTS "PlatformWallet" (
  "id"        TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "balance"   DECIMAL(10,2) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformWallet_pkey" PRIMARY KEY ("id")
);

-- Create PlatformWalletTransaction table
CREATE TABLE IF NOT EXISTS "PlatformWalletTransaction" (
  "id"               TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "platformWalletId" TEXT NOT NULL,
  "type"             "PlatformTransactionType" NOT NULL,
  "amount"           DECIMAL(10,2) NOT NULL,
  "balanceBefore"    DECIMAL(10,2) NOT NULL,
  "balanceAfter"     DECIMAL(10,2) NOT NULL,
  "bookingId"        TEXT,
  "reference"        TEXT,
  "description"      TEXT,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformWalletTransaction_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PlatformWalletTransaction_platformWalletId_fkey"
    FOREIGN KEY ("platformWalletId") REFERENCES "PlatformWallet"("id")
);

CREATE INDEX IF NOT EXISTS "PlatformWalletTransaction_platformWalletId_idx" ON "PlatformWalletTransaction"("platformWalletId");
CREATE INDEX IF NOT EXISTS "PlatformWalletTransaction_bookingId_idx" ON "PlatformWalletTransaction"("bookingId");
CREATE INDEX IF NOT EXISTS "PlatformWalletTransaction_createdAt_idx" ON "PlatformWalletTransaction"("createdAt");

-- Insert the single platform wallet if not exists
INSERT INTO "PlatformWallet" ("id", "balance", "createdAt", "updatedAt")
SELECT 'platform-wallet-001', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "PlatformWallet" WHERE "id" = 'platform-wallet-001');

SELECT id, balance FROM "PlatformWallet";
