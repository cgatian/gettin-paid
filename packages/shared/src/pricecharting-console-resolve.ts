import {
	getPriceChartingConsoleName,
	PRICECHARTING_CONSOLES,
} from "./pricecharting-console-ids.js";

/** Display label from official PriceCharting Console ID table */
export function labelPriceChartingConsole(
	id: string | null | undefined,
): string {
	if (!id?.trim()) return "Unknown";
	return getPriceChartingConsoleName(id) ?? id;
}

/**
 * Map PriceCharting GET /api/product `console-name` → best matching G-code using the given rows.
 * When multiple rows share the same name (PAL/JP/NTSC), prefers non-PAL, non-JP rows.
 */
export function findBestPriceChartingConsoleIdFromRows(
	rows: readonly { id: string; name: string }[],
	consoleName: string | null | undefined,
): string | undefined {
	if (!consoleName?.trim()) return undefined;
	const target = consoleName.trim().toLowerCase();
	const matches = rows.filter((r) => r.name.toLowerCase() === target);
	if (matches.length === 0) return undefined;
	if (matches.length === 1) return matches[0].id;
	const ntsc = matches.find(
		(r) =>
			!r.name.startsWith("PAL ") &&
			!r.name.startsWith("JP ") &&
			!r.name.startsWith("Asian "),
	);
	return ntsc?.id ?? matches[0].id;
}

/**
 * Same as {@link findBestPriceChartingConsoleIdFromRows} using the bundled
 * `PRICECHARTING_CONSOLES` list (kept in sync with generated table + DB seed).
 */
export function findBestPriceChartingConsoleIdFromApiConsoleName(
	consoleName: string | null | undefined,
): string | undefined {
	return findBestPriceChartingConsoleIdFromRows(
		PRICECHARTING_CONSOLES,
		consoleName,
	);
}

/** Curated G-codes for filter shortcuts (inventory UI); full list is PRICECHARTING_CONSOLES */
export const POPULAR_PRICECHARTING_CONSOLE_IDS: readonly string[] = [
	"G8",
	"G10",
	"G54",
	"G7585",
	"G12",
	"G53",
	"G7468",
	"G6",
	"G7",
	"G11",
	"G47",
	"G59",
	"G3",
	"G17",
	"G13",
	"G4",
	"G1",
	"G2",
	"G49",
	"G5",
	"G39",
	"G9",
	"G43",
	"G16",
	"G15",
	"G14",
	"G23",
	"G37",
	"G20",
	"G145",
];
