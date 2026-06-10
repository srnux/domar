-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "checkoutAt" TIMESTAMP(3) NOT NULL,
    "checkinAt" TIMESTAMP(3),
    "guestNote" TEXT,
    "turnoverJobId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Booking_turnoverJobId_key" ON "Booking"("turnoverJobId");

-- CreateIndex
CREATE INDEX "Booking_propertyId_checkoutAt_idx" ON "Booking"("propertyId", "checkoutAt");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_turnoverJobId_fkey" FOREIGN KEY ("turnoverJobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;
