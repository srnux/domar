-- Multi-tenant SaaS conversion: introduce Company (tenant) + platform-admin plane.
-- Strategy: expand (nullable columns) -> backfill (assign existing rows to one
-- default company) -> contract (SET NOT NULL). Safe on both the seeded dev DB and
-- an empty production DB (the backfill is a no-op when there is no data).

-- ── Expand: enum + Company table ──────────────────────────────────────────────
CREATE TYPE "CompanyStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "CompanyStatus" NOT NULL DEFAULT 'ACTIVE',
    "plan" TEXT,
    "maxSeats" INTEGER NOT NULL,
    "monthlyFeeCents" INTEGER NOT NULL DEFAULT 0,
    "ownerUserId" TEXT,
    "parentCompanyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- ── Expand: tenant columns (nullable for now) ─────────────────────────────────
ALTER TABLE "User" ADD COLUMN "companyId" TEXT,
    ADD COLUMN "isPlatformAdmin" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Property" ADD COLUMN "companyId" TEXT;
ALTER TABLE "Job" ADD COLUMN "companyId" TEXT;
ALTER TABLE "Bill" ADD COLUMN "companyId" TEXT;
ALTER TABLE "BillLineItem" ADD COLUMN "companyId" TEXT;
ALTER TABLE "Booking" ADD COLUMN "companyId" TEXT;
ALTER TABLE "Invite" ADD COLUMN "companyId" TEXT;
ALTER TABLE "Bid" ADD COLUMN "companyId" TEXT;
ALTER TABLE "RefreshToken" ADD COLUMN "companyId" TEXT;

-- ── Backfill: assign all pre-existing single-tenant data to one default company ─
-- Only runs when legacy data exists; an empty DB skips straight to the contract.
-- The default company id is a real v4 UUID via gen_random_uuid() (PG 13+ built-in).
DO $$
DECLARE
  default_company_id text;
BEGIN
  IF EXISTS (SELECT 1 FROM "User") THEN
    INSERT INTO "Company" ("id", "name", "status", "maxSeats", "monthlyFeeCents", "createdAt", "updatedAt")
    VALUES (
      gen_random_uuid()::text,
      'Default Company',
      'ACTIVE',
      GREATEST((SELECT COUNT(*) FROM "User" WHERE "isActive" = true AND "role" IN ('SUPERVISOR', 'WORKER')), 10),
      0,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    )
    RETURNING "id" INTO default_company_id;

    UPDATE "User" SET "companyId" = default_company_id WHERE "isPlatformAdmin" = false;
    UPDATE "Property" SET "companyId" = default_company_id;
    UPDATE "Job" SET "companyId" = default_company_id;
    UPDATE "Bill" SET "companyId" = default_company_id;
    UPDATE "BillLineItem" SET "companyId" = default_company_id;
    UPDATE "Booking" SET "companyId" = default_company_id;
    UPDATE "Invite" SET "companyId" = default_company_id;
    UPDATE "Bid" SET "companyId" = default_company_id;
    UPDATE "RefreshToken" rt SET "companyId" = u."companyId" FROM "User" u WHERE rt."userId" = u."id";

    -- Account-owner = the earliest existing supervisor.
    UPDATE "Company"
    SET "ownerUserId" = (SELECT "id" FROM "User" WHERE "role" = 'SUPERVISOR' ORDER BY "createdAt" ASC LIMIT 1)
    WHERE "id" = default_company_id;
  END IF;
END $$;

-- ── Contract: make tenant columns required (User + RefreshToken stay nullable) ─
ALTER TABLE "Property" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "Job" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "Bill" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "BillLineItem" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "Booking" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "Invite" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "Bid" ALTER COLUMN "companyId" SET NOT NULL;

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX "Company_ownerUserId_key" ON "Company"("ownerUserId");
CREATE INDEX "Company_parentCompanyId_idx" ON "Company"("parentCompanyId");
CREATE INDEX "Bid_companyId_idx" ON "Bid"("companyId");
CREATE INDEX "Bill_companyId_idx" ON "Bill"("companyId");
CREATE INDEX "BillLineItem_companyId_idx" ON "BillLineItem"("companyId");
CREATE INDEX "Booking_companyId_idx" ON "Booking"("companyId");
CREATE INDEX "Invite_companyId_idx" ON "Invite"("companyId");
CREATE INDEX "Job_companyId_status_idx" ON "Job"("companyId", "status");
CREATE INDEX "Property_companyId_idx" ON "Property"("companyId");
CREATE INDEX "RefreshToken_companyId_idx" ON "RefreshToken"("companyId");
CREATE INDEX "User_companyId_role_idx" ON "User"("companyId", "role");

-- ── Foreign keys ──────────────────────────────────────────────────────────────
ALTER TABLE "Company" ADD CONSTRAINT "Company_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Company" ADD CONSTRAINT "Company_parentCompanyId_fkey" FOREIGN KEY ("parentCompanyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Property" ADD CONSTRAINT "Property_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Job" ADD CONSTRAINT "Job_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BillLineItem" ADD CONSTRAINT "BillLineItem_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
