import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import { InventoryModule } from "./inventory/inventory.module";
import { PriceChartingModule } from "./pricecharting/pricecharting.module";
import { PrismaModule } from "./prisma/prisma.module";

@Module({
	imports: [
		ConfigModule.forRoot({ isGlobal: true }),
		PrismaModule,
		PriceChartingModule,
		InventoryModule,
	],
	controllers: [AppController],
})
export class AppModule {}
