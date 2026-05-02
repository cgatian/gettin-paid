export * from "./pricecharting-console-ids.js";
export * from "./pricecharting-console-resolve.js";
export * from "./pricecharting-product-url.js";

export const CopyClassification = {
	SEALED: "SEALED",
	CIB: "CIB",
	INCOMPLETE_BOX: "INCOMPLETE_BOX",
	LOOSE: "LOOSE",
	GRADED_SLAB: "GRADED_SLAB",
	OTHER: "OTHER",
} as const;

export type CopyClassification =
	(typeof CopyClassification)[keyof typeof CopyClassification];

/** Maps OwnedCopy.classification → PriceCharting snapshot penny column (conceptual) */
export const classificationToSnapshotField = {
	SEALED: "newPrice",
	CIB: "cibPrice",
	LOOSE: "loosePrice",
	GRADED_SLAB: "gradedPrice",
	INCOMPLETE_BOX: null,
	OTHER: null,
} as const;

/** Money in user's currency (decimal string or number in API — document as minor units optional later) */
export type MoneyDto = {
	amount: string;
	currency: string;
};

/** Short product row from GET /api/products (list search) */
export type PriceChartingProductListItem = {
	id?: string;
	"product-name"?: string;
	"console-name"?: string;
};

export type PriceChartingProductsApi = {
	status?: string;
	products?: PriceChartingProductListItem[];
	"error-message"?: string;
};

/** One option from GET /api/product-suggestions (PriceCharting /api/products search) */
export type PriceChartingProductSuggestionDto = {
	id: string;
	productName: string;
	consoleName: string;
};

export type PriceChartingProductApi = {
	status?: string;
	id?: string;
	"product-name"?: string;
	"console-name"?: string;
	upc?: string;
	genre?: string;
	"release-date"?: string;
	asin?: string;
	epid?: string;
	"loose-price"?: number;
	"cib-price"?: number;
	"new-price"?: number;
	"graded-price"?: number;
	"box-only-price"?: number;
	"manual-only-price"?: number;
	"gamestop-price"?: number;
	"bgs-10-price"?: number;
	"condition-17-price"?: number;
	"condition-18-price"?: number;
	"retail-loose-buy"?: number;
	"retail-loose-sell"?: number;
	"retail-cib-buy"?: number;
	"retail-cib-sell"?: number;
	"retail-new-buy"?: number;
	"retail-new-sell"?: number;
	"sales-volume"?: number;
	"error-message"?: string;
};

/** One unsold copy on the inventory list, with condition-based FMV and optional proposed price */
export type EditionListActiveCopyDto = {
	id: string;
	copyClassification: CopyClassification;
	/** Fair market value in USD pennies from latest snapshot, or null if unpriced */
	fmvCents: number | null;
	offerAmount: string | null;
	offerCurrency: string | null;
};

/** Platform = PriceCharting console id (e.g. G8, G17). See PRICECHARTING_CONSOLES */
export type GameEditionDto = {
	id: string;
	upc: string;
	title: string;
	publisher: string | null;
	priceChartingProductId: string | null;
	priceChartingConsoleId: string | null;
	/** Resolved from {@link PRICECHARTING_CONSOLE_ID_TO_NAME}; null if id missing or unknown */
	priceChartingConsoleName: string | null;
	copyCount?: number;
	/** Set on GET /editions: unsold copies with FMV and optional proposed (offer) price */
	activeCopies?: EditionListActiveCopyDto[];
};

export type OwnedCopyDto = {
	id: string;
	editionId: string;
	copyClassification: CopyClassification;
	classificationNotes: string | null;
	purchaseAmount: string | null;
	purchaseCurrency: string | null;
	purchaseDate: string | null;
	offerAmount: string | null;
	offerCurrency: string | null;
	soldAmount: string | null;
	soldCurrency: string | null;
	soldAt: string | null;
};

/** GET /api/product-pricing — live PriceCharting prices for a product id (add flow) */
export type PriceChartingPricingPreviewDto = {
	productName: string | null;
	consoleName: string | null;
	loosePrice: number | null;
	cibPrice: number | null;
	newPrice: number | null;
	gradedPrice: number | null;
	salesVolume: number | null;
};

export type PriceChartingSnapshotDto = {
	id: string;
	editionId: string;
	fetchedAt: string;
	loosePrice: number | null;
	cibPrice: number | null;
	newPrice: number | null;
	gradedPrice: number | null;
	boxOnlyPrice: number | null;
	manualOnlyPrice: number | null;
	gamestopPrice: number | null;
	bgs10Price: number | null;
	condition17Price: number | null;
	condition18Price: number | null;
	retailLooseBuy: number | null;
	retailLooseSell: number | null;
	retailCibBuy: number | null;
	retailCibSell: number | null;
	retailNewBuy: number | null;
	retailNewSell: number | null;
	salesVolume: number | null;
	priceChartingId: string | null;
	productName: string | null;
	consoleName: string | null;
	genre: string | null;
	releaseDate: string | null;
	upc: string | null;
	asin: string | null;
	epid: string | null;
};

export type EditionDetailDto = GameEditionDto & {
	copies: OwnedCopyDto[];
	snapshot: PriceChartingSnapshotDto | null;
};

/** One slice for “games per system” on the dashboard */
export type DashboardSystemCountDto = {
	priceChartingConsoleId: string | null;
	name: string;
	editionCount: number;
};

/** POST /api/editions/refresh-all-market */
export type BulkRefreshMarketResultDto = {
	total: number;
	ok: number;
	failed: number;
	failures: {
		editionId: string;
		title: string;
		upc: string;
		message: string;
	}[];
};

/** GET /api/dashboard */
export type DashboardSummaryDto = {
	systems: DashboardSystemCountDto[];
	/** Sum of snapshot FMV (USD pennies) for active copies that map to a price column */
	totalValueCents: number;
	/** Active (unsold) copies included in totalValueCents */
	valuedCopyCount: number;
	/** Active copies with no usable FMV (no snapshot, unmapped classification, or null price) */
	unpricedCopyCount: number;
	activeCopyCount: number;
	editionCount: number;
	/**
	 * Sum of proposed / asking prices for active unsold copies, in USD whole cents.
	 * Only offers with currency USD (or blank, treated as USD) are included.
	 */
	proposedTotalUsdCents: number;
	/** Active copies counted toward proposedTotalUsdCents */
	proposedOfferCopyCount: number;
};

export type BulkImportResultDto = {
	total: number;
	updated: number;
	failed: number;
	failures: {
		rowNumber: number;
		copyId: string;
		message: string;
	}[];
};

/** FMV in USD pennies from a snapshot row for a copy classification, or null if not applicable */
export function snapshotFmvCentsForClassification(
	snap: Pick<
		PriceChartingSnapshotDto,
		"loosePrice" | "cibPrice" | "newPrice" | "gradedPrice"
	>,
	classification: CopyClassification,
): number | null {
	const field = classificationToSnapshotField[classification];
	if (field === null) return null;
	return snap[field] ?? null;
}
