-- CreateEnum
CREATE TYPE "FieldStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'HIDDEN');

-- AlterTable
ALTER TABLE "Field" ADD COLUMN     "status" "FieldStatus" NOT NULL DEFAULT 'ACTIVE';
