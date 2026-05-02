/**
 * Public PriceCharting game page; same id as API.
 * `/game/{id}` redirects to the `/game/.../...` slug URL.
 */
export function priceChartingProductBrowseUrl(
	productId: string | undefined | null,
): string | null {
	if (!productId?.trim()) return null;
	return `https://www.pricecharting.com/game/${encodeURIComponent(productId.trim())}`;
}
