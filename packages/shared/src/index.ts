export * from './pricecharting-console-ids.js';
export * from './pricecharting-console-resolve.js';
export * from './pricecharting-product-url.js';

export const CopyClassification = {
	SEALED: 'SEALED',
	CIB: 'CIB',
	INCOMPLETE_BOX: 'INCOMPLETE_BOX',
	LOOSE: 'LOOSE',
	GRADED_SLAB: 'GRADED_SLAB',
	OTHER: 'OTHER',
} as const;

export type CopyClassification =
	(typeof CopyClassification)[keyof typeof CopyClassification];

/** Maps OwnedCopy.classification → PriceCharting snapshot penny column (conceptual) */
export const classificationToSnapshotField = {
	SEALED: 'newPrice',
	CIB: 'cibPrice',
	LOOSE: 'loosePrice',
	GRADED_SLAB: 'gradedPrice',
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
	'product-name'?: string;
	'console-name'?: string;
};

export type PriceChartingProductsApi = {
	status?: string;
	products?: PriceChartingProductListItem[];
	'error-message'?: string;
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
	'product-name'?: string;
	'console-name'?: string;
	upc?: string;
	genre?: string;
	'release-date'?: string;
	asin?: string;
	epid?: string;
	'loose-price'?: number;
	'cib-price'?: number;
	'new-price'?: number;
	'graded-price'?: number;
	'box-only-price'?: number;
	'manual-only-price'?: number;
	'gamestop-price'?: number;
	'bgs-10-price'?: number;
	'condition-17-price'?: number;
	'condition-18-price'?: number;
	'retail-loose-buy'?: number;
	'retail-loose-sell'?: number;
	'retail-cib-buy'?: number;
	'retail-cib-sell'?: number;
	'retail-new-buy'?: number;
	'retail-new-sell'?: number;
	'sales-volume'?: number;
	'error-message'?: string;
};

/** Eight predefined collection badge colors (#RRGGBB, stored uppercase in API). */
export const COLLECTION_BADGE_COLORS = [
	'#6366F1',
	'#22C55E',
	'#EF4444',
	'#F59E0B',
	'#8B5CF6',
	'#06B6D4',
	'#EC4899',
	'#78716C',
] as const;

export type CollectionBadgeColor = (typeof COLLECTION_BADGE_COLORS)[number];

const COLLECTION_BADGE_COLOR_SET = new Set<string>(
	COLLECTION_BADGE_COLORS as readonly string[],
);

export const DEFAULT_COLLECTION_BADGE_COLOR: CollectionBadgeColor =
	COLLECTION_BADGE_COLORS[0];

/** True if `value` matches one of {@link COLLECTION_BADGE_COLORS} (case-insensitive). */
export function isCollectionBadgeColor(value: string): boolean {
	return COLLECTION_BADGE_COLOR_SET.has(value.trim().toUpperCase());
}

/** Returns uppercase preset hex, or {@link DEFAULT_COLLECTION_BADGE_COLOR} if invalid. */
export function coerceCollectionBadgeColor(
	value: string | undefined | null,
): CollectionBadgeColor {
	const u = value?.trim().toUpperCase() ?? '';
	if (COLLECTION_BADGE_COLOR_SET.has(u)) return u as CollectionBadgeColor;
	return DEFAULT_COLLECTION_BADGE_COLOR;
}

/** User collection shown on copies and in dropdowns */
export type GameCollectionSummaryDto = {
	id: string;
	title: string;
	description: string | null;
	badgeColor: string;
};

/**
 * One copy row on GET /editions lists. Library mode is unsold copies only (`soldAt` null)
 * unless the request sets `includeSoldCopies=true`, in which case sold copies are included too.
 * Collection-scoped lists may include sold copies still tagged with that collection.
 */
export type EditionListActiveCopyDto = {
	id: string;
	copyClassification: CopyClassification;
	/** Fair market value in USD pennies from latest snapshot, or null if unpriced */
	fmvCents: number | null;
	offerAmount: string | null;
	offerCurrency: string | null;
	/** Sale proceeds when sold; null if not sold */
	soldAmount: string | null;
	soldCurrency: string | null;
	/** Shelf collections this copy belongs to (may be multiple). */
	collections: GameCollectionSummaryDto[];
	/** ISO date-only or datetime when sold; null while still in inventory */
	soldAt: string | null;
};

/** Platform = PriceCharting console id (e.g. G8, G17). See PRICECHARTING_CONSOLES */
export type GameEditionDto = {
	id: string;
	upc: string | null;
	title: string;
	publisher: string | null;
	priceChartingProductId: string | null;
	priceChartingConsoleId: string | null;
	/** Resolved from {@link PRICECHARTING_CONSOLE_ID_TO_NAME}; null if id missing or unknown */
	priceChartingConsoleName: string | null;
	/** True when a cover image was stored (see coverFetchedAt) */
	hasCover: boolean;
	/** ISO timestamp when cover scrape succeeded; null if none */
	coverFetchedAt: string | null;
	copyCount?: number;
	/**
	 * Set on GET /editions: per-row copies (unsold only by default; all copies when
	 * `includeSoldCopies=true`; collection filter may include sold).
	 */
	activeCopies?: EditionListActiveCopyDto[];
	/**
	 * Distinct collections any copy of this edition belongs to (sold or unsold).
	 * Used so the inventory list can show tags even when list rows only include unsold copies.
	 */
	shelfCollections?: GameCollectionSummaryDto[];
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
	collections: GameCollectionSummaryDto[];
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

/** GET /api/product-cover-preview — absolute URL to GET /api/product-cover/:productId (stored file; scraped if missing) */
export type PriceChartingProductCoverPreviewDto = {
	previewImageUrl: string | null;
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
		upc: string | null;
		message: string;
	}[];
};

/** POST /api/editions/fetch-all-covers */
export type FetchAllCoversResultDto = {
	total: number;
	ok: number;
	skipped: number;
	failed: number;
	failures: {
		editionId: string;
		title: string;
		upc: string | null;
		message: string;
	}[];
};

/** POST /api/editions/reset-all-covers */
export type ResetAllCoversResultDto = {
	/** Rows updated (all editions get null cover fields). */
	editionsUpdated: number;
	/** Distinct PriceCharting product ids for which on-disk cover files were removed. */
	productIdsFilesRemoved: number;
};

/** POST /api/editions/:id/fetch-cover */
export type FetchEditionCoverResponseDto = EditionDetailDto & {
	/** True when cover was already on disk and scrape was skipped */
	coverAlreadyStored?: boolean;
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
	/** Unsold copies in scope (library-wide, or unsold copies tagged to a collection). */
	activeCopyCount: number;
	editionCount: number;
	/**
	 * Sum of proposed / asking prices for active unsold copies, in USD whole cents.
	 * Only offers with currency USD (or blank, treated as USD) are included.
	 */
	proposedTotalUsdCents: number;
	/** Active copies counted toward proposedTotalUsdCents */
	proposedOfferCopyCount: number;
	/** Sum of recorded sale amounts for sold copies (USD whole cents); non-USD sales excluded */
	soldTotalUsdCents: number;
	/** Sold copies with a USD sale amount included in soldTotalUsdCents */
	soldCopyCount: number;
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
		'loosePrice' | 'cibPrice' | 'newPrice' | 'gradedPrice'
	>,
	classification: CopyClassification,
): number | null {
	const field = classificationToSnapshotField[classification];
	if (field === null) return null;
	return snap[field] ?? null;
}
