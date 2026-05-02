import { Module } from "@nestjs/common";
import { CoverArtService } from "./cover-art.service";

@Module({
	providers: [CoverArtService],
	exports: [CoverArtService],
})
export class CoverArtModule {}
