import {
	type BulkImportResultDto,
	type BulkRefreshMarketResultDto,
	type FetchAllCoversResultDto,
	type FetchEditionCoverResponseDto,
	coerceCollectionBadgeColor,
	findBestPriceChartingConsoleIdFromRows,
	type DashboardSummaryDto,
	type PriceChartingPricingPreviewDto,
	type PriceChartingProductCoverPreviewDto,
	type PriceChartingProductSuggestionDto,
	type PriceChartingSnapshotDto,
	snapshotFmvCentsForClassification,
} from "@gettin-paid/shared";
import {
	BadRequestException,
	HttpException,
	Injectable,
	Logger,
	NotFoundException,
	ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createReadStream, type ReadStream } from "node:fs";
import {
	CopyClassification,
	type GameEdition,
	type OwnedCopy,
	type PriceChartingProductSnapshot,
	Prisma,
} from "@prisma/client";
import { CoverArtService } from "../cover-art/cover-art.service";
import { pickBestProduct } from "../oneoff/pick-product";
import { PriceChartingService } from "../pricecharting/pricecharting.service";
import { PrismaService } from "../prisma/prisma.service";
import type { Request } from "express";
import type { CreateCollectionDto } from "./dto/create-collection.dto";
import type { CreateCopyDto } from "./dto/create-copy.dto";
import type { CreateEditionDto } from "./dto/create-edition.dto";
import type { PatchCollectionDto } from "./dto/patch-collection.dto";
import type { PatchCopyDto } from "./dto/patch-copy.dto";
import type { PatchEditionDto } from "./dto/patch-edition.dto";

function d(s: string | null | undefined): Prisma.Decimal | null {
	if (s == null || s === "") return null;
	return new Prisma.Decimal(s);
}

const EDITION_ID_UUID =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

@Injectable()
export class InventoryService {
	private readonly logger = new Logger(InventoryService.name);

	constructor(
		private readonly prisma: PrismaService,
		private readonly pricecharting: PriceChartingService,
		private readonly coverArt: CoverArtService,
		private readonly config: ConfigService,
	) {}

	/** Minimum pause between PriceCharting HTML/image hits when bulk-fetching covers (403 avoidance). */
	private coverScrapeIntervalMs(): number {
		const raw = Number(this.config.get("COVER_SCRAPE_MIN_INTERVAL_MS") ?? 2000);
		if (!Number.isFinite(raw)) return 2000;
		return Math.max(2000, Math.floor(raw));
	}

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

	/** Optional collection filter; must be a UUID of an existing GameCollection */
	async resolveCollectionFilterQuery(
		collectionParam?: string,
	): Promise<string | undefined> {
		const raw = collectionParam?.trim();
		if (!raw) return undefined;
		if (!EDITION_ID_UUID.test(raw)) {
			throw new BadRequestException("Invalid collection id");
		}
		const row = await this.prisma.gameCollection.findUnique({
			where: { id: raw },
			select: { id: true },
		});
		if (!row) throw new BadRequestException("Collection not found");
		return row.id;
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

	/**
	 * Ensures cover is on disk (scrape if needed), returns absolute URL to GET …/product-cover/:id.
	 */
	async productCoverPreview(
		productId: string,
		req: Request,
	): Promise<PriceChartingProductCoverPreviewDto> {
		const id = productId.trim();
		if (!id) {
			return { previewImageUrl: null };
		}
		const stored = await this.coverArt.ensureCoverImageStored(id);
		if (!stored) {
			return { previewImageUrl: null };
		}
		const previewImageUrl = this.absolutePublicApiUrl(
			req,
			`/product-cover/${encodeURIComponent(id)}`,
		);
		return { previewImageUrl };
	}

	private absolutePublicApiUrl(req: Request, pathname: string): string {
		const proto = (
			req.get("x-forwarded-proto") ||
			req.protocol ||
			"http"
		).split(",")[0].trim();
		const host = (
			req.get("x-forwarded-host") ||
			req.get("host") ||
			"localhost"
		).split(",")[0].trim();
		const pathPart = pathname.startsWith("/") ? pathname : `/${pathname}`;
		return `${proto}://${host}/api${pathPart}`;
	}

	/** Stream a stored cover by PriceCharting product id (used during add-game before an edition exists). */
	async getProductCoverReadStream(
		priceChartingProductId: string,
	): Promise<{ stream: ReadStream; contentType: string }> {
		const found = await this.coverArt.findStoredCoverFile(
			priceChartingProductId.trim(),
		);
		if (!found) {
			throw new NotFoundException("Cover not found");
		}
		this.logger.debug(
			`getProductCoverReadStream: pcId=${priceChartingProductId.trim()} path=${found.absPath}`,
		);
		return {
			stream: createReadStream(found.absPath),
			contentType: found.mime,
		};
	}

	async listEditions(
		priceChartingConsoleId?: string,
		gameCollectionId?: string,
	) {
		/** Rows: unsold inventory, or every copy assigned to this collection (including sold). */
		const copyRowsWhere: Prisma.OwnedCopyWhereInput = gameCollectionId
			? { collectionId: gameCollectionId }
			: { soldAt: null };
		/** Which editions appear: any copy assigned to this collection (sold or unsold) */
		const where: Prisma.GameEditionWhereInput = {
			...(priceChartingConsoleId ? { priceChartingConsoleId } : {}),
			...(gameCollectionId
				? { copies: { some: { collectionId: gameCollectionId } } }
				: {}),
		};
		const editions = await this.prisma.gameEdition.findMany({
			where,
			orderBy: { title: "asc" },
			include: {
				_count: { select: { copies: true } },
				priceChartingConsole: { select: { name: true } },
				snapshot: true,
				copies: {
					where: copyRowsWhere,
					orderBy: { id: "asc" },
					select: {
						id: true,
						copyClassification: true,
						offerAmount: true,
						offerCurrency: true,
						soldAt: true,
						collection: {
							select: {
								id: true,
								title: true,
								description: true,
								badgeColor: true,
							},
						},
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
				collection: this.collectionToSummary(c.collection),
				soldAt: c.soldAt?.toISOString() ?? null,
			}));
			return { ...base, activeCopies };
		});
	}

	/**
	 * Games per system (editions) and total FMV of active copies from the latest
	 * PriceCharting snapshot and each copy’s classification.
	 */
	async dashboardSummary(): Promise<DashboardSummaryDto> {
		return this.buildDashboardSummary(undefined);
	}

	async collectionSummary(collectionId: string): Promise<DashboardSummaryDto> {
		await this.ensureCollection(collectionId);
		return this.buildDashboardSummary(collectionId);
	}

	private async buildDashboardSummary(
		gameCollectionId: string | undefined,
	): Promise<DashboardSummaryDto> {
		/** Library: unsold only. Collection shelf: every copy tagged to the collection (sold or not) so FMV matches the list. */
		const copyWhere: Prisma.OwnedCopyWhereInput = gameCollectionId
			? { collectionId: gameCollectionId }
			: { soldAt: null };

		const soldWhere: Prisma.OwnedCopyWhereInput = {
			soldAt: { not: null },
			...(gameCollectionId ? { collectionId: gameCollectionId } : {}),
		};

		const [copiesForMetrics, soldRows] = await Promise.all([
			this.prisma.ownedCopy.findMany({
				where: copyWhere,
				include: {
					edition: { include: { snapshot: true } },
				},
			}),
			this.prisma.ownedCopy.findMany({
				where: soldWhere,
				select: { soldAmount: true, soldCurrency: true },
			}),
		]);

		/** Match listEditions: editions with any copy in this collection. */
		const editionWhere: Prisma.GameEditionWhereInput | undefined =
			gameCollectionId
				? { copies: { some: { collectionId: gameCollectionId } } }
				: undefined;

		const [editionRows, editionCount] = await Promise.all([
			this.prisma.gameEdition.findMany({
				where: editionWhere,
				select: { priceChartingConsoleId: true },
			}),
			this.prisma.gameEdition.count({
				where: editionWhere ?? {},
			}),
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
		for (const c of copiesForMetrics) {
			if (c.soldAt == null && c.offerAmount != null) {
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

		const unsoldInScope = copiesForMetrics.filter((c) => c.soldAt == null).length;

		let soldTotalUsdCents = 0;
		let soldCopyCount = 0;
		for (const c of soldRows) {
			if (c.soldAmount == null) continue;
			const cur = (c.soldCurrency?.trim() || "USD")
				.toUpperCase()
				.slice(0, 3);
			if (cur !== "USD") continue;
			const dollars =
				typeof c.soldAmount === "object" &&
				c.soldAmount !== null &&
				"toNumber" in c.soldAmount
					? (c.soldAmount as Prisma.Decimal).toNumber()
					: Number(c.soldAmount);
			if (!Number.isFinite(dollars)) continue;
			soldTotalUsdCents += Math.round(dollars * 100);
			soldCopyCount++;
		}

		return {
			systems,
			totalValueCents,
			valuedCopyCount,
			unpricedCopyCount,
			/** Unsold copies in scope (library = all rows; collection = unsold tagged to shelf). */
			activeCopyCount: gameCollectionId ? unsoldInScope : copiesForMetrics.length,
			editionCount,
			proposedTotalUsdCents,
			proposedOfferCopyCount,
			soldTotalUsdCents,
			soldCopyCount,
		};
	}

	async listCollections() {
		const rows = await this.prisma.gameCollection.findMany({
			orderBy: { title: "asc" },
			select: {
				id: true,
				title: true,
				description: true,
				badgeColor: true,
			},
		});
		return rows.map((r) => this.collectionToSummary(r)!);
	}

	async createCollection(dto: CreateCollectionDto) {
		const badge = coerceCollectionBadgeColor(dto.badgeColor);
		const row = await this.prisma.gameCollection.create({
			data: {
				title: dto.title.trim(),
				description:
					dto.description === undefined
						? null
						: (dto.description?.trim() || null),
				badgeColor: badge,
			},
			select: {
				id: true,
				title: true,
				description: true,
				badgeColor: true,
			},
		});
		return this.collectionToSummary(row)!;
	}

	async getCollection(id: string) {
		await this.ensureCollection(id);
		const row = await this.prisma.gameCollection.findUniqueOrThrow({
			where: { id },
			select: {
				id: true,
				title: true,
				description: true,
				badgeColor: true,
			},
		});
		return this.collectionToSummary(row)!;
	}

	async patchCollection(id: string, dto: PatchCollectionDto) {
		await this.ensureCollection(id);
		const data: Prisma.GameCollectionUpdateInput = {};
		if (dto.title !== undefined) data.title = dto.title.trim();
		if (dto.description !== undefined) {
			data.description =
				dto.description === null ? null : dto.description.trim() || null;
		}
		if (dto.badgeColor !== undefined) {
			data.badgeColor = coerceCollectionBadgeColor(dto.badgeColor);
		}
		const row = await this.prisma.gameCollection.update({
			where: { id },
			data,
			select: {
				id: true,
				title: true,
				description: true,
				badgeColor: true,
			},
		});
		return this.collectionToSummary(row)!;
	}

	async deleteCollection(id: string) {
		await this.ensureCollection(id);
		await this.prisma.gameCollection.delete({ where: { id } });
	}

	async getEdition(id: string) {
		const edition = await this.prisma.gameEdition.findUnique({
			where: { id },
			include: {
				copies: {
					orderBy: { id: "asc" },
					include: {
						collection: {
							select: {
								id: true,
								title: true,
								description: true,
								badgeColor: true,
							},
						},
					},
				},
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
		const trimmedUpc = (dto.upc ?? "").trim();
		const upcDigits = trimmedUpc.replace(/\D/g, "");
		if (trimmedUpc.length > 0 && upcDigits.length < 8) {
			throw new BadRequestException(
				"UPC must be at least 8 digits when provided",
			);
		}
		const upc = upcDigits.length >= 8 ? upcDigits : null;

		const priceChartingProductId = await this.resolvePriceChartingProductIdOrThrow(
			upc,
			dto.title,
			dto.priceChartingConsoleId,
		);

		const coverStored =
			await this.coverArt.ensureCoverImageStored(priceChartingProductId);

		const initialCollectionId =
			(dto.initialCopyCollectionId ?? "").trim() || null;
		if (initialCollectionId) {
			await this.ensureCollection(initialCollectionId);
		}

		const edition = await this.prisma.$transaction(async (tx) => {
			const existing = await tx.gameEdition.findUnique({
				where: { priceChartingProductId },
				select: { id: true },
			});

			const editionId =
				existing?.id ??
				(
					await tx.gameEdition.create({
						data: {
							title: dto.title,
							priceChartingConsoleId: dto.priceChartingConsoleId,
							publisher: dto.publisher ?? null,
							priceChartingProductId,
							...(upc !== null ? { upc } : {}),
							...(coverStored
								? {
										coverFetchedAt: new Date(),
										coverContentType: coverStored.mime,
									}
								: {}),
						} as Prisma.GameEditionUncheckedCreateInput,
					})
				).id;

			const purchaseAmt = dto.initialPurchaseAmount?.trim();
			const offerAmt = dto.initialOfferAmount?.trim();
			await tx.ownedCopy.create({
				data: {
					editionId,
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
					...(initialCollectionId
						? { collectionId: initialCollectionId }
						: {}),
				},
			});
			return { id: editionId };
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
		if (dto.upc !== undefined) {
			const trimmed =
				dto.upc === null ? "" : String(dto.upc).trim();
			const digits = trimmed.replace(/\D/g, "");
			if (trimmed.length > 0 && digits.length < 8) {
				throw new BadRequestException(
					"UPC must be at least 8 digits when provided",
				);
			}
			(data as { upc?: string | null }).upc =
				digits.length >= 8 ? digits : null;
		}
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
		const created = await this.prisma.ownedCopy.create({
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
			select: { id: true },
		});
		const copy = await this.prisma.ownedCopy.findUniqueOrThrow({
			where: { id: created.id },
			include: {
				collection: {
					select: {
						id: true,
						title: true,
						description: true,
						badgeColor: true,
					},
				},
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
		if (dto.collectionId !== undefined) {
			if (dto.collectionId === null) {
				data.collection = { disconnect: true };
			} else {
				await this.ensureCollection(dto.collectionId);
				data.collection = { connect: { id: dto.collectionId } };
			}
		}

		await this.prisma.ownedCopy.update({
			where: { id: copyId },
			data,
		});
		const copy = await this.prisma.ownedCopy.findUniqueOrThrow({
			where: { id: copyId },
			include: {
				collection: {
					select: {
						id: true,
						title: true,
						description: true,
						badgeColor: true,
					},
				},
			},
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

	async fetchEditionCover(
		editionId: string,
		force: boolean,
	): Promise<FetchEditionCoverResponseDto> {
		await this.ensureEdition(editionId);
		const edition = await this.prisma.gameEdition.findUniqueOrThrow({
			where: { id: editionId },
			select: {
				id: true,
				priceChartingProductId: true,
				coverFetchedAt: true,
				coverContentType: true,
			},
		});
		if (!edition.priceChartingProductId?.trim()) {
			throw new BadRequestException(
				"Edition has no PriceCharting product id",
			);
		}
		const pcId = edition.priceChartingProductId.trim();
		this.logger.log(
			`fetchEditionCover: editionId=${editionId} priceChartingProductId=${pcId} force=${force}`,
		);
		const fileOk = await this.coverArt.coverFileExistsForPriceChartingProduct(
			pcId,
			edition.coverContentType,
		);
		if (!force && edition.coverFetchedAt && fileOk) {
			this.logger.log(
				`fetchEditionCover: skipped (already on disk) editionId=${editionId} pcId=${pcId}`,
			);
			const detail = await this.getEdition(editionId);
			return { ...detail, coverAlreadyStored: true };
		}
		if (edition.coverFetchedAt && !fileOk) {
			this.logger.warn(
				`fetchEditionCover: DB had cover metadata but file missing — clearing editionId=${editionId} pcId=${pcId}`,
			);
			await this.prisma.gameEdition.update({
				where: { id: editionId },
				data: { coverFetchedAt: null, coverContentType: null },
			});
		}
		try {
			const { buffer, mime } = await this.coverArt.scrapeCoverImage(pcId);
			await this.coverArt.writeCoverFile(pcId, buffer, mime);
			await this.prisma.gameEdition.update({
				where: { id: editionId },
				data: {
					coverFetchedAt: new Date(),
					coverContentType: mime,
				},
			});
			this.logger.log(
				`fetchEditionCover: success editionId=${editionId} pcId=${pcId} mime=${mime}`,
			);
		} catch (e) {
			const msg = e instanceof Error ? e.message : "Cover fetch failed";
			this.logger.warn(
				`fetchEditionCover: failed editionId=${editionId} pcId=${pcId}: ${msg}`,
			);
			throw new BadRequestException(msg);
		}
		return this.getEdition(editionId);
	}

	async fetchAllCovers(force: boolean): Promise<FetchAllCoversResultDto> {
		const editions = await this.prisma.gameEdition.findMany({
			orderBy: { title: "asc" },
			select: {
				id: true,
				title: true,
				upc: true,
				priceChartingProductId: true,
				coverFetchedAt: true,
				coverContentType: true,
			},
		});
		const failures: FetchAllCoversResultDto["failures"] = [];
		let skipped = 0;
		type QueueItem = {
			id: string;
			title: string;
			upc: string | null;
			pcId: string;
			clearStaleDb: boolean;
		};
		const queue: QueueItem[] = [];

		for (let i = 0; i < editions.length; i++) {
			const e = editions[i];
			if (!e.priceChartingProductId?.trim()) {
				this.logger.warn(
					`fetchAllCovers [${i + 1}/${editions.length}] skip (no PC id): "${e.title}" (${e.upc ?? "no UPC"})`,
				);
				failures.push({
					editionId: e.id,
					title: e.title,
					upc: e.upc,
					message: "No PriceCharting product id",
				});
				continue;
			}
			const pcId = e.priceChartingProductId.trim();
			const fileOk = await this.coverArt.coverFileExistsForPriceChartingProduct(
				pcId,
				e.coverContentType,
			);
			if (!force && e.coverFetchedAt && fileOk) {
				this.logger.log(
					`fetchAllCovers [${i + 1}/${editions.length}] skipped (stored): "${e.title}" pcId=${pcId}`,
				);
				skipped++;
				continue;
			}
			queue.push({
				id: e.id,
				title: e.title,
				upc: e.upc,
				pcId,
				clearStaleDb: !!(e.coverFetchedAt && !fileOk),
			});
		}

		const intervalMs = this.coverScrapeIntervalMs();
		this.logger.log(
			`fetchAllCovers: editions=${editions.length} toScrape=${queue.length} skipped=${skipped} force=${force} throttleMs=${intervalMs}`,
		);

		let ok = 0;
		for (let i = 0; i < queue.length; i++) {
			if (i > 0) await sleep(intervalMs);
			const item = queue[i];
			if (item.clearStaleDb) {
				this.logger.warn(
					`fetchAllCovers scrape [${i + 1}/${queue.length}] stale DB row, clearing: "${item.title}" pcId=${item.pcId}`,
				);
				await this.prisma.gameEdition.update({
					where: { id: item.id },
					data: { coverFetchedAt: null, coverContentType: null },
				});
			}
			this.logger.log(
				`fetchAllCovers scrape [${i + 1}/${queue.length}] "${item.title}" pcId=${item.pcId}`,
			);
			try {
				const { buffer, mime } = await this.coverArt.scrapeCoverImage(item.pcId);
				await this.coverArt.writeCoverFile(item.pcId, buffer, mime);
				await this.prisma.gameEdition.update({
					where: { id: item.id },
					data: {
						coverFetchedAt: new Date(),
						coverContentType: mime,
					},
				});
				ok++;
				this.logger.log(
					`fetchAllCovers scrape [${i + 1}/${queue.length}] ok: "${item.title}" pcId=${item.pcId} mime=${mime}`,
				);
			} catch (err) {
				const message = exceptionMessage(err);
				this.logger.warn(
					`fetchAllCovers scrape [${i + 1}/${queue.length}] failed: "${item.title}" pcId=${item.pcId}: ${message}`,
				);
				failures.push({
					editionId: item.id,
					title: item.title,
					upc: item.upc,
					message,
				});
			}
		}
		this.logger.log(
			`fetchAllCovers: done total=${editions.length} ok=${ok} skipped=${skipped} failed=${failures.length}`,
		);
		return {
			total: editions.length,
			ok,
			skipped,
			failed: failures.length,
			failures,
		};
	}

	async getCoverReadStream(
		editionId: string,
	): Promise<{ stream: ReadStream; contentType: string }> {
		if (!EDITION_ID_UUID.test(editionId)) {
			throw new BadRequestException("Invalid edition id");
		}
		const edition = await this.prisma.gameEdition.findUnique({
			where: { id: editionId },
			select: {
				coverFetchedAt: true,
				coverContentType: true,
				priceChartingProductId: true,
			},
		});
		if (!edition?.coverFetchedAt || !edition.coverContentType) {
			throw new NotFoundException("No cover for this edition");
		}
		const pcId = edition.priceChartingProductId?.trim();
		if (!pcId) {
			throw new NotFoundException("No cover for this edition");
		}
		const exists = await this.coverArt.coverFileExistsForPriceChartingProduct(
			pcId,
			edition.coverContentType,
		);
		if (!exists) {
			throw new NotFoundException("Cover file missing");
		}
		const absPath = this.coverArt.coverFileAbsolute(
			pcId,
			edition.coverContentType,
		);
		this.logger.debug(
			`getCoverReadStream: editionId=${editionId} pcId=${pcId} path=${absPath}`,
		);
		return {
			stream: createReadStream(absPath),
			contentType: edition.coverContentType,
		};
	}

	/**
	 * Every new edition must get a PriceCharting product id for pricing lookups.
	 * Try UPC + console first, then title search + pick (same heuristics as the CSV script).
	 */
	private async resolvePriceChartingProductIdOrThrow(
		upc: string | null,
		title: string,
		priceChartingConsoleId: string,
	): Promise<string> {
		const tryUpc = async (): Promise<string | undefined> => {
			if (!upc || upc.length < 8) return undefined;
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
			"Could not resolve a PriceCharting product id for this title and console (and UPC if provided). Check PriceCharting or try a different spelling.",
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
			} else if (edition.upc && edition.priceChartingConsoleId) {
				data = await this.pricecharting.fetchProduct({
					upc: edition.upc,
					console: edition.priceChartingConsoleId,
				});
			} else if (edition.upc) {
				data = await this.pricecharting.fetchProduct({ upc: edition.upc });
			} else {
				throw new BadRequestException(
					"Cannot refresh market data without a PriceCharting product id or UPC",
				);
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
			c.edition.upc ?? "",
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
		const row = await this.prisma.gameEdition.findUnique({
			where: { id },
			select: { priceChartingProductId: true },
		});
		if (row?.priceChartingProductId?.trim()) {
			this.logger.log(
				`deleteEdition: removing cover files for PriceCharting id ${row.priceChartingProductId.trim()} (edition ${id})`,
			);
		}
		await this.coverArt.removeCoverFilesForPriceChartingProduct(
			row?.priceChartingProductId,
		);
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

	private async ensureCollection(id: string) {
		const row = await this.prisma.gameCollection.findUnique({ where: { id } });
		if (!row) throw new NotFoundException("Collection not found");
	}

	private collectionToSummary(
		c:
			| {
					id: string;
					title: string;
					description: string | null;
					badgeColor: string;
			  }
			| null
			| undefined,
	) {
		if (!c) return null;
		return {
			id: c.id,
			title: c.title,
			description: c.description,
			badgeColor: coerceCollectionBadgeColor(c.badgeColor),
		};
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
			hasCover: e.coverFetchedAt != null,
			coverFetchedAt: e.coverFetchedAt?.toISOString() ?? null,
			...(e._count !== undefined ? { copyCount: e._count.copies } : {}),
		};
	}

	private copyToDto(
		c: OwnedCopy & {
			collection?: {
				id: string;
				title: string;
				description: string | null;
				badgeColor: string;
			} | null;
		},
	) {
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
			collection: this.collectionToSummary(c.collection ?? null),
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
