/**
 * Phase 1: plain-text collection list → CSV of resolved UPCs / PriceCharting ids for human review.
 *
 * From repo root:
 *   pnpm --filter @gettin-paid/backend exec tsx src/oneoff/resolve-listing-upcs.run.ts --input backend/data/games.txt
 * From backend/:
 *   pnpm exec tsx src/oneoff/resolve-listing-upcs.run.ts --input data/games.txt
 *
 * Requires PRICECHARTING_API_TOKEN (unless --dry-run) and optional PRICECHARTING_MIN_INTERVAL_MS in backend/.env
 *
 * `--limit N` / `-n N` — process only the first N playable lines (after parse); handy for smoke tests.
 * `--log-product-api` — print full GET /api/product JSON to stderr for each resolved row (stderr only; use with --quiet to keep CSV clean on stdout if you pipe).
 * When the API returns no usable UPC, the script also dumps the product JSON automatically (unless --quiet), so you can see which fields PriceCharting sent.
 *
 * Logs each step to stderr by default (stdout reserved if you pipe CSV). Use --quiet for summary only.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { PriceChartingProductApi } from "@gettin-paid/shared";
import { labelPriceChartingConsole } from "@gettin-paid/shared";
import {
	clampPriceChartingMinIntervalMs,
	getPriceChartingErrorMessage,
	PRICECHARTING_MIN_INTERVAL_MS_FLOOR,
	PriceChartingHttpClient,
} from "../pricecharting/pricecharting-http.client";
import { resolveListingSectionToPriceChartingConsoleId } from "../pricecharting/listing-section-to-console-id";
import { parseGamesList, shouldSkipNonSoftwareLine } from "./parse-games-list";
import { pickBestProduct } from "./pick-product";

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

function csvEscape(s: string): string {
	if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
	return s;
}

function parseArgs(): {
	input: string;
	output: string;
	dryRun: boolean;
	quiet: boolean;
	limit: number | undefined;
	logProductApi: boolean;
} {
	const argv = process.argv.slice(2);
	let input = "";
	let output = "resolved-editions.csv";
	let dryRun = false;
	let quiet = false;
	let limit: number | undefined;
	let logProductApi = false;
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a === "--input" || a === "-i") input = argv[++i] ?? "";
		else if (a === "--output" || a === "-o") output = argv[++i] ?? "";
		else if (a === "--dry-run") dryRun = true;
		else if (a === "--quiet" || a === "-q") quiet = true;
		else if (a === "--log-product-api") logProductApi = true;
		else if (a === "--limit" || a === "-n") {
			const raw = argv[++i];
			const n =
				raw !== undefined ? Number.parseInt(String(raw), 10) : Number.NaN;
			if (!Number.isFinite(n) || n < 1) {
				console.error("--limit / -n expects a positive integer");
				process.exit(1);
			}
			limit = n;
		}
	}
	return { input, output, dryRun, quiet, limit, logProductApi };
}

function logLine(quiet: boolean, msg: string) {
	if (!quiet) console.error(msg);
}

/** Public game page; same id as API. `/game/{id}` redirects to the `/game/.../...` slug URL. */
function priceChartingProductBrowseUrl(
	productId: string | undefined | null,
): string | null {
	if (!productId?.trim()) return null;
	return `https://www.pricecharting.com/game/${encodeURIComponent(productId.trim())}`;
}

/** Full `/api/product` body for debugging (UPC field name, empty values, etc.). */
function logPriceChartingProductResponse(
	quiet: boolean,
	logProductApi: boolean,
	upcDigits: string,
	detail: PriceChartingProductApi,
): void {
	const shouldDump =
		logProductApi || (!quiet && upcDigits.length === 0);
	if (!shouldDump) return;
	const reason = logProductApi
		? "--log-product-api"
		: "no UPC in response (raw `upc` field after digit-strip)";
	console.error(`  → GET /api/product JSON (${reason}):`);
	console.error(JSON.stringify(detail, null, 2));
}

async function main() {
	const { input, output, dryRun, quiet, limit, logProductApi } = parseArgs();
	if (!input) {
		console.error(
			"Usage: tsx src/oneoff/resolve-listing-upcs.run.ts --input <games.txt> [--output resolved-editions.csv] [--limit N] [--log-product-api] [--dry-run] [--quiet]",
		);
		process.exit(1);
	}

	const inputPath = resolve(input);
	const text = readFileSync(inputPath, "utf8");
	const allRows = parseGamesList(text);
	const rows =
		limit !== undefined ? allRows.slice(0, limit) : allRows;

	const token = process.env.PRICECHARTING_API_TOKEN;
	const rawIntervalEnv = Number(process.env.PRICECHARTING_MIN_INTERVAL_MS ?? 4000);
	const effectiveThrottleMs = clampPriceChartingMinIntervalMs(rawIntervalEnv);

	const http =
		token && !dryRun
			? new PriceChartingHttpClient({
					token,
					minIntervalMs: rawIntervalEnv,
					onThrottleWait: (waitMs) =>
						logLine(
							quiet,
							`  … waiting ${waitMs}ms before next PriceCharting request`,
						),
				})
			: null;

	logLine(
		quiet,
		[
			"[resolve-listing-upcs] start",
			`  input: ${inputPath}`,
			`  output: ${resolve(output)}`,
			`  games lines: ${rows.length}${limit !== undefined ? ` (limit ${limit} of ${allRows.length} parsed)` : ""}`,
			`  log-product-api: ${logProductApi}`,
			`  dry-run: ${dryRun}`,
			`  throttle: ${effectiveThrottleMs}ms minimum between PriceCharting HTTP calls (serialized queue)`,
			...(rawIntervalEnv !== effectiveThrottleMs
				? [
						`  note: PRICECHARTING_MIN_INTERVAL_MS=${rawIntervalEnv} raised to floor ${PRICECHARTING_MIN_INTERVAL_MS_FLOOR}ms to avoid rate limits`,
					]
				: []),
			`  token: ${token ? "set" : "missing"}`,
			"",
		].join("\n"),
	);

	let countSkipped = 0;
	let countDry = 0;
	let countNoToken = 0;
	let countOk = 0;
	let countNoResults = 0;
	let countErrors = 0;
	let countAmbiguous = 0;

	const header = [
		"line_no",
		"section_key",
		"raw_title",
		"price_charting_console_id",
		"console_display_name",
		"price_charting_product_id",
		"product_name",
		"console_name",
		"upc",
		"ambiguous",
		"skipped",
		"skip_reason",
		"error",
	].join(",");

	const outLines: string[] = [header];

	let idx = 0;
	for (const r of rows) {
		idx += 1;
		const lowered = r.rawLine.toLowerCase();
		let skipped = false;
		let skipReason = "";
		if (shouldSkipNonSoftwareLine(lowered)) {
			skipped = true;
			skipReason = "accessory_or_non_software";
		}

		const pcId = r.sectionKey
			? resolveListingSectionToPriceChartingConsoleId(r.sectionKey)
			: undefined;
		const consoleDisplay = pcId ? labelPriceChartingConsole(pcId) : "";

		if (skipped) {
			countSkipped += 1;
			logLine(
				quiet,
				`[${idx}/${rows.length}] skip (non-game) line ${r.lineNo} "${r.title.slice(0, 60)}${r.title.length > 60 ? "…" : ""}"`,
			);
			outLines.push(
				[
					String(r.lineNo),
					csvEscape(r.sectionKey),
					csvEscape(r.title),
					pcId ?? "",
					csvEscape(consoleDisplay),
					"",
					"",
					"",
					"",
					"",
					"yes",
					skipReason,
					"",
				].join(","),
			);
			continue;
		}

		if (dryRun) {
			countDry += 1;
			logLine(
				quiet,
				`[${idx}/${rows.length}] dry-run line ${r.lineNo} section=${r.sectionKey || "?"} console=${pcId ?? ""} (${consoleDisplay}) "${r.title.slice(0, 70)}${r.title.length > 70 ? "…" : ""}"`,
			);
			outLines.push(
				[
					String(r.lineNo),
					csvEscape(r.sectionKey),
					csvEscape(r.title),
					pcId ?? "",
					csvEscape(consoleDisplay),
					"",
					"",
					"",
					"",
					"",
					"",
					"",
					"dry_run",
				].join(","),
			);
			continue;
		}

		if (!http) {
			countNoToken += 1;
			logLine(
				quiet,
				`[${idx}/${rows.length}] skip API (no token) line ${r.lineNo} "${r.title.length > 60 ? `${r.title.slice(0, 60)}…` : r.title}"`,
			);
			outLines.push(
				[
					String(r.lineNo),
					csvEscape(r.sectionKey),
					csvEscape(r.title),
					pcId ?? "",
					csvEscape(consoleDisplay),
					"",
					"",
					"",
					"",
					"",
					"",
					"",
					"no_token",
				].join(","),
			);
			continue;
		}

		let priceChartingProductId = "";
		let productName = "";
		let consoleName = "";
		let upc = "";
		let ambiguous = "";
		let errMsg = "";

		try {
			const q = r.title;
			logLine(
				quiet,
				`[${idx}/${rows.length}] line ${r.lineNo} search q=${JSON.stringify(q)} console=${pcId ?? "(none)"} section=${r.sectionKey || "?"}`,
			);

			let productsData = await http.fetchProducts({
				q,
				console: pcId,
			});
			let err = getPriceChartingErrorMessage(productsData);
			if (productsData.status === "error" || err) {
				throw new Error(err ?? "products search failed");
			}

			let products = productsData.products ?? [];
			logLine(
				quiet,
				`  → /api/products with console=${pcId ?? "—"}: ${products.length} hit(s)`,
			);

			if (products.length === 0 && pcId) {
				logLine(
					quiet,
					`  → retry /api/products without console filter`,
				);
				productsData = await http.fetchProducts({ q });
				products = productsData.products ?? [];
				logLine(quiet, `  → retry: ${products.length} hit(s)`);
			}

			const picked = pickBestProduct(products, pcId, q);
			if (!picked) {
				errMsg = "no_search_results";
				countNoResults += 1;
				logLine(quiet, `  ✗ no results`);
			} else {
				ambiguous = picked.ambiguous ? "yes" : "";
				if (picked.ambiguous) countAmbiguous += 1;
				priceChartingProductId = picked.pick.id ?? "";
				productName = picked.pick["product-name"] ?? "";
				consoleName = picked.pick["console-name"] ?? "";

				logLine(
					quiet,
					`  → pick list id=${picked.pick.id} "${productName}" (${consoleName})${picked.ambiguous ? " [AMBIGUOUS]" : ""}`,
				);

				// Full product row (incl. UPC when PC has it) is tied to `id`. Do not pass
				// `console` with `id`—use id-only. If the list row had no id, search by q then
				// re-fetch by the returned `id` so we get the same body as a direct id lookup.
				const upcDigits = (d: PriceChartingProductApi) =>
					(d.upc ?? "").replace(/\D/g, "");

				let detail: PriceChartingProductApi;
				if (picked.pick.id) {
					logLine(
						quiet,
						`  → GET /api/product id=${picked.pick.id} (id-only — full product / UPC)`,
					);
					detail = await http.fetchProduct({ id: picked.pick.id });
				} else {
					logLine(
						quiet,
						`  → GET /api/product q=… (no id on list row; disambiguate with console)`,
					);
					detail = await http.fetchProduct({ q, console: pcId });
					if (detail.id && upcDigits(detail).length === 0) {
						logLine(
							quiet,
							`  → GET /api/product id=${detail.id} (follow-up by id for UPC)`,
						);
						detail = await http.fetchProduct({ id: detail.id });
					}
				}

				err = getPriceChartingErrorMessage(detail);
				if (detail.status === "error" || err) {
					throw new Error(err ?? "product detail failed");
				}

				productName = detail["product-name"] ?? productName;
				consoleName = detail["console-name"] ?? consoleName;
				upc = (detail.upc ?? "").replace(/\D/g, "");
				priceChartingProductId = detail.id ?? priceChartingProductId;

				logPriceChartingProductResponse(
					quiet,
					logProductApi,
					upc,
					detail,
				);

				countOk += 1;
				logLine(
					quiet,
					`  ✓ upc=${upc || "(none)"} pcProductId=${priceChartingProductId}`,
				);
				const browse = priceChartingProductBrowseUrl(priceChartingProductId);
				if (browse) {
					logLine(quiet, `  → open in browser: ${browse}`);
				}
			}
		} catch (e) {
			errMsg = e instanceof Error ? e.message : String(e);
			countErrors += 1;
			logLine(quiet, `  ✗ error: ${errMsg}`);
		}

		outLines.push(
			[
				String(r.lineNo),
				csvEscape(r.sectionKey),
				csvEscape(r.title),
				pcId ?? "",
				csvEscape(consoleDisplay),
				priceChartingProductId,
				csvEscape(productName),
				csvEscape(consoleName),
				upc,
				ambiguous,
				"",
				"",
				csvEscape(errMsg),
			].join(","),
		);
	}

	const outPath = resolve(output);
	writeFileSync(outPath, outLines.join("\n"), "utf8");
	console.error(
		[
			"",
			"[resolve-listing-upcs] done",
			`  wrote: ${outPath}`,
			`  rows: ${outLines.length - 1}`,
			`  resolved (had product detail): ${countOk}`,
			`  no search results: ${countNoResults}`,
			`  errors: ${countErrors}`,
			`  ambiguous pick: ${countAmbiguous}`,
			`  skipped (accessory/non-game): ${countSkipped}`,
			...(dryRun ? [`  dry-run rows: ${countDry}`] : []),
			...(countNoToken ? [`  no-token rows: ${countNoToken}`] : []),
			"",
		].join("\n"),
	);
	console.log(`Wrote ${outLines.length - 1} data rows to ${outPath}`);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
