-- Add test balance to platform wallet and create a test transaction
UPDATE "PlatformWallet" SET balance = 1000, "updatedAt" = NOW() WHERE id = 'platform-wallet-001';

INSERT INTO "PlatformWalletTransaction" (id, "platformWalletId", type, amount, "balanceBefore", "balanceAfter", "bookingId", description, "createdAt")
VALUES (
  gen_random_uuid()::text,
  'platform-wallet-001',
  'MANUAL_ADJUSTMENT',
  1000,
  0,
  1000,
  NULL,
  'Initial test balance',
  NOW()
);

SELECT id, balance FROM "PlatformWallet";
