/**
 * Maps pasted collection-list section headers to NTSC USA PriceCharting console ids.
 * Keys use {@link normalizeListingSectionHeader}. Extend as new headers appear.
 * @see https://www.pricecharting.com/api-documentation#console-ids
 */
export const LISTING_SECTION_TO_PRICECHARTING_CONSOLE_ID: Readonly<
	Record<string, string>
> = {
	// Microsoft
	xbox: "G8",
	"xbox 360": "G10",
	x360: "G10",
	xone: "G54",
	xbone: "G54",
	"xbox one": "G54",
	"xbox series x": "G7585",
	"xbox series": "G7585",
	// Sony (PS1 / PSX lists)
	psx: "G6",
	ps1: "G6",
	playstation: "G6",
	ps2: "G7",
	ps3: "G12",
	ps4: "G53",
	ps5: "G7468",
	psp: "G9",
	vita: "G43",
	"ps vita": "G43",
	// Nintendo
	gameboy: "G49",
	gb: "G49",
	"gameboy color": "G2",
	"game boy color": "G2",
	gbc: "G2",
	"gameboy advance": "G1",
	"game boy advance": "G1",
	gba: "G1",
	nes: "G17",
	snes: "G13",
	"super nintendo": "G13",
	n64: "G4",
	"nintendo 64": "G4",
	gamecube: "G3",
	gc: "G3",
	wii: "G11",
	wiiu: "G47",
	"wii u": "G47",
	"nintendo ds": "G5",
	ds: "G5",
	"nintendo 3ds": "G39",
	"3ds": "G39",
	switch: "G59",
	"switch 2": "G80178",
	"nintendo switch": "G59",
	"nintendo switch 2": "G80178",
	switch2: "G80178",
	// Sega
	dreamcast: "G16",
	dc: "G16",
	genesis: "G15",
	"mega drive": "G15",
	saturn: "G14",
	"sega cd": "G23",
	"sega genesis": "G15",
	// PC (PriceCharting label "PC Games")
	pc: "G145",
	// Aliases from collector lists
	xbla: "G10",
	"xbox live arcade": "G10",
	cdi: "G37",
	"cd-i": "G37",
	"game gear": "G20",
	intellivision: "G27",
	"atari 7800": "G33",
	segacd: "G23",
};

/** Normalize a section title for lookup: trim, strip trailing `:`, collapse spaces, lowercase. */
export function normalizeListingSectionHeader(header: string): string {
	return header
		.trim()
		.replace(/:\s*$/, "")
		.replace(/\s+/g, " ")
		.toLowerCase();
}

export function resolveListingSectionToPriceChartingConsoleId(
	sectionHeader: string,
): string | undefined {
	const k = normalizeListingSectionHeader(sectionHeader);
	return LISTING_SECTION_TO_PRICECHARTING_CONSOLE_ID[k];
}
