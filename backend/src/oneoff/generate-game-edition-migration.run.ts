/**
 * Phase 2: reviewed CSV (from Phase 1) → Prisma data migration SQL for `GameEdition`
 * plus one `OwnedCopy` per edition (default CIB), matching `createEdition` behavior.
 *
 * Expects columns: upc, title, price_charting_console_id (G-code), optional publisher,
 * optional price_charting_product_id. Legacy CSV column pc_console_id also accepted.
 * Skips rows with empty upc or unknown console id. Dedupes by UPC (first wins).
 */
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { getConsoleByPriceChartingId } from "@gettin-paid/shared";

function parseCsvLine(line: string): string[] {
	const out: string[] = [];
	let cur = "";
	let inQ = false;
	for (let i = 0; i < line.length; i++) {
		const c = line[i];
		if (c === "\"") {
			if (inQ && line[i + 1] === "\"") {
				cur += "\"";
				i++;
			} else {
				inQ = !inQ;
			}
		} else if (c === "," && !inQ) {
			out.push(cur);
			cur = "";
		} else {
			cur += c;
		}
	}
	out.push(cur);
	return out;
}

function parseCsv(text: string): Record<string, string>[] {
	const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
	if (lines.length === 0) return [];
	const header = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
	const rows: Record<string, string>[] = [];
	for (let i = 1; i < lines.length; i++) {
		const cells = parseCsvLine(lines[i]);
		const row: Record<string, string> = {};
		for (let j = 0; j < header.length; j++) {
			row[header[j]] = cells[j] ?? "";
		}
		rows.push(row);
	}
	return rows;
}

function main() {
	const arg = process.argv[2];
	if (!arg) {
		console.error(
			"Usage: tsx src/oneoff/generate-game-edition-migration.run.ts <reviewed-editions.csv> [output.sql]",
		);
		process.exit(1);
	}
	const csvPath = resolve(arg);
	const outPath = process.argv[3] ? resolve(process.argv[3]) : null;

	if (!existsSync(csvPath)) {
		console.error(`File not found: ${csvPath}`);
		process.exit(1);
	}

	const raw = readFileSync(csvPath, "utf8");
	const rows = parseCsv(raw);

	const seenUpc = new Set<string>();
	const statements: string[] = [];

	statements.push(
		`-- Generated GameEdition + first OwnedCopy (CIB) per edition — edit CSV before applying.`,
		`-- Source: ${csvPath}`,
		"",
	);

	for (const row of rows) {
		const upc = (row.upc ?? row.upc_digits ?? "").replace(/\D/g, "");
		const title = (
			row.title ??
			row.reviewed_title ??
			row.product_name ??
			row.raw_title ??
			""
		).trim();
		const publisher = (row.publisher ?? "").trim() || null;
		const pcPid = (
			row.price_charting_product_id ??
			row.pricechartingproductid ??
			""
		).trim();
		const pcCid = (
			row.pc_console_id ??
			row.price_charting_console_id ??
			""
		).trim();

		const skipped = (row.skipped ?? "").toLowerCase() === "yes";
		if (skipped) continue;
		if (!upc || upc.length < 4) continue;
		if (!title) continue;
		if (!pcCid || !getConsoleByPriceChartingId(pcCid)) continue;

		if (seenUpc.has(upc)) continue;
		seenUpc.add(upc);

		const pubSql =
			publisher === null || publisher === ""
				? "NULL"
				: `'${publisher.replace(/'/g, "''")}'`;

		const pidSql = pcPid ? `'${pcPid.replace(/'/g, "''")}'` : "NULL";
		const cidSql = `'${pcCid.replace(/'/g, "''")}'`;

		const editionId = randomUUID();
		const copyId = randomUUID();

		statements.push(
			`INSERT INTO "GameEdition" ("id","upc","title","publisher","priceChartingProductId","priceChartingConsoleId","createdAt","updatedAt") VALUES ('${editionId}', '${upc}', '${title.replace(/'/g, "''")}', ${pubSql}, ${pidSql}, ${cidSql}, NOW(), NOW());`,
		);
		statements.push(
			`INSERT INTO "OwnedCopy" ("id","editionId","copyClassification","classificationNotes","purchaseAmount","purchaseCurrency","purchaseDate","offerAmount","offerCurrency","soldAmount","soldCurrency","soldAt") VALUES ('${copyId}', '${editionId}', 'CIB'::"CopyClassification", NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);`,
		);
	}

	const sql = `${statements.join("\n")}\n`;

	if (outPath) {
		writeFileSync(outPath, sql, "utf8");
		console.error(`Wrote ${seenUpc.size} edition+copy pairs (${seenUpc.size * 2} INSERTs) to ${outPath}`);
	} else {
		process.stdout.write(sql);
	}
}

main();
