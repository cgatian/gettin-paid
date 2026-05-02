import type { PriceChartingProductListItem } from "@gettin-paid/shared";
import { getConsoleByPriceChartingId } from "@gettin-paid/shared";

function scoreAgainstExpected(
	apiConsole: string | undefined,
	expectedPcName: string | undefined,
): number {
	if (!apiConsole || !expectedPcName) return 0;
	const a = apiConsole.toLowerCase().trim();
	const e = expectedPcName.toLowerCase().trim();
	if (a === e) return 100;
	if (a.includes(e) || e.includes(a)) return 80;
	const ew = e.split(/\s+/).filter(Boolean);
	const hits = ew.filter((w) => a.includes(w)).length;
	if (hits > 0) return 40 + Math.min(30, hits * 10);
	return 0;
}

/**
 * How well the API `product-name` matches the line you searched for (0–100).
 * Breaks ties when many list hits share the same console (e.g. 47× "Xbox 360").
 */
function scoreTitleMatch(
	productName: string | undefined,
	searchQuery: string,
): number {
	const pn = productName?.trim();
	const q = searchQuery.trim();
	if (!pn || !q) return 0;

	const p = pn.toLowerCase().replace(/\s+/g, " ");
	const s = q.toLowerCase().replace(/\s+/g, " ");
	if (p === s) return 100;
	if (p.startsWith(`${s} (`) || p.startsWith(`${s} [`) || p.startsWith(`${s}:`))
		return 98;
	if (p.includes(s)) return 92;
	if (s.includes(p) && p.length >= 4) return 88;

	const sw = s.split(/\s+/).filter((w) => w.length > 1);
	if (sw.length === 0) return 0;
	const pw = p.split(/\s+/);
	const pwSet = new Set(pw);
	let matched = 0;
	for (const w of sw) {
		if (pwSet.has(w)) {
			matched += 1;
			continue;
		}
		if (pw.some((t) => t === w || t.startsWith(w) || w.startsWith(t)))
			matched += 1;
	}
	return Math.min(78, Math.round((matched / sw.length) * 78));
}

/**
 * Pick one product from GET /api/products results.
 * Uses console match first, then title match vs `searchQuery`, so a flood of same-console hits
 * does not all tie as "ambiguous" when only one row matches the game title.
 */
export function pickBestProduct(
	products: PriceChartingProductListItem[] | undefined,
	expectedPriceChartingConsoleId: string | undefined,
	searchQuery: string,
): { pick: PriceChartingProductListItem; ambiguous: boolean } | null {
	const list = products ?? [];
	if (list.length === 0) return null;

	const expectedName = expectedPriceChartingConsoleId
		? getConsoleByPriceChartingId(expectedPriceChartingConsoleId)?.name
		: undefined;

	const scored = list.map((p) => {
		const cs = scoreAgainstExpected(p["console-name"], expectedName);
		const ts = scoreTitleMatch(p["product-name"], searchQuery);
		/** Console tier dominates; title breaks ties within the same console score. */
		const total = cs * 1000 + ts;
		return { p, total, cs, ts };
	});

	let bestTotal = -1;
	for (const { total } of scored) {
		if (total > bestTotal) bestTotal = total;
	}

	// Identical to old behavior: if nothing scored, keep first result and do not mark ambiguous
	if (bestTotal === 0) {
		return { pick: list[0], ambiguous: false };
	}

	const top = scored
		.filter((x) => x.total === bestTotal)
		.map((x) => x.p);
	const ambiguous = top.length > 1;
	return { pick: top[0], ambiguous };
}
