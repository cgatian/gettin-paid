import { Module } from "@nestjs/common";
import { CoverArtModule } from "../cover-art/cover-art.module";
import { PriceChartingModule } from "../pricecharting/pricecharting.module";
import { InventoryController } from "./inventory.controller";
import { InventoryService } from "./inventory.service";

@Module({
	imports: [PriceChartingModule, CoverArtModule],
	controllers: [InventoryController],
	providers: [InventoryService],
})
export class InventoryModule {}
