import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const candidates = [
	path.join(__dirname, "../data/pricecharting-console-id-table.md"),
	path.join(__dirname, "../../../uploads/api-documentation-0.md"),
	path.join(
		process.env.USERPROFILE || "",
		".cursor/projects/c-repositories-gettin-paid/uploads/api-documentation-0.md",
	),
];

let mdPath;
for (const c of candidates) {
	if (fs.existsSync(c)) {
		mdPath = c;
		break;
	}
}
if (!mdPath) {
	console.error(
		"api-documentation-0.md not found; place at repo uploads/ or use Cursor uploads path",
	);
	process.exit(1);
}

const t = fs.readFileSync(mdPath, "utf8");
const lines = t.split(/\r?\n/);
const rows = [];
let inTable = false;
for (const line of lines) {
	if (line.includes("## Console ID Table")) {
		inTable = true;
		continue;
	}
	if (inTable && line.startsWith("## ") && !line.includes("Console ID")) break;
	if (!inTable) continue;
	const m = line.match(/^\|\s*([^|]+)\|\s*(G\d+)\s*\|/);
	if (m) {
		const name = m[1].trim();
		const id = m[2].trim();
		if (name === "Console Name") continue;
		rows.push({ name, id });
	}
}

function esc(s) {
	return s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

const bodyFixed = rows
	.map((r) => `\t{ id: '${esc(r.id)}', name: '${esc(r.name)}' }`)
	.join(",\n");

const out = `/**
 * PriceCharting API Console ID reference table.
 * Mirrors https://www.pricecharting.com/api-documentation#console-ids
 * (Console Name | ID). Update when PriceCharting publishes changes.
 *
 * Use {@link getPriceChartingConsoleName} or {@link PRICECHARTING_CONSOLE_ID_TO_NAME}
 * to resolve a stored id (e.g. G53) to the official display string (e.g. "Playstation 4").
 */

export type PriceChartingConsoleRow = {
\t/** PriceCharting unique console id, e.g. G8, G17 */
\tid: string;
\t/** Console label as returned by the API / documentation */
\tname: string;
};

/**
 * All consoles from the official Console ID table, in documentation order.
 */
export const PRICECHARTING_CONSOLES: readonly PriceChartingConsoleRow[] = [
${bodyFixed}
] as const;

const byId: Record<string, PriceChartingConsoleRow> = Object.create(null);
const idToName: Record<string, string> = Object.create(null);
for (const row of PRICECHARTING_CONSOLES) {
\tbyId[row.id] = row;
\tidToName[row.id] = row.name;
}

/**
 * Map each G-code to the official console name from PriceCharting’s table
 * (same strings as {@link PRICECHARTING_CONSOLES}[].name).
 */
export const PRICECHARTING_CONSOLE_ID_TO_NAME: Readonly<Record<string, string>> =
\tObject.freeze(idToName);

/** Official display name for \`id\`, or null if missing / unknown id. */
export function getPriceChartingConsoleName(
\tid: string | null | undefined,
): string | null {
\tif (!id?.trim()) return null;
\treturn idToName[id] ?? null;
}

/** O(1) lookup by PriceCharting console id (e.g. G8 → Xbox). */
export function getConsoleByPriceChartingId(
\tid: string | undefined | null,
): PriceChartingConsoleRow | undefined {
\tif (!id) return undefined;
\treturn byId[id];
}

/**
 * Case-insensitive substring match on console name; useful for fuzzy header matching.
 * Returns rows where \`name\` includes \`substring\` (trimmed, empty returns []).
 */
export function findConsolesByNameSubstring(substring: string): PriceChartingConsoleRow[] {
\tconst q = substring.trim().toLowerCase();
\tif (!q) return [];
\treturn PRICECHARTING_CONSOLES.filter((r) =>
\t\tr.name.toLowerCase().includes(q),
\t);
}
`;

const target = path.join(__dirname, "../src/pricecharting-console-ids.ts");
fs.writeFileSync(target, out, "utf8");
console.log("wrote", rows.length, "rows to", target, "from", mdPath);
