/** PriceCharting JSON prices are in whole cents. */
export function formatPcCents(value: number | null | undefined): string {
	if (value == null) return "—";
	const dollars = value / 100;
	return new Intl.NumberFormat(undefined, {
		style: "currency",
		currency: "USD",
	}).format(dollars);
}

/** Decimal amount string + ISO 4217 code from the API (inventory copy offer / purchase). */
export function formatMoneyAmount(
	amount: string,
	currency: string | null | undefined,
): string {
	const code = (currency?.trim().toUpperCase() || "USD").slice(0, 3);
	const n = Number.parseFloat(amount);
	if (!Number.isFinite(n)) return `${amount} ${code}`;
	try {
		return new Intl.NumberFormat(undefined, {
			style: "currency",
			currency: code.length === 3 ? code : "USD",
		}).format(n);
	} catch {
		return `${amount} ${code}`;
	}
}
