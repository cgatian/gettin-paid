import {
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	HttpStatus,
	Param,
	Patch,
	Post,
	Query,
	Res,
} from "@nestjs/common";
import type { Response } from "express";
import { CreateCopyDto } from "./dto/create-copy.dto";
import { CreateEditionDto } from "./dto/create-edition.dto";
import { ImportCsvDto } from "./dto/import-csv.dto";
import { PatchCopyDto } from "./dto/patch-copy.dto";
import { PatchEditionDto } from "./dto/patch-edition.dto";
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

	@Get("product-pricing")
	productPricing(@Query("productId") productId?: string) {
		return this.inventory.productPricingPreview(productId ?? "");
	}

	@Get("dashboard")
	dashboard() {
		return this.inventory.dashboardSummary();
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

	@Post("editions/refresh-all-market")
	async refreshAllMarket(
		@Query("console") console?: string,
		@Query("platform") platformLegacy?: string,
	) {
		const filter = await this.inventory.resolveConsoleFilterQuery(
			console,
			platformLegacy,
		);
		return this.inventory.refreshAllMarket(filter);
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

	@Delete("editions/:id")
	@HttpCode(HttpStatus.NO_CONTENT)
	deleteEdition(@Param("id") id: string) {
		return this.inventory.deleteEdition(id);
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

	@Get("export")
	async exportCsv(@Res() res: Response) {
		const csv = await this.inventory.exportAllCopies();
		res.setHeader("Content-Type", "text/csv; charset=utf-8");
		res.setHeader(
			"Content-Disposition",
			'attachment; filename="inventory.csv"',
		);
		res.send(csv);
	}

	@Post("import")
	importCsv(@Body() body: ImportCsvDto) {
		return this.inventory.importCsv(body.csv);
	}
}
