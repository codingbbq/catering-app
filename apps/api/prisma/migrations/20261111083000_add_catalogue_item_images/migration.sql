-- CreateTable
CREATE TABLE "CatalogueItemImage" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CatalogueItemImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CatalogueItemImage_itemId_idx" ON "CatalogueItemImage"("itemId");

-- CreateIndex
CREATE INDEX "CatalogueItemImage_itemId_isPrimary_idx" ON "CatalogueItemImage"("itemId", "isPrimary");

-- AddForeignKey
ALTER TABLE "CatalogueItemImage" ADD CONSTRAINT "CatalogueItemImage_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "CatalogueItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
