import type { PriceChartingProductApi, PriceChartingProductsApi } from "@gettin-paid/shared";
import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
	getPriceChartingErrorMessage,
	PriceChartingHttpClient,
} from "./pricecharting-http.client";
import { productApiToSnapshotFields } from "./product-snapshot-fields";

@Injectable()
export class PriceChartingService {
	private httpClient: PriceChartingHttpClient | null = null;

	constructor(
		private readonly config: ConfigService,
		private readonly prisma: PrismaService,
	) {}

	private get minIntervalMs(): number {
		return Number(this.config.get("PRICECHARTING_MIN_INTERVAL_MS") ?? 4000);
	}

	private get token(): string | undefined {
		return this.config.get<string>("PRICECHARTING_API_TOKEN");
	}

	private ensureHttp(): PriceChartingHttpClient {
		const t = this.token;
		if (!t) {
			throw new ServiceUnavailableException(
				"PRICECHARTING_API_TOKEN is not set",
			);
		}
		if (!this.httpClient) {
			this.httpClient = new PriceChartingHttpClient({
				token: t,
				minIntervalMs: this.minIntervalMs,
			});
		}
		return this.httpClient;
	}

	async fetchProduct(params: {
		upc?: string;
		id?: string;
		q?: string;
		console?: string;
	}): Promise<PriceChartingProductApi> {
		const data = await this.ensureHttp().fetchProduct(params);
		const err = getPriceChartingErrorMessage(data);
		if (data.status === "error" || err) {
			throw new ServiceUnavailableException(err ?? "PriceCharting error");
		}
		return data;
	}

	/** Full-text search returning up to 20 products (optional PriceCharting `console` G-code). */
	async fetchProducts(params: {
		q: string;
		console?: string;
	}): Promise<PriceChartingProductsApi> {
		const t = this.token;
		if (!t) {
			throw new ServiceUnavailableException(
				"PRICECHARTING_API_TOKEN is not set",
			);
		}
		const data = await this.ensureHttp().fetchProducts(params);
		const err = getPriceChartingErrorMessage(data);
		if (data.status === "error" || err) {
			throw new ServiceUnavailableException(err ?? "PriceCharting error");
		}
		return data;
	}

	snapshotFromApi(
		data: PriceChartingProductApi,
	): Omit<
			Prisma.PriceChartingProductSnapshotCreateInput,
			"edition" | "editionId"
		> {
		return productApiToSnapshotFields(data);
	}
}
