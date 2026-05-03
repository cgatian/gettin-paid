import type { DashboardSummaryDto, GameEditionDto } from '@gettin-paid/shared';
import {
	labelPriceChartingConsole,
	POPULAR_PRICECHARTING_CONSOLE_IDS,
} from '@gettin-paid/shared';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { css } from 'styled-system/css';
import { DashboardSummaryPanel } from '#/components/DashboardSummaryPanel';
import { InventoryEditionList } from '#/components/InventoryEditionList';
import { Button, buttonVariants } from '#/components/ui/Button';
import { Card } from '#/components/ui/Card';
import { Input } from '#/components/ui/Input';
import { apiFetch } from '#/lib/api';

const popularSet = new Set(POPULAR_PRICECHARTING_CONSOLE_IDS);

const chipConsoleIds = POPULAR_PRICECHARTING_CONSOLE_IDS.slice(0, 10);

function parseInventorySearch(search: Record<string, unknown>) {
	const out: { console?: string; sold?: true } = {};
	const c = search.console;
	if (typeof c === 'string' && c.trim()) out.console = c.trim();
	const s = search.sold;
	if (s === true || s === 'true' || s === 1 || s === '1') out.sold = true;
	return out;
}

export const Route = createFileRoute('/inventory/')({
	component: InventoryList,
	validateSearch: parseInventorySearch,
});

const pageClass = css({ p: '6' });

const pageHeaderClass = css({
	display: 'flex',
	flexDir: { base: 'column', md: 'row' },
	alignItems: { base: 'stretch', md: 'center' },
	justifyContent: { base: 'flex-start', md: 'space-between' },
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

const filtersStackClass = css({
	display: 'flex',
	flexDir: 'column',
	gap: '4',
	mb: '6',
});

const searchBlockClass = css({
	display: 'flex',
	alignItems: 'center',
	flexWrap: 'wrap',
	gap: '3',
	p: '4',
	borderRadius: 'card',
	bg: 'surface',
	borderWidth: '1px',
	borderStyle: 'solid',
	borderColor: 'border',
	minW: '0',
});

const filtersRowClass = css({
	display: 'flex',
	alignItems: 'center',
	gap: '2',
	flexWrap: 'wrap',
});

const filterLabelClass = css({
	fontSize: 'sm',
	color: 'foregroundMuted',
	mr: '1',
});

const filterChipBase = css({
	display: 'inline-flex',
	alignItems: 'center',
	px: '3',
	py: '1',
	borderRadius: 'full',
	fontSize: 'sm',
	borderWidth: '1px',
	borderStyle: 'solid',
	cursor: 'pointer',
	textDecoration: 'none',
	transition:
		'background-color 120ms ease, border-color 120ms ease, color 120ms ease',
});

const filterChipActive = css({
	bg: 'navActive',
	borderColor: 'borderSubtle',
	color: 'foreground',
	fontWeight: 'medium',
});

const filterChipInactive = css({
	bg: 'transparent',
	borderColor: 'transparent',
	color: 'foregroundMuted',
	_hover: { bg: 'navHover', color: 'foreground', borderColor: 'border' },
});

const emptyClass = css({
	textAlign: 'center',
	py: '16',
	color: 'foregroundMuted',
});

const emptyTitleClass = css({
	fontSize: 'md',
	color: 'foreground',
	mb: '2',
});

const stateTextClass = css({
	color: 'foregroundMuted',
	fontSize: 'sm',
	py: '4',
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

const errorTextClass = css({
	fontSize: 'sm',
	color: 'foregroundMuted',
	mb: '3',
});

type InventoryListSearch = ReturnType<typeof parseInventorySearch>;

function InventoryList() {
	const navigate = useNavigate();
	const { console: consoleFilter, sold: includeSoldSearch } = Route.useSearch();
	const includeSold = includeSoldSearch === true;
	const soldSearchFragment = includeSold ? ({ sold: true } as const) : {};
	const platformsQuery = useQuery({
		queryKey: ['platforms'],
		queryFn: () => apiFetch<{ id: string; name: string }[]>('/platforms'),
		staleTime: 86_400_000,
	});
	const nameById = useMemo(() => {
		const m = new Map<string, string>();
		for (const p of platformsQuery.data ?? []) {
			m.set(p.id, p.name);
		}
		return m;
	}, [platformsQuery.data]);

	function chipLabel(id: string) {
		return nameById.get(id) ?? labelPriceChartingConsole(id);
	}

	const moreConsoleOptions = useMemo(() => {
		const platforms = platformsQuery.data;
		if (!platforms?.length) return [] as { id: string; label: string }[];
		const head = POPULAR_PRICECHARTING_CONSOLE_IDS.slice(10).map((id) => ({
			id,
			label: `${nameById.get(id) ?? labelPriceChartingConsole(id)} (${id})`,
		}));
		const tail = platforms
			.filter((c) => !popularSet.has(c.id))
			.sort((a, b) => a.name.localeCompare(b.name))
			.map((c) => ({
				id: c.id,
				label: `${c.name} (${c.id})`,
			}));
		return [...head, ...tail];
	}, [platformsQuery.data, nameById]);

	const dashboardQ = useQuery({
		queryKey: ['entire-collection'],
		queryFn: () => apiFetch<DashboardSummaryDto>('/dashboard'),
	});

	const { data, isLoading, isError, error, refetch } = useQuery({
		queryKey: ['editions', consoleFilter ?? 'all'],
		queryFn: () => {
			const q = consoleFilter
				? `?console=${encodeURIComponent(consoleFilter)}`
				: '';
			return apiFetch<GameEditionDto[]>(`/editions${q}`);
		},
	});

	const [titleFilter, setTitleFilter] = useState('');

	const editionsAfterSoldFilter = useMemo(() => {
		if (!data?.length) return [];
		if (includeSold) return data;
		return data.filter((e) => (e.activeCopies?.length ?? 0) > 0);
	}, [data, includeSold]);

	const filteredEditions = useMemo(() => {
		if (!editionsAfterSoldFilter.length) return [];
		const needle = titleFilter.trim().toLowerCase();
		if (!needle) return editionsAfterSoldFilter;
		return editionsAfterSoldFilter.filter((e) =>
			e.title.toLowerCase().includes(needle),
		);
	}, [editionsAfterSoldFilter, titleFilter]);

	return (
		<div className={pageClass}>
			<div className={pageHeaderClass}>
				<h1 className={pageTitleClass}>Games</h1>
				<div
					className={css({
						display: 'flex',
						flexWrap: 'wrap',
						gap: '2',
						alignItems: 'center',
					})}
				>
					<Link
						to="/inventory/bulk-edit"
						className={buttonVariants({ variant: 'secondary', size: 'sm' })}
					>
						Bulk edit
					</Link>
					<Link
						to="/inventory/add"
						className={buttonVariants({ variant: 'primary', size: 'sm' })}
					>
						+ New
					</Link>
				</div>
			</div>

			{dashboardQ.isLoading && (
				<p
					className={css({ color: 'foregroundMuted', fontSize: 'sm', mb: '4' })}
				>
					Loading metrics…
				</p>
			)}
			{dashboardQ.isError && (
				<div className={css({ mb: '6' })}>
					<div className={errorCardClass}>
						<p className={errorTitleClass}>Could not load library metrics.</p>
						<p className={errorTextClass}>
							{dashboardQ.error instanceof Error
								? dashboardQ.error.message
								: 'Unknown error'}
						</p>
						<Button
							variant="secondary"
							size="sm"
							onClick={() => {
								void dashboardQ.refetch();
							}}
						>
							Retry metrics
						</Button>
					</div>
				</div>
			)}
			{dashboardQ.data && (
				<div className={css({ mb: '8' })}>
					<DashboardSummaryPanel
						data={dashboardQ.data}
						pieEmptyLabel="No games yet."
						gamesPerSystemEmptyHint="Add games to see how titles split across systems."
						fmvCardTitle="All games FMV (snapshot)"
					/>
				</div>
			)}

			<div className={filtersStackClass}>
				<div className={searchBlockClass}>
					<label htmlFor="inventory-title-filter" className={filterLabelClass}>
						Search:
					</label>
					<Input
						id="inventory-title-filter"
						type="search"
						placeholder="Filter by title…"
						value={titleFilter}
						onChange={(ev) => setTitleFilter(ev.target.value)}
						autoComplete="off"
						className={css({ flex: '1', minW: '0' })}
					/>
					<label
						className={css({
							display: 'inline-flex',
							alignItems: 'center',
							gap: '2',
							fontSize: 'sm',
							color: 'foreground',
							cursor: 'pointer',
							whiteSpace: 'nowrap',
						})}
					>
						<input
							type="checkbox"
							checked={includeSold}
							onChange={() => {
								void navigate({
									search: (prev: InventoryListSearch) => {
										const next = { ...prev };
										if (includeSold) delete next.sold;
										else next.sold = true;
										return next;
									},
								});
							}}
							className={css({ cursor: 'pointer' })}
						/>
						Include sold
					</label>
				</div>
				<div className={filtersRowClass}>
					<span className={filterLabelClass}>Console:</span>
					<FilterChip
						label="All"
						to="/inventory"
						search={soldSearchFragment}
						active={!consoleFilter}
					/>
					{chipConsoleIds.map((id) => (
						<FilterChip
							key={id}
							label={chipLabel(id)}
							to="/inventory"
							search={{ console: id, ...soldSearchFragment }}
							active={consoleFilter === id}
						/>
					))}
					{moreConsoleOptions.length > 0 && (
						<details style={{ position: 'relative' }}>
							<summary
								className={`${filterChipBase} ${filterChipInactive}`}
								style={{ listStyle: 'none' }}
							>
								More…
							</summary>
							<Card
								style={{
									position: 'absolute',
									top: '100%',
									left: 0,
									marginTop: '4px',
									zIndex: 20,
									minWidth: '220px',
									maxHeight: '280px',
									overflowY: 'auto',
								}}
							>
								<div
									className={css({
										p: '2',
										display: 'flex',
										flexDir: 'column',
										gap: '1',
									})}
								>
									{moreConsoleOptions.map((row) => (
										<Link
											key={row.id}
											to="/inventory"
											search={{ console: row.id, ...soldSearchFragment }}
											className={css({
												display: 'block',
												px: '3',
												py: '2',
												borderRadius: 'btn',
												fontSize: 'sm',
												color: 'foregroundMuted',
												textDecoration: 'none',
												_hover: { bg: 'navHover', color: 'foreground' },
											})}
										>
											{row.label}
										</Link>
									))}
								</div>
							</Card>
						</details>
					)}
				</div>
			</div>

			{isLoading && <p className={stateTextClass}>Loading editions…</p>}

			{isError && (
				<div className={errorCardClass}>
					<p className={errorTitleClass}>Could not load games.</p>
					<p className={errorTextClass}>
						{error instanceof Error ? error.message : 'Unknown error'}
					</p>
					<Button
						variant="secondary"
						size="sm"
						onClick={() => {
							void refetch();
						}}
					>
						Retry
					</Button>
				</div>
			)}

			{data && data.length === 0 && !isLoading && (
				<div className={emptyClass}>
					<p className={emptyTitleClass}>No games yet.</p>
					<p className={css({ mb: '4', fontSize: 'sm' })}>
						Add a UPC to start tracking copies and market data.
					</p>
					<Link
						to="/inventory/add"
						className={buttonVariants({ variant: 'primary', size: 'md' })}
					>
						Add a game
					</Link>
				</div>
			)}

			{data &&
				data.length > 0 &&
				editionsAfterSoldFilter.length === 0 &&
				!includeSold && (
					<div className={emptyClass}>
						<p className={emptyTitleClass}>No active inventory on this view.</p>
						<p className={css({ fontSize: 'sm', mb: '3' })}>
							All matching games are sold out. Turn on{' '}
							<strong>Include sold</strong> to list those titles.
						</p>
					</div>
				)}

			{data &&
				data.length > 0 &&
				editionsAfterSoldFilter.length > 0 &&
				filteredEditions.length === 0 && (
					<div className={emptyClass}>
						<p className={emptyTitleClass}>No titles match your search.</p>
						<p className={css({ fontSize: 'sm' })}>
							Try a different phrase or clear the search box.
						</p>
					</div>
				)}

			{data && data.length > 0 && filteredEditions.length > 0 && (
				<InventoryEditionList editions={filteredEditions} />
			)}
		</div>
	);
}

function FilterChip({
	label,
	to,
	search,
	active,
}: {
	label: string;
	to: '/inventory';
	search?: InventoryListSearch;
	active: boolean;
}) {
	return (
		<Link
			to={to}
			{...(search !== undefined ? { search } : {})}
			className={`${filterChipBase} ${active ? filterChipActive : filterChipInactive}`}
		>
			{label}
		</Link>
	);
}
