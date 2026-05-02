import { Module } from "@nestjs/common";
import { PriceChartingModule } from "../pricecharting/pricecharting.module";
import { InventoryController } from "./inventory.controller";
import { InventoryService } from "./inventory.service";

@Module({
	imports: [PriceChartingModule],
	controllers: [InventoryController],
	providers: [InventoryService],
})
export class InventoryModule {}
