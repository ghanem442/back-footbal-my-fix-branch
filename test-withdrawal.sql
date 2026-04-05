-- Create a test withdrawal request directly
INSERT INTO "WithdrawalRequest" (id, "ownerId", amount, status, "paymentMethod", "accountDetails", "createdAt", "updatedAt")
VALUES (
  'test-wr-001',
  '3c37acce-0e25-48f8-a60e-e3c00484bd16',
  100.00,
  'PENDING',
  'instapay',
  '01012345678',
  NOW(),
  NOW()
);

SELECT id, "ownerId", amount, status, "paymentMethod", "accountDetails", "createdAt" FROM "WithdrawalRequest";
