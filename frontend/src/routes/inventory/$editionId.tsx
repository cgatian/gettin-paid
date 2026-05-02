import {
	CopyClassification,
	type EditionDetailDto,
	labelPriceChartingConsole,
	type OwnedCopyDto,
} from "@gettin-paid/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { css, cx } from "styled-system/css";
import { Badge } from "#/components/ui/Badge";
import { Button } from "#/components/ui/Button";
import { Card, cardBody, cardHeader } from "#/components/ui/Card";
import { Label, Select } from "#/components/ui/Input";
import { apiFetch } from "#/lib/api";
import { formatPcCents } from "#/lib/money";

export const Route = createFileRoute("/inventory/$editionId")({
	component: EditionDetail,
});

const CLASSIFICATION_OPTIONS = Object.values(CopyClassification);

function editionConsoleBadge(
	e: Pick<
		EditionDetailDto,
		"priceChartingConsoleId" | "priceChartingConsoleName"
	>,
) {
	return (
		e.priceChartingConsoleName ??
		labelPriceChartingConsole(e.priceChartingConsoleId)
	);
}

const pageClass = css({ p: "6" });

const backLinkClass = css({
	display: "inline-flex",
	alignItems: "center",
	gap: "1",
	fontSize: "sm",
	color: "foregroundMuted",
	textDecoration: "none",
	mb: "5",
	_hover: { color: "foreground" },
	transition: "color 120ms ease",
});

const pageHeaderClass = css({ mb: "6" });

const pageTitleClass = css({
	fontSize: "2xl",
	fontWeight: "normal",
	color: "foreground",
	mb: "2",
	letterSpacing: "-0.01em",
});

const metaRowClass = css({
	display: "flex",
	alignItems: "center",
	gap: "2",
	flexWrap: "wrap",
});

const metaTextClass = css({
	fontSize: "sm",
	color: "foregroundMuted",
});

const gridClass = css({
	display: "grid",
	gridTemplateColumns: { base: "1fr", md: "1fr 1fr" },
	gap: "4",
	mb: "4",
});

const cardTitleClass = css({
	fontSize: "base",
	fontWeight: "medium",
	color: "foreground",
});

const emptyTextClass = css({
	fontSize: "sm",
	color: "foregroundMuted",
	margin: "0",
});

const dlClass = css({
	display: "grid",
	gridTemplateColumns: { base: "1fr", sm: "1fr 1fr" },
	gap: "2",
	margin: "0",
});

const dtClass = css({ fontSize: "sm", color: "foregroundMuted" });

const ddClass = css({
	fontSize: "sm",
	fontWeight: "medium",
	color: "accentGreen",
	margin: "0",
});

const fetchedAtClass = css({
	fontSize: "xs",
	color: "foregroundMuted",
	mb: "3",
});

const copyListClass = css({
	listStyle: "none",
	padding: "0",
	margin: "0 0 16px 0",
	display: "flex",
	flexDir: "column",
	gap: "2",
});

const copyItemClass = css({
	bg: "background",
	borderWidth: "1px",
	borderStyle: "solid",
	borderColor: "border",
	borderRadius: "btn",
	px: "3",
	py: "2",
	fontSize: "sm",
});

const copyClassClass = css({
	fontWeight: "medium",
	color: "foreground",
});

const copyMetaClass = css({
	fontSize: "xs",
	color: "foregroundMuted",
	mt: "1",
});

const addCopyFormClass = css({
	borderTopWidth: "1px",
	borderTopStyle: "solid",
	borderTopColor: "border",
	pt: "4",
	display: "flex",
	flexDir: "column",
	gap: "3",
});

const formRowClass = css({
	display: "flex",
	flexDir: { base: "column", sm: "row" },
	gap: "3",
	alignItems: { base: "stretch", sm: "flex-end" },
	flexWrap: "wrap",
});

const fieldClass = css({ flex: "1", minWidth: "120px" });

const errorClass = css({
	fontSize: "xs",
	color: "danger",
	mb: "2",
});

const errorBannerClass = css({
	bg: "rgba(192,57,43,0.08)",
	borderWidth: "1px",
	borderStyle: "solid",
	borderColor: "rgba(192,57,43,0.2)",
	borderRadius: "btn",
	px: "3",
	py: "2",
	fontSize: "sm",
	color: "danger",
	mb: "3",
});

const stateTextClass = css({
	color: "foregroundMuted",
	fontSize: "sm",
	p: "6",
});

function pad2(n: number) {
	return String(n).padStart(2, "0");
}

function toDatetimeLocalValue(d: Date) {
	return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function isoToDatetimeLocal(iso: string) {
	return toDatetimeLocalValue(new Date(iso));
}

const textInputClass = css({
	display: "block",
	width: "100%",
	borderWidth: "1px",
	borderStyle: "solid",
	borderColor: "border",
	bg: "background",
	color: "foreground",
	borderRadius: "btn",
	px: "3",
	py: "2",
	fontSize: "sm",
	outline: "none",
	fontFamily: "sans",
	_focus: { borderColor: "accent" },
	_placeholder: { color: "foregroundMuted" },
});

const overlayClass = css({
	position: "fixed",
	inset: 0,
	bg: "rgba(0,0,0,0.45)",
	zIndex: 100,
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	p: "4",
});

const modalPanelClass = css({
	bg: "surface",
	borderRadius: "card",
	borderWidth: "1px",
	borderStyle: "solid",
	borderColor: "border",
	maxWidth: "420px",
	width: "100%",
	p: "5",
	boxShadow: "md",
});

const modalTitleClass = css({
	fontSize: "lg",
	fontWeight: "medium",
	color: "foreground",
	mb: "4",
	mt: "0",
});

const modalActionsClass = css({
	display: "flex",
	flexDir: { base: "column-reverse", sm: "row" },
	gap: "3",
	justifyContent: { base: "stretch", sm: "flex-end" },
	mt: "5",
	pt: "1",
});

function EditionDetail() {
	const { editionId } = Route.useParams();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [copyError, setCopyError] = useState<string | null>(null);
	const [refreshError, setRefreshError] = useState<string | null>(null);
	const [deleteModalOpen, setDeleteModalOpen] = useState(false);
	const [deleteError, setDeleteError] = useState<string | null>(null);
	const [classification, setClassification] = useState<CopyClassification>(
		CopyClassification.CIB,
	);
	const [notes, setNotes] = useState("");
	const [sellCopyId, setSellCopyId] = useState<string | null>(null);
	const [sellAmount, setSellAmount] = useState("");
	const [sellCurrency, setSellCurrency] = useState("USD");
	const [sellDatetimeLocal, setSellDatetimeLocal] = useState(() =>
		toDatetimeLocalValue(new Date()),
	);
	const [sellError, setSellError] = useState<string | null>(null);

	const [editCopyId, setEditCopyId] = useState<string | null>(null);
	const [editClassification, setEditClassification] =
		useState<CopyClassification>(CopyClassification.CIB);
	const [editNotes, setEditNotes] = useState("");
	const [editOfferAmount, setEditOfferAmount] = useState("");
	const [editOfferCurrency, setEditOfferCurrency] = useState("USD");
	const [editCopyError, setEditCopyError] = useState<string | null>(null);

	const q = useQuery({
		queryKey: ["edition", editionId],
		queryFn: () => apiFetch<EditionDetailDto>(`/editions/${editionId}`),
	});

	const refresh = useMutation({
		mutationFn: () =>
			apiFetch<EditionDetailDto>(`/editions/${editionId}/refresh-market`, {
				method: "POST",
			}),
		onSuccess: (data) => {
			setRefreshError(null);
			queryClient.setQueryData(["edition", editionId], data);
			void queryClient.invalidateQueries({ queryKey: ["editions"] });
		},
		onError: (e) => {
			setRefreshError(e instanceof Error ? e.message : "Refresh failed");
		},
	});

	const addCopy = useMutation({
		mutationFn: () =>
			apiFetch<OwnedCopyDto>(`/editions/${editionId}/copies`, {
				method: "POST",
				body: JSON.stringify({
					copyClassification: classification,
					classificationNotes: notes.trim() || undefined,
				}),
			}),
		onSuccess: () => {
			setCopyError(null);
			setNotes("");
			void q.refetch();
			void queryClient.invalidateQueries({ queryKey: ["editions"] });
		},
		onError: (e) => {
			setCopyError(e instanceof Error ? e.message : "Could not add copy");
		},
	});

	function openSellModal(c: OwnedCopyDto) {
		setEditCopyId(null);
		setEditCopyError(null);
		setSellCopyId(c.id);
		setSellAmount(c.soldAmount ?? "");
		setSellCurrency((c.soldCurrency ?? "USD").trim().slice(0, 3) || "USD");
		setSellDatetimeLocal(
			c.soldAt
				? isoToDatetimeLocal(c.soldAt)
				: toDatetimeLocalValue(new Date()),
		);
		setSellError(null);
	}

	function closeSellModal() {
		setSellCopyId(null);
		setSellError(null);
	}

	function openEditCopyModal(c: OwnedCopyDto) {
		setSellCopyId(null);
		setSellError(null);
		setEditCopyId(c.id);
		setEditClassification(c.copyClassification);
		setEditNotes(c.classificationNotes ?? "");
		setEditOfferAmount(c.offerAmount ?? "");
		setEditOfferCurrency(
			(c.offerCurrency ?? "USD").trim().slice(0, 3) || "USD",
		);
		setEditCopyError(null);
	}

	function closeEditCopyModal() {
		setEditCopyId(null);
		setEditCopyError(null);
	}

	const updateCopyMeta = useMutation({
		mutationFn: async () => {
			const id = editCopyId;
			if (!id) throw new Error("No copy selected");
			const trimmedOffer = editOfferAmount.trim();
			const body: Record<string, unknown> = {
				copyClassification: editClassification,
				classificationNotes: editNotes.trim() || null,
			};
			if (trimmedOffer) {
				body.offerAmount = trimmedOffer;
				body.offerCurrency = editOfferCurrency.trim().slice(0, 3) || "USD";
			} else {
				body.offerAmount = null;
				body.offerCurrency = null;
			}
			return apiFetch<OwnedCopyDto>(`/copies/${id}`, {
				method: "PATCH",
				body: JSON.stringify(body),
			});
		},
		onSuccess: () => {
			closeEditCopyModal();
			void q.refetch();
			void queryClient.invalidateQueries({ queryKey: ["editions"] });
		},
		onError: (e) => {
			setEditCopyError(
				e instanceof Error ? e.message : "Could not update copy",
			);
		},
	});

	const markSold = useMutation({
		mutationFn: async () => {
			const id = sellCopyId;
			if (!id) throw new Error("No copy selected");
			const amt = sellAmount.trim();
			if (!amt) throw new Error("Enter the sale amount");
			let soldAtIso: string;
			try {
				soldAtIso = new Date(sellDatetimeLocal).toISOString();
			} catch {
				throw new Error("Invalid sale date");
			}
			return apiFetch<OwnedCopyDto>(`/copies/${id}`, {
				method: "PATCH",
				body: JSON.stringify({
					soldAmount: amt,
					soldCurrency: sellCurrency.trim() || "USD",
					soldAt: soldAtIso,
				}),
			});
		},
		onSuccess: () => {
			closeSellModal();
			void q.refetch();
			void queryClient.invalidateQueries({ queryKey: ["editions"] });
		},
		onError: (e) => {
			setSellError(e instanceof Error ? e.message : "Could not save sale");
		},
	});

	useEffect(() => {
		if (!sellCopyId) return;
		const onKey = (ev: KeyboardEvent) => {
			if (ev.key === "Escape") {
				setSellCopyId(null);
				setSellError(null);
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [sellCopyId]);

	useEffect(() => {
		if (!editCopyId) return;
		const onKey = (ev: KeyboardEvent) => {
			if (ev.key === "Escape" && !updateCopyMeta.isPending) {
				closeEditCopyModal();
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [editCopyId, updateCopyMeta.isPending]);

	const deleteGame = useMutation({
		mutationFn: () =>
			apiFetch<void>(`/editions/${editionId}`, { method: "DELETE" }),
		onSuccess: () => {
			setDeleteModalOpen(false);
			setDeleteError(null);
			void queryClient.removeQueries({ queryKey: ["edition", editionId] });
			void queryClient.invalidateQueries({ queryKey: ["editions"] });
			void navigate({ to: "/inventory" });
		},
		onError: (e) => {
			setDeleteError(e instanceof Error ? e.message : "Could not delete game");
		},
	});

	useEffect(() => {
		if (!deleteModalOpen) return;
		const onKey = (ev: KeyboardEvent) => {
			if (ev.key === "Escape" && !deleteGame.isPending) {
				setDeleteModalOpen(false);
				setDeleteError(null);
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [deleteModalOpen, deleteGame.isPending]);

	if (q.isLoading) {
		return <p className={stateTextClass}>Loading…</p>;
	}

	if (q.isError || !q.data) {
		return (
			<div className={pageClass}>
				<p className={css({ color: "danger", mb: "3" })}>
					{q.error instanceof Error ? q.error.message : "Edition not found"}
				</p>
				<Link to="/inventory" className={backLinkClass}>
					← Back to inventory
				</Link>
			</div>
		);
	}

	const e = q.data;
	const snap = e.snapshot;
	const sellingCopy =
		sellCopyId !== null ? e.copies.find((c) => c.id === sellCopyId) : undefined;
	const editingCopy =
		editCopyId !== null ? e.copies.find((c) => c.id === editCopyId) : undefined;

	return (
		<div className={pageClass}>
			<Link to="/inventory" className={backLinkClass}>
				← Inventory
			</Link>

			<div className={pageHeaderClass}>
				<div
					className={css({
						display: "flex",
						flexDir: { base: "column", sm: "row" },
						justifyContent: { base: "flex-start", sm: "space-between" },
						alignItems: { base: "flex-start", sm: "flex-start" },
						gap: "4",
						flexWrap: "wrap",
						mb: "2",
					})}
				>
					<h1 className={cx(pageTitleClass, css({ mb: "0" }))}>{e.title}</h1>
					<Button
						variant="danger"
						size="sm"
						onClick={() => {
							setDeleteModalOpen(true);
							setDeleteError(null);
						}}
					>
						Delete game
					</Button>
				</div>
				<div className={metaRowClass}>
					<Badge variant="default">{editionConsoleBadge(e)}</Badge>
					<span className={metaTextClass}>UPC {e.upc}</span>
					{e.publisher && (
						<span className={metaTextClass}>· {e.publisher}</span>
					)}
				</div>
			</div>

			<div className={gridClass}>
				{/* Market snapshot */}
				<Card>
					<div className={cardHeader}>
						<span className={cardTitleClass}>Market snapshot</span>
						<Button
							variant="secondary"
							size="sm"
							disabled={refresh.isPending}
							onClick={() => {
								setRefreshError(null);
								refresh.mutate();
							}}
						>
							{refresh.isPending ? "Refreshing…" : "Refresh"}
						</Button>
					</div>
					<div className={cardBody}>
						{refreshError && <p className={errorBannerClass}>{refreshError}</p>}
						{!snap ? (
							<p className={emptyTextClass}>
								No snapshot yet. Use refresh if your API token is configured.
							</p>
						) : (
							<>
								<p className={fetchedAtClass}>
									Fetched {new Date(snap.fetchedAt).toLocaleString()}
									{snap.productName && snap.productName !== e.title
										? ` · PC: ${snap.productName}`
										: null}
								</p>
								<dl className={dlClass}>
									<dt className={dtClass}>Loose</dt>
									<dd className={ddClass}>{formatPcCents(snap.loosePrice)}</dd>
									<dt className={dtClass}>CIB</dt>
									<dd className={ddClass}>{formatPcCents(snap.cibPrice)}</dd>
									<dt className={dtClass}>New</dt>
									<dd className={ddClass}>{formatPcCents(snap.newPrice)}</dd>
									<dt className={dtClass}>Graded</dt>
									<dd className={ddClass}>{formatPcCents(snap.gradedPrice)}</dd>
									{snap.salesVolume != null && (
										<>
											<dt className={dtClass}>Sales vol.</dt>
											<dd
												className={css({
													margin: "0",
													fontSize: "sm",
													color: "foreground",
												})}
											>
												{snap.salesVolume.toLocaleString()}
											</dd>
										</>
									)}
								</dl>
							</>
						)}
					</div>
				</Card>

				{/* Copies */}
				<Card>
					<div className={cardHeader}>
						<span className={cardTitleClass}>Your copies</span>
						{e.copies.length > 0 && (
							<Badge variant="default">{e.copies.length}</Badge>
						)}
					</div>
					<div className={cardBody}>
						{e.copies.length === 0 ? (
							<p className={emptyTextClass}>No copies logged yet.</p>
						) : (
							<ul className={copyListClass}>
								{e.copies.map((c: OwnedCopyDto) => (
									<li key={c.id} className={copyItemClass}>
										<div
											className={css({
												display: "flex",
												flexDir: { base: "column", sm: "row" },
												justifyContent: {
													base: "flex-start",
													sm: "space-between",
												},
												alignItems: { base: "stretch", sm: "flex-start" },
												gap: "3",
												flexWrap: "wrap",
											})}
										>
											<div className={css({ minWidth: 0, flex: "1" })}>
												<span className={copyClassClass}>
													{c.copyClassification.replace(/_/g, " ")}
												</span>
												{c.purchaseAmount != null && (
													<span
														className={css({
															ml: "2",
															fontSize: "xs",
															color: "foregroundMuted",
														})}
													>
														Paid {c.purchaseAmount} {c.purchaseCurrency ?? ""}
													</span>
												)}
												{c.offerAmount != null && (
													<span
														className={css({
															ml: "2",
															fontSize: "xs",
															color: "foregroundMuted",
														})}
													>
														Offer {c.offerAmount} {c.offerCurrency ?? ""}
													</span>
												)}
												{c.soldAt != null && (
													<span
														className={css({
															display: "block",
															mt: "1",
															fontSize: "xs",
															color: "accentGreen",
															fontWeight: "medium",
														})}
													>
														Sold {c.soldAmount} {c.soldCurrency ?? ""} ·{" "}
														{new Date(c.soldAt).toLocaleString()}
													</span>
												)}
												{c.classificationNotes && (
													<p className={copyMetaClass}>
														{c.classificationNotes}
													</p>
												)}
											</div>
											<div
												className={css({
													display: "flex",
													flexDir: { base: "column", sm: "row" },
													gap: "2",
													alignSelf: { base: "stretch", sm: "auto" },
													flexShrink: 0,
												})}
											>
												<Button
													type="button"
													variant="secondary"
													size="sm"
													onClick={() => openEditCopyModal(c)}
												>
													Edit copy
												</Button>
												<Button
													type="button"
													variant="secondary"
													size="sm"
													onClick={() => openSellModal(c)}
												>
													{c.soldAt != null ? "Edit sale" : "Mark sold"}
												</Button>
											</div>
										</div>
									</li>
								))}
							</ul>
						)}

						<form
							className={addCopyFormClass}
							onSubmit={(ev) => {
								ev.preventDefault();
								setCopyError(null);
								addCopy.mutate();
							}}
						>
							{copyError && <p className={errorClass}>{copyError}</p>}
							<div className={formRowClass}>
								<div className={fieldClass}>
									<Label htmlFor="classification">Classification</Label>
									<Select
										id="classification"
										value={classification}
										onChange={(ev) =>
											setClassification(ev.target.value as CopyClassification)
										}
									>
										{CLASSIFICATION_OPTIONS.map((x) => (
											<option key={x} value={x}>
												{x.replace(/_/g, " ")}
											</option>
										))}
									</Select>
								</div>
								<div className={css({ flex: "2", minWidth: "120px" })}>
									<Label htmlFor="notes">Notes (optional)</Label>
									<input
										id="notes"
										value={notes}
										onChange={(ev) => setNotes(ev.target.value)}
										placeholder="e.g. mild box wear"
										className={textInputClass}
									/>
								</div>
							</div>
							<div>
								<Button
									type="submit"
									variant="primary"
									size="sm"
									disabled={addCopy.isPending}
								>
									{addCopy.isPending ? "Adding…" : "+ Add copy"}
								</Button>
							</div>
						</form>
					</div>
				</Card>
			</div>

			{editCopyId !== null && (
				<div
					className={overlayClass}
					role="presentation"
					onClick={(ev) => {
						if (ev.target === ev.currentTarget && !updateCopyMeta.isPending) {
							closeEditCopyModal();
						}
					}}
				>
					<div
						className={cx(
							modalPanelClass,
							css({ maxWidth: "460px" }),
						)}
						role="dialog"
						aria-modal="true"
						aria-labelledby="edit-copy-dialog-title"
						onClick={(ev) => ev.stopPropagation()}
					>
						<h2 id="edit-copy-dialog-title" className={modalTitleClass}>
							Edit copy
							{editingCopy && (
								<span
									className={css({
										display: "block",
										fontSize: "xs",
										fontWeight: "normal",
										color: "foregroundMuted",
										mt: "1",
									})}
								>
									{e.title}
								</span>
							)}
						</h2>
						<form
							onSubmit={(ev) => {
								ev.preventDefault();
								setEditCopyError(null);
								updateCopyMeta.mutate();
							}}
						>
							{editCopyError && (
								<p className={errorBannerClass}>{editCopyError}</p>
							)}
							<div
								className={css({
									display: "flex",
									flexDir: "column",
									gap: "3",
								})}
							>
								<div>
									<Label htmlFor="edit-classification">Classification</Label>
									<Select
										id="edit-classification"
										value={editClassification}
										onChange={(ev) =>
											setEditClassification(
												ev.target.value as CopyClassification,
											)
										}
									>
										{CLASSIFICATION_OPTIONS.map((x) => (
											<option key={x} value={x}>
												{x.replace(/_/g, " ")}
											</option>
										))}
									</Select>
								</div>
								<div>
									<Label htmlFor="edit-notes">Notes (optional)</Label>
									<input
										id="edit-notes"
										type="text"
										value={editNotes}
										onChange={(ev) => setEditNotes(ev.target.value)}
										placeholder="e.g. mild box wear"
										className={textInputClass}
									/>
								</div>
								<div>
									<Label htmlFor="edit-offer-amt">
										Offer / asking price (optional)
									</Label>
									<div
										className={css({
											display: "flex",
											gap: "2",
											alignItems: "stretch",
										})}
									>
										<input
											id="edit-offer-amt"
											type="text"
											inputMode="decimal"
											autoComplete="off"
											value={editOfferAmount}
											onChange={(ev) => setEditOfferAmount(ev.target.value)}
											placeholder="0.00"
											className={cx(textInputClass, css({ flex: "1", minW: 0 }))}
										/>
										<input
											id="edit-offer-ccy"
											type="text"
											maxLength={3}
											autoComplete="off"
											value={editOfferCurrency}
											onChange={(ev) =>
												setEditOfferCurrency(
													ev.target.value.toUpperCase().slice(0, 3),
												)
											}
											placeholder="USD"
											aria-label="Offer currency"
											className={cx(
												textInputClass,
												css({ width: "76px", flexShrink: 0 }),
											)}
										/>
									</div>
									<p
										className={css({
											fontSize: "xs",
											color: "foregroundMuted",
											mt: "1",
											mb: "0",
										})}
									>
										Leave amount empty to remove a proposed price.
									</p>
								</div>
							</div>
							<div className={modalActionsClass}>
								<Button
									type="button"
									variant="secondary"
									onClick={() => closeEditCopyModal()}
									disabled={updateCopyMeta.isPending}
								>
									Cancel
								</Button>
								<Button
									type="submit"
									variant="primary"
									disabled={updateCopyMeta.isPending}
								>
									{updateCopyMeta.isPending ? "Saving…" : "Save changes"}
								</Button>
							</div>
						</form>
					</div>
				</div>
			)}

			{sellCopyId !== null && (
				<div
					className={overlayClass}
					role="presentation"
					onClick={(ev) => {
						if (ev.target === ev.currentTarget) closeSellModal();
					}}
				>
					<div
						className={modalPanelClass}
						role="dialog"
						aria-modal="true"
						aria-labelledby="sell-dialog-title"
						onClick={(ev) => ev.stopPropagation()}
					>
						<h2 id="sell-dialog-title" className={modalTitleClass}>
							{sellingCopy?.soldAt != null ? "Edit sale" : "Mark copy as sold"}
						</h2>
						<form
							onSubmit={(ev) => {
								ev.preventDefault();
								setSellError(null);
								markSold.mutate();
							}}
						>
							{sellError && <p className={errorBannerClass}>{sellError}</p>}
							<div
								className={css({
									display: "flex",
									flexDir: "column",
									gap: "3",
								})}
							>
								<div>
									<Label htmlFor="sell-amount">Sale amount</Label>
									<input
										id="sell-amount"
										type="text"
										inputMode="decimal"
										autoComplete="off"
										value={sellAmount}
										onChange={(ev) => setSellAmount(ev.target.value)}
										placeholder="0.00"
										required
										className={textInputClass}
									/>
								</div>
								<div className={formRowClass}>
									<div className={fieldClass}>
										<Label htmlFor="sell-currency">Currency</Label>
										<input
											id="sell-currency"
											type="text"
											maxLength={3}
											value={sellCurrency}
											onChange={(ev) =>
												setSellCurrency(ev.target.value.toUpperCase())
											}
											className={textInputClass}
										/>
									</div>
									<div className={css({ flex: "2", minWidth: "140px" })}>
										<Label htmlFor="sell-when">Sold at</Label>
										<input
											id="sell-when"
											type="datetime-local"
											value={sellDatetimeLocal}
											onChange={(ev) => setSellDatetimeLocal(ev.target.value)}
											className={textInputClass}
										/>
									</div>
								</div>
							</div>
							<div className={modalActionsClass}>
								<Button
									type="button"
									variant="secondary"
									onClick={() => closeSellModal()}
									disabled={markSold.isPending}
								>
									Cancel
								</Button>
								<Button
									type="submit"
									variant="primary"
									disabled={markSold.isPending}
								>
									{markSold.isPending ? "Saving…" : "Save sale"}
								</Button>
							</div>
						</form>
					</div>
				</div>
			)}

			{deleteModalOpen && (
				<div
					className={overlayClass}
					role="presentation"
					onClick={(ev) => {
						if (ev.target === ev.currentTarget && !deleteGame.isPending) {
							setDeleteModalOpen(false);
							setDeleteError(null);
						}
					}}
				>
					<div
						className={modalPanelClass}
						role="dialog"
						aria-modal="true"
						aria-labelledby="delete-dialog-title"
						onClick={(ev) => ev.stopPropagation()}
					>
						<h2 id="delete-dialog-title" className={modalTitleClass}>
							Delete this game?
						</h2>
						<p
							className={css({
								fontSize: "sm",
								color: "foregroundMuted",
								lineHeight: "1.5",
								margin: "0 0 16px 0",
							})}
						>
							This permanently removes{" "}
							<strong className={css({ color: "foreground" })}>
								{e.title}
							</strong>{" "}
							and all copies you logged, including sale records. The market
							snapshot is removed too. This cannot be undone.
						</p>
						{deleteError && <p className={errorBannerClass}>{deleteError}</p>}
						<div className={modalActionsClass}>
							<Button
								type="button"
								variant="secondary"
								onClick={() => {
									setDeleteModalOpen(false);
									setDeleteError(null);
								}}
								disabled={deleteGame.isPending}
							>
								Cancel
							</Button>
							<Button
								type="button"
								variant="danger"
								onClick={() => {
									setDeleteError(null);
									deleteGame.mutate();
								}}
								disabled={deleteGame.isPending}
							>
								{deleteGame.isPending ? "Deleting…" : "Delete game"}
							</Button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
