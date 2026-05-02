import {
	findBestPriceChartingConsoleIdFromRows,
	type PriceChartingProductSuggestionDto,
	type PriceChartingSnapshotDto,
} from "@gettin-paid/shared";
import {
	BadRequestException,
	Injectable,
	NotFoundException,
	ServiceUnavailableException,
} from "@nestjs/common";
import {
	CopyClassification,
	type GameEdition,
	type OwnedCopy,
	type PriceChartingProductSnapshot,
	Prisma,
} from "@prisma/client";
import { pickBestProduct } from "../oneoff/pick-product";
import { PriceChartingService } from "../pricecharting/pricecharting.service";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateCopyDto } from "./dto/create-copy.dto";
import type { CreateEditionDto } from "./dto/create-edition.dto";
import type { PatchCopyDto } from "./dto/patch-copy.dto";
import type { PatchEditionDto } from "./dto/patch-edition.dto";

function d(s: string | null | undefined): Prisma.Decimal | null {
	if (s == null || s === "") return null;
	return new Prisma.Decimal(s);
}

@Injectable()
export class InventoryService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly pricecharting: PriceChartingService,
	) {}

	/** PriceCharting official console list (from DB, same as api-documentation#console-ids) */
	async platformsMeta() {
		return this.prisma.priceChartingConsole.findMany({
			orderBy: { displayOrder: "asc" },
			select: { id: true, name: true },
		});
	}

	/** Valid console filter from query string (G-code must exist in `PriceChartingConsole`) */
	async resolveConsoleFilterQuery(
		consoleParam?: string,
		platformLegacy?: string,
	): Promise<string | undefined> {
		const raw = consoleParam?.trim() || platformLegacy?.trim();
		if (!raw) return undefined;
		const row = await this.prisma.priceChartingConsole.findUnique({
			where: { id: raw },
			select: { id: true },
		});
		return row?.id;
	}

	/** Live search against PriceCharting GET /api/products (max ~20 hits); optional console scopes results */
	async productSuggestions(
		q: string,
		priceChartingConsoleId?: string,
	): Promise<PriceChartingProductSuggestionDto[]> {
		const t = (q ?? "").trim();
		if (t.length < 2) return [];
		const cid = priceChartingConsoleId?.trim();
		if (cid) {
			const ok = await this.prisma.priceChartingConsole.findUnique({
				where: { id: cid },
				select: { id: true },
			});
			if (!ok) {
				throw new BadRequestException("Invalid console");
			}
		}
		const data = await this.pricecharting.fetchProducts({
			q: t,
			console: cid || undefined,
		});
		const products = data.products ?? [];
		return products
			.map((p) => ({
				id: p.id ?? "",
				productName: p["product-name"] ?? "",
				consoleName: p["console-name"] ?? "",
			}))
			.filter((row) => row.id.length > 0);
	}

	async listEditions(priceChartingConsoleId?: string) {
		const where = priceChartingConsoleId
			? { priceChartingConsoleId }
			: {};
		const editions = await this.prisma.gameEdition.findMany({
			where,
			orderBy: { title: "asc" },
			include: {
				_count: { select: { copies: true } },
				priceChartingConsole: { select: { name: true } },
			},
		});
		return editions.map((e) => this.editionToDto(e));
	}

	async getEdition(id: string) {
		const edition = await this.prisma.gameEdition.findUnique({
			where: { id },
			include: {
				copies: { orderBy: { id: "asc" } },
				snapshot: true,
				priceChartingConsole: { select: { name: true } },
			},
		});
		if (!edition) throw new NotFoundException("Edition not found");
		return {
			...this.editionToDto(edition),
			copies: edition.copies.map((c) => this.copyToDto(c)),
			snapshot: edition.snapshot ? this.snapshotToDto(edition.snapshot) : null,
		};
	}

	async createEdition(dto: CreateEditionDto) {
		const ok = await this.prisma.priceChartingConsole.findUnique({
			where: { id: dto.priceChartingConsoleId },
			select: { id: true },
		});
		if (!ok) {
			throw new BadRequestException("Invalid priceChartingConsoleId");
		}
		const upc = dto.upc.replace(/\D/g, "");
		const priceChartingProductId = await this.resolvePriceChartingProductIdOrThrow(
			upc,
			dto.title,
			dto.priceChartingConsoleId,
		);

		const edition = await this.prisma.$transaction(async (tx) => {
			const e = await tx.gameEdition.create({
				data: {
					upc,
					title: dto.title,
					priceChartingConsoleId: dto.priceChartingConsoleId,
					publisher: dto.publisher ?? null,
					priceChartingProductId,
				},
			});
			const purchaseAmt = dto.initialPurchaseAmount?.trim();
			const offerAmt = dto.initialOfferAmount?.trim();
			await tx.ownedCopy.create({
				data: {
					editionId: e.id,
					copyClassification:
						dto.initialCopyClassification ?? CopyClassification.CIB,
					classificationNotes: dto.initialCopyNotes ?? null,
					purchaseAmount: d(purchaseAmt || undefined),
					purchaseCurrency: purchaseAmt
						? (dto.initialPurchaseCurrency?.trim() || "USD")
						: null,
					offerAmount: d(offerAmt || undefined),
					offerCurrency: offerAmt
						? (dto.initialOfferCurrency?.trim() || "USD")
						: null,
				},
			});
			return e;
		});

		if (dto.syncPriceCharting) {
			try {
				await this.refreshMarketSnapshot(edition.id);
			} catch {
				/* optional snapshot — edition still created; product id already set */
			}
		}

		return this.getEdition(edition.id);
	}

	async patchEdition(id: string, dto: PatchEditionDto) {
		await this.ensureEdition(id);
		const data: Prisma.GameEditionUpdateInput = {};
		if (dto.upc !== undefined) data.upc = dto.upc.replace(/\D/g, "");
		if (dto.title !== undefined) data.title = dto.title;
		if (dto.priceChartingConsoleId !== undefined) {
			const row = await this.prisma.priceChartingConsole.findUnique({
				where: { id: dto.priceChartingConsoleId },
				select: { id: true },
			});
			if (!row) {
				throw new BadRequestException("Invalid priceChartingConsoleId");
			}
			data.priceChartingConsole = {
				connect: { id: dto.priceChartingConsoleId },
			};
		}
		if (dto.publisher !== undefined) data.publisher = dto.publisher;

		await this.prisma.gameEdition.update({
			where: { id },
			data,
		});
		return this.getEdition(id);
	}

	async createCopy(editionId: string, dto: CreateCopyDto) {
		await this.ensureEdition(editionId);
		const copy = await this.prisma.ownedCopy.create({
			data: {
				editionId,
				copyClassification: dto.copyClassification,
				classificationNotes: dto.classificationNotes ?? null,
				purchaseAmount: d(dto.purchaseAmount ?? undefined),
				purchaseCurrency: dto.purchaseCurrency ?? null,
				purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : null,
				offerAmount: d(dto.offerAmount ?? undefined),
				offerCurrency: dto.offerCurrency ?? null,
			},
		});
		return this.copyToDto(copy);
	}

	async patchCopy(copyId: string, dto: PatchCopyDto) {
		await this.ensureCopy(copyId);
		const data: Prisma.OwnedCopyUpdateInput = {};
		if (dto.copyClassification !== undefined)
			data.copyClassification = dto.copyClassification;
		if (dto.classificationNotes !== undefined)
			data.classificationNotes = dto.classificationNotes;
		if (dto.purchaseAmount !== undefined)
			data.purchaseAmount = d(dto.purchaseAmount ?? undefined);
		if (dto.purchaseCurrency !== undefined)
			data.purchaseCurrency = dto.purchaseCurrency;
		if (dto.purchaseDate !== undefined)
			data.purchaseDate = dto.purchaseDate ? new Date(dto.purchaseDate) : null;
		if (dto.offerAmount !== undefined)
			data.offerAmount = d(dto.offerAmount ?? undefined);
		if (dto.offerCurrency !== undefined) data.offerCurrency = dto.offerCurrency;
		if (dto.soldAmount !== undefined)
			data.soldAmount = d(dto.soldAmount ?? undefined);
		if (dto.soldCurrency !== undefined) data.soldCurrency = dto.soldCurrency;
		if (dto.soldAt !== undefined)
			data.soldAt = dto.soldAt ? new Date(dto.soldAt) : null;

		const copy = await this.prisma.ownedCopy.update({
			where: { id: copyId },
			data,
		});
		return this.copyToDto(copy);
	}

	async refreshMarket(editionId: string) {
		await this.ensureEdition(editionId);
		await this.refreshMarketSnapshot(editionId);
		return this.getEdition(editionId);
	}

	/**
	 * Every new edition must get a PriceCharting product id for pricing lookups.
	 * Try UPC + console first, then title search + pick (same heuristics as the CSV script).
	 */
	private async resolvePriceChartingProductIdOrThrow(
		upc: string,
		title: string,
		priceChartingConsoleId: string,
	): Promise<string> {
		const tryUpc = async (): Promise<string | undefined> => {
			try {
				const data = await this.pricecharting.fetchProduct({
					upc,
					console: priceChartingConsoleId,
				});
				return data.id ?? undefined;
			} catch (e) {
				if (e instanceof ServiceUnavailableException) throw e;
				return undefined;
			}
		};

		const tryTitleSearch = async (): Promise<string | undefined> => {
			const search = await this.pricecharting.fetchProducts({
				q: title,
				console: priceChartingConsoleId,
			});
			const products = search.products ?? [];
			const picked = pickBestProduct(
				products,
				priceChartingConsoleId,
				title,
			);
			if (!picked?.pick.id) return undefined;
			const detail = await this.pricecharting.fetchProduct({
				id: picked.pick.id,
			});
			return detail.id ?? undefined;
		};

		const fromUpc = await tryUpc();
		if (fromUpc) return fromUpc;

		const fromSearch = await tryTitleSearch();
		if (fromSearch) return fromSearch;

		throw new BadRequestException(
			"Could not resolve a PriceCharting product id for this UPC, title, and console. Check PriceCharting or try a different spelling.",
		);
	}

	private async refreshMarketSnapshot(editionId: string) {
		const edition = await this.prisma.gameEdition.findUniqueOrThrow({
			where: { id: editionId },
		});
		let data;
		try {
			if (edition.priceChartingProductId) {
				data = await this.pricecharting.fetchProduct({
					id: edition.priceChartingProductId,
				});
			} else if (edition.priceChartingConsoleId) {
				data = await this.pricecharting.fetchProduct({
					upc: edition.upc,
					console: edition.priceChartingConsoleId,
				});
			} else {
				data = await this.pricecharting.fetchProduct({ upc: edition.upc });
			}
		} catch (e) {
			if (e instanceof ServiceUnavailableException) throw e;
			throw new BadRequestException(
				e instanceof Error ? e.message : "PriceCharting fetch failed",
			);
		}

		const snap = this.pricecharting.snapshotFromApi(data);
		const consoles = await this.prisma.priceChartingConsole.findMany({
			select: { id: true, name: true },
		});
		const inferredConsoleId = findBestPriceChartingConsoleIdFromRows(
			consoles,
			data["console-name"],
		);

		await this.prisma.$transaction([
			this.prisma.gameEdition.update({
				where: { id: editionId },
				data: {
					priceChartingProductId: data.id ?? edition.priceChartingProductId,
					...(edition.priceChartingConsoleId == null && inferredConsoleId
						? { priceChartingConsoleId: inferredConsoleId }
						: {}),
				},
			}),
			this.prisma.priceChartingProductSnapshot.upsert({
				where: { editionId },
				create: {
					editionId,
					fetchedAt: new Date(),
					...snap,
				},
				update: {
					fetchedAt: new Date(),
					...snap,
				},
			}),
		]);
	}

	private async ensureEdition(id: string) {
		const e = await this.prisma.gameEdition.findUnique({ where: { id } });
		if (!e) throw new NotFoundException("Edition not found");
	}

	private async ensureCopy(id: string) {
		const c = await this.prisma.ownedCopy.findUnique({ where: { id } });
		if (!c) throw new NotFoundException("Copy not found");
	}

	private editionToDto(
		e: GameEdition & {
			_count?: { copies: number };
			priceChartingConsole?: { name: string } | null;
		},
	) {
		return {
			id: e.id,
			upc: e.upc,
			title: e.title,
			publisher: e.publisher,
			priceChartingProductId: e.priceChartingProductId,
			priceChartingConsoleId: e.priceChartingConsoleId,
			priceChartingConsoleName: e.priceChartingConsole?.name ?? null,
			...(e._count !== undefined ? { copyCount: e._count.copies } : {}),
		};
	}

	private copyToDto(c: OwnedCopy) {
		return {
			id: c.id,
			editionId: c.editionId,
			copyClassification: c.copyClassification,
			classificationNotes: c.classificationNotes,
			purchaseAmount: decStr(c.purchaseAmount),
			purchaseCurrency: c.purchaseCurrency,
			purchaseDate: c.purchaseDate?.toISOString() ?? null,
			offerAmount: decStr(c.offerAmount),
			offerCurrency: c.offerCurrency,
			soldAmount: decStr(c.soldAmount),
			soldCurrency: c.soldCurrency,
			soldAt: c.soldAt?.toISOString() ?? null,
		};
	}

	private snapshotToDto(
		s: PriceChartingProductSnapshot,
	): PriceChartingSnapshotDto {
		return {
			id: s.id,
			editionId: s.editionId,
			fetchedAt: s.fetchedAt.toISOString(),
			loosePrice: s.loosePrice,
			cibPrice: s.cibPrice,
			newPrice: s.newPrice,
			gradedPrice: s.gradedPrice,
			boxOnlyPrice: s.boxOnlyPrice,
			manualOnlyPrice: s.manualOnlyPrice,
			gamestopPrice: s.gamestopPrice,
			bgs10Price: s.bgs10Price,
			condition17Price: s.condition17Price,
			condition18Price: s.condition18Price,
			retailLooseBuy: s.retailLooseBuy,
			retailLooseSell: s.retailLooseSell,
			retailCibBuy: s.retailCibBuy,
			retailCibSell: s.retailCibSell,
			retailNewBuy: s.retailNewBuy,
			retailNewSell: s.retailNewSell,
			salesVolume: s.salesVolume,
			priceChartingId: s.priceChartingId,
			productName: s.productName,
			consoleName: s.consoleName,
			genre: s.genre,
			releaseDate: s.releaseDate?.toISOString().slice(0, 10) ?? null,
			upc: s.upc,
			asin: s.asin,
			epid: s.epid,
		};
	}
}

function decStr(v: Prisma.Decimal | null): string | null {
	if (v === null) return null;
	return v.toString();
}
