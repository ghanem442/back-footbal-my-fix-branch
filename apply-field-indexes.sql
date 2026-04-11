-- Apply Field indexes for better query performance
-- Run this on Railway database using: railway run psql < apply-field-indexes.sql

-- Index on deletedAt for filtering non-deleted fields
CREATE INDEX IF NOT EXISTS "Field_deletedAt_idx" ON "Field"("deletedAt");

-- Index on ownerId for filtering fields by owner
CREATE INDEX IF NOT EXISTS "Field_ownerId_idx" ON "Field"("ownerId");

-- Index on createdAt for sorting
CREATE INDEX IF NOT EXISTS "Field_createdAt_idx" ON "Field"("createdAt" DESC);

-- Composite index for common query pattern (deletedAt + createdAt)
CREATE INDEX IF NOT EXISTS "Field_deletedAt_createdAt_idx" ON "Field"("deletedAt", "createdAt" DESC);

-- Index on FieldImage for faster primary image lookup
CREATE INDEX IF NOT EXISTS "FieldImage_fieldId_isPrimary_idx" ON "FieldImage"("fieldId", "isPrimary");

-- Verify indexes were created
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN ('Field', 'FieldImage')
ORDER BY tablename, indexname;
