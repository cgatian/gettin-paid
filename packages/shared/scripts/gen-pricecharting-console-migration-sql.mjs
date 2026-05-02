/**
 * Reads PriceCharting Console ID table from markdown (same sources as gen-pricecharting-console-ids.mjs)
 * and writes a Prisma migration SQL: CREATE TABLE + INSERT + FK on GameEdition.
 *
 * Usage: node scripts/gen-pricecharting-console-migration-sql.mjs
 */
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
		"Console ID markdown not found; use packages/shared/data/pricecharting-console-id-table.md or Cursor uploads api-documentation-0.md",
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

function sqlStr(s) {
	return `'${s.replace(/'/g, "''")}'`;
}

const valueLines = rows.map(
	(r, i) =>
		`(${sqlStr(r.id)}, ${sqlStr(r.name)}, ${i})`,
);

const out = `-- Generated from PriceCharting api-documentation#console-ids (Console ID table)
-- Source: ${path.basename(mdPath)} — ${rows.length} rows

CREATE TABLE "PriceChartingConsole" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    CONSTRAINT "PriceChartingConsole_pkey" PRIMARY KEY ("id")
);

INSERT INTO "PriceChartingConsole" ("id", "name", "displayOrder") VALUES
${valueLines.join(",\n")};

ALTER TABLE "GameEdition" ADD CONSTRAINT "GameEdition_priceChartingConsoleId_fkey" FOREIGN KEY ("priceChartingConsoleId") REFERENCES "PriceChartingConsole"("id") ON DELETE SET NULL ON UPDATE CASCADE;
`;

const migrationDir = path.join(
	__dirname,
	"../../../backend/prisma/migrations/20260505140000_pricecharting_console_lookup",
);
fs.mkdirSync(migrationDir, { recursive: true });
const target = path.join(migrationDir, "migration.sql");
fs.writeFileSync(target, out, "utf8");
console.log("wrote", target, rows.length, "consoles from", mdPath);
