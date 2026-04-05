-- Add Wallet Balance for Testing

-- Option 1: Add balance to specific user by email
UPDATE "Wallet" 
SET balance = 1000.00 
WHERE "userId" = (
  SELECT id FROM "User" WHERE email = 'player@test.com'
);

-- Option 2: Add balance to specific user by ID
UPDATE "Wallet" 
SET balance = 1000.00 
WHERE "userId" = 'user-uuid-here';

-- Option 3: Add balance (increment) instead of replace
UPDATE "Wallet" 
SET balance = balance + 500.00 
WHERE "userId" = (
  SELECT id FROM "User" WHERE email = 'player@test.com'
);

-- Option 4: Set balance for all players
UPDATE "Wallet" 
SET balance = 1000.00 
WHERE "userId" IN (
  SELECT id FROM "User" WHERE role = 'PLAYER'
);

-- Verify the balance
SELECT 
  u.email,
  u.role,
  w.balance,
  w."updatedAt"
FROM "Wallet" w
JOIN "User" u ON w."userId" = u.id
WHERE u.email = 'player@test.com';
