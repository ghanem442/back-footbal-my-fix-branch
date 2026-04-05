-- Check if FieldStatus enum exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FieldStatus') THEN
    CREATE TYPE "FieldStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'HIDDEN');
    RAISE NOTICE 'Created FieldStatus enum';
  ELSE
    RAISE NOTICE 'FieldStatus enum already exists';
  END IF;
END$$;

-- Check if status column exists in Field table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Field' AND column_name = 'status' AND table_schema = 'public'
  ) THEN
    ALTER TABLE "Field" ADD COLUMN "status" "FieldStatus" NOT NULL DEFAULT 'ACTIVE';
    RAISE NOTICE 'Added status column to Field table';
  ELSE
    RAISE NOTICE 'status column already exists in Field table';
  END IF;
END$$;

-- Show current Field columns
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'Field' AND table_schema = 'public'
ORDER BY ordinal_position;
