import type {
	BulkImportResultDto,
	BulkRefreshMarketResultDto,
	FetchAllCoversResultDto,
	FetchEditionCoverResponseDto,
	GameEditionDto,
} from "@gettin-paid/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { css } from "styled-system/css";
import { Button } from "#/components/ui/Button";
import { Card, cardBody, cardHeader } from "#/components/ui/Card";
import { apiFetch, apiFetchBlob, apiFetchPost } from "#/lib/api";

export const Route = createFileRoute("/settings")({ component: Settings });

/** Match backend COVER_SCRAPE_MIN_INTERVAL_MS — pause between cover scrapes to avoid PriceCharting 403s. */
const COVER_FETCH_THROTTLE_MS = 2000;

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Only editions missing a cover and linked to PriceCharting are fetched; others are counted, not requested. */
function editionsNeedingCoverFetch(all: GameEditionDto[]) {
	const skippedHadCover: GameEditionDto[] = [];
	const missingPriceChartingId: GameEditionDto[] = [];
	const toFetch: GameEditionDto[] = [];
	for (const e of all) {
		if (e.hasCover) {
			skippedHadCover.push(e);
			continue;
		}
		if (!e.priceChartingProductId?.trim()) {
			missingPriceChartingId.push(e);
			continue;
		}
		toFetch.push(e);
	}
	return { skippedHadCover, missingPriceChartingId, toFetch };
}

const pageClass = css({ p: "6", maxWidth: "700px" });

const pageTitleClass = css({
	fontSize: "2xl",
	fontWeight: "normal",
	color: "foreground",
	mb: "5",
	letterSpacing: "-0.01em",
});

const cardTitleClass = css({
	fontSize: "base",
	fontWeight: "medium",
	color: "foreground",
	margin: "0",
});

const descriptionClass = css({
	fontSize: "sm",
	color: "foregroundMuted",
	margin: "0 0 16px 0",
	lineHeight: "1.6",
});

const resultBoxClass = css({
	mt: "3",
	p: "3",
	borderRadius: "card",
	bg: "background",
	borderWidth: "1px",
	borderStyle: "solid",
	borderColor: "border",
	fontSize: "sm",
});

const errorBoxClass = css({
	mt: "3",
	p: "3",
	borderRadius: "card",
	bg: "rgba(192,57,43,0.08)",
	borderWidth: "1px",
	borderStyle: "solid",
	borderColor: "rgba(192,57,43,0.2)",
	fontSize: "sm",
	color: "danger",
});

function Settings() {
	const queryClient = useQueryClient();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [exportLoading, setExportLoading] = useState(false);
	const [importResult, setImportResult] = useState<BulkImportResultDto | null>(
		null,
	);
	const [importError, setImportError] = useState<string | null>(null);
	const [bulkResult, setBulkResult] =
		useState<BulkRefreshMarketResultDto | null>(null);
	const [coversBulkResult, setCoversBulkResult] =
		useState<FetchAllCoversResultDto | null>(null);
	const [bulkProgress, setBulkProgress] = useState<{
		current: number;
		total: number;
	} | null>(null);
	const [coversProgress, setCoversProgress] = useState<{
		current: number;
		total: number;
	} | null>(null);

	const editionsQuery = useQuery({
		queryKey: ["editions", "all"],
		queryFn: () => apiFetch<GameEditionDto[]>(`/editions`),
	});

	const fetchAllCovers = useMutation({
		mutationFn: async (editions: GameEditionDto[]) => {
			const total = editions.length;
			if (total === 0) {
				return {
					total: 0,
					ok: 0,
					skipped: 0,
					failed: 0,
					failures: [],
				} satisfies FetchAllCoversResultDto;
			}
			const { skippedHadCover, missingPriceChartingId, toFetch } =
				editionsNeedingCoverFetch(editions);
			const failures: FetchAllCoversResultDto["failures"] =
				missingPriceChartingId.map((e) => ({
					editionId: e.id,
					title: e.title,
					upc: e.upc,
					message: "No PriceCharting product id",
				}));
			let ok = 0;
			let skipped = skippedHadCover.length;

			if (toFetch.length === 0) {
				return {
					total,
					ok: 0,
					skipped,
					failed: failures.length,
					failures,
				} satisfies FetchAllCoversResultDto;
			}

			const fetchTotal = toFetch.length;
			for (let i = 0; i < toFetch.length; i++) {
				if (i > 0) await sleep(COVER_FETCH_THROTTLE_MS);
				const e = toFetch[i];
				setCoversProgress({ current: i + 1, total: fetchTotal });
				try {
					const res = await apiFetchPost<FetchEditionCoverResponseDto>(
						`/editions/${e.id}/fetch-cover`,
					);
					if (res.coverAlreadyStored) skipped++;
					else ok++;
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
				skipped,
				failed: failures.length,
				failures,
			} satisfies FetchAllCoversResultDto;
		},
		onSuccess: (r) => {
			setCoversBulkResult(r);
			void queryClient.invalidateQueries({ queryKey: ["editions"] });
			void queryClient.invalidateQueries({ queryKey: ["edition"] });
		},
		onSettled: () => {
			setCoversProgress(null);
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

	const editions = editionsQuery.data;
	const editionsBusy =
		editionsQuery.isLoading || editionsQuery.isError || !editions?.length;

	async function handleExport() {
		setExportLoading(true);
		try {
			const blob = await apiFetchBlob("/export");
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = "inventory.csv";
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		} catch (err) {
			console.error("Export failed", err);
		} finally {
			setExportLoading(false);
		}
	}

	const importMutation = useMutation({
		mutationFn: async (file: File) => {
			const csv = await file.text();
			return apiFetch<BulkImportResultDto>("/import", {
				method: "POST",
				body: JSON.stringify({ csv }),
			});
		},
		onSuccess: (result) => {
			setImportResult(result);
			setImportError(null);
			void queryClient.invalidateQueries({ queryKey: ["editions"] });
			void queryClient.invalidateQueries({ queryKey: ["edition"] });
			void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
		},
		onError: (err) => {
			setImportError(err instanceof Error ? err.message : "Import failed");
			setImportResult(null);
		},
	});

	function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;
		setImportResult(null);
		setImportError(null);
		importMutation.mutate(file);
		e.target.value = "";
	}

	return (
		<div className={pageClass}>
			<h1 className={pageTitleClass}>Settings</h1>

			<Card>
				<div className={cardHeader}>
					<h2 className={cardTitleClass}>Export</h2>
				</div>
				<div className={cardBody}>
					<p className={descriptionClass}>
						Download all owned copies as a CSV file. Each row includes the copy
						ID, edition info, condition, and all pricing fields. Open it in any
						spreadsheet app to review or edit, then reimport below.
					</p>
					<Button
						type="button"
						variant="secondary"
						size="sm"
						disabled={exportLoading}
						onClick={() => void handleExport()}
					>
						{exportLoading ? "Exporting…" : "Export CSV"}
					</Button>
				</div>
			</Card>

			<div className={css({ h: "3" })} />

			<Card>
				<div className={cardHeader}>
					<h2 className={cardTitleClass}>Import</h2>
				</div>
				<div className={cardBody}>
					<p className={descriptionClass}>
						Upload a CSV previously exported from this app. Each row is matched
						by <code>copy_id</code> and its editable fields are updated.
						Read-only columns (title, console, UPC) are ignored.
					</p>
					<input
						ref={fileInputRef}
						type="file"
						accept=".csv,text/csv"
						style={{ display: "none" }}
						onChange={handleFileChange}
					/>
					<Button
						type="button"
						variant="secondary"
						size="sm"
						disabled={importMutation.isPending}
						onClick={() => fileInputRef.current?.click()}
					>
						{importMutation.isPending ? "Importing…" : "Import CSV"}
					</Button>

					{importError && <div className={errorBoxClass}>{importError}</div>}

					{importResult && !importMutation.isPending && (
						<div className={resultBoxClass}>
							<p
								className={css({
									margin: "0 0 6px 0",
									color: "foreground",
								})}
							>
								{importResult.updated} of {importResult.total}{" "}
								{importResult.total === 1 ? "copy" : "copies"} updated
								{importResult.failed > 0
									? ` — ${importResult.failed} failed`
									: ""}
								.
							</p>
							{importResult.failures.length > 0 && (
								<ul
									className={css({
										margin: "0",
										paddingLeft: "1.25rem",
										color: "foregroundMuted",
									})}
								>
									{importResult.failures
										.slice(0, 8)
										.map((f: BulkImportResultDto["failures"][number]) => (
											<li key={`${f.rowNumber}-${f.copyId}`}>
												Row {f.rowNumber}
												{f.copyId ? ` (${f.copyId.slice(0, 8)}…)` : ""}:{" "}
												{f.message}
											</li>
										))}
									{importResult.failures.length > 8 && (
										<li>… and {importResult.failures.length - 8} more</li>
									)}
								</ul>
							)}
						</div>
					)}
				</div>
			</Card>

			<div className={css({ h: "3" })} />

			<Card>
				<div className={cardHeader}>
					<h2 className={cardTitleClass}>Market data & covers</h2>
				</div>
				<div className={cardBody}>
					<p className={descriptionClass}>
						Refresh PriceCharting market snapshots for every edition, or
						download missing cover images. These jobs run across your full
						inventory (not only the list view).
					</p>
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
								bulkRefresh.isPending ||
								fetchAllCovers.isPending ||
								editionsBusy
							}
							onClick={() => {
								if (!editions?.length || bulkRefresh.isPending) return;
								setBulkResult(null);
								bulkRefresh.mutate(editions);
							}}
						>
							{bulkRefresh.isPending && bulkProgress
								? `Refreshing… ${bulkProgress.current}/${bulkProgress.total}`
								: bulkRefresh.isPending
									? "Refreshing…"
									: "Refresh all prices"}
						</Button>
						<Button
							type="button"
							variant="secondary"
							size="sm"
							disabled={
								fetchAllCovers.isPending ||
								bulkRefresh.isPending ||
								editionsBusy
							}
							onClick={() => {
								if (!editions?.length || fetchAllCovers.isPending) return;
								setCoversBulkResult(null);
								fetchAllCovers.mutate(editions);
							}}
						>
							{fetchAllCovers.isPending && coversProgress
								? `Fetching covers… ${coversProgress.current}/${coversProgress.total}`
								: fetchAllCovers.isPending
									? "Fetching covers…"
									: "Fetch all covers"}
						</Button>
					</div>

					{bulkRefresh.isPending && bulkProgress && (
						<p
							className={css({
								fontSize: "sm",
								color: "foregroundMuted",
								mt: "3",
								mb: "0",
							})}
						>
							Refreshing market prices… {bulkProgress.current}/
							{bulkProgress.total}
						</p>
					)}

					{fetchAllCovers.isPending && coversProgress && (
						<p
							className={css({
								fontSize: "sm",
								color: "foregroundMuted",
								mt: "3",
								mb: "0",
							})}
						>
							Fetching covers… {coversProgress.current}/{coversProgress.total}
						</p>
					)}

					{bulkRefresh.isError && (
						<div className={errorBoxClass}>
							<p
								className={css({
									margin: "0 0 6px 0",
									fontWeight: "semibold",
								})}
							>
								Bulk refresh failed.
							</p>
							<p className={css({ margin: "0", color: "foregroundMuted" })}>
								{bulkRefresh.error instanceof Error
									? bulkRefresh.error.message
									: "Unknown error"}
							</p>
						</div>
					)}

					{fetchAllCovers.isError && (
						<div className={errorBoxClass}>
							<p
								className={css({
									margin: "0 0 6px 0",
									fontWeight: "semibold",
								})}
							>
								Fetch all covers failed.
							</p>
							<p className={css({ margin: "0", color: "foregroundMuted" })}>
								{fetchAllCovers.error instanceof Error
									? fetchAllCovers.error.message
									: "Unknown error"}
							</p>
						</div>
					)}

					{bulkResult && !bulkRefresh.isPending && (
						<div className={resultBoxClass}>
							<p
								className={css({
									margin: "0 0 6px 0",
									color: "foreground",
								})}
							>
								Market snapshots updated: {bulkResult.ok} of {bulkResult.total}{" "}
								succeeded
								{bulkResult.failed > 0
									? ` (${bulkResult.failed} could not be refreshed)`
									: ""}
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
									{bulkResult.failures
										.slice(0, 8)
										.map(
											(f: BulkRefreshMarketResultDto["failures"][number]) => (
												<li key={f.editionId}>
													{f.title} (UPC {f.upc}): {f.message}
												</li>
											),
										)}
									{bulkResult.failures.length > 8 && (
										<li>
											… and {bulkResult.failures.length - 8} more; open each
											edition to retry individually.
										</li>
									)}
								</ul>
							)}
						</div>
					)}

					{coversBulkResult && !fetchAllCovers.isPending && (
						<div className={resultBoxClass}>
							<p
								className={css({
									margin: "0 0 6px 0",
									color: "foreground",
								})}
							>
								Covers: {coversBulkResult.ok} fetched,{" "}
								{coversBulkResult.skipped} skipped (already had cover)
								{coversBulkResult.failed > 0
									? `, ${coversBulkResult.failed} failed`
									: ""}{" "}
								out of {coversBulkResult.total}.
							</p>
							{coversBulkResult.failures.length > 0 && (
								<ul
									className={css({
										margin: "0",
										paddingLeft: "1.25rem",
										color: "foregroundMuted",
									})}
								>
									{coversBulkResult.failures.slice(0, 8).map((f) => (
										<li key={f.editionId}>
											{f.title} (UPC {f.upc}): {f.message}
										</li>
									))}
									{coversBulkResult.failures.length > 8 && (
										<li>… and {coversBulkResult.failures.length - 8} more</li>
									)}
								</ul>
							)}
						</div>
					)}
				</div>
			</Card>
		</div>
	);
}
