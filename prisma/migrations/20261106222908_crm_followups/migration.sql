-- AlterTable
ALTER TABLE "CrmOrderSync" ADD COLUMN     "collectedAt" TIMESTAMP(3),
ADD COLUMN     "reversedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "CrmReturnSync" (
    "id" TEXT NOT NULL,
    "returnRequestId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "documents" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrmReturnSync_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CrmReturnSync_returnRequestId_key" ON "CrmReturnSync"("returnRequestId");

-- AddForeignKey
ALTER TABLE "CrmReturnSync" ADD CONSTRAINT "CrmReturnSync_returnRequestId_fkey" FOREIGN KEY ("returnRequestId") REFERENCES "ReturnRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmReturnSync" ADD CONSTRAINT "CrmReturnSync_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "CrmSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
