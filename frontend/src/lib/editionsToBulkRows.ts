import type { GameEditionDto } from '@gettin-paid/shared';
import { labelPriceChartingConsole } from '@gettin-paid/shared';
import type { BulkInventoryGridRow } from '#/components/InventoryBulkEditGrid';
import { formatMoneyAmount, formatPcCents } from '#/lib/money';

export function editionsToBulkRows(
	editions: GameEditionDto[],
): BulkInventoryGridRow[] {
	const rows: BulkInventoryGridRow[] = [];
	for (const e of editions) {
		const consoleLabel =
			e.priceChartingConsoleName ??
			labelPriceChartingConsole(e.priceChartingConsoleId ?? '');
		for (const c of e.activeCopies ?? []) {
			const proposedLabel =
				c.offerAmount != null && String(c.offerAmount).trim() !== ''
					? formatMoneyAmount(c.offerAmount)
					: '—';
			const soldLabel =
				c.soldAmount != null && String(c.soldAmount).trim() !== ''
					? formatMoneyAmount(c.soldAmount)
					: '—';
			rows.push({
				copyId: c.id,
				editionId: e.id,
				title: e.title,
				consoleLabel,
				collectionsLabel:
					c.collections?.map((col) => col.title).join(', ') || '—',
				copyClassification: c.copyClassification,
				soldAt: c.soldAt,
				fmvLabel: formatPcCents(c.fmvCents),
				proposedLabel,
				soldLabel,
			});
		}
	}
	return rows;
}
