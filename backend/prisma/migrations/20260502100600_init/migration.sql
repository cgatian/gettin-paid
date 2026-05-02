-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('PS5', 'PS4', 'PS3', 'SWITCH', 'XBOX_SERIES', 'XBOX_ONE', 'XBOX_360', 'PC', 'NES', 'SNES', 'N64', 'GAMECUBE', 'WII', 'WII_U', 'GBA', 'DS', 'THREE_DS', 'PS_VITA', 'PSP', 'DREAMCAST', 'GENESIS', 'SATURN', 'OTHER');

-- CreateEnum
CREATE TYPE "CopyClassification" AS ENUM ('SEALED', 'CIB', 'INCOMPLETE_BOX', 'LOOSE', 'GRADED_SLAB', 'OTHER');

-- CreateTable
CREATE TABLE "GameEdition" (
    "id" TEXT NOT NULL,
    "upc" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "publisher" TEXT,
    "priceChartingProductId" TEXT,
    "priceChartingConsoleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameEdition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OwnedCopy" (
    "id" TEXT NOT NULL,
    "editionId" TEXT NOT NULL,
    "copyClassification" "CopyClassification" NOT NULL,
    "classificationNotes" TEXT,
    "purchaseAmount" DECIMAL(12,2),
    "purchaseCurrency" TEXT,
    "purchaseDate" TIMESTAMP(3),
    "offerAmount" DECIMAL(12,2),
    "offerCurrency" TEXT,
    "soldAmount" DECIMAL(12,2),
    "soldCurrency" TEXT,
    "soldAt" TIMESTAMP(3),

    CONSTRAINT "OwnedCopy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceChartingProductSnapshot" (
    "id" TEXT NOT NULL,
    "editionId" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "priceChartingId" TEXT,
    "productName" TEXT,
    "consoleName" TEXT,
    "genre" TEXT,
    "releaseDate" DATE,
    "upc" TEXT,
    "asin" TEXT,
    "epid" TEXT,
    "loosePrice" INTEGER,
    "cibPrice" INTEGER,
    "newPrice" INTEGER,
    "gradedPrice" INTEGER,
    "boxOnlyPrice" INTEGER,
    "manualOnlyPrice" INTEGER,
    "gamestopPrice" INTEGER,
    "bgs10Price" INTEGER,
    "condition17Price" INTEGER,
    "condition18Price" INTEGER,
    "retailLooseBuy" INTEGER,
    "retailLooseSell" INTEGER,
    "retailCibBuy" INTEGER,
    "retailCibSell" INTEGER,
    "retailNewBuy" INTEGER,
    "retailNewSell" INTEGER,
    "salesVolume" INTEGER,
    "raw" JSONB,

    CONSTRAINT "PriceChartingProductSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GameEdition_upc_key" ON "GameEdition"("upc");

-- CreateIndex
CREATE UNIQUE INDEX "GameEdition_priceChartingProductId_key" ON "GameEdition"("priceChartingProductId");

-- CreateIndex
CREATE INDEX "GameEdition_platform_idx" ON "GameEdition"("platform");

-- CreateIndex
CREATE INDEX "OwnedCopy_editionId_idx" ON "OwnedCopy"("editionId");

-- CreateIndex
CREATE UNIQUE INDEX "PriceChartingProductSnapshot_editionId_key" ON "PriceChartingProductSnapshot"("editionId");

-- AddForeignKey
ALTER TABLE "OwnedCopy" ADD CONSTRAINT "OwnedCopy_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "GameEdition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceChartingProductSnapshot" ADD CONSTRAINT "PriceChartingProductSnapshot_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "GameEdition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
