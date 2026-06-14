-- CreateEnum
CREATE TYPE "PriceType" AS ENUM ('FIXED', 'HOURLY', 'NEGOTIABLE');

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'EUR',
ADD COLUMN     "estimatedHours" DOUBLE PRECISION,
ADD COLUMN     "priceCents" INTEGER,
ADD COLUMN     "priceType" "PriceType",
ADD COLUMN     "spentHours" DOUBLE PRECISION;
