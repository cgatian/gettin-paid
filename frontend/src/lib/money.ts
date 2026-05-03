/** PriceCharting JSON prices are in whole cents. */
export function formatPcCents(value: number | null | undefined): string {
	if (value == null) return '—';
	const dollars = value / 100;
	return new Intl.NumberFormat(undefined, {
		style: 'currency',
		currency: 'USD',
	}).format(dollars);
}

/** Decimal amount string from the API; displayed as USD. */
export function formatMoneyAmount(amount: string): string {
	const n = Number.parseFloat(amount);
	if (!Number.isFinite(n)) return amount;
	try {
		return new Intl.NumberFormat(undefined, {
			style: 'currency',
			currency: 'USD',
		}).format(n);
	} catch {
		return amount;
	}
}
