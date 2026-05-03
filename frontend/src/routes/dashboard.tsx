import type { DashboardSummaryDto } from '@gettin-paid/shared';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { css, cx } from 'styled-system/css';
import { GamesPerSystemPie } from '#/components/GamesPerSystemPie';
import { Button, buttonVariants } from '#/components/ui/Button';
import { Card } from '#/components/ui/Card';
import { apiFetch } from '#/lib/api';
import { formatPcCents } from '#/lib/money';

export const Route = createFileRoute('/dashboard')({
	component: DashboardPage,
});

const pageClass = css({ p: '6' });

const pageHeaderClass = css({
	display: 'flex',
	flexDir: { base: 'column', sm: 'row' },
	alignItems: { base: 'stretch', sm: 'center' },
	justifyContent: { base: 'flex-start', sm: 'space-between' },
	mb: '6',
	gap: '4',
});

const pageTitleClass = css({
	fontSize: '2xl',
	fontWeight: 'normal',
	color: 'foreground',
	margin: '0',
	letterSpacing: '-0.01em',
});

const gridClass = css({
	display: 'grid',
	gridTemplateColumns: {
		base: '1fr',
		lg: '1fr 1fr',
		xl: 'repeat(3, minmax(0, 1fr))',
	},
	gap: '6',
	alignItems: 'start',
});

const proposedCardGridClass = css({
	lg: { gridColumn: '1 / -1' },
	xl: { gridColumn: 'auto' },
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

const errorCardClass = css({
	bg: 'rgba(192,57,43,0.08)',
	borderWidth: '1px',
	borderStyle: 'solid',
	borderColor: 'rgba(192,57,43,0.2)',
	borderRadius: 'card',
	p: '4',
	mb: '4',
});

const errorTitleClass = css({
	fontSize: 'base',
	fontWeight: 'semibold',
	color: 'danger',
	mb: '1',
});

const stateTextClass = css({
	color: 'foregroundMuted',
	fontSize: 'sm',
	py: '4',
});

function DashboardPage() {
	const q = useQuery({
		queryKey: ['dashboard'],
		queryFn: () => apiFetch<DashboardSummaryDto>('/dashboard'),
	});

	if (q.isLoading) {
		return (
			<div className={pageClass}>
				<p className={stateTextClass}>Loading dashboard…</p>
			</div>
		);
	}

	if (q.isError || !q.data) {
		return (
			<div className={pageClass}>
				<div className={errorCardClass}>
					<p className={errorTitleClass}>Could not load dashboard.</p>
					<p className={supportingClass}>
						{q.error instanceof Error ? q.error.message : 'Unknown error'}
					</p>
					<Button
						variant="secondary"
						size="sm"
						onClick={() => {
							void q.refetch();
						}}
					>
						Retry
					</Button>
				</div>
				<Link
					to="/inventory"
					className={buttonVariants({ variant: 'ghost', size: 'sm' })}
				>
					← Inventory
				</Link>
			</div>
		);
	}

	const d = q.data;
	const pieSlices = d.systems.map((s) => ({
		label: s.name,
		value: s.editionCount,
	}));

	return (
		<div className={pageClass}>
			<div className={pageHeaderClass}>
				<h1 className={pageTitleClass}>Dashboard</h1>
				<Link
					to="/inventory"
					className={buttonVariants({ variant: 'secondary', size: 'sm' })}
				>
					View inventory
				</Link>
			</div>

			<div className={gridClass}>
				<Card className={css({ p: '5' })}>
					<h2 className={cardTitleClass}>Games per system</h2>
					<p
						className={css({
							fontSize: 'sm',
							color: 'foregroundMuted',
							mt: '0',
							mb: '4',
						})}
					>
						{d.editionCount === 0
							? 'Add games from Inventory to see the breakdown.'
							: `${d.editionCount} ${d.editionCount === 1 ? 'title' : 'titles'} across ${d.systems.length} ${d.systems.length === 1 ? 'system' : 'systems'}.`}
					</p>
					<GamesPerSystemPie
						slices={pieSlices}
						emptyLabel="No games in your library yet."
					/>
				</Card>

				<Card className={css({ p: '5' })}>
					<h2 className={cardTitleClass}>Collection FMV (snapshot)</h2>
					<p className={bigNumberClass}>{formatPcCents(d.totalValueCents)}</p>
					<p className={supportingClass}>
						Total implied value from the latest PriceCharting snapshot for each
						active copy, using the price column that matches its classification
						(sealed → new, CIB → complete, loose, graded, etc.).
					</p>
					<p className={cx(supportingClass, css({ mt: '3' }))}>
						{d.valuedCopyCount} of {d.activeCopyCount} active{' '}
						{d.activeCopyCount === 1 ? 'copy' : 'copies'} have a mapped price.
						{d.unpricedCopyCount > 0 && (
							<>
								{' '}
								{d.unpricedCopyCount} unpriced (missing snapshot, unsupported
								classification, or empty column).
							</>
						)}
					</p>
				</Card>

				<Card className={cx(css({ p: '5' }), proposedCardGridClass)}>
					<h2 className={cardTitleClass}>Estimated selling value</h2>
					<p className={bigNumberClass}>
						{formatPcCents(d.proposedTotalUsdCents ?? 0)}
					</p>
					<p className={supportingClass}>
						Sum of proposed asking prices on active (unsold) copies.
					</p>
					<p className={cx(supportingClass, css({ mt: '3' }))}>
						{d.proposedOfferCopyCount ?? 0} active{' '}
						{(d.proposedOfferCopyCount ?? 0) === 1 ? 'copy' : 'copies'} with a
						proposed price.
					</p>
				</Card>
			</div>
		</div>
	);
}
