-- AlterTable
ALTER TABLE "ReturnRequest" ADD COLUMN     "details" TEXT,
ADD COLUMN     "refundAmount" INTEGER,
ADD COLUMN     "refundRef" TEXT,
ADD COLUMN     "refundedAt" TIMESTAMP(3),
ADD COLUMN     "resolution" TEXT;

-- CreateIndex
CREATE INDEX "ReturnRequest_status_idx" ON "ReturnRequest"("status");
