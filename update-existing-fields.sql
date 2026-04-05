-- Update Existing Fields with basePrice
-- Run this SQL after migration to set basePrice for existing fields

-- Option 1: Set default price (300 EGP) for all fields without basePrice
UPDATE "Field" 
SET "basePrice" = 300.00 
WHERE "basePrice" IS NULL 
  AND "deletedAt" IS NULL;

-- Option 2: Set different prices based on field name or location
-- Example: Premium fields get higher price
-- UPDATE "Field" 
-- SET "basePrice" = 500.00 
-- WHERE "name" LIKE '%Premium%' 
--   AND "basePrice" IS NULL 
--   AND "deletedAt" IS NULL;

-- Option 3: Update specific field by ID
-- UPDATE "Field" 
-- SET "basePrice" = 400.00 
-- WHERE id = 'your-field-uuid-here';

-- Verify the update
SELECT 
  id,
  name,
  address,
  "basePrice",
  "createdAt"
FROM "Field"
WHERE "deletedAt" IS NULL
ORDER BY "createdAt" DESC;
