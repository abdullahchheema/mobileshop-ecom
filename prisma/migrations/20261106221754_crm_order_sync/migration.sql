-- CreateEnum
CREATE TYPE "CrmOrderStatus" AS ENUM ('BOOKED', 'FAILED');

-- CreateTable
CREATE TABLE "CrmOrderSync" (
    "id" TEXT NOT NULL,
    "sellerOrderId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "status" "CrmOrderStatus" NOT NULL,
    "documents" TEXT[],
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmOrderSync_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CrmOrderSync_sellerOrderId_key" ON "CrmOrderSync"("sellerOrderId");

-- CreateIndex
CREATE INDEX "CrmOrderSync_sourceId_status_idx" ON "CrmOrderSync"("sourceId", "status");

-- AddForeignKey
ALTER TABLE "CrmOrderSync" ADD CONSTRAINT "CrmOrderSync_sellerOrderId_fkey" FOREIGN KEY ("sellerOrderId") REFERENCES "SellerOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmOrderSync" ADD CONSTRAINT "CrmOrderSync_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "CrmSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
