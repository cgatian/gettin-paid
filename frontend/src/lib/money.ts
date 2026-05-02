/** PriceCharting JSON prices are in whole cents. */
export function formatPcCents(value: number | null | undefined): string {
	if (value == null) return "—";
	const dollars = value / 100;
	return new Intl.NumberFormat(undefined, {
		style: "currency",
		currency: "USD",
	}).format(dollars);
}
