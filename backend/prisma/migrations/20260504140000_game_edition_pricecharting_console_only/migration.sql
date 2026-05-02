-- Map legacy Prisma Platform enum → PriceCharting Console ID (only fill missing G-code)
UPDATE "GameEdition" SET "priceChartingConsoleId" = (
  CASE "platform"::text
    WHEN 'PS5' THEN 'G7468'
    WHEN 'PS4' THEN 'G53'
    WHEN 'PS3' THEN 'G12'
    WHEN 'SWITCH' THEN 'G59'
    WHEN 'XBOX_SERIES' THEN 'G7585'
    WHEN 'XBOX_ONE' THEN 'G54'
    WHEN 'XBOX_360' THEN 'G10'
    WHEN 'PC' THEN 'G145'
    WHEN 'NES' THEN 'G17'
    WHEN 'SNES' THEN 'G13'
    WHEN 'N64' THEN 'G4'
    WHEN 'GAMECUBE' THEN 'G3'
    WHEN 'WII' THEN 'G11'
    WHEN 'WII_U' THEN 'G47'
    WHEN 'GBA' THEN 'G1'
    WHEN 'DS' THEN 'G5'
    WHEN 'THREE_DS' THEN 'G39'
    WHEN 'PS_VITA' THEN 'G43'
    WHEN 'PSP' THEN 'G9'
    WHEN 'DREAMCAST' THEN 'G16'
    WHEN 'GENESIS' THEN 'G15'
    WHEN 'SATURN' THEN 'G14'
    ELSE NULL
  END
)
WHERE "priceChartingConsoleId" IS NULL;

-- AlterTable
DROP INDEX IF EXISTS "GameEdition_platform_idx";
ALTER TABLE "GameEdition" DROP COLUMN "platform";

-- DropEnum
DROP TYPE "Platform";

-- CreateIndex
CREATE INDEX "GameEdition_priceChartingConsoleId_idx" ON "GameEdition"("priceChartingConsoleId");
