/*
  Warnings:

  - Added the required column `productId` to the `Offer` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Offer" ADD COLUMN     "productId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Offer_productId_status_price_idx" ON "Offer"("productId", "status", "price");

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
