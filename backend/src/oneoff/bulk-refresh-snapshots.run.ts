/**
 * Phase 2b: After GameEdition rows exist, upsert PriceChartingProductSnapshot per edition (same logic as POST …/refresh-market).
 *
 * Usage (DATABASE_URL in backend/.env):
 *   pnpm exec tsx src/oneoff/bulk-refresh-snapshots.run.ts
 *
 * Optional: --edition-id <uuid> to refresh a single edition.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { findBestPriceChartingConsoleIdFromRows } from "@gettin-paid/shared";
import { type GameEdition, PrismaClient } from "@prisma/client";
import {
	clampPriceChartingMinIntervalMs,
	getPriceChartingErrorMessage,
	PRICECHARTING_MIN_INTERVAL_MS_FLOOR,
	PriceChartingHttpClient,
} from "../pricecharting/pricecharting-http.client";
import { productApiToSnapshotFields } from "../pricecharting/product-snapshot-fields";

for (const p of [resolve(process.cwd(), ".env"), resolve(process.cwd(), "backend/.env")]) {
	if (!existsSync(p)) continue;
	const t = readFileSync(p, "utf8");
	for (const line of t.split(/\n/)) {
		const s = line.trim();
		if (!s || s.startsWith("#")) continue;
		const i = s.indexOf("=");
		if (i <= 0) continue;
		const k = s.slice(0, i).trim();
		let v = s.slice(i + 1).trim();
		if (
			(v.startsWith("\"") && v.endsWith("\"")) ||
			(v.startsWith("'") && v.endsWith("'"))
		) {
			v = v.slice(1, -1);
		}
		if (process.env[k] === undefined) process.env[k] = v;
	}
	break;
}

async function refreshOne(
	prisma: PrismaClient,
	http: PriceChartingHttpClient,
	edition: GameEdition,
	consoles: { id: string; name: string }[],
): Promise<void> {
	let data;
	try {
		if (edition.priceChartingProductId) {
			data = await http.fetchProduct({
				id: edition.priceChartingProductId,
			});
		} else if (edition.upc && edition.priceChartingConsoleId) {
			data = await http.fetchProduct({
				upc: edition.upc,
				console: edition.priceChartingConsoleId,
			});
		} else if (edition.upc) {
			data = await http.fetchProduct({ upc: edition.upc });
		} else {
			console.error(
				`Skip ${edition.title}: no PriceCharting product id or UPC`,
			);
			return;
		}
	} catch (e) {
		console.error(`Skip ${edition.upc ?? edition.id}: ${e}`);
		return;
	}

	const err = getPriceChartingErrorMessage(data);
	if (data.status === "error" || err) {
		console.error(`Skip ${edition.upc ?? edition.id}: ${err ?? "error"}`);
		return;
	}

	const snap = productApiToSnapshotFields(data);
	const inferredConsoleId = findBestPriceChartingConsoleIdFromRows(
		consoles,
		data["console-name"],
	);

	await prisma.$transaction([
		prisma.gameEdition.update({
			where: { id: edition.id },
			data: {
				priceChartingProductId: data.id ?? edition.priceChartingProductId,
				...(edition.priceChartingConsoleId == null && inferredConsoleId
					? { priceChartingConsoleId: inferredConsoleId }
					: {}),
			},
		}),
		prisma.priceChartingProductSnapshot.upsert({
			where: { editionId: edition.id },
			create: {
				editionId: edition.id,
				fetchedAt: new Date(),
				...snap,
			},
			update: {
				fetchedAt: new Date(),
				...snap,
			},
		}),
	]);
	console.log(`OK ${edition.upc ?? "(no UPC)"} ${edition.title}`);
}

async function main() {
	const token = process.env.PRICECHARTING_API_TOKEN;
	if (!token) {
		console.error("PRICECHARTING_API_TOKEN is required");
		process.exit(1);
	}
	const rawInterval = Number(process.env.PRICECHARTING_MIN_INTERVAL_MS ?? 2000);
	const effectiveMs = clampPriceChartingMinIntervalMs(rawInterval);
	const http = new PriceChartingHttpClient({
		token,
		minIntervalMs: rawInterval,
		onThrottleWait: (waitMs) =>
			console.error(`[bulk-refresh-snapshots] throttle wait ${waitMs}ms`),
	});

	console.error(
		`[bulk-refresh-snapshots] ${effectiveMs}ms minimum between PriceCharting calls${rawInterval !== effectiveMs ? ` (env ${rawInterval}ms clamped to ≥${PRICECHARTING_MIN_INTERVAL_MS_FLOOR}ms)` : ""}`,
	);

	let editionId: string | undefined;
	const argv = process.argv.slice(2);
	for (let i = 0; i < argv.length; i++) {
		if (argv[i] === "--edition-id") editionId = argv[++i];
	}

	const prisma = new PrismaClient();
	try {
		const consoles = await prisma.priceChartingConsole.findMany({
			select: { id: true, name: true },
		});
		if (consoles.length === 0) {
			console.error(
				"PriceChartingConsole table is empty; run prisma migrate deploy.",
			);
			process.exit(1);
		}
		const editions = await prisma.gameEdition.findMany({
			where: editionId ? { id: editionId } : undefined,
			orderBy: { title: "asc" },
		});
		for (const e of editions) {
			await refreshOne(prisma, http, e, consoles);
		}
	} finally {
		await prisma.$disconnect();
	}
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
