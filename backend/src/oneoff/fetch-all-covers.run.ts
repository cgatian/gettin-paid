/**
 * Download edition cover images from PriceCharting (same rules as POST …/editions/fetch-all-covers).
 * Use after empty deploys, when moving COVER_STORAGE_PATH to a volume, or from CI against staging.
 *
 * Usage (DATABASE_URL in .env; run from backend/: `pnpm run fetch-covers`):
 *   pnpm --filter @gettin-paid/backend exec tsx src/oneoff/fetch-all-covers.run.ts
 *
 * Options:
 *   --force              Re-scrape even when DB says cover exists and file is present
 *   --edition-id <uuid> Only process one edition (still needs PriceCharting product id)
 */
import "reflect-metadata";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { BadRequestException } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "../app.module";
import { InventoryService } from "../inventory/inventory.service";

for (const p of [resolve(process.cwd(), ".env"), resolve(process.cwd(), "backend/.env")]) {
	if (!existsSync(p)) continue;
	const t = readFileSync(p, "utf8");
	for (const line of t.split("\n")) {
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

function exceptionMessage(e: unknown): string {
	if (e instanceof BadRequestException) {
		const r = e.getResponse();
		if (typeof r === "string") return r;
		if (r && typeof r === "object" && "message" in r) {
			const m = (r as { message?: unknown }).message;
			if (typeof m === "string") return m;
			if (Array.isArray(m)) return m.join(", ");
		}
	}
	if (e instanceof Error) return e.message;
	return String(e);
}

async function main() {
	if (!process.env.DATABASE_URL?.trim()) {
		console.error("DATABASE_URL is required");
		process.exit(1);
	}

	let force = false;
	let editionId: string | undefined;
	const argv = process.argv.slice(2);
	for (let i = 0; i < argv.length; i++) {
		if (argv[i] === "--force") force = true;
		else if (argv[i] === "--edition-id") editionId = argv[++i];
	}

	const app = await NestFactory.createApplicationContext(AppModule, {
		logger: ["error", "warn", "log"],
	});
	try {
		const inventory = app.get(InventoryService);
		if (editionId) {
			try {
				const row = await inventory.fetchEditionCover(editionId, force);
				console.log(
					JSON.stringify(
						{
							mode: "single",
							editionId,
							coverAlreadyStored: row.coverAlreadyStored ?? false,
							title: row.title,
						},
						null,
						2,
					),
				);
			} catch (e) {
				console.error(exceptionMessage(e));
				process.exit(1);
			}
		} else {
			const result = await inventory.fetchAllCovers(force);
			console.log(JSON.stringify({ mode: "all", ...result }, null, 2));
		}
	} finally {
		await app.close();
	}
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
