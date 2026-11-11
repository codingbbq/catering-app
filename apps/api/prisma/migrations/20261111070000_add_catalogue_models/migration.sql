-- CreateEnum
CREATE TYPE "PricingUnit" AS ENUM ('per_person', 'per_plate', 'per_kg', 'per_tray', 'per_piece', 'per_liter', 'fixed');

-- CreateEnum
CREATE TYPE "CatalogueImportStatus" AS ENUM ('pending', 'completed', 'failed', 'partially_failed');

-- CreateTable
CREATE TABLE "CatalogueItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'main',
    "pricingUnit" "PricingUnit" NOT NULL DEFAULT 'per_person',
    "costPrice" DECIMAL(10,2),
    "sellingPrice" DECIMAL(10,2) NOT NULL,
    "dietaryTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "minQuantity" INTEGER,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogueItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogueImportJob" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "status" "CatalogueImportStatus" NOT NULL DEFAULT 'pending',
    "filename" TEXT,
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "successfulRows" INTEGER NOT NULL DEFAULT 0,
    "failedRows" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB DEFAULT '[]',
    "importedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogueImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CatalogueItem_tenantId_idx" ON "CatalogueItem"("tenantId");

-- CreateIndex
CREATE INDEX "CatalogueItem_tenantId_category_idx" ON "CatalogueItem"("tenantId", "category");

-- CreateIndex
CREATE INDEX "CatalogueItem_tenantId_isArchived_idx" ON "CatalogueItem"("tenantId", "isArchived");

-- CreateIndex
CREATE INDEX "CatalogueItem_tenantId_name_idx" ON "CatalogueItem"("tenantId", "name");

-- CreateIndex
CREATE INDEX "CatalogueImportJob_tenantId_idx" ON "CatalogueImportJob"("tenantId");

-- CreateIndex
CREATE INDEX "CatalogueImportJob_tenantId_status_idx" ON "CatalogueImportJob"("tenantId", "status");

-- CreateIndex
CREATE INDEX "CatalogueImportJob_tenantId_createdAt_idx" ON "CatalogueImportJob"("tenantId", "createdAt");

-- AddForeignKey
ALTER TABLE "CatalogueItem" ADD CONSTRAINT "CatalogueItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogueImportJob" ADD CONSTRAINT "CatalogueImportJob_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogueImportJob" ADD CONSTRAINT "CatalogueImportJob_importedById_fkey" FOREIGN KEY ("importedById") REFERENCES "TenantUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
