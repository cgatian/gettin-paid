import type { PriceChartingProductApi, PriceChartingProductsApi } from "@gettin-paid/shared";

/** Matches PriceCharting subscription guidance (~≥4s between calls); never go faster than this */
export const PRICECHARTING_MIN_INTERVAL_MS_FLOOR = 4000;
const PRICECHARTING_MIN_INTERVAL_MS_CEILING = 120_000;

/** Clamp configured interval so typos / low values cannot hammer the API */
export function clampPriceChartingMinIntervalMs(ms: number): number {
	if (!Number.isFinite(ms)) return PRICECHARTING_MIN_INTERVAL_MS_FLOOR;
	const n = Math.floor(ms);
	if (n < PRICECHARTING_MIN_INTERVAL_MS_FLOOR) return PRICECHARTING_MIN_INTERVAL_MS_FLOOR;
	if (n > PRICECHARTING_MIN_INTERVAL_MS_CEILING) return PRICECHARTING_MIN_INTERVAL_MS_CEILING;
	return n;
}

export type PriceChartingHttpConfig = {
	token: string;
	minIntervalMs: number;
	/** Called right before sleeping to respect spacing (for CLI visibility) */
	onThrottleWait?: (waitMs: number) => void;
};

/**
 * Throttled GETs to PriceCharting Prices API (shared by Nest service and one-off scripts).
 * @see https://www.pricecharting.com/api-documentation
 */
export class PriceChartingHttpClient {
	private queueTail: Promise<void> = Promise.resolve();
	private lastCallEnd = 0;
	private readonly intervalMs: number;

	constructor(private readonly config: PriceChartingHttpConfig) {
		this.intervalMs = clampPriceChartingMinIntervalMs(config.minIntervalMs);
	}

	private async withThrottle<T>(fn: () => Promise<T>): Promise<T> {
		const run = this.queueTail.then(async () => {
			const min = this.intervalMs;
			const now = Date.now();
			const wait = Math.max(0, min - (now - this.lastCallEnd));
			if (wait > 0) {
				this.config.onThrottleWait?.(wait);
				await new Promise((r) => setTimeout(r, wait));
			}
			try {
				return await fn();
			} finally {
				this.lastCallEnd = Date.now();
			}
		});
		this.queueTail = run.then(() => {}).catch(() => {});
		return run;
	}

	/**
	 * Full-text search; returns up to 20 products. Optional `console` is PriceCharting G-code (e.g. G12); may be ignored by the API.
	 */
	async fetchProducts(params: { q: string; console?: string }): Promise<PriceChartingProductsApi> {
		return this.withThrottle(async () => {
			const sp = new URLSearchParams();
			sp.set("t", this.config.token);
			sp.set("q", params.q);
			if (params.console) sp.set("console", params.console);
			const url = `https://www.pricecharting.com/api/products?${sp.toString()}`;
			const res = await fetch(url, { method: "GET" });
			if (!res.ok) {
				throw new Error(`PriceCharting HTTP ${res.status}`);
			}
			return (await res.json()) as PriceChartingProductsApi;
		});
	}

	/**
	 * Single product: by `id`, `upc`, and/or full-text `q`.
	 * Prefer **`id` alone** when you have a PriceCharting product id (same row as CSV); do not pass
	 * `console` with `id`. Use `q` (+ optional `console`) only when you do not have an id yet.
	 */
	async fetchProduct(params: {
		id?: string;
		upc?: string;
		q?: string;
		console?: string;
	}): Promise<PriceChartingProductApi> {
		return this.withThrottle(async () => {
			const sp = new URLSearchParams();
			sp.set("t", this.config.token);
			if (params.id) sp.set("id", params.id);
			if (params.upc) sp.set("upc", params.upc.replace(/\D/g, ""));
			if (params.q) sp.set("q", params.q);
			if (params.console) sp.set("console", params.console);
			const url = `https://www.pricecharting.com/api/product?${sp.toString()}`;
			const res = await fetch(url, { method: "GET" });
			if (!res.ok) {
				throw new Error(`PriceCharting HTTP ${res.status}`);
			}
			return (await res.json()) as PriceChartingProductApi;
		});
	}
}

export function getPriceChartingErrorMessage(
	data: PriceChartingProductApi | PriceChartingProductsApi,
): string | undefined {
	const msg = (data as { "error-message"?: string })["error-message"];
	if (msg) return msg;
	if (data.status === "error") return "PriceCharting status error";
	return undefined;
}
