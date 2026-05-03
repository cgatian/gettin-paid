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
	Req,
	Res,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { CreateCollectionDto } from "./dto/create-collection.dto";
import { CreateCopyDto } from "./dto/create-copy.dto";
import { CreateEditionDto } from "./dto/create-edition.dto";
import { ImportCsvDto } from "./dto/import-csv.dto";
import { PatchCollectionDto } from "./dto/patch-collection.dto";
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

	@Get("product-cover-preview")
	productCoverPreview(
		@Query("productId") productId: string | undefined,
		@Req() req: Request,
	) {
		return this.inventory.productCoverPreview(productId ?? "", req);
	}

	@Get("product-cover/:productId")
	async streamProductCover(
		@Param("productId") productId: string,
		@Res() res: Response,
	) {
		const { stream, contentType } =
			await this.inventory.getProductCoverReadStream(productId);
		res.setHeader("Content-Type", contentType);
		res.setHeader("Cache-Control", "public, max-age=86400");
		stream.on("error", () => {
			if (!res.headersSent) res.sendStatus(500);
			else res.end();
		});
		stream.pipe(res);
	}

	@Get("dashboard")
	dashboard() {
		return this.inventory.dashboardSummary();
	}

	@Get("collections")
	listCollections() {
		return this.inventory.listCollections();
	}

	@Post("collections")
	createCollection(@Body() dto: CreateCollectionDto) {
		return this.inventory.createCollection(dto);
	}

	@Get("collections/:id/summary")
	collectionSummary(@Param("id") id: string) {
		return this.inventory.collectionSummary(id);
	}

	@Get("collections/:id")
	getCollection(@Param("id") id: string) {
		return this.inventory.getCollection(id);
	}

	@Patch("collections/:id")
	patchCollection(@Param("id") id: string, @Body() dto: PatchCollectionDto) {
		return this.inventory.patchCollection(id, dto);
	}

	@Delete("collections/:id")
	@HttpCode(HttpStatus.NO_CONTENT)
	deleteCollection(@Param("id") id: string) {
		return this.inventory.deleteCollection(id);
	}

	@Get("editions")
	async list(
		@Query("console") console?: string,
		@Query("platform") platformLegacy?: string,
		@Query("collection") collection?: string,
		@Query("includeSoldCopies") includeSoldCopiesRaw?: string,
	) {
		const includeSoldCopies =
			includeSoldCopiesRaw === "true" || includeSoldCopiesRaw === "1";
		const [filter, collectionId] = await Promise.all([
			this.inventory.resolveConsoleFilterQuery(console, platformLegacy),
			collection?.trim()
				? this.inventory.resolveCollectionFilterQuery(collection)
				: Promise.resolve(undefined),
		]);
		return this.inventory.listEditions(filter, collectionId, includeSoldCopies);
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

	@Post("editions/fetch-all-covers")
	fetchAllCovers(@Query("force") forceRaw?: string) {
		const force = forceRaw === "true" || forceRaw === "1";
		return this.inventory.fetchAllCovers(force);
	}

	@Post("editions/:id/fetch-cover")
	fetchEditionCover(
		@Param("id") id: string,
		@Query("force") forceRaw?: string,
	) {
		const force = forceRaw === "true" || forceRaw === "1";
		return this.inventory.fetchEditionCover(id, force);
	}

	@Get("editions/:id/cover")
	async streamEditionCover(@Param("id") id: string, @Res() res: Response) {
		const { stream, contentType } =
			await this.inventory.getCoverReadStream(id);
		res.setHeader("Content-Type", contentType);
		res.setHeader("Cache-Control", "public, max-age=86400");
		stream.on("error", () => {
			if (!res.headersSent) res.sendStatus(500);
			else res.end();
		});
		stream.pipe(res);
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
