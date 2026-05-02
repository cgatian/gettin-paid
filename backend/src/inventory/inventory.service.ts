import {
	type BulkImportResultDto,
	type BulkRefreshMarketResultDto,
	findBestPriceChartingConsoleIdFromRows,
	type DashboardSummaryDto,
	type PriceChartingPricingPreviewDto,
	type PriceChartingProductSuggestionDto,
	type PriceChartingSnapshotDto,
	snapshotFmvCentsForClassification,
} from "@gettin-paid/shared";
import {
	BadRequestException,
	HttpException,
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

	/** Full product row for a PriceCharting id (add-game pricing hint; ~1 API call) */
	async productPricingPreview(
		productId: string,
	): Promise<PriceChartingPricingPreviewDto> {
		const id = productId.trim();
		if (!id) {
			throw new BadRequestException("productId is required");
		}
		try {
			const data = await this.pricecharting.fetchProduct({ id });
			const snap = this.pricecharting.snapshotFromApi(data);
			return {
				productName: snap.productName ?? null,
				consoleName: snap.consoleName ?? null,
				loosePrice: snap.loosePrice ?? null,
				cibPrice: snap.cibPrice ?? null,
				newPrice: snap.newPrice ?? null,
				gradedPrice: snap.gradedPrice ?? null,
				salesVolume: snap.salesVolume ?? null,
			};
		} catch (e) {
			if (e instanceof ServiceUnavailableException) throw e;
			throw new BadRequestException(
				e instanceof Error ? e.message : "PriceCharting fetch failed",
			);
		}
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
				snapshot: true,
				copies: {
					where: { soldAt: null },
					orderBy: { id: "asc" },
					select: {
						id: true,
						copyClassification: true,
						offerAmount: true,
						offerCurrency: true,
					},
				},
			},
		});
		return editions.map((e) => {
			const base = this.editionToDto(e);
			const snap = e.snapshot;
			const activeCopies = e.copies.map((c) => ({
				id: c.id,
				copyClassification: c.copyClassification,
				fmvCents: snap
					? snapshotFmvCentsForClassification(
							{
								loosePrice: snap.loosePrice,
								cibPrice: snap.cibPrice,
								newPrice: snap.newPrice,
								gradedPrice: snap.gradedPrice,
							},
							c.copyClassification,
						)
					: null,
				offerAmount: decStr(c.offerAmount),
				offerCurrency: c.offerCurrency,
			}));
			return { ...base, activeCopies };
		});
	}

	/**
	 * Games per system (editions) and total FMV of active copies from the latest
	 * PriceCharting snapshot and each copy’s classification.
	 */
	async dashboardSummary(): Promise<DashboardSummaryDto> {
		const [editionRows, activeCopies, editionCount] = await Promise.all([
			this.prisma.gameEdition.findMany({
				select: { priceChartingConsoleId: true },
			}),
			this.prisma.ownedCopy.findMany({
				where: { soldAt: null },
				include: {
					edition: { include: { snapshot: true } },
				},
			}),
			this.prisma.gameEdition.count(),
		]);

		const countByConsole = new Map<string | null, number>();
		for (const e of editionRows) {
			const k = e.priceChartingConsoleId;
			countByConsole.set(k, (countByConsole.get(k) ?? 0) + 1);
		}

		const consoleIds = [...countByConsole.keys()].filter(
			(id): id is string => id != null,
		);
		const consoleRows = await this.prisma.priceChartingConsole.findMany({
			where: { id: { in: consoleIds } },
			select: { id: true, name: true },
		});
		const nameById = new Map(consoleRows.map((c) => [c.id, c.name]));

		const systems = [...countByConsole.entries()]
			.map(([priceChartingConsoleId, count]) => ({
				priceChartingConsoleId,
				name:
					priceChartingConsoleId == null
						? "Unknown"
						: (nameById.get(priceChartingConsoleId) ??
							priceChartingConsoleId),
				editionCount: count,
			}))
			.sort((a, b) => b.editionCount - a.editionCount);

		let totalValueCents = 0;
		let valuedCopyCount = 0;
		let unpricedCopyCount = 0;
		let proposedTotalUsdCents = 0;
		let proposedOfferCopyCount = 0;
		for (const c of activeCopies) {
			if (c.offerAmount != null) {
				// Empty string is stored for some rows; treat like missing currency → USD
				const cur = (c.offerCurrency?.trim() || "USD")
					.toUpperCase()
					.slice(0, 3);
				if (cur === "USD") {
					const dollars =
						typeof c.offerAmount === "object" &&
						c.offerAmount !== null &&
						"toNumber" in c.offerAmount
							? (c.offerAmount as Prisma.Decimal).toNumber()
							: Number(c.offerAmount);
					if (Number.isFinite(dollars)) {
						proposedTotalUsdCents += Math.round(dollars * 100);
						proposedOfferCopyCount++;
					}
				}
			}

			const snap = c.edition.snapshot;
			if (!snap) {
				unpricedCopyCount++;
				continue;
			}
			const cents = snapshotFmvCentsForClassification(
				{
					loosePrice: snap.loosePrice,
					cibPrice: snap.cibPrice,
					newPrice: snap.newPrice,
					gradedPrice: snap.gradedPrice,
				},
				c.copyClassification,
			);
			if (cents == null) {
				unpricedCopyCount++;
				continue;
			}
			totalValueCents += cents;
			valuedCopyCount++;
		}

		return {
			systems,
			totalValueCents,
			valuedCopyCount,
			unpricedCopyCount,
			activeCopyCount: activeCopies.length,
			editionCount,
			proposedTotalUsdCents,
			proposedOfferCopyCount,
		};
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
	 * Sequentially refresh PriceCharting snapshots for every edition (optional console filter).
	 * Per-edition failures are collected; missing API token aborts the whole run.
	 */
	async refreshAllMarket(
		priceChartingConsoleId?: string,
	): Promise<BulkRefreshMarketResultDto> {
		const where = priceChartingConsoleId
			? { priceChartingConsoleId }
			: {};
		const editions = await this.prisma.gameEdition.findMany({
			where,
			orderBy: { title: "asc" },
			select: { id: true, title: true, upc: true },
		});
		const failures: BulkRefreshMarketResultDto["failures"] = [];
		let ok = 0;
		for (const e of editions) {
			try {
				await this.refreshMarketSnapshot(e.id);
				ok++;
			} catch (err) {
				const msg = exceptionMessage(err);
				if (
					err instanceof ServiceUnavailableException &&
					msg.includes("PRICECHARTING_API_TOKEN")
				) {
					throw err;
				}
				failures.push({
					editionId: e.id,
					title: e.title,
					upc: e.upc,
					message: msg,
				});
			}
		}
		return {
			total: editions.length,
			ok,
			failed: failures.length,
			failures,
		};
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

	async exportAllCopies(): Promise<string> {
		const copies = await this.prisma.ownedCopy.findMany({
			orderBy: [{ edition: { title: "asc" } }, { id: "asc" }],
			include: {
				edition: {
					include: { priceChartingConsole: { select: { name: true } } },
				},
			},
		});

		const headers = [
			"copy_id",
			"edition_id",
			"title",
			"console",
			"upc",
			"publisher",
			"copy_classification",
			"classification_notes",
			"purchase_amount",
			"purchase_currency",
			"purchase_date",
			"offer_amount",
			"offer_currency",
			"sold_amount",
			"sold_currency",
			"sold_at",
		];

		const rows = copies.map((c) => [
			c.id,
			c.editionId,
			c.edition.title,
			c.edition.priceChartingConsole?.name ?? "",
			c.edition.upc,
			c.edition.publisher ?? "",
			c.copyClassification,
			c.classificationNotes ?? "",
			decStr(c.purchaseAmount) ?? "",
			c.purchaseCurrency ?? "",
			c.purchaseDate?.toISOString().slice(0, 10) ?? "",
			decStr(c.offerAmount) ?? "",
			c.offerCurrency ?? "",
			decStr(c.soldAmount) ?? "",
			c.soldCurrency ?? "",
			c.soldAt?.toISOString() ?? "",
		]);

		return [headers, ...rows]
			.map((row) => row.map(csvEscape).join(","))
			.join("\n");
	}

	async importCsv(csv: string): Promise<BulkImportResultDto> {
		const lines = csv.split(/\r?\n/).filter((l) => l.trim());
		if (lines.length < 2) {
			throw new BadRequestException(
				"CSV must have a header row and at least one data row",
			);
		}

		const headers = parseCsvLine(lines[0]);
		const expected = [
			"copy_id",
			"edition_id",
			"title",
			"console",
			"upc",
			"publisher",
			"copy_classification",
			"classification_notes",
			"purchase_amount",
			"purchase_currency",
			"purchase_date",
			"offer_amount",
			"offer_currency",
			"sold_amount",
			"sold_currency",
			"sold_at",
		];
		if (headers.length < expected.length || expected.some((h, i) => headers[i] !== h)) {
			throw new BadRequestException(
				`CSV headers do not match expected format. Expected: ${expected.join(",")}`,
			);
		}

		const dataRows = lines.slice(1);
		const failures: BulkImportResultDto["failures"] = [];
		let updated = 0;

		const validClassifications = new Set(Object.values(CopyClassification));

		for (let i = 0; i < dataRows.length; i++) {
			const rowNumber = i + 2;
			const fields = parseCsvLine(dataRows[i]);
			const copyId = fields[0]?.trim() ?? "";

			if (!copyId) {
				failures.push({ rowNumber, copyId: "", message: "Missing copy_id" });
				continue;
			}

			const classification = fields[6]?.trim() ?? "";
			if (!validClassifications.has(classification as CopyClassification)) {
				failures.push({
					rowNumber,
					copyId,
					message: `Invalid copy_classification: "${classification}"`,
				});
				continue;
			}

			try {
				const copy = await this.prisma.ownedCopy.findUnique({
					where: { id: copyId },
				});
				if (!copy) {
					failures.push({ rowNumber, copyId, message: "Copy not found" });
					continue;
				}

				const purchaseDate = fields[10]?.trim();
				const soldAt = fields[15]?.trim();

				await this.prisma.ownedCopy.update({
					where: { id: copyId },
					data: {
						copyClassification: classification as CopyClassification,
						classificationNotes: fields[7]?.trim() || null,
						purchaseAmount: d(fields[8]?.trim() || undefined),
						purchaseCurrency: fields[9]?.trim() || null,
						purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
						offerAmount: d(fields[11]?.trim() || undefined),
						offerCurrency: fields[12]?.trim() || null,
						soldAmount: d(fields[13]?.trim() || undefined),
						soldCurrency: fields[14]?.trim() || null,
						soldAt: soldAt ? new Date(soldAt) : null,
					},
				});
				updated++;
			} catch (err) {
				failures.push({
					rowNumber,
					copyId,
					message: err instanceof Error ? err.message : String(err),
				});
			}
		}

		return { total: dataRows.length, updated, failed: failures.length, failures };
	}

	async deleteEdition(id: string) {
		await this.ensureEdition(id);
		await this.prisma.gameEdition.delete({ where: { id } });
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

function csvEscape(value: string): string {
	if (value.includes(",") || value.includes('"') || value.includes("\n")) {
		return `"${value.replace(/"/g, '""')}"`;
	}
	return value;
}

function parseCsvLine(line: string): string[] {
	const fields: string[] = [];
	let current = "";
	let inQuotes = false;
	let i = 0;
	while (i < line.length) {
		const ch = line[i];
		if (inQuotes) {
			if (ch === '"' && line[i + 1] === '"') {
				current += '"';
				i += 2;
			} else if (ch === '"') {
				inQuotes = false;
				i++;
			} else {
				current += ch;
				i++;
			}
		} else {
			if (ch === '"') {
				inQuotes = true;
				i++;
			} else if (ch === ",") {
				fields.push(current);
				current = "";
				i++;
			} else {
				current += ch;
				i++;
			}
		}
	}
	fields.push(current);
	return fields;
}

function decStr(v: Prisma.Decimal | null): string | null {
	if (v === null) return null;
	return v.toString();
}

function exceptionMessage(err: unknown): string {
	if (err instanceof HttpException) {
		const r = err.getResponse();
		if (typeof r === "string") return r;
		if (typeof r === "object" && r !== null && "message" in r) {
			const m = (r as { message?: unknown }).message;
			if (Array.isArray(m)) return m.join("; ");
			if (typeof m === "string") return m;
		}
	}
	if (err instanceof Error) return err.message;
	return String(err);
}
