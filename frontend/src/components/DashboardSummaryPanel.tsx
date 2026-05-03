import type { DashboardSummaryDto } from '@gettin-paid/shared';
import { css, cx } from 'styled-system/css';
import { GamesPerSystemPie } from '#/components/GamesPerSystemPie';
import { Card } from '#/components/ui/Card';
import { formatPcCents } from '#/lib/money';

const gridClass = css({
	display: 'grid',
	gridTemplateColumns: {
		base: '1fr',
		sm: 'repeat(2, minmax(0, 1fr))',
		xl: 'repeat(4, minmax(0, 1fr))',
	},
	gap: '6',
	alignItems: 'stretch',
});

/** Full-height flex column so siblings in a grid row share equal card height. */
const metricCardClass = css({
	h: '100%',
	minH: '0',
	display: 'flex',
	flexDir: 'column',
	p: '5',
});

/** Shared vertical band for pie vs. headline numbers so rows look even at xl. */
const metricHeroClass = css({
	flex: '1',
	minH: '0',
	display: 'flex',
	flexDir: 'column',
	justifyContent: 'center',
	w: '100%',
	xl: { minH: '200px' },
});

const metricFooterClass = css({
	mt: 'auto',
	flexShrink: '0',
});

const pieFillClass = css({
	flex: '1',
	minH: '0',
	w: '100%',
	alignSelf: 'stretch',
});

const cardTitleClass = css({
	fontSize: 'sm',
	fontWeight: 'medium',
	color: 'foregroundMuted',
	textTransform: 'uppercase',
	letterSpacing: '0.06em',
	mb: '4',
});

const bigNumberClass = css({
	fontSize: '3xl',
	fontWeight: 'normal',
	color: 'foreground',
	letterSpacing: '-0.02em',
	mb: '2',
});

const supportingClass = css({
	fontSize: 'sm',
	color: 'foregroundMuted',
	margin: '0',
	lineHeight: '1.5',
});

export type DashboardSummaryPanelProps = {
	data: DashboardSummaryDto;
	/** Shown inside the pie when there is no data */
	pieEmptyLabel?: string;
	/** Shown under “Games per system” when editionCount is 0 */
	gamesPerSystemEmptyHint?: string;
	/** Title for the FMV card (default: library wording) */
	fmvCardTitle?: string;
	/**
	 * `active` = whole-library unsold copies (default).
	 * `assigned` = copies on a collection shelf (may include sold); FMV denominator is valued+unpriced.
	 */
	fmvCopyLabel?: 'active' | 'assigned';
};

export function DashboardSummaryPanel({
	data: d,
	pieEmptyLabel = 'No games in your library yet.',
	gamesPerSystemEmptyHint = 'Add games to see the breakdown.',
	fmvCardTitle = 'Library FMV (snapshot)',
	fmvCopyLabel = 'active',
}: DashboardSummaryPanelProps) {
	const fmvTotalCopies = d.valuedCopyCount + d.unpricedCopyCount;
	const pieSlices = d.systems.map((s) => ({
		label: s.name,
		value: s.editionCount,
	}));

	return (
		<div className={gridClass}>
			<Card className={metricCardClass}>
				<h2 className={cardTitleClass}>Games per system</h2>
				<p
					className={css({
						fontSize: 'sm',
						color: 'foregroundMuted',
						mt: '0',
						mb: '4',
						flexShrink: '0',
					})}
				>
					{d.editionCount === 0
						? gamesPerSystemEmptyHint
						: `${d.editionCount} ${d.editionCount === 1 ? 'title' : 'titles'} across ${d.systems.length} ${d.systems.length === 1 ? 'system' : 'systems'}.`}
				</p>
				<div className={metricHeroClass}>
					<GamesPerSystemPie
						slices={pieSlices}
						emptyLabel={pieEmptyLabel}
						className={pieFillClass}
					/>
				</div>
			</Card>

			<Card className={metricCardClass}>
				<h2 className={cardTitleClass}>{fmvCardTitle}</h2>
				<div className={metricHeroClass}>
					<p className={cx(bigNumberClass, css({ mb: '0' }))}>
						{formatPcCents(d.totalValueCents)}
					</p>
				</div>
				<div className={metricFooterClass}>
					<p className={supportingClass}>
						{fmvCopyLabel === 'assigned' ? (
							<>
								Total implied value from the latest PriceCharting snapshot for
								each copy assigned to this collection (including copies marked
								sold), using the price column that matches its classification
								(sealed → new, CIB → complete, loose, graded, etc.).
							</>
						) : (
							<>
								Total implied value from the latest PriceCharting snapshot for
								each active copy, using the price column that matches its
								classification (sealed → new, CIB → complete, loose, graded,
								etc.).
							</>
						)}
					</p>
					<p className={cx(supportingClass, css({ mt: '3' }))}>
						{d.valuedCopyCount} of {fmvTotalCopies}{' '}
						{fmvCopyLabel === 'assigned' ? 'assigned' : 'active'}{' '}
						{fmvTotalCopies === 1 ? 'copy' : 'copies'} have a mapped price.
						{d.unpricedCopyCount > 0 && (
							<>
								{' '}
								{d.unpricedCopyCount} unpriced (missing snapshot, unsupported
								classification, or empty column).
							</>
						)}
					</p>
				</div>
			</Card>

			<Card className={metricCardClass}>
				<h2 className={cardTitleClass}>Estimated selling value</h2>
				<div className={metricHeroClass}>
					<p className={cx(bigNumberClass, css({ mb: '0' }))}>
						{formatPcCents(d.proposedTotalUsdCents ?? 0)}
					</p>
				</div>
				<div className={metricFooterClass}>
					<p className={supportingClass}>
						Sum of proposed asking prices on active (unsold) copies.
					</p>
					<p className={cx(supportingClass, css({ mt: '3' }))}>
						{d.proposedOfferCopyCount ?? 0} active{' '}
						{(d.proposedOfferCopyCount ?? 0) === 1 ? 'copy' : 'copies'} with a
						proposed price.
					</p>
				</div>
			</Card>

			<Card className={metricCardClass}>
				<h2 className={cardTitleClass}>Earnings</h2>
				<div className={metricHeroClass}>
					<p className={cx(bigNumberClass, css({ mb: '0' }))}>
						{formatPcCents(d.soldTotalUsdCents ?? 0)}
					</p>
				</div>
				<div className={metricFooterClass}>
					<p className={supportingClass}>
						{fmvCopyLabel === 'assigned' ? (
							<>
								Sum of recorded sale prices for copies marked sold that are
								still assigned to this collection (USD only; other currencies
								omitted).
							</>
						) : (
							<>
								Sum of recorded sale prices for all sold copies in your library
								(USD only; other currencies omitted).
							</>
						)}
					</p>
					<p className={cx(supportingClass, css({ mt: '3' }))}>
						{(d.soldCopyCount ?? 0) === 1
							? '1 sale'
							: `${d.soldCopyCount ?? 0} sales`}{' '}
						included in the total.
					</p>
				</div>
			</Card>
		</div>
	);
}
