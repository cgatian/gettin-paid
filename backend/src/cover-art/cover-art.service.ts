import { priceChartingProductBrowseUrl } from "@gettin-paid/shared";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as cheerio from "cheerio";
import * as fs from "fs/promises";
import * as path from "path";

const DEFAULT_STORAGE_SUBDIR = "storage/covers";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const HTML_TIMEOUT_MS = 30_000;
const IMAGE_TIMEOUT_MS = 45_000;

const CHROME_UA =
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function extFromMime(mime: string): string {
	switch (mime) {
		case "image/jpeg":
			return "jpg";
		case "image/png":
			return "png";
		case "image/webp":
			return "webp";
		case "image/gif":
			return "gif";
		default:
			return "bin";
	}
}

/** Detect image MIME from magic bytes (authoritative). */
function detectImageMime(buf: Buffer): string | null {
	if (buf.length < 12) return null;
	if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
	if (
		buf[0] === 0x89 &&
		buf[1] === 0x50 &&
		buf[2] === 0x4e &&
		buf[3] === 0x47
	)
		return "image/png";
	const head = buf.slice(0, 6).toString("ascii");
	if (head === "GIF87a" || head === "GIF89a") return "image/gif";
	if (
		buf.slice(0, 4).toString("ascii") === "RIFF" &&
		buf.slice(8, 12).toString("ascii") === "WEBP"
	)
		return "image/webp";
	return null;
}

async function pathExists(file: string): Promise<boolean> {
	try {
		await fs.access(file);
		return true;
	} catch {
		return false;
	}
}

/**
 * Single safe path segment for cover filenames (PriceCharting product id, e.g. numeric string).
 */
function safeCoverBasename(priceChartingProductId: string): string {
	const t = priceChartingProductId.trim();
	if (!t) throw new Error("Missing PriceCharting product id");
	if (t !== path.basename(t) || /[/\\]/.test(t) || t.includes("..")) {
		throw new Error("Invalid PriceCharting product id");
	}
	return t;
}

@Injectable()
export class CoverArtService {
	private readonly logger = new Logger(CoverArtService.name);

	constructor(private readonly config: ConfigService) {}

	private storageRoot(): string {
		const raw =
			this.config.get<string>("COVER_STORAGE_PATH")?.trim() ||
			path.join(process.cwd(), DEFAULT_STORAGE_SUBDIR);
		return path.resolve(raw);
	}

	/** Absolute path for a stored cover file (keyed by PriceCharting product id, not edition UUID). */
	coverFileAbsolute(priceChartingProductId: string, mime: string): string {
		const base = safeCoverBasename(priceChartingProductId);
		const ext = extFromMime(mime);
		return path.join(this.storageRoot(), `${base}.${ext}`);
	}

	async ensureStorageDir(): Promise<void> {
		await fs.mkdir(this.storageRoot(), { recursive: true });
	}

	/**
	 * Remove any file named `{priceChartingProductId}.*` under storage (handles MIME/extension changes).
	 */
	async removeCoverFilesForPriceChartingProduct(
		priceChartingProductId: string | null | undefined,
	): Promise<void> {
		const id = priceChartingProductId?.trim();
		if (!id) return;
		let base: string;
		try {
			base = safeCoverBasename(id);
		} catch {
			return;
		}
		const root = this.storageRoot();
		let names: string[];
		try {
			names = await fs.readdir(root);
		} catch {
			return;
		}
		const prefix = `${base}.`;
		const toRemove = names.filter((n) => n.startsWith(prefix));
		if (toRemove.length > 0) {
			this.logger.log(
				`Removing prior cover file(s) for PriceCharting id ${base}: ${toRemove.join(", ")}`,
			);
		}
		await Promise.all(
			toRemove.map((n) =>
				fs.unlink(path.join(root, n)).catch(() => undefined),
			),
		);
	}

	async coverFileExistsForPriceChartingProduct(
		priceChartingProductId: string,
		coverContentType: string | null,
	): Promise<boolean> {
		if (!coverContentType) return false;
		const p = this.coverFileAbsolute(priceChartingProductId, coverContentType);
		return pathExists(p);
	}

	/** Resolve absolute cover image URL from PriceCharting product browse page (same DOM as full scrape). */
	private async loadCoverImageAbsoluteUrl(
		priceChartingProductId: string,
	): Promise<string> {
		const pageUrl = priceChartingProductBrowseUrl(priceChartingProductId);
		if (!pageUrl) {
			throw new Error("Missing PriceCharting product id");
		}

		this.logger.log(
			`Scrape cover: fetching HTML for PriceCharting product ${priceChartingProductId} (${pageUrl})`,
		);

		const htmlRes = await fetch(pageUrl, {
			headers: { "User-Agent": CHROME_UA, Accept: "text/html" },
			signal: AbortSignal.timeout(HTML_TIMEOUT_MS),
			redirect: "follow",
		});
		if (!htmlRes.ok) {
			this.logger.warn(
				`PriceCharting HTML failed: product ${priceChartingProductId} HTTP ${htmlRes.status}`,
			);
			throw new Error(`PriceCharting page HTTP ${htmlRes.status}`);
		}
		const html = await htmlRes.text();
		const finalUrl = htmlRes.url;
		this.logger.log(
			`PriceCharting HTML OK: product ${priceChartingProductId}, finalUrl=${finalUrl}, htmlBytes=${html.length}`,
		);
		const $ = cheerio.load(html);
		const img = $("#product_details img").first();
		const src = img.attr("src")?.trim();
		if (!src) {
			this.logger.warn(
				`No #product_details img for product ${priceChartingProductId}`,
			);
			throw new Error("No image found in #product_details");
		}

		const imageUrl = new URL(src, finalUrl).href;
		this.logger.log(
			`Resolved cover image URL for product ${priceChartingProductId}: ${imageUrl}`,
		);
		return imageUrl;
	}

	/**
	 * Public image URL for UI preview (add-game). Returns null if the page has no image or fetch fails.
	 */
	async resolveCoverPreviewImageUrl(
		priceChartingProductId: string,
	): Promise<string | null> {
		const id = priceChartingProductId.trim();
		if (!id) return null;
		try {
			return await this.loadCoverImageAbsoluteUrl(id);
		} catch (e) {
			this.logger.debug(
				`Cover preview URL unavailable for ${id}: ${e instanceof Error ? e.message : String(e)}`,
			);
			return null;
		}
	}

	/**
	 * Fetch PriceCharting HTML, extract `#product_details img`, download image bytes.
	 */
	async scrapeCoverImage(priceChartingProductId: string): Promise<{
		buffer: Buffer;
		mime: string;
	}> {
		const imageUrl = await this.loadCoverImageAbsoluteUrl(
			priceChartingProductId,
		);

		const imgRes = await fetch(imageUrl, {
			headers: { "User-Agent": CHROME_UA, Accept: "image/*,*/*" },
			signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS),
			redirect: "follow",
		});
		if (!imgRes.ok) {
			this.logger.warn(
				`Cover image download failed: product ${priceChartingProductId} HTTP ${imgRes.status}`,
			);
			throw new Error(`Cover image HTTP ${imgRes.status}`);
		}
		const lenHeader = imgRes.headers.get("content-length");
		if (lenHeader) {
			const n = Number(lenHeader);
			if (Number.isFinite(n) && n > MAX_IMAGE_BYTES) {
				this.logger.warn(
					`Cover image too large (Content-Length): product ${priceChartingProductId} ${n} bytes`,
				);
				throw new Error("Cover image exceeds size limit");
			}
		}

		const arrayBuf = await imgRes.arrayBuffer();
		if (arrayBuf.byteLength > MAX_IMAGE_BYTES) {
			this.logger.warn(
				`Cover image too large: product ${priceChartingProductId} ${arrayBuf.byteLength} bytes`,
			);
			throw new Error("Cover image exceeds size limit");
		}
		const buffer = Buffer.from(arrayBuf);
		const mime = detectImageMime(buffer);
		if (!mime) {
			this.logger.warn(
				`Cover bytes not a recognized image: product ${priceChartingProductId}, firstBytes=${buffer.subarray(0, 12).toString("hex")}`,
			);
			throw new Error("Downloaded file is not a recognized image");
		}
		this.logger.log(
			`Cover downloaded: product ${priceChartingProductId}, mime=${mime}, bytes=${buffer.length}`,
		);
		return { buffer, mime };
	}

	async writeCoverFile(
		priceChartingProductId: string,
		buffer: Buffer,
		mime: string,
	): Promise<void> {
		await this.ensureStorageDir();
		await this.removeCoverFilesForPriceChartingProduct(priceChartingProductId);
		const dest = this.coverFileAbsolute(priceChartingProductId, mime);
		await fs.writeFile(dest, buffer);
		this.logger.log(
			`Cover saved: PriceCharting id ${priceChartingProductId.trim()} → ${dest} (${buffer.length} bytes, ${mime})`,
		);
	}
}
