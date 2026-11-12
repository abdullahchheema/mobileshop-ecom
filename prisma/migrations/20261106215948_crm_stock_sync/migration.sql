-- CreateTable
CREATE TABLE "CrmSource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "apiKeyHash" TEXT NOT NULL,
    "lastSyncAt" TIMESTAMP(3),
    "lastSyncSummary" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrmSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmListingMap" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "crmProductCode" TEXT NOT NULL,
    "crmCondition" TEXT NOT NULL,
    "ptaStatus" TEXT NOT NULL,
    "crmProductName" TEXT NOT NULL,
    "variantId" TEXT,
    "lastPrice" INTEGER NOT NULL DEFAULT 0,
    "lastStock" INTEGER NOT NULL DEFAULT 0,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrmListingMap_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CrmSource_sellerId_key" ON "CrmSource"("sellerId");

-- CreateIndex
CREATE UNIQUE INDEX "CrmSource_apiKeyHash_key" ON "CrmSource"("apiKeyHash");

-- CreateIndex
CREATE INDEX "CrmListingMap_variantId_idx" ON "CrmListingMap"("variantId");

-- CreateIndex
CREATE UNIQUE INDEX "CrmListingMap_sourceId_crmProductCode_crmCondition_ptaStatu_key" ON "CrmListingMap"("sourceId", "crmProductCode", "crmCondition", "ptaStatus");

-- AddForeignKey
ALTER TABLE "CrmSource" ADD CONSTRAINT "CrmSource_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmListingMap" ADD CONSTRAINT "CrmListingMap_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "CrmSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmListingMap" ADD CONSTRAINT "CrmListingMap_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "Variant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
