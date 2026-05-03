-- CreateTable
CREATE TABLE "GameCollection" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "badgeColor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameCollection_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "OwnedCopy" ADD COLUMN     "collectionId" TEXT;

-- CreateIndex
CREATE INDEX "OwnedCopy_collectionId_idx" ON "OwnedCopy"("collectionId");

-- AddForeignKey
ALTER TABLE "OwnedCopy" ADD CONSTRAINT "OwnedCopy_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "GameCollection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
