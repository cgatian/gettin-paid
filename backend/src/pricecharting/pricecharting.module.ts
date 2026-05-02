import { Module } from "@nestjs/common";
import { PriceChartingService } from "./pricecharting.service";

@Module({
	providers: [PriceChartingService],
	exports: [PriceChartingService],
})
export class PriceChartingModule {}
