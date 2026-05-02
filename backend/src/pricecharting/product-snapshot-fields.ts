import type { PriceChartingProductApi } from "@gettin-paid/shared";
import type { Prisma } from "@prisma/client";

/**
 * PriceCharting sometimes returns numeric fields as strings in JSON. Prisma `Int?`
 * columns require numbers (or null).
 */
function apiInt(value: unknown): number | null {
	if (value == null || value === "") return null;
	if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
	if (typeof value === "string") {
		const t = value.trim().replace(/,/g, "");
		if (t === "") return null;
		const n = Number(t);
		return Number.isFinite(n) ? Math.trunc(n) : null;
	}
	return null;
}

/** Map PriceCharting GET /api/product JSON → Prisma snapshot create/update fields */
export function productApiToSnapshotFields(
	data: PriceChartingProductApi,
): Omit<
	Prisma.PriceChartingProductSnapshotCreateInput,
	"edition" | "editionId"
> {
	const release = data["release-date"];
	return {
		priceChartingId: data.id ?? null,
		productName: data["product-name"] ?? null,
		consoleName: data["console-name"] ?? null,
		genre: data.genre ?? null,
		releaseDate: release ? new Date(release) : null,
		upc: data.upc ?? null,
		asin: data.asin ?? null,
		epid: data.epid ?? null,
		loosePrice: apiInt(data["loose-price"]),
		cibPrice: apiInt(data["cib-price"]),
		newPrice: apiInt(data["new-price"]),
		gradedPrice: apiInt(data["graded-price"]),
		boxOnlyPrice: apiInt(data["box-only-price"]),
		manualOnlyPrice: apiInt(data["manual-only-price"]),
		gamestopPrice: apiInt(data["gamestop-price"]),
		bgs10Price: apiInt(data["bgs-10-price"]),
		condition17Price: apiInt(data["condition-17-price"]),
		condition18Price: apiInt(data["condition-18-price"]),
		retailLooseBuy: apiInt(data["retail-loose-buy"]),
		retailLooseSell: apiInt(data["retail-loose-sell"]),
		retailCibBuy: apiInt(data["retail-cib-buy"]),
		retailCibSell: apiInt(data["retail-cib-sell"]),
		retailNewBuy: apiInt(data["retail-new-buy"]),
		retailNewSell: apiInt(data["retail-new-sell"]),
		salesVolume: apiInt(data["sales-volume"]),
		raw: data as object,
	};
}
