-- CreateTable
CREATE TABLE "JobRating" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "ratedById" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobRating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JobRating_jobId_key" ON "JobRating"("jobId");

-- CreateIndex
CREATE INDEX "JobRating_workerId_idx" ON "JobRating"("workerId");

-- AddForeignKey
ALTER TABLE "JobRating" ADD CONSTRAINT "JobRating_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobRating" ADD CONSTRAINT "JobRating_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobRating" ADD CONSTRAINT "JobRating_ratedById_fkey" FOREIGN KEY ("ratedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
