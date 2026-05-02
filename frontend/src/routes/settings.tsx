import type { BulkImportResultDto } from "@gettin-paid/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { css } from "styled-system/css";
import { Button } from "#/components/ui/Button";
import { Card, cardBody, cardHeader } from "#/components/ui/Card";
import { apiFetch, apiFetchBlob } from "#/lib/api";

export const Route = createFileRoute("/settings")({ component: Settings });

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
	const [importResult, setImportResult] = useState<BulkImportResultDto | null>(null);
	const [importError, setImportError] = useState<string | null>(null);

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

					{importError && (
						<div className={errorBoxClass}>{importError}</div>
					)}

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
										.map(
											(
												f: BulkImportResultDto["failures"][number],
											) => (
												<li key={`${f.rowNumber}-${f.copyId}`}>
													Row {f.rowNumber}
													{f.copyId
														? ` (${f.copyId.slice(0, 8)}…)`
														: ""}
													: {f.message}
												</li>
											),
										)}
									{importResult.failures.length > 8 && (
										<li>
											… and {importResult.failures.length - 8} more
										</li>
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
