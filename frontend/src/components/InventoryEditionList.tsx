import type {
	EditionListActiveCopyDto,
	GameCollectionSummaryDto,
	GameEditionDto,
} from '@gettin-paid/shared';
import { labelPriceChartingConsole } from '@gettin-paid/shared';
import { Link } from '@tanstack/react-router';
import { css, cx } from 'styled-system/css';
import { CollectionBadge } from '#/components/CollectionBadge';
import { Badge } from '#/components/ui/Badge';
import { getApiBase } from '#/lib/api';
import { formatMoneyAmount, formatPcCents } from '#/lib/money';

function editionConsoleLabel(
	e: Pick<
		GameEditionDto,
		'priceChartingConsoleId' | 'priceChartingConsoleName'
	>,
) {
	return (
		e.priceChartingConsoleName ??
		labelPriceChartingConsole(e.priceChartingConsoleId)
	);
}

function classificationLabel(c: string) {
	return c.replace(/_/g, ' ');
}

/** Distinct collections assigned to any of the listed copy rows (stable order by title). */
function distinctCollectionsFromCopies(
	copies: EditionListActiveCopyDto[],
): GameCollectionSummaryDto[] {
	const byId = new Map<string, GameCollectionSummaryDto>();
	for (const row of copies) {
		if (row.collection) byId.set(row.collection.id, row.collection);
	}
	return [...byId.values()].sort((a, b) => a.title.localeCompare(b.title));
}

function editionCoverSrc(
	id: string,
	coverFetchedAt: string | null,
	hasCover: boolean,
): string | null {
	if (!hasCover || !coverFetchedAt) return null;
	const base = getApiBase().replace(/\/$/, '');
	const t = Date.parse(coverFetchedAt);
	if (!Number.isFinite(t)) return null;
	return `${base}/api/editions/${encodeURIComponent(id)}/cover?t=${t}`;
}

const listClass = css({
	listStyle: 'none',
	padding: '0',
	margin: '0',
	display: 'flex',
	flexDir: 'column',
	gap: '2',
});

const listColumnHeaderClass = css({
	display: { base: 'none', md: 'grid' },
	gridTemplateColumns:
		'minmax(0,1fr) auto auto minmax(min-content,max-content)',
	columnGap: '4',
	alignItems: 'baseline',
	px: '4',
	pb: '2',
	mb: '1',
	fontSize: 'xs',
	fontWeight: 'medium',
	color: 'foregroundMuted',
	textTransform: 'uppercase',
	letterSpacing: '0.06em',
});

const editionCardClass = css({
	display: 'flex',
	flexDir: 'column',
	gap: '3',
	p: '4',
	textDecoration: 'none',
	borderRadius: 'card',
	bg: 'surface',
	borderWidth: '1px',
	borderStyle: 'solid',
	borderColor: 'border',
	transition: 'border-color 120ms ease, background-color 120ms ease',
	_hover: { borderColor: 'borderSubtle', bg: 'rgba(255,255,255,0.03)' },
	md: {
		display: 'grid',
		columnGap: '4',
		rowGap: '2',
		alignItems: 'center',
		gridTemplateColumns:
			'minmax(0,1fr) auto auto minmax(min-content,max-content)',
	},
});

const editionTitleBlockClass = css({
	minWidth: '0',
	md: {
		gridColumn: '1',
		gridRow: '1 / 3',
	},
});

const editionTitleClass = css({
	fontSize: 'base',
	fontWeight: 'medium',
	color: 'foreground',
	margin: '0 0 4px 0',
});

const editionMetaClass = css({
	fontSize: 'sm',
	color: 'foregroundMuted',
	margin: '0',
});

const editionClassificationClass = css({
	fontSize: 'sm',
	color: 'foregroundMuted',
	minWidth: '0',
});

const editionMetricClass = css({
	fontSize: 'sm',
	fontVariantNumeric: 'tabular-nums',
	color: 'foreground',
	textAlign: 'right',
	whiteSpace: 'nowrap',
});

const editionMetricMutedClass = css({
	fontSize: 'sm',
	fontVariantNumeric: 'tabular-nums',
	color: 'foregroundMuted',
	textAlign: 'right',
	whiteSpace: 'nowrap',
});

const editionActionsClass = css({
	display: 'flex',
	alignItems: 'center',
	gap: '3',
	alignSelf: 'flex-end',
	justifyContent: 'flex-end',
	md: {
		gridColumn: '4',
		alignSelf: 'center',
		justifySelf: 'end',
	},
});

const arrowClass = css({
	fontSize: 'sm',
	color: 'foregroundMuted',
	flexShrink: '0',
});

const copyClassRowClass = css({
	display: 'flex',
	flexWrap: 'wrap',
	alignItems: 'center',
	gap: '2',
});

export type InventoryEditionListProps = {
	editions: GameEditionDto[];
	/** When set, game cards link to the collection-scoped edition view. */
	gameLinksCollectionId?: string;
};

export function InventoryEditionList({
	editions,
	gameLinksCollectionId,
}: InventoryEditionListProps) {
	if (editions.length === 0) return null;

	const showMetricHeader = editions.some(
		(e) => (e.activeCopies?.length ?? 0) > 0,
	);

	return (
		<>
			{showMetricHeader && (
				<div className={listColumnHeaderClass} aria-hidden="true">
					<span style={{ gridColumn: 1 }} />
					<span style={{ gridColumn: 2, textAlign: 'right' }}>FMV</span>
					<span style={{ gridColumn: 3, textAlign: 'right' }}>Proposed</span>
					<span style={{ gridColumn: 4 }} />
				</div>
			)}
			<ul className={listClass}>
				{editions.map((e) => {
					const copies = e.activeCopies ?? [];
					const n = copies.length;
					const editionCollections = distinctCollectionsFromCopies(copies);
					const thumbSrc = editionCoverSrc(
						e.id,
						e.coverFetchedAt ?? null,
						e.hasCover,
					);
					const gameLink =
						gameLinksCollectionId != null && gameLinksCollectionId !== ''
							? ({
									to: '/collections/$collectionId/gameEdition/$editionId',
									params: {
										collectionId: gameLinksCollectionId,
										editionId: e.id,
									},
								} as const)
							: ({
									to: '/inventory/$editionId',
									params: { editionId: e.id },
								} as const);

					return (
						<li key={e.id}>
							<Link {...gameLink} className={editionCardClass}>
								<div className={editionTitleBlockClass}>
									<div
										className={css({
											display: 'flex',
											alignItems: 'flex-start',
											gap: '3',
										})}
									>
										{thumbSrc ? (
											<img
												src={thumbSrc}
												alt=""
												className={css({
													width: '48px',
													height: '48px',
													objectFit: 'cover',
													borderRadius: 'btn',
													flexShrink: '0',
													borderWidth: '1px',
													borderStyle: 'solid',
													borderColor: 'border',
													bg: 'surface',
												})}
											/>
										) : null}
										<div className={css({ minWidth: '0', flex: '1' })}>
											<p className={editionTitleClass}>{e.title}</p>
											<p className={editionMetaClass}>
												{editionConsoleLabel(e)}
												{e.copyCount != null && e.copyCount > 0
													? ` · ${e.copyCount} ${e.copyCount === 1 ? 'copy' : 'copies'}`
													: ''}
											</p>
											{editionCollections.length > 0 ? (
												<div
													className={css({
														display: 'flex',
														flexWrap: 'wrap',
														alignItems: 'center',
														gap: '2',
														mt: '2',
													})}
													aria-label="Collections for this title"
												>
													<span
														className={css({
															fontSize: 'xs',
															color: 'foregroundMuted',
															fontWeight: 'medium',
															textTransform: 'uppercase',
															letterSpacing: '0.06em',
														})}
													>
														Collections
													</span>
													{editionCollections.map((col) => (
														<CollectionBadge key={col.id} collection={col} />
													))}
												</div>
											) : null}
										</div>
									</div>
								</div>
								{copies.map((row: EditionListActiveCopyDto, i: number) => (
									<div
										key={row.id}
										className={css({
											display: { base: 'grid', md: 'contents' },
											gridTemplateColumns: {
												base: 'minmax(0,1fr) auto auto',
												md: undefined,
											},
											columnGap: '3',
											alignItems: 'baseline',
											borderTopWidth: { base: '1px', md: '0' },
											borderTopStyle: 'solid',
											borderTopColor: 'borderSubtle',
											pt: { base: '3', md: '0' },
										})}
									>
										<div
											className={cx(
												editionClassificationClass,
												css({
													md: {
														gridColumn: '1',
														gridRow: `${3 + i} / ${4 + i}`,
													},
												}),
												copyClassRowClass,
											)}
										>
											<span>
												{classificationLabel(row.copyClassification)}
											</span>
											{row.collection ? (
												<CollectionBadge collection={row.collection} />
											) : null}
											{row.soldAt ? (
												<span
													className={css({
														fontSize: 'xs',
														color: 'foregroundMuted',
														fontWeight: 'medium',
													})}
												>
													Sold
												</span>
											) : null}
										</div>
										<span
											className={cx(
												editionMetricClass,
												css({
													md: {
														gridColumn: '2',
														gridRow: `${3 + i} / ${4 + i}`,
													},
												}),
											)}
										>
											{formatPcCents(row.fmvCents)}
										</span>
										<span
											className={cx(
												row.offerAmount != null
													? editionMetricClass
													: editionMetricMutedClass,
												css({
													md: {
														gridColumn: '3',
														gridRow: `${3 + i} / ${4 + i}`,
													},
												}),
											)}
										>
											{row.offerAmount != null
												? formatMoneyAmount(row.offerAmount)
												: '—'}
										</span>
									</div>
								))}
								<div
									className={cx(
										editionActionsClass,
										css({
											md: {
												gridRow: n > 0 ? `1 / ${3 + n}` : '1 / 3',
											},
										}),
									)}
								>
									{e.copyCount != null && e.copyCount > 0 && (
										<Badge variant="default">{e.copyCount}</Badge>
									)}
									<span className={arrowClass}>→</span>
								</div>
							</Link>
						</li>
					);
				})}
			</ul>
		</>
	);
}
