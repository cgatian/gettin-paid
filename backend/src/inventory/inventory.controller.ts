import {
	Body,
	Controller,
	Get,
	Param,
	Patch,
	Post,
	Query,
} from "@nestjs/common";
import type { CreateCopyDto } from "./dto/create-copy.dto";
import type { CreateEditionDto } from "./dto/create-edition.dto";
import type { PatchCopyDto } from "./dto/patch-copy.dto";
import type { PatchEditionDto } from "./dto/patch-edition.dto";
import { InventoryService } from "./inventory.service";

@Controller()
export class InventoryController {
	constructor(private readonly inventory: InventoryService) {}

	@Get("platforms")
	platforms() {
		return this.inventory.platformsMeta();
	}

	@Get("product-suggestions")
	productSuggestions(
		@Query("q") q?: string,
		@Query("console") priceChartingConsoleId?: string,
	) {
		return this.inventory.productSuggestions(q ?? "", priceChartingConsoleId);
	}

	@Get("editions")
	async list(
		@Query("console") console?: string,
		@Query("platform") platformLegacy?: string,
	) {
		const filter = await this.inventory.resolveConsoleFilterQuery(
			console,
			platformLegacy,
		);
		return this.inventory.listEditions(filter);
	}

	@Get("editions/:id")
	getOne(@Param("id") id: string) {
		return this.inventory.getEdition(id);
	}

	@Post("editions")
	create(@Body() dto: CreateEditionDto) {
		return this.inventory.createEdition(dto);
	}

	@Patch("editions/:id")
	patchEdition(@Param("id") id: string, @Body() dto: PatchEditionDto) {
		return this.inventory.patchEdition(id, dto);
	}

	@Post("editions/:editionId/copies")
	createCopy(
		@Param("editionId") editionId: string,
		@Body() dto: CreateCopyDto,
	) {
		return this.inventory.createCopy(editionId, dto);
	}

	@Patch("copies/:id")
	patchCopy(@Param("id") id: string, @Body() dto: PatchCopyDto) {
		return this.inventory.patchCopy(id, dto);
	}

	@Post("editions/:id/refresh-market")
	refresh(@Param("id") id: string) {
		return this.inventory.refreshMarket(id);
	}
}
