/**
 * PriceCharting API Console ID reference table.
 * Mirrors https://www.pricecharting.com/api-documentation#console-ids
 * (Console Name | ID). Update when PriceCharting publishes changes.
 *
 * Use {@link getPriceChartingConsoleName} or {@link PRICECHARTING_CONSOLE_ID_TO_NAME}
 * to resolve a stored id (e.g. G53) to the official display string (e.g. "Playstation 4").
 */

export type PriceChartingConsoleRow = {
	/** PriceCharting unique console id, e.g. G8, G17 */
	id: string;
	/** Console label as returned by the API / documentation */
	name: string;
};

/**
 * All consoles from the official Console ID table, in documentation order.
 */
export const PRICECHARTING_CONSOLES: readonly PriceChartingConsoleRow[] = [
	{ id: "G25", name: "3DO" },
	{ id: "G36545", name: "Action Max" },
	{ id: "G46", name: "Amiga" },
	{ id: "G92", name: "Amiga CD32" },
	{ id: "G56", name: "Amiibo" },
	{ id: "G46757", name: "Amiibo Cards" },
	{ id: "G70472", name: "Amstrad CPC" },
	{ id: "G66098", name: "Amstrad GX4000" },
	{ id: "G79417", name: "Apple II" },
	{ id: "G91", name: "Arcadia 2001" },
	{ id: "G56638", name: "Asian English Nintendo 3DS" },
	{ id: "G59682", name: "Asian English PSP" },
	{ id: "G70756", name: "Asian English Playstation 2" },
	{ id: "G56634", name: "Asian English Playstation 3" },
	{ id: "G56635", name: "Asian English Playstation 4" },
	{ id: "G56636", name: "Asian English Playstation 5" },
	{ id: "G56637", name: "Asian English Playstation Vita" },
	{ id: "G56633", name: "Asian English Switch" },
	{ id: "G80190", name: "Asian English Switch 2" },
	{ id: "G72899", name: "Asian English Xbox" },
	{ id: "G79471", name: "Asian Xbox 360" },
	{ id: "G24", name: "Atari 2600" },
	{ id: "G84152", name: "Atari 2800" },
	{ id: "G45", name: "Atari 400" },
	{ id: "G31", name: "Atari 5200" },
	{ id: "G33", name: "Atari 7800" },
	{ id: "G26", name: "Atari Lynx" },
	{ id: "G146", name: "Atari ST" },
	{ id: "G72528", name: "Atari XE" },
	{ id: "G90", name: "Bally Astrocade" },
	{ id: "G94412", name: "Bandai Playdia" },
	{ id: "G37", name: "CD-i" },
	{ id: "G63134", name: "Casio Loopy" },
	{ id: "G77760", name: "Club Nintendo Magazine" },
	{ id: "G30", name: "Colecovision" },
	{ id: "G72569", name: "Commodore 128" },
	{ id: "G56918", name: "Commodore 16" },
	{ id: "G28", name: "Commodore 64" },
	{ id: "G52", name: "Disney Infinity" },
	{ id: "G53043", name: "Dreamcast Magazine" },
	{ id: "G53047", name: "Electronic Gaming Monthly" },
	{ id: "G72005", name: "Entex Adventure Vision" },
	{ id: "G28704", name: "Evercade" },
	{ id: "G55665", name: "FM Towns Marty" },
	{ id: "G83", name: "Fairchild Channel F" },
	{ id: "G55", name: "Famicom" },
	{ id: "G117", name: "Famicom Disk System" },
	{ id: "G68", name: "Game & Watch" },
	{ id: "G53044", name: "Game Informer" },
	{ id: "G93674", name: "Game Players" },
	{ id: "G55666", name: "Game Wave" },
	{ id: "G93", name: "Game.Com" },
	{ id: "G49", name: "GameBoy" },
	{ id: "G1", name: "GameBoy Advance" },
	{ id: "G2", name: "GameBoy Color" },
	{ id: "G53046", name: "GamePro" },
	{ id: "G3", name: "Gamecube" },
	{ id: "G7728", name: "Gizmondo" },
	{ id: "G55667", name: "HyperScan" },
	{ id: "G27", name: "Intellivision" },
	{ id: "G68532", name: "JP 3DO" },
	{ id: "G112", name: "JP GameBoy" },
	{ id: "G79", name: "JP GameBoy Advance" },
	{ id: "G113", name: "JP GameBoy Color" },
	{ id: "G98", name: "JP Gamecube" },
	{ id: "G68060", name: "JP LaserActive" },
	{ id: "G122", name: "JP MSX" },
	{ id: "G128", name: "JP MSX2" },
	{ id: "G115", name: "JP Neo Geo AES" },
	{ id: "G43342", name: "JP Neo Geo CD" },
	{ id: "G114", name: "JP Neo Geo MVS" },
	{ id: "G59835", name: "JP Neo Geo Pocket" },
	{ id: "G129", name: "JP Neo Geo Pocket Color" },
	{ id: "G119", name: "JP Nintendo 3DS" },
	{ id: "G99", name: "JP Nintendo 64" },
	{ id: "G111", name: "JP Nintendo DS" },
	{ id: "G100", name: "JP Nintendo Switch" },
	{ id: "G80189", name: "JP Nintendo Switch 2" },
	{ id: "G82", name: "JP PC Engine" },
	{ id: "G154", name: "JP PC Engine CD" },
	{ id: "G110", name: "JP PSP" },
	{ id: "G107", name: "JP Playstation" },
	{ id: "G108", name: "JP Playstation 2" },
	{ id: "G109", name: "JP Playstation 3" },
	{ id: "G118", name: "JP Playstation 4" },
	{ id: "G7470", name: "JP Playstation 5" },
	{ id: "G106", name: "JP Playstation Vita" },
	{ id: "G64", name: "JP Sega Dreamcast" },
	{ id: "G74", name: "JP Sega Game Gear" },
	{ id: "G6900", name: "JP Sega Mark III" },
	{ id: "G140", name: "JP Sega Mega CD" },
	{ id: "G105", name: "JP Sega Mega Drive" },
	{ id: "G137", name: "JP Sega Pico" },
	{ id: "G67", name: "JP Sega Saturn" },
	{ id: "G142", name: "JP Super 32X" },
	{ id: "G76", name: "JP Virtual Boy" },
	{ id: "G102", name: "JP Wii" },
	{ id: "G104", name: "JP Wii U" },
	{ id: "G125", name: "JP Xbox" },
	{ id: "G124", name: "JP Xbox 360" },
	{ id: "G126", name: "JP Xbox One" },
	{ id: "G7587", name: "JP Xbox Series X" },
	{ id: "G21", name: "Jaguar" },
	{ id: "G65467", name: "Jaguar CD" },
	{ id: "G66470", name: "LaserActive" },
	{ id: "G144", name: "Lego Dimensions" },
	{ id: "G81500", name: "Macintosh" },
	{ id: "G130", name: "Magnavox Odyssey" },
	{ id: "G36", name: "Magnavox Odyssey 2" },
	{ id: "G131", name: "Magnavox Odyssey 300" },
	{ id: "G132", name: "Mattel Aquarius" },
	{ id: "G58494", name: "MegaZone" },
	{ id: "G6956", name: "Microvision" },
	{ id: "G69", name: "Mini Arcade" },
	{ id: "G42", name: "N-Gage" },
	{ id: "G17", name: "NES" },
	{ id: "G116", name: "Neo Geo AES" },
	{ id: "G60", name: "Neo Geo CD" },
	{ id: "G18", name: "Neo Geo MVS" },
	{ id: "G40", name: "Neo Geo Pocket Color" },
	{ id: "G39", name: "Nintendo 3DS" },
	{ id: "G4", name: "Nintendo 64" },
	{ id: "G5", name: "Nintendo DS" },
	{ id: "G81", name: "Nintendo Power" },
	{ id: "G59", name: "Nintendo Switch" },
	{ id: "G80178", name: "Nintendo Switch 2" },
	{ id: "G72978", name: "Nuon" },
	{ id: "G77563", name: "Official Nintendo Magazine" },
	{ id: "G73272", name: "Official US Playstation Magazine" },
	{ id: "G68531", name: "PAL 3DO" },
	{ id: "G153", name: "PAL Amiga CD32" },
	{ id: "G72181", name: "PAL Amstrad GX4000" },
	{ id: "G72094", name: "PAL Atari 2600" },
	{ id: "G62701", name: "PAL Atari 7800" },
	{ id: "G85742", name: "PAL Dreamcast Magazine" },
	{ id: "G61287", name: "PAL Evercade" },
	{ id: "G73", name: "PAL GameBoy" },
	{ id: "G80", name: "PAL GameBoy Advance" },
	{ id: "G77", name: "PAL GameBoy Color" },
	{ id: "G70", name: "PAL Gamecube" },
	{ id: "G123", name: "PAL MSX" },
	{ id: "G127", name: "PAL MSX2" },
	{ id: "G141", name: "PAL Mega Drive 32X" },
	{ id: "G63150", name: "PAL N-Gage" },
	{ id: "G58", name: "PAL NES" },
	{ id: "G61530", name: "PAL Neo Geo Pocket" },
	{ id: "G37074", name: "PAL Neo Geo Pocket Color" },
	{ id: "G94", name: "PAL Nintendo 3DS" },
	{ id: "G62", name: "PAL Nintendo 64" },
	{ id: "G78", name: "PAL Nintendo DS" },
	{ id: "G87", name: "PAL Nintendo Switch" },
	{ id: "G80188", name: "PAL Nintendo Switch 2" },
	{ id: "G84", name: "PAL PSP" },
	{ id: "G72", name: "PAL Playstation" },
	{ id: "G63", name: "PAL Playstation 2" },
	{ id: "G75", name: "PAL Playstation 3" },
	{ id: "G86", name: "PAL Playstation 4" },
	{ id: "G7469", name: "PAL Playstation 5" },
	{ id: "G101", name: "PAL Playstation Vita" },
	{ id: "G65", name: "PAL Sega Dreamcast" },
	{ id: "G121", name: "PAL Sega Game Gear" },
	{ id: "G51", name: "PAL Sega Master System" },
	{ id: "G139", name: "PAL Sega Mega CD" },
	{ id: "G71", name: "PAL Sega Mega Drive" },
	{ id: "G138", name: "PAL Sega Pico" },
	{ id: "G97", name: "PAL Sega Saturn" },
	{ id: "G61", name: "PAL Super Nintendo" },
	{ id: "G133", name: "PAL Vectrex" },
	{ id: "G134", name: "PAL Videopac G7000" },
	{ id: "G135", name: "PAL Videopac G7400" },
	{ id: "G85", name: "PAL Wii" },
	{ id: "G96", name: "PAL Wii U" },
	{ id: "G88", name: "PAL Xbox" },
	{ id: "G89", name: "PAL Xbox 360" },
	{ id: "G95", name: "PAL Xbox One" },
	{ id: "G7586", name: "PAL Xbox Series X" },
	{ id: "G6955", name: "PC FX" },
	{ id: "G53045", name: "PC Gamer Magazine" },
	{ id: "G145", name: "PC Games" },
	{ id: "G9", name: "PSP" },
	{ id: "G55669", name: "Pippin" },
	{ id: "G6", name: "Playstation" },
	{ id: "G7", name: "Playstation 2" },
	{ id: "G12", name: "Playstation 3" },
	{ id: "G53", name: "Playstation 4" },
	{ id: "G7468", name: "Playstation 5" },
	{ id: "G43", name: "Playstation Vita" },
	{ id: "G143", name: "Pokemon Mini" },
	{ id: "G76600", name: "Polymega" },
	{ id: "G87937", name: "RCA Studio II" },
	{ id: "G91000", name: "RDI Halcyon" },
	{ id: "G93657", name: "Retro Gamer Magazine" },
	{ id: "G43345", name: "Rumble U" },
	{ id: "G50", name: "Sega 32X" },
	{ id: "G23", name: "Sega CD" },
	{ id: "G16", name: "Sega Dreamcast" },
	{ id: "G20", name: "Sega Game Gear" },
	{ id: "G15", name: "Sega Genesis" },
	{ id: "G29", name: "Sega Master System" },
	{ id: "G136", name: "Sega Pico" },
	{ id: "G14", name: "Sega Saturn" },
	{ id: "G85478", name: "Sega Saturn Magazine" },
	{ id: "G61110", name: "Sharp X68000" },
	{ id: "G77384", name: "Sinclair ZX81" },
	{ id: "G48", name: "Skylanders" },
	{ id: "G43344", name: "Starlink" },
	{ id: "G60326", name: "Stoneheart" },
	{ id: "G26297", name: "Strategy Guide" },
	{ id: "G66", name: "Super Famicom" },
	{ id: "G13", name: "Super Nintendo" },
	{ id: "G55668", name: "Supervision" },
	{ id: "G120", name: "TI-99" },
	{ id: "G75713", name: "TRS-80" },
	{ id: "G51260", name: "Tapwave Zodiac" },
	{ id: "G43401", name: "Tiger R-Zone" },
	{ id: "G6927", name: "TurboGrafx CD" },
	{ id: "G19", name: "TurboGrafx-16" },
	{ id: "G75110", name: "UB Funkeys" },
	{ id: "G56889", name: "VTech Socrates" },
	{ id: "G32", name: "Vectrex" },
	{ id: "G44", name: "Vic-20" },
	{ id: "G22", name: "Virtual Boy" },
	{ id: "G57", name: "Wholesale" },
	{ id: "G11", name: "Wii" },
	{ id: "G47", name: "Wii U" },
	{ id: "G151", name: "WonderSwan" },
	{ id: "G152", name: "WonderSwan Color" },
	{ id: "G8", name: "Xbox" },
	{ id: "G10", name: "Xbox 360" },
	{ id: "G54", name: "Xbox One" },
	{ id: "G7585", name: "Xbox Series X" },
	{ id: "G44257", name: "ZX Spectrum" },
] as const;

const byId: Record<string, PriceChartingConsoleRow> = Object.create(null);
const idToName: Record<string, string> = Object.create(null);
for (const row of PRICECHARTING_CONSOLES) {
	byId[row.id] = row;
	idToName[row.id] = row.name;
}

/**
 * Map each G-code to the official console name from PriceCharting’s table
 * (same strings as {@link PRICECHARTING_CONSOLES}[].name).
 */
export const PRICECHARTING_CONSOLE_ID_TO_NAME: Readonly<
	Record<string, string>
> = Object.freeze(idToName);

/** Official display name for `id`, or null if missing / unknown id. */
export function getPriceChartingConsoleName(
	id: string | null | undefined,
): string | null {
	if (!id?.trim()) return null;
	return idToName[id] ?? null;
}

/** O(1) lookup by PriceCharting console id (e.g. G8 → Xbox). */
export function getConsoleByPriceChartingId(
	id: string | undefined | null,
): PriceChartingConsoleRow | undefined {
	if (!id) return undefined;
	return byId[id];
}

/**
 * Case-insensitive substring match on console name; useful for fuzzy header matching.
 * Returns rows where `name` includes `substring` (trimmed, empty returns []).
 */
export function findConsolesByNameSubstring(
	substring: string,
): PriceChartingConsoleRow[] {
	const q = substring.trim().toLowerCase();
	if (!q) return [];
	return PRICECHARTING_CONSOLES.filter((r) => r.name.toLowerCase().includes(q));
}
