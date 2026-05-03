-- Many-to-many: OwnedCopy <-> GameCollection (replaces single OwnedCopy.collectionId)

CREATE TABLE "OwnedCopyCollection" (
    "copyId" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,

    CONSTRAINT "OwnedCopyCollection_pkey" PRIMARY KEY ("copyId","collectionId")
);

CREATE INDEX "OwnedCopyCollection_collectionId_idx" ON "OwnedCopyCollection"("collectionId");

ALTER TABLE "OwnedCopyCollection" ADD CONSTRAINT "OwnedCopyCollection_copyId_fkey" FOREIGN KEY ("copyId") REFERENCES "OwnedCopy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OwnedCopyCollection" ADD CONSTRAINT "OwnedCopyCollection_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "GameCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "OwnedCopyCollection" ("copyId", "collectionId")
SELECT "id", "collectionId" FROM "OwnedCopy" WHERE "collectionId" IS NOT NULL;

ALTER TABLE "OwnedCopy" DROP CONSTRAINT "OwnedCopy_collectionId_fkey";

DROP INDEX IF EXISTS "OwnedCopy_collectionId_idx";

ALTER TABLE "OwnedCopy" DROP COLUMN "collectionId";
