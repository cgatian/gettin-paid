import type {
	BulkRefreshMarketResultDto,
	GameEditionDto,
} from "@gettin-paid/shared";
import {
	labelPriceChartingConsole,
	POPULAR_PRICECHARTING_CONSOLE_IDS,
} from "@gettin-paid/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { css, cx } from "styled-system/css";
import { Badge } from "#/components/ui/Badge";
import { Button, buttonVariants } from "#/components/ui/Button";
import { Card } from "#/components/ui/Card";
import { apiFetch } from "#/lib/api";
import { formatMoneyAmount, formatPcCents } from "#/lib/money";

const popularSet = new Set(POPULAR_PRICECHARTING_CONSOLE_IDS);

const chipConsoleIds = POPULAR_PRICECHARTING_CONSOLE_IDS.slice(0, 10);

export const Route = createFileRoute("/inventory/")({
	component: InventoryList,
	validateSearch: (search: Record<string, unknown>) => {
		const c = search.console;
		if (typeof c === "string" && c.trim()) return { console: c.trim() };
		return {};
	},
});

function editionConsoleLabel(
	e: Pick<
		GameEditionDto,
		"priceChartingConsoleId" | "priceChartingConsoleName"
	>,
) {
	return (
		e.priceChartingConsoleName ??
		labelPriceChartingConsole(e.priceChartingConsoleId)
	);
}

function classificationLabel(c: string) {
	return c.replace(/_/g, " ");
}

const pageClass = css({ p: "6" });

const pageHeaderClass = css({
	display: "flex",
	flexDir: { base: "column", md: "row" },
	alignItems: { base: "stretch", md: "center" },
	justifyContent: { base: "flex-start", md: "space-between" },
	mb: "6",
	gap: "4",
});

const pageTitleClass = css({
	fontSize: "2xl",
	fontWeight: "normal",
	color: "foreground",
	margin: "0",
	letterSpacing: "-0.01em",
});

const filtersRowClass = css({
	display: "flex",
	alignItems: "center",
	gap: "2",
	mb: "6",
	flexWrap: "wrap",
});

const filterLabelClass = css({
	fontSize: "sm",
	color: "foregroundMuted",
	mr: "1",
});

const filterChipBase = css({
	display: "inline-flex",
	alignItems: "center",
	px: "3",
	py: "1",
	borderRadius: "full",
	fontSize: "sm",
	borderWidth: "1px",
	borderStyle: "solid",
	cursor: "pointer",
	textDecoration: "none",
	transition:
		"background-color 120ms ease, border-color 120ms ease, color 120ms ease",
});

const filterChipActive = css({
	bg: "navActive",
	borderColor: "borderSubtle",
	color: "foreground",
	fontWeight: "medium",
});

const filterChipInactive = css({
	bg: "transparent",
	borderColor: "transparent",
	color: "foregroundMuted",
	_hover: { bg: "navHover", color: "foreground", borderColor: "border" },
});

const listClass = css({
	listStyle: "none",
	padding: "0",
	margin: "0",
	display: "flex",
	flexDir: "column",
	gap: "2",
});

/** Matches each edition row grid: title block | FMV | Proposed | actions */
const listColumnHeaderClass = css({
	display: { base: "none", md: "grid" },
	gridTemplateColumns: "minmax(0,1fr) auto auto minmax(min-content,max-content)",
	columnGap: "4",
	alignItems: "baseline",
	px: "4",
	pb: "2",
	mb: "1",
	fontSize: "xs",
	fontWeight: "medium",
	color: "foregroundMuted",
	textTransform: "uppercase",
	letterSpacing: "0.06em",
});

const editionCardClass = css({
	display: "flex",
	flexDir: "column",
	gap: "3",
	p: "4",
	textDecoration: "none",
	borderRadius: "card",
	bg: "surface",
	borderWidth: "1px",
	borderStyle: "solid",
	borderColor: "border",
	transition: "border-color 120ms ease, background-color 120ms ease",
	_hover: { borderColor: "borderSubtle", bg: "rgba(255,255,255,0.03)" },
	md: {
		display: "grid",
		columnGap: "4",
		rowGap: "2",
		alignItems: "center",
		gridTemplateColumns:
			"minmax(0,1fr) auto auto minmax(min-content,max-content)",
	},
});

const editionTitleBlockClass = css({
	minWidth: "0",
	md: {
		gridColumn: "1",
		gridRow: "1 / 3",
	},
});

const editionTitleClass = css({
	fontSize: "base",
	fontWeight: "medium",
	color: "foreground",
	margin: "0 0 4px 0",
});

const editionMetaClass = css({
	fontSize: "sm",
	color: "foregroundMuted",
	margin: "0",
});

const editionClassificationClass = css({
	fontSize: "sm",
	color: "foregroundMuted",
	minWidth: "0",
});

const editionMetricClass = css({
	fontSize: "sm",
	fontVariantNumeric: "tabular-nums",
	color: "foreground",
	textAlign: "right",
	whiteSpace: "nowrap",
});

const editionMetricMutedClass = css({
	fontSize: "sm",
	fontVariantNumeric: "tabular-nums",
	color: "foregroundMuted",
	textAlign: "right",
	whiteSpace: "nowrap",
});

const editionActionsClass = css({
	display: "flex",
	alignItems: "center",
	gap: "3",
	alignSelf: "flex-end",
	justifyContent: "flex-end",
	md: {
		gridColumn: "4",
		alignSelf: "center",
		justifySelf: "end",
	},
});

const arrowClass = css({
	fontSize: "sm",
	color: "foregroundMuted",
	flexShrink: "0",
});

const emptyClass = css({
	textAlign: "center",
	py: "16",
	color: "foregroundMuted",
});

const emptyTitleClass = css({
	fontSize: "md",
	color: "foreground",
	mb: "2",
});

const stateTextClass = css({
	color: "foregroundMuted",
	fontSize: "sm",
	py: "4",
});

const errorCardClass = css({
	bg: "rgba(192,57,43,0.08)",
	borderWidth: "1px",
	borderStyle: "solid",
	borderColor: "rgba(192,57,43,0.2)",
	borderRadius: "card",
	p: "4",
	mb: "4",
});

const errorTitleClass = css({
	fontSize: "base",
	fontWeight: "semibold",
	color: "danger",
	mb: "1",
});

const errorTextClass = css({
	fontSize: "sm",
	color: "foregroundMuted",
	mb: "3",
});

function InventoryList() {
	const queryClient = useQueryClient();
	const { console: consoleFilter } = Route.useSearch();
	const [bulkResult, setBulkResult] = useState<BulkRefreshMarketResultDto | null>(
		null,
	);
	const [bulkProgress, setBulkProgress] = useState<{
		current: number;
		total: number;
	} | null>(null);
	const platformsQuery = useQuery({
		queryKey: ["platforms"],
		queryFn: () => apiFetch<{ id: string; name: string }[]>("/platforms"),
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

	const { data, isLoading, isError, error, refetch } = useQuery({
		queryKey: ["editions", consoleFilter ?? "all"],
		queryFn: () => {
			const q = consoleFilter
				? `?console=${encodeURIComponent(consoleFilter)}`
				: "";
			return apiFetch<GameEditionDto[]>(`/editions${q}`);
		},
	});

	const bulkRefresh = useMutation({
		mutationFn: async (editions: GameEditionDto[]) => {
			const total = editions.length;
			if (total === 0) {
				return {
					total: 0,
					ok: 0,
					failed: 0,
					failures: [],
				} satisfies BulkRefreshMarketResultDto;
			}
			const failures: BulkRefreshMarketResultDto["failures"] = [];
			let ok = 0;
			for (let i = 0; i < editions.length; i++) {
				const e = editions[i];
				setBulkProgress({ current: i + 1, total });
				try {
					await apiFetch(`/editions/${e.id}/refresh-market`, {
						method: "POST",
					});
					ok++;
				} catch (err) {
					failures.push({
						editionId: e.id,
						title: e.title,
						upc: e.upc,
						message: err instanceof Error ? err.message : String(err),
					});
				}
			}
			return {
				total,
				ok,
				failed: failures.length,
				failures,
			} satisfies BulkRefreshMarketResultDto;
		},
		onSuccess: (r) => {
			setBulkResult(r);
			void queryClient.invalidateQueries({ queryKey: ["editions"] });
			void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
		},
		onSettled: () => {
			setBulkProgress(null);
		},
	});

	return (
		<div className={pageClass}>
			<div className={pageHeaderClass}>
				<h1 className={pageTitleClass}>Inventory</h1>
				<div
					className={css({
						display: "flex",
						flexWrap: "wrap",
						gap: "2",
						alignItems: "center",
					})}
				>
					<Button
						type="button"
						variant="secondary"
						size="sm"
						disabled={
							bulkRefresh.isPending || !data?.length || isLoading || isError
						}
						onClick={() => {
							if (!data?.length || bulkRefresh.isPending) return;
							setBulkResult(null);
							bulkRefresh.mutate(data);
						}}
					>
						{bulkRefresh.isPending && bulkProgress
							? `Refreshing… ${bulkProgress.current}/${bulkProgress.total}`
							: bulkRefresh.isPending
								? "Refreshing…"
								: "Refresh all prices"}
					</Button>
					<Link
						to="/inventory/add"
						className={buttonVariants({ variant: "primary", size: "sm" })}
					>
						+ New
					</Link>
				</div>
			</div>

			{bulkRefresh.isPending && bulkProgress && (
				<p
					className={css({
						fontSize: "sm",
						color: "foregroundMuted",
						mb: "4",
						mt: "-2",
					})}
				>
					Refreshing market prices… {bulkProgress.current}/
					{bulkProgress.total}
				</p>
			)}

			<div className={filtersRowClass}>
				<span className={filterLabelClass}>Console:</span>
				<FilterChip
					label="All"
					to="/inventory"
					search={{}}
					active={!consoleFilter}
				/>
				{chipConsoleIds.map((id) => (
					<FilterChip
						key={id}
						label={chipLabel(id)}
						to="/inventory"
						search={{ console: id }}
						active={consoleFilter === id}
					/>
				))}
				{moreConsoleOptions.length > 0 && (
					<details style={{ position: "relative" }}>
						<summary
							className={`${filterChipBase} ${filterChipInactive}`}
							style={{ listStyle: "none" }}
						>
							More…
						</summary>
						<Card
							style={{
								position: "absolute",
								top: "100%",
								left: 0,
								marginTop: "4px",
								zIndex: 20,
								minWidth: "220px",
								maxHeight: "280px",
								overflowY: "auto",
							}}
						>
							<div
								className={css({
									p: "2",
									display: "flex",
									flexDir: "column",
									gap: "1",
								})}
							>
								{moreConsoleOptions.map((row) => (
									<Link
										key={row.id}
										to="/inventory"
										search={{ console: row.id }}
										className={css({
											display: "block",
											px: "3",
											py: "2",
											borderRadius: "btn",
											fontSize: "sm",
											color: "foregroundMuted",
											textDecoration: "none",
											_hover: { bg: "navHover", color: "foreground" },
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

			{bulkRefresh.isError && (
				<div className={errorCardClass}>
					<p className={errorTitleClass}>Bulk refresh failed.</p>
					<p className={errorTextClass}>
						{bulkRefresh.error instanceof Error
							? bulkRefresh.error.message
							: "Unknown error"}
					</p>
				</div>
			)}

			{bulkResult && !bulkRefresh.isPending && (
				<div
					className={css({
						mb: "4",
						p: "4",
						borderRadius: "card",
						bg: "surface",
						borderWidth: "1px",
						borderStyle: "solid",
						borderColor: "border",
						fontSize: "sm",
					})}
				>
					<p className={css({ margin: "0 0 8px 0", color: "foreground" })}>
						Market snapshots updated: {bulkResult.ok} of {bulkResult.total}{" "}
						succeeded
						{bulkResult.failed > 0
							? ` (${bulkResult.failed} could not be refreshed)`
							: ""}
						{consoleFilter ? (
							<span className={css({ color: "foregroundMuted" })}>
								{" "}
								(filtered by console)
							</span>
						) : null}
						.
					</p>
					{bulkResult.failures.length > 0 && (
						<ul
							className={css({
								margin: "0",
								paddingLeft: "1.25rem",
								color: "foregroundMuted",
							})}
						>
							{bulkResult.failures.slice(0, 8).map(
								(f: BulkRefreshMarketResultDto["failures"][number]) => (
									<li key={f.editionId}>
										{f.title} (UPC {f.upc}): {f.message}
									</li>
								)
							)}
							{bulkResult.failures.length > 8 && (
								<li>
									… and {bulkResult.failures.length - 8} more; open each edition
									to retry individually.
								</li>
							)}
						</ul>
					)}
				</div>
			)}

			{isLoading && <p className={stateTextClass}>Loading editions…</p>}

			{isError && (
				<div className={errorCardClass}>
					<p className={errorTitleClass}>Could not load inventory.</p>
					<p className={errorTextClass}>
						{error instanceof Error ? error.message : "Unknown error"}
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
					<p className={css({ mb: "4", fontSize: "sm" })}>
						Add a UPC to start tracking copies and market data.
					</p>
					<Link
						to="/inventory/add"
						className={buttonVariants({ variant: "primary", size: "md" })}
					>
						Add a game
					</Link>
				</div>
			)}

			{data && data.length > 0 && (
				<>
					{data.some((e) => (e.activeCopies?.length ?? 0) > 0) && (
						<div className={listColumnHeaderClass} aria-hidden="true">
							<span style={{ gridColumn: 1 }} />
							<span style={{ gridColumn: 2, textAlign: "right" }}>FMV</span>
							<span style={{ gridColumn: 3, textAlign: "right" }}>Proposed</span>
							<span style={{ gridColumn: 4 }} />
						</div>
					)}
					<ul className={listClass}>
						{data.map((e) => {
							const copies = e.activeCopies ?? [];
							const n = copies.length;
							return (
								<li key={e.id}>
									<Link
										to="/inventory/$editionId"
										params={{ editionId: e.id }}
										className={editionCardClass}
									>
										<div className={editionTitleBlockClass}>
											<p className={editionTitleClass}>{e.title}</p>
											<p className={editionMetaClass}>
												{editionConsoleLabel(e)}
												{e.copyCount != null && e.copyCount > 0
													? ` · ${e.copyCount} ${e.copyCount === 1 ? "copy" : "copies"}`
													: ""}
											</p>
										</div>
										{copies.map((row, i) => (
											<div
												key={row.id}
												className={css({
													display: { base: "grid", md: "contents" },
													gridTemplateColumns: {
														base: "minmax(0,1fr) auto auto",
														md: undefined,
													},
													columnGap: "3",
													alignItems: "baseline",
													borderTopWidth: { base: "1px", md: "0" },
													borderTopStyle: "solid",
													borderTopColor: "borderSubtle",
													pt: { base: "3", md: "0" },
												})}
											>
												<span
													className={cx(
														editionClassificationClass,
														css({
															md: {
																gridColumn: "1",
																gridRow: `${3 + i} / ${4 + i}`,
															},
														}),
													)}
												>
													{classificationLabel(row.copyClassification)}
												</span>
												<span
													className={cx(
														editionMetricClass,
														css({
															md: {
																gridColumn: "2",
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
																gridColumn: "3",
																gridRow: `${3 + i} / ${4 + i}`,
															},
														}),
													)}
												>
													{row.offerAmount != null
														? formatMoneyAmount(
																row.offerAmount,
																row.offerCurrency,
															)
														: "—"}
												</span>
											</div>
										))}
										<div
											className={cx(
												editionActionsClass,
												css({
													md: {
														gridRow: n > 0 ? `1 / ${3 + n}` : "1 / 3",
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
	to: "/inventory";
	search?: { console?: string };
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
