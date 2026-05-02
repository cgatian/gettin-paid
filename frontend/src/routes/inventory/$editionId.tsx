import {
	CopyClassification,
	type EditionDetailDto,
	type FetchEditionCoverResponseDto,
	labelPriceChartingConsole,
	type OwnedCopyDto,
	type PriceChartingPricingPreviewDto,
	priceChartingProductBrowseUrl,
	snapshotFmvCentsForClassification,
} from "@gettin-paid/shared";
import { Dialog } from "@base-ui/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { css, cx } from "styled-system/css";
import { Badge } from "#/components/ui/Badge";
import { Button } from "#/components/ui/Button";
import { Card, cardBody, cardHeader, formGroupClass } from "#/components/ui/Card";
import {
	Field,
	Input,
	Label,
	Select,
	inputClass,
} from "#/components/ui/Input";
import { apiFetch, apiFetchPost, getApiBase } from "#/lib/api";
import { formatMoneyAmount, formatPcCents } from "#/lib/money";

export const Route = createFileRoute("/inventory/$editionId")({
	component: EditionDetail,
});

const CLASSIFICATION_OPTIONS = Object.values(CopyClassification);

/** Anchor cents for offer slider + autofill; aligns with Add game flow. */
function baseOfferCentsPreview(
	data: Pick<
		PriceChartingPricingPreviewDto,
		"loosePrice" | "cibPrice" | "newPrice" | "gradedPrice"
	>,
	classification: CopyClassification,
): number | null {
	const mapped = snapshotFmvCentsForClassification(data, classification);
	if (mapped != null) return mapped;
	return data.cibPrice ?? data.loosePrice ?? null;
}

function snapshotToPricingPreview(
	s: NonNullable<EditionDetailDto["snapshot"]>,
): Pick<
	PriceChartingPricingPreviewDto,
	| "productName"
	| "consoleName"
	| "loosePrice"
	| "cibPrice"
	| "newPrice"
	| "gradedPrice"
	| "salesVolume"
> {
	return {
		productName: s.productName,
		consoleName: s.consoleName,
		loosePrice: s.loosePrice,
		cibPrice: s.cibPrice,
		newPrice: s.newPrice,
		gradedPrice: s.gradedPrice,
		salesVolume: s.salesVolume,
	};
}

const priceDlClass = css({
	display: "grid",
	gridTemplateColumns: "auto 1fr",
	columnGap: "4",
	rowGap: "1",
	fontSize: "sm",
	margin: "0",
});

const priceDtClass = css({
	color: "foregroundMuted",
	fontWeight: "normal",
	margin: "0",
});
const priceDdClass = css({ margin: "0", color: "foreground" });

const mutedHelpClass = css({
	color: "foregroundMuted",
	fontSize: "xs",
	mt: "1",
	mb: "0",
});

const lowOfferWarningClass = css({
	display: "block",
	mt: "2",
	mb: "0",
	fontSize: "sm",
	color: "foreground",
	bg: "rgba(180, 120, 0, 0.08)",
	borderWidth: "1px",
	borderStyle: "solid",
	borderColor: "rgba(180, 120, 0, 0.22)",
	borderRadius: "btn",
	px: "3",
	py: "2",
});

function editionDetailCoverSrc(
	e: Pick<EditionDetailDto, "id" | "coverFetchedAt" | "hasCover">,
): string | null {
	if (!e.hasCover || !e.coverFetchedAt) return null;
	const base = getApiBase().replace(/\/$/, "");
	const t = Date.parse(e.coverFetchedAt);
	if (!Number.isFinite(t)) return null;
	return `${base}/api/editions/${encodeURIComponent(e.id)}/cover?t=${t}`;
}

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
	color: "link",
	textDecoration: "none",
	mb: "5",
	_hover: { color: "linkHover" },
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

const externalLinkClass = css({
	fontSize: "sm",
	color: "link",
	textDecoration: "underline",
	textUnderlineOffset: "2px",
	_hover: { color: "linkHover" },
});

const gridClass = css({
	display: "flex",
	flexDir: "column",
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
	gridTemplateColumns: "auto 1fr",
	columnGap: "2",
	rowGap: "1",
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
	mb: "2",
});

const copiesTableScrollClass = css({
	overflowX: "auto",
	mb: "4",
});

const copiesTableMinClass = css({
	minWidth: "640px",
});

const copiesGridCols =
	"minmax(96px, 120px) minmax(72px, 96px) minmax(72px, 96px) minmax(100px, 140px) minmax(0, 1fr) auto";

const copiesHeaderRowClass = css({
	display: "grid",
	gridTemplateColumns: copiesGridCols,
	gap: "3",
	alignItems: "center",
	px: "2",
	pb: "2",
	mb: "2",
	borderBottomWidth: "1px",
	borderBottomStyle: "solid",
	borderBottomColor: "border",
	fontSize: "xs",
	fontWeight: "medium",
	color: "foregroundMuted",
	textTransform: "uppercase",
	letterSpacing: "0.05em",
});

const copyDataRowClass = css({
	display: "grid",
	gridTemplateColumns: copiesGridCols,
	gap: "3",
	alignItems: "center",
	px: "2",
	py: "3",
	borderBottomWidth: "1px",
	borderBottomStyle: "solid",
	borderBottomColor: "borderSubtle",
	fontSize: "sm",
	"&:last-child": {
		borderBottomWidth: "0",
	},
});

const copyCellMutedClass = css({
	fontSize: "sm",
	color: "foregroundMuted",
	fontVariantNumeric: "tabular-nums",
});

const copyCellClass = css({
	fontSize: "sm",
	color: "foreground",
	fontVariantNumeric: "tabular-nums",
});

const copyNotesCellClass = css({
	fontSize: "sm",
	color: "foregroundMuted",
	minWidth: "0",
	overflow: "hidden",
	textOverflow: "ellipsis",
	whiteSpace: "nowrap",
	md: { whiteSpace: "normal", wordBreak: "break-word" },
});

const copyActionsCellClass = css({
	display: "flex",
	flexWrap: "wrap",
	gap: "2",
	justifyContent: "flex-end",
});

const copyClassClass = css({
	fontWeight: "medium",
	color: "foreground",
});

const addCopyFormInnerClass = css({
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
});

const modalPanelClass = css({
	position: "fixed",
	top: "50%",
	left: "50%",
	transform: "translate(-50%, -50%)",
	bg: "surface",
	borderRadius: "card",
	borderWidth: "1px",
	borderStyle: "solid",
	borderColor: "border",
	maxWidth: "420px",
	width: "calc(100% - 2rem)",
	p: "5",
	boxShadow: "md",
	zIndex: 101,
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
	const [fetchCoverError, setFetchCoverError] = useState<string | null>(null);
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
	const [addCopyModalOpen, setAddCopyModalOpen] = useState(false);
	const [addCopyOfferAmount, setAddCopyOfferAmount] = useState("");
	const [addCopyOfferCurrency, setAddCopyOfferCurrency] = useState("USD");
	const [addCopyPurchaseAmount, setAddCopyPurchaseAmount] = useState("");

	const q = useQuery({
		queryKey: ["edition", editionId],
		queryFn: () => apiFetch<EditionDetailDto>(`/editions/${editionId}`),
	});

	const addCopyPricingQuery = useQuery({
		queryKey: ["product-pricing", q.data?.priceChartingProductId] as const,
		queryFn: () => {
			const sp = new URLSearchParams();
			sp.set("productId", q.data?.priceChartingProductId ?? "");
			return apiFetch<PriceChartingPricingPreviewDto>(
				`/product-pricing?${sp.toString()}`,
			);
		},
		enabled: addCopyModalOpen && Boolean(q.data?.priceChartingProductId),
		staleTime: 60_000,
	});

	const addCopyEffectivePricing = useMemo(() => {
		const edition = q.data;
		if (!edition) return null;
		if (addCopyPricingQuery.data) return addCopyPricingQuery.data;
		if (edition.snapshot) return snapshotToPricingPreview(edition.snapshot);
		return null;
	}, [q.data, addCopyPricingQuery.data]);

	const addCopyBaseOfferCents = useMemo(() => {
		if (!addCopyEffectivePricing) return null;
		return baseOfferCentsPreview(addCopyEffectivePricing, classification);
	}, [addCopyEffectivePricing, classification]);

	const addCopyOfferAmountNumeric = useMemo(() => {
		const t = addCopyOfferAmount.trim();
		if (!t) return null;
		const n = Number.parseFloat(t.replace(/,/g, ""));
		return Number.isFinite(n) ? n : null;
	}, [addCopyOfferAmount]);

	const addCopyOfferCurrencyNorm =
		addCopyOfferCurrency.trim().toUpperCase() || "USD";

	const addCopyShowLowOfferWarning =
		addCopyOfferAmountNumeric != null &&
		addCopyOfferAmountNumeric < 5 &&
		addCopyOfferCurrencyNorm === "USD";

	const addCopyOfferSliderCents = useMemo(() => {
		if (addCopyBaseOfferCents == null) return null;
		const parsedCents =
			addCopyOfferAmountNumeric != null
				? Math.round(addCopyOfferAmountNumeric * 100)
				: addCopyBaseOfferCents;
		const minC = Math.max(
			100,
			Math.floor((addCopyBaseOfferCents * 0.5) / 100) * 100,
		);
		const maxC = Math.max(
			Math.ceil((addCopyBaseOfferCents * 2) / 100) * 100,
			minC + 100,
		);
		return {
			minC,
			maxC,
			value: Math.min(maxC, Math.max(minC, parsedCents)),
		};
	}, [addCopyBaseOfferCents, addCopyOfferAmountNumeric]);

	useEffect(() => {
		if (!addCopyModalOpen) return;
		if (addCopyBaseOfferCents == null) return;
		setAddCopyOfferAmount((addCopyBaseOfferCents / 100).toFixed(2));
	}, [addCopyModalOpen, addCopyBaseOfferCents]);

	const refresh = useMutation({
		mutationFn: () =>
			apiFetch<EditionDetailDto>(`/editions/${editionId}/refresh-market`, {
				method: "POST",
			}),
		onSuccess: (data) => {
			setRefreshError(null);
			queryClient.setQueryData(["edition", editionId], data);
			void queryClient.invalidateQueries({ queryKey: ["editions"] });
			void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
		},
		onError: (e) => {
			setRefreshError(e instanceof Error ? e.message : "Refresh failed");
		},
	});

	const fetchCoverArt = useMutation({
		mutationFn: (force: boolean) =>
			apiFetchPost<FetchEditionCoverResponseDto>(
				`/editions/${editionId}/fetch-cover${force ? "?force=true" : ""}`,
			),
		onSuccess: (data) => {
			setFetchCoverError(null);
			const { coverAlreadyStored: _skipped, ...edition } = data;
			void _skipped;
			queryClient.setQueryData(["edition", editionId], edition);
			void queryClient.invalidateQueries({ queryKey: ["editions"] });
		},
		onError: (e) => {
			setFetchCoverError(
				e instanceof Error ? e.message : "Could not fetch cover",
			);
		},
	});

	const addCopy = useMutation({
		mutationFn: () =>
			apiFetch<OwnedCopyDto>(`/editions/${editionId}/copies`, {
				method: "POST",
				body: JSON.stringify({
					copyClassification: classification,
					classificationNotes: notes.trim() || undefined,
					...(addCopyPurchaseAmount.trim()
						? {
								purchaseAmount: addCopyPurchaseAmount.trim(),
								purchaseCurrency: "USD",
							}
						: {}),
					...(addCopyOfferAmount.trim()
						? {
								offerAmount: addCopyOfferAmount.trim(),
								offerCurrency:
									addCopyOfferCurrency.trim().slice(0, 3) || "USD",
							}
						: {}),
				}),
			}),
		onSuccess: () => {
			setCopyError(null);
			setNotes("");
			setAddCopyOfferAmount("");
			setAddCopyPurchaseAmount("");
			setAddCopyOfferCurrency("USD");
			setAddCopyModalOpen(false);
			void q.refetch();
			void queryClient.invalidateQueries({ queryKey: ["editions"] });
			void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
		},
		onError: (e) => {
			setCopyError(e instanceof Error ? e.message : "Could not add copy");
		},
	});

	function closeAddCopyModal() {
		setAddCopyModalOpen(false);
		setCopyError(null);
		setAddCopyOfferAmount("");
		setAddCopyPurchaseAmount("");
		setAddCopyOfferCurrency("USD");
	}

	function openSellModal(c: OwnedCopyDto) {
		setAddCopyModalOpen(false);
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
		setAddCopyModalOpen(false);
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
			void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
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
			void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
		},
		onError: (e) => {
			setSellError(e instanceof Error ? e.message : "Could not save sale");
		},
	});


	const deleteGame = useMutation({
		mutationFn: () =>
			apiFetch<void>(`/editions/${editionId}`, { method: "DELETE" }),
		onSuccess: () => {
			setDeleteModalOpen(false);
			setDeleteError(null);
			void queryClient.removeQueries({ queryKey: ["edition", editionId] });
			void queryClient.invalidateQueries({ queryKey: ["editions"] });
			void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
			void navigate({ to: "/inventory" });
		},
		onError: (e) => {
			setDeleteError(e instanceof Error ? e.message : "Could not delete game");
		},
	});


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
	const priceChartingBrowseUrl = priceChartingProductBrowseUrl(
		e.priceChartingProductId,
	);
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
						flexDir: { base: "column", md: "row" },
						gap: "6",
						alignItems: { base: "stretch", md: "flex-start" },
						mb: "2",
					})}
				>
					<div
						className={css({
							flexShrink: "0",
							width: { base: "100%", md: "160px" },
							maxW: "100%",
						})}
					>
						{editionDetailCoverSrc(e) ? (
							<img
								src={editionDetailCoverSrc(e) ?? ""}
								alt={e.title}
								className={css({
									width: "100%",
									maxH: "240px",
									objectFit: "contain",
									borderRadius: "card",
									borderWidth: "1px",
									borderStyle: "solid",
									borderColor: "border",
									bg: "surface",
								})}
							/>
						) : (
							<div
								className={css({
									width: "100%",
									minH: "120px",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									borderRadius: "card",
									borderWidth: "1px",
									borderStyle: "dashed",
									borderColor: "border",
									color: "foregroundMuted",
									fontSize: "sm",
								})}
							>
								No cover yet
							</div>
						)}
					</div>
					<div className={css({ flex: "1", minW: "0" })}>
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
							<h1 className={cx(pageTitleClass, css({ mb: "0" }))}>
								{e.title}
							</h1>
							<div
								className={css({
									display: "flex",
									flexWrap: "wrap",
									gap: "2",
									alignItems: "center",
								})}
							>
								{e.priceChartingProductId ? (
									<Button
										type="button"
										variant="secondary"
										size="sm"
										disabled={fetchCoverArt.isPending}
										onClick={() => {
											setFetchCoverError(null);
											fetchCoverArt.mutate(e.hasCover);
										}}
									>
										{fetchCoverArt.isPending
											? "Cover…"
											: e.hasCover
												? "Refresh cover"
												: "Fetch cover"}
									</Button>
								) : null}
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
						</div>
						<div
							className={css({
								display: "flex",
								flexDir: "column",
								alignItems: "flex-start",
								gap: "1",
							})}
						>
							<div className={metaRowClass}>
								<Badge variant="default">{editionConsoleBadge(e)}</Badge>
								<span className={metaTextClass}>UPC {e.upc}</span>
								{e.publisher && (
									<span className={metaTextClass}>· {e.publisher}</span>
								)}
							</div>
							{priceChartingBrowseUrl ? (
								<a
									href={priceChartingBrowseUrl}
									target="_blank"
									rel="noopener noreferrer"
									className={externalLinkClass}
								>
									View on PriceCharting
								</a>
							) : null}
						</div>
						{fetchCoverError && (
							<p className={css({ fontSize: "sm", color: "danger", mt: "2" })}>
								{fetchCoverError}
							</p>
						)}
					</div>
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
						<span
							className={css({
								display: "flex",
								alignItems: "center",
								gap: "2",
								flexWrap: "wrap",
							})}
						>
							<span className={cardTitleClass}>Your copies</span>
							{e.copies.length > 0 && (
								<Badge variant="default">{e.copies.length}</Badge>
							)}
						</span>
						<Button
							type="button"
							variant="primary"
							size="sm"
							onClick={() => {
								setCopyError(null);
								setAddCopyOfferAmount("");
								setAddCopyPurchaseAmount("");
								setAddCopyOfferCurrency("USD");
								setAddCopyModalOpen(true);
							}}
						>
							+ Add copy
						</Button>
					</div>
					<div className={cardBody}>
						{e.copies.length === 0 ? (
							<p className={emptyTextClass}>
								No copies logged yet. Use{" "}
								<strong className={css({ color: "foreground" })}>
									Add copy
								</strong>{" "}
								above to log one.
							</p>
						) : (
							<div className={copiesTableScrollClass}>
								<div className={copiesTableMinClass}>
									<div className={copiesHeaderRowClass}>
										<span>Class</span>
										<span
											className={css({ textAlign: "right" })}
										>
											Paid
										</span>
										<span
											className={css({ textAlign: "right" })}
										>
											Offer
										</span>
										<span>Sale</span>
										<span>Notes</span>
										<span />
									</div>
									{e.copies.map((c: OwnedCopyDto) => (
										<div key={c.id} className={copyDataRowClass}>
											<span className={copyClassClass}>
												{c.copyClassification.replace(/_/g, " ")}
											</span>
											<span className={css({ textAlign: "right" })}>
												{c.purchaseAmount != null ? (
													<span className={copyCellClass}>
														{formatMoneyAmount(
															c.purchaseAmount,
															c.purchaseCurrency,
														)}
													</span>
												) : (
													<span className={copyCellMutedClass}>—</span>
												)}
											</span>
											<span className={css({ textAlign: "right" })}>
												{c.offerAmount != null ? (
													<span className={copyCellClass}>
														{formatMoneyAmount(
															c.offerAmount,
															c.offerCurrency,
														)}
													</span>
												) : (
													<span className={copyCellMutedClass}>—</span>
												)}
											</span>
											<div>
												{c.soldAt != null ? (
													<span
														className={css({
															fontSize: "sm",
															color: "accentGreen",
															fontWeight: "medium",
														})}
													>
														{formatMoneyAmount(
															c.soldAmount ?? "0",
															c.soldCurrency,
														)}{" "}
														·{" "}
														{new Date(c.soldAt).toLocaleDateString()}
													</span>
												) : (
													<span className={copyCellMutedClass}>—</span>
												)}
											</div>
											<div
												className={copyNotesCellClass}
												title={
													c.classificationNotes?.trim()
														? c.classificationNotes
														: undefined
												}
											>
												{c.classificationNotes?.trim()
													? c.classificationNotes
													: "—"}
											</div>
											<div className={copyActionsCellClass}>
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
													variant="success"
													size="sm"
													onClick={() => openSellModal(c)}
												>
													{c.soldAt != null ? "Edit sale" : "Mark sold"}
												</Button>
											</div>
										</div>
									))}
								</div>
							</div>
						)}
					</div>
				</Card>
			</div>

			<Dialog.Root
				open={addCopyModalOpen}
				onOpenChange={(open) => {
					if (!open && addCopy.isPending) return;
					if (!open) closeAddCopyModal();
				}}
			>
				<Dialog.Portal>
					<Dialog.Backdrop className={overlayClass} />
					<Dialog.Popup
						className={cx(modalPanelClass, css({ maxWidth: "520px" }))}
					>
						<Dialog.Title className={modalTitleClass}>
							Add copy
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
						</Dialog.Title>
						<form
							className={addCopyFormInnerClass}
							onSubmit={(ev) => {
								ev.preventDefault();
								setCopyError(null);
								addCopy.mutate();
							}}
						>
							{copyError && <p className={errorBannerClass}>{copyError}</p>}
							<div className={formRowClass}>
								<div className={fieldClass}>
									<Label htmlFor="add-copy-classification">
										Classification
									</Label>
									<Select
										id="add-copy-classification"
										value={classification}
										onValueChange={(v) =>
											setClassification(v as CopyClassification)
										}
										items={CLASSIFICATION_OPTIONS.map((x) => ({
											value: x,
											label: x.replace(/_/g, " "),
										}))}
									/>
								</div>
								<div className={css({ flex: "2", minWidth: "120px" })}>
									<Label htmlFor="add-copy-notes">Notes (optional)</Label>
									<input
										id="add-copy-notes"
										value={notes}
										onChange={(ev) => setNotes(ev.target.value)}
										placeholder="e.g. mild box wear"
										className={textInputClass}
									/>
								</div>
							</div>

							{(e.snapshot || e.priceChartingProductId) && (
								<div className={formGroupClass} aria-live="polite">
									<span
										className={css({
											fontSize: "sm",
											fontWeight: "medium",
											color: "foreground",
										})}
									>
										PriceCharting (FMV)
									</span>
									{e.priceChartingProductId &&
										addCopyPricingQuery.isFetching &&
										!addCopyEffectivePricing && (
											<p
												className={css({
													fontSize: "sm",
													color: "foregroundMuted",
													mb: "0",
												})}
											>
												Loading prices…
											</p>
										)}
									{e.priceChartingProductId &&
										addCopyPricingQuery.isError &&
										!addCopyEffectivePricing && (
											<p
												className={css({
													fontSize: "sm",
													color: "danger",
													mb: "0",
												})}
											>
												Could not load prices (check API token / network).
											</p>
										)}
									{addCopyEffectivePricing && (
										<>
											{(addCopyEffectivePricing.productName ||
												addCopyEffectivePricing.consoleName) && (
												<p
													className={css({
														fontSize: "xs",
														color: "foregroundMuted",
														m: "0",
													})}
												>
													{addCopyEffectivePricing.productName}
													{addCopyEffectivePricing.consoleName && (
														<> · {addCopyEffectivePricing.consoleName}</>
													)}
												</p>
											)}
											<dl className={priceDlClass}>
												<dt className={priceDtClass}>Loose</dt>
												<dd className={priceDdClass}>
													{formatPcCents(addCopyEffectivePricing.loosePrice)}
												</dd>
												<dt className={priceDtClass}>CIB</dt>
												<dd className={priceDdClass}>
													{formatPcCents(addCopyEffectivePricing.cibPrice)}
												</dd>
												<dt className={priceDtClass}>New</dt>
												<dd className={priceDdClass}>
													{formatPcCents(addCopyEffectivePricing.newPrice)}
												</dd>
												<dt className={priceDtClass}>Graded</dt>
												<dd className={priceDdClass}>
													{formatPcCents(addCopyEffectivePricing.gradedPrice)}
												</dd>
												{addCopyEffectivePricing.salesVolume != null && (
													<>
														<dt className={priceDtClass}>Sales vol.</dt>
														<dd className={priceDdClass}>
															{addCopyEffectivePricing.salesVolume.toLocaleString()}
														</dd>
													</>
												)}
											</dl>
											<p className={mutedHelpClass}>
												Asking price starts at the FMV for your selected
												condition; use the slider or type to adjust.
											</p>
										</>
									)}
								</div>
							)}

							<div className={formGroupClass}>
								<Field label="Paid (optional)" htmlFor="add-copy-purchase">
									<Input
										id="add-copy-purchase"
										type="text"
										inputMode="decimal"
										autoComplete="off"
										value={addCopyPurchaseAmount}
										onChange={(ev) =>
											setAddCopyPurchaseAmount(ev.target.value)
										}
										placeholder="0.00"
										className={inputClass}
									/>
								</Field>

								<Field
									label={
										<>
											Asking (optional){" "}
											<span
												className={css({
													color: "foregroundMuted",
													fontWeight: "normal",
												})}
											>
												(USD)
											</span>
										</>
									}
									htmlFor="add-copy-offer-amt"
								>
									<div
										className={css({
											display: "flex",
											gap: "2",
											alignItems: "stretch",
										})}
									>
										<Input
											id="add-copy-offer-amt"
											type="text"
											inputMode="decimal"
											autoComplete="off"
											value={addCopyOfferAmount}
											onChange={(ev) =>
												setAddCopyOfferAmount(ev.target.value)
											}
											placeholder="0.00"
											className={cx(inputClass, css({ flex: "1", minW: "0" }))}
										/>
										<Input
											id="add-copy-offer-ccy"
											type="text"
											autoComplete="off"
											value={addCopyOfferCurrency}
											onChange={(ev) =>
												setAddCopyOfferCurrency(
													ev.target.value.toUpperCase().slice(0, 3),
												)
											}
											placeholder="USD"
											maxLength={3}
											aria-label="Offer currency"
											className={cx(
												inputClass,
												css({ width: "60px", flexShrink: "0" }),
											)}
										/>
									</div>
									{addCopyOfferSliderCents && (
										<input
											type="range"
											className={css({
												w: "100%",
												mt: "2",
												accentColor: "accent",
												cursor: "pointer",
											})}
											min={addCopyOfferSliderCents.minC}
											max={addCopyOfferSliderCents.maxC}
											step={100}
											value={addCopyOfferSliderCents.value}
											aria-label="Adjust asking price"
											onChange={(ev) =>
												setAddCopyOfferAmount(
													(Number(ev.target.value) / 100).toFixed(2),
												)
											}
										/>
									)}
									{addCopyShowLowOfferWarning && (
										<output
											className={lowOfferWarningClass}
											htmlFor="add-copy-offer-amt add-copy-offer-ccy"
											aria-live="polite"
										>
											Prices under $5 may sell faster but earn less.
										</output>
									)}
								</Field>
							</div>

							<div className={modalActionsClass}>
								<Button
									type="button"
									variant="secondary"
									onClick={() => closeAddCopyModal()}
									disabled={addCopy.isPending}
								>
									Cancel
								</Button>
								<Button
									type="submit"
									variant="primary"
									disabled={addCopy.isPending}
								>
									{addCopy.isPending ? "Adding…" : "Add copy"}
								</Button>
							</div>
						</form>
					</Dialog.Popup>
				</Dialog.Portal>
			</Dialog.Root>

			<Dialog.Root
				open={editCopyId !== null}
				onOpenChange={(open) => {
					if (!open && updateCopyMeta.isPending) return;
					if (!open) closeEditCopyModal();
				}}
			>
				<Dialog.Portal>
					<Dialog.Backdrop className={overlayClass} />
					<Dialog.Popup
						className={cx(modalPanelClass, css({ maxWidth: "460px" }))}
					>
						<Dialog.Title className={modalTitleClass}>
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
						</Dialog.Title>
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
										onValueChange={(v) =>
											setEditClassification(v as CopyClassification)
										}
										items={CLASSIFICATION_OPTIONS.map((x) => ({
											value: x,
											label: x.replace(/_/g, " "),
										}))}
									/>
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
					</Dialog.Popup>
				</Dialog.Portal>
			</Dialog.Root>

			<Dialog.Root
				open={sellCopyId !== null}
				onOpenChange={(open) => {
					if (!open) closeSellModal();
				}}
			>
				<Dialog.Portal>
					<Dialog.Backdrop className={overlayClass} />
					<Dialog.Popup className={modalPanelClass}>
						<Dialog.Title className={modalTitleClass}>
							{sellingCopy?.soldAt != null ? "Edit sale" : "Mark copy as sold"}
						</Dialog.Title>
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
					</Dialog.Popup>
				</Dialog.Portal>
			</Dialog.Root>

			<Dialog.Root
				open={deleteModalOpen}
				onOpenChange={(open) => {
					if (!open && deleteGame.isPending) return;
					if (!open) {
						setDeleteModalOpen(false);
						setDeleteError(null);
					}
				}}
			>
				<Dialog.Portal>
					<Dialog.Backdrop className={overlayClass} />
					<Dialog.Popup className={modalPanelClass}>
						<Dialog.Title className={modalTitleClass}>
							Delete this game?
						</Dialog.Title>
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
					</Dialog.Popup>
				</Dialog.Portal>
			</Dialog.Root>
		</div>
	);
}
