import {
	LISTING_SECTION_TO_PRICECHARTING_CONSOLE_ID,
	normalizeListingSectionHeader,
} from "../pricecharting/listing-section-to-console-id";

export type ParsedGameRow = {
	lineNo: number;
	rawLine: string;
	sectionRawHeader: string;
	sectionKey: string;
	title: string;
	loose: boolean;
};

/** True if this inventory line should not get a PriceCharting game search (per import plan skip list). */
export function shouldSkipNonSoftwareLine(loweredLine: string): boolean {
	const skipPhrases = [
		"ac adapter",
		"slim ac",
		"av cable",
		"n64 av",
		"ps2 av",
		"vmu",
		"racing wheel",
		"quickshot",
		"pelican",
		"controller",
		"donkey kong plush",
		"hitman 47 dvd",
		"tamagotchi",
		"memory card",
	];
	return skipPhrases.some((p) => loweredLine.includes(p));
}

/** Section vs title: avoids treating `Star Wars: Battlefront` as a header. */
export function classifyInventoryLine(trimmed: string): "section" | "title" {
	const keyWhole = normalizeListingSectionHeader(trimmed);
	if (LISTING_SECTION_TO_PRICECHARTING_CONSOLE_ID[keyWhole] !== undefined) {
		return "section";
	}

	const m = trimmed.match(/^([^:]+):\s*(.*)$/);
	if (!m) return "title";

	const before = m[1].trim();
	const after = m[2].trim();
	const keyBefore = normalizeListingSectionHeader(before);

	if (!after && LISTING_SECTION_TO_PRICECHARTING_CONSOLE_ID[keyBefore] !== undefined) {
		return "section";
	}

	// Unknown `Platform:` with nothing after the colon — still start a new section bucket
	if (!after && before.length > 0 && before.length < 48) {
		return "section";
	}

	return "title";
}

function resolveSectionKey(line: string): string {
	const stripped = line.trim().replace(/:\s*$/, "");
	return normalizeListingSectionHeader(stripped);
}

/**
 * Parse section headers + title lines. Headers match {@link LISTING_SECTION_TO_PRICECHARTING_CONSOLE_ID}
 * after normalization, or `Label:` with no trailing title text.
 */
export function parseGamesList(text: string): ParsedGameRow[] {
	const lines = text.split(/\r?\n/);
	const out: ParsedGameRow[] = [];
	let sectionRawHeader = "(no section)";
	let sectionKey = "";

	for (let i = 0; i < lines.length; i++) {
		const lineNo = i + 1;
		const raw = lines[i];
		const trimmed = raw.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;

		if (classifyInventoryLine(trimmed) === "section") {
			sectionRawHeader = trimmed.replace(/:\s*$/, "").trim();
			sectionKey = resolveSectionKey(trimmed);
			continue;
		}

		let loose = false;
		let titlePart = trimmed;
		const looseM = trimmed.match(/^(.*?)\s*\(\s*loose\s*\)\s*$/i);
		if (looseM) {
			titlePart = looseM[1].trim();
			loose = true;
		}

		out.push({
			lineNo,
			rawLine: trimmed,
			sectionRawHeader,
			sectionKey,
			title: titlePart,
			loose,
		});
	}

	return out;
}
