import {
	CopyClassification,
	type EditionDetailDto,
	findBestPriceChartingConsoleIdFromApiConsoleName,
	POPULAR_PRICECHARTING_CONSOLE_IDS,
	type PriceChartingPricingPreviewDto,
	type PriceChartingProductCoverPreviewDto,
	type PriceChartingProductSuggestionDto,
	snapshotFmvCentsForClassification,
} from "@gettin-paid/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Camera } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { css, cx } from "styled-system/css";
import { Button, buttonVariants } from "#/components/ui/Button";
import {
	Card,
	cardBody,
	cardHeader,
	formGroupClass,
} from "#/components/ui/Card";
import { Field, Input, Select } from "#/components/ui/Input";
import { apiFetch } from "#/lib/api";
import { formatPcCents } from "#/lib/money";

export const Route = createFileRoute("/inventory/add")({ component: AddGame });

type CopyClassificationTag =
	(typeof CopyClassification)[keyof typeof CopyClassification];

const CLASSIFICATION_OPTIONS = Object.values(
	CopyClassification,
) as CopyClassificationTag[];

/** Anchor cents for offer slider + autofill; falls back when classification has no PC column. */
function baseOfferCentsPreview(
	data: PriceChartingPricingPreviewDto,
	classification: CopyClassificationTag,
): number | null {
	const mapped = snapshotFmvCentsForClassification(data, classification);
	if (mapped != null) return mapped;
	return data.cibPrice ?? data.loosePrice ?? null;
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
	const [debounced, setDebounced] = useState(value);
	useEffect(() => {
		const id = setTimeout(() => setDebounced(value), delayMs);
		return () => clearTimeout(id);
	}, [value, delayMs]);
	return debounced;
}

/** Mobile: fills visible main area; inner scroll + fixed action bar. Desktop: normal flow. */
const addPageShellClass = css({
	w: "100%",
	maxWidth: "600px",
	display: { base: "flex", sm: "block" },
	flexDir: "column",
	h: {
		base: "calc(100dvh - var(--sizes-topbar) - env(safe-area-inset-bottom, 0px))",
		sm: "auto",
	},
	maxH: {
		base: "calc(100dvh - var(--sizes-topbar) - env(safe-area-inset-bottom, 0px))",
		sm: "none",
	},
	minH: { base: "0", sm: "auto" },
	overflow: { base: "hidden", sm: "visible" },
});

const addPageScrollClass = css({
	flex: { base: "1", sm: "none" },
	minH: { base: "0", sm: "auto" },
	overflowY: { base: "auto", sm: "visible" },
	WebkitOverflowScrolling: { base: "touch", sm: "auto" },
	overscrollBehavior: { base: "contain", sm: "auto" },
	/** Flush to viewport edges on mobile; horizontal safe-area only where the device needs it. */
	pt: { base: "0", sm: "0" },
	pb: { base: "0", sm: "0" },
	pl: { base: "env(safe-area-inset-left, 0px)", sm: "0" },
	pr: { base: "env(safe-area-inset-right, 0px)", sm: "0" },
});

const addPageScrollInnerClass = css({
	pb: { sm: "calc({spacing.6} + env(safe-area-inset-bottom, 0px))" },
	px: { sm: "6" },
	pt: { sm: "6" },
});

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

const pageTitleClass = css({
	fontSize: "2xl",
	fontWeight: "normal",
	color: "foreground",
	mb: "5",
	letterSpacing: "-0.01em",
});

const formBodyClass = css({
	display: "flex",
	flexDir: "column",
	gap: "4",
});

const errorClass = css({
	bg: "rgba(192,57,43,0.08)",
	borderWidth: "1px",
	borderStyle: "solid",
	borderColor: "rgba(192,57,43,0.2)",
	borderRadius: "btn",
	px: "3",
	py: "2",
	fontSize: "sm",
	color: "danger",
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

const formActionsInnerClass = css({
	display: "flex",
	flexDir: { base: "column-reverse", sm: "row" },
	flexWrap: "wrap",
	alignItems: { base: "stretch", sm: "center" },
	gap: "3",
	pt: "2",
	"& a, & button": {
		width: { base: "100%", sm: "auto" },
		justifyContent: { base: "center", sm: "flex-start" },
	},
});

const desktopFormActionsClass = css({
	display: { base: "none", sm: "flex" },
});

const mobileFormActionsBarClass = css({
	display: { base: "flex", sm: "none" },
	flexDir: "column-reverse",
	flexShrink: "0",
	gap: "3",
	pt: "3",
	pl: "env(safe-area-inset-left, 0px)",
	pr: "env(safe-area-inset-right, 0px)",
	pb: "calc({spacing.3} + env(safe-area-inset-bottom, 0px))",
	borderTopWidth: "1px",
	borderTopStyle: "solid",
	borderTopColor: "border",
	bg: "surface",
});

const suggestPanelClass = css({
	position: "absolute",
	left: 0,
	right: 0,
	top: "100%",
	mt: "1",
	zIndex: 30,
	maxHeight: "240px",
	overflowY: "auto",
	borderWidth: "1px",
	borderStyle: "solid",
	borderColor: "border",
	borderRadius: "btn",
	bg: "surface",
	boxShadow: "md",
});

const suggestRowClass = css({
	w: "100%",
	textAlign: "left",
	px: "3",
	py: "2",
	fontSize: "sm",
	cursor: "pointer",
	border: "none",
	bg: "transparent",
	color: "foreground",
	_hover: { bg: "navHover" },
});

const mutedTextClass = css({
	color: "foregroundMuted",
	fontSize: "xs",
	mt: "1",
	mb: "0",
});

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

const coverThumbWrapClass = css({
	flexShrink: "0",
	width: "72px",
	height: "72px",
	borderRadius: "btn",
	borderWidth: "1px",
	borderStyle: "solid",
	borderColor: "border",
	bg: "surface",
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	overflow: "hidden",
});

const coverThumbImgClass = css({
	width: "100%",
	height: "100%",
	objectFit: "contain",
	display: "block",
});

function AddGame() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const platformsQuery = useQuery({
		queryKey: ["platforms"],
		queryFn: () => apiFetch<{ id: string; name: string }[]>("/platforms"),
		staleTime: 86_400_000,
	});
	const sortedConsoles = useMemo(
		() =>
			[...(platformsQuery.data ?? [])].sort((a, b) =>
				a.name.localeCompare(b.name),
			),
		[platformsQuery.data],
	);
	const [upc, setUpc] = useState("");
	const [scanError, setScanError] = useState<string | null>(null);
	const [isScanning, setIsScanning] = useState(false);
	const cameraInputRef = useRef<HTMLInputElement>(null);

	async function handleScan(ev: React.ChangeEvent<HTMLInputElement>) {
		const file = ev.target.files?.[0];
		ev.target.value = "";
		if (!file) return;
		setIsScanning(true);
		setScanError(null);
		const url = URL.createObjectURL(file);
		try {
			const Quagga = (await import("@ericblade/quagga2")).default;
			const result = await Quagga.decodeSingle({
				src: url,
				numOfWorkers: 0,
				locate: true,
				decoder: {
					readers: [
						"ean_reader",
						"ean_8_reader",
						"upc_reader",
						"upc_e_reader",
						"code_128_reader",
					],
				},
			});
			const code = result?.codeResult?.code;
			if (code) setUpc(code);
			else setScanError("No barcode found — try a clearer photo.");
		} catch {
			setScanError("No barcode found — try a clearer photo.");
		} finally {
			URL.revokeObjectURL(url);
			setIsScanning(false);
		}
	}

	const [title, setTitle] = useState("");
	const [priceChartingConsoleId, setPriceChartingConsoleId] = useState(
		POPULAR_PRICECHARTING_CONSOLE_IDS[0] ?? "G8",
	);
	useEffect(() => {
		const list = platformsQuery.data;
		if (!list?.length) return;
		const valid = list.some((c) => c.id === priceChartingConsoleId);
		if (!valid) {
			const preferred = POPULAR_PRICECHARTING_CONSOLE_IDS.find((id) =>
				list.some((c) => c.id === id),
			);
			setPriceChartingConsoleId(preferred ?? list[0].id);
		}
	}, [platformsQuery.data, priceChartingConsoleId]);
	const debouncedTitle = useDebouncedValue(title, 400);
	const [suggestOpen, setSuggestOpen] = useState(false);
	const blurCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

	const suggestionsQuery = useQuery({
		queryKey: [
			"pc-product-suggestions",
			debouncedTitle,
			priceChartingConsoleId,
		] as const,
		queryFn: () => {
			const sp = new URLSearchParams();
			sp.set("q", debouncedTitle.trim());
			sp.set("console", priceChartingConsoleId);
			return apiFetch<PriceChartingProductSuggestionDto[]>(
				`/product-suggestions?${sp.toString()}`,
			);
		},
		enabled:
			debouncedTitle.trim().length >= 2 &&
			Boolean(priceChartingConsoleId) &&
			!platformsQuery.isLoading,
		staleTime: 30_000,
	});

	const [publisher, setPublisher] = useState("");
	const [copyClassification, setCopyClassification] =
		useState<CopyClassificationTag>(CopyClassification.CIB);
	const [copyNotes, setCopyNotes] = useState("");
	const [purchaseAmount, setPurchaseAmount] = useState("");
	const [offerAmount, setOfferAmount] = useState("");
	const [selectedPcProductId, setSelectedPcProductId] = useState<string | null>(
		null,
	);
	const [formError, setFormError] = useState<string | null>(null);
	const [coverPreviewLoadFailed, setCoverPreviewLoadFailed] = useState(false);
	const titleInputRef = useRef<HTMLInputElement>(null);

	const pricingPreviewQuery = useQuery({
		queryKey: ["product-pricing", selectedPcProductId] as const,
		queryFn: () => {
			const sp = new URLSearchParams();
			sp.set("productId", selectedPcProductId ?? "");
			return apiFetch<PriceChartingPricingPreviewDto>(
				`/product-pricing?${sp.toString()}`,
			);
		},
		enabled: Boolean(selectedPcProductId),
		staleTime: 60_000,
	});

	const coverPreviewQuery = useQuery({
		queryKey: ["product-cover-preview", selectedPcProductId] as const,
		queryFn: () => {
			const sp = new URLSearchParams();
			sp.set("productId", selectedPcProductId ?? "");
			return apiFetch<PriceChartingProductCoverPreviewDto>(
				`/product-cover-preview?${sp.toString()}`,
			);
		},
		enabled: Boolean(selectedPcProductId),
		staleTime: 86_400_000,
	});

	useEffect(() => {
		setCoverPreviewLoadFailed(false);
	}, [selectedPcProductId]);

	const baseOfferCents = useMemo(() => {
		const d = pricingPreviewQuery.data;
		if (!d) return null;
		return baseOfferCentsPreview(d, copyClassification);
	}, [pricingPreviewQuery.data, copyClassification]);

	useEffect(() => {
		if (!selectedPcProductId) return;
		if (baseOfferCents == null) return;
		if (!pricingPreviewQuery.isSuccess) return;
		setOfferAmount((baseOfferCents / 100).toFixed(2));
	}, [selectedPcProductId, baseOfferCents, pricingPreviewQuery.isSuccess]);

	const suggestions = suggestionsQuery.data ?? [];
	const showSuggestions =
		suggestOpen &&
		debouncedTitle.trim().length >= 2 &&
		Boolean(priceChartingConsoleId);

	const offerAmountNumeric = useMemo(() => {
		const t = offerAmount.trim();
		if (!t) return null;
		const n = Number.parseFloat(t.replace(/,/g, ""));
		return Number.isFinite(n) ? n : null;
	}, [offerAmount]);
	const showLowOfferWarning =
		offerAmountNumeric != null && offerAmountNumeric < 5;

	const offerSliderCents = useMemo(() => {
		if (baseOfferCents == null) return null;
		const parsedCents =
			offerAmountNumeric != null
				? Math.round(offerAmountNumeric * 100)
				: baseOfferCents;
		const minC = Math.max(100, Math.floor((baseOfferCents * 0.5) / 100) * 100);
		const maxC = Math.max(
			Math.ceil((baseOfferCents * 2) / 100) * 100,
			minC + 100,
		);
		return { minC, maxC, value: Math.min(maxC, Math.max(minC, parsedCents)) };
	}, [baseOfferCents, offerAmountNumeric]);

	function scheduleBlurClose() {
		blurCloseTimer.current = setTimeout(() => setSuggestOpen(false), 180);
	}

	function cancelBlurClose() {
		if (blurCloseTimer.current) clearTimeout(blurCloseTimer.current);
	}

	function applySuggestion(s: PriceChartingProductSuggestionDto) {
		setTitle(s.productName);
		const gid = findBestPriceChartingConsoleIdFromApiConsoleName(s.consoleName);
		if (gid) setPriceChartingConsoleId(gid);
		setSelectedPcProductId(s.id);
		setSuggestOpen(false);
	}

	function resetSelectionPricingState() {
		setSelectedPcProductId(null);
		setOfferAmount("");
	}

	function resetAddForm() {
		setUpc("");
		setTitle("");
		setPriceChartingConsoleId(POPULAR_PRICECHARTING_CONSOLE_IDS[0] ?? "G8");
		setPublisher("");
		setCopyClassification(CopyClassification.CIB);
		setCopyNotes("");
		setPurchaseAmount("");
		setOfferAmount("");
		setSelectedPcProductId(null);
		setSuggestOpen(false);
		setScanError(null);
		setFormError(null);
		queueMicrotask(() => titleInputRef.current?.focus());
	}

	type CreateEditionVars = { stayOnPage?: boolean } | undefined;

	const create = useMutation<EditionDetailDto, Error, CreateEditionVars>({
		mutationFn: () => {
			const trimmed = upc.trim();
			const digits = upc.replace(/\D/g, "");
			if (trimmed.length > 0 && digits.length < 8) {
				throw new Error("UPC must be at least 8 digits when provided");
			}
			return apiFetch<EditionDetailDto>("/editions", {
				method: "POST",
				body: JSON.stringify({
					...(digits.length >= 8 ? { upc: digits } : {}),
					title: title.trim(),
					priceChartingConsoleId,
					publisher: publisher.trim() || undefined,
					syncPriceCharting: true,
					initialCopyClassification: copyClassification,
					initialCopyNotes: copyNotes.trim() || undefined,
					...(purchaseAmount.trim()
						? { initialPurchaseAmount: purchaseAmount.trim() }
						: {}),
					...(offerAmount.trim()
						? {
								initialOfferAmount: offerAmount.trim(),
								initialOfferCurrency: "USD",
							}
						: {}),
				}),
			});
		},
		onSuccess: (edition, variables) => {
			void queryClient.invalidateQueries({ queryKey: ["editions"] });
			void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
			if (variables?.stayOnPage) {
				resetAddForm();
				return;
			}
			void navigate({
				to: "/inventory/$editionId",
				params: { editionId: edition.id },
			});
		},
		onError: (e) => {
			setFormError(e instanceof Error ? e.message : "Failed to create edition");
		},
	});

	return (
		<div className={addPageShellClass}>
			<div className={addPageScrollClass}>
				<div className={addPageScrollInnerClass}>
					<Link to="/inventory" className={backLinkClass}>
						← Inventory
					</Link>

					<h1 className={pageTitleClass}>Add a game</h1>
					<Card>
						<div className={cardHeader}>
							<span
								className={css({
									fontSize: "base",
									fontWeight: "medium",
									color: "foreground",
								})}
							>
								Edition details
							</span>
						</div>
						<div className={cardBody}>
							<form
								id="add-game-form"
								className={formBodyClass}
								onSubmit={(ev) => {
									ev.preventDefault();
									setFormError(null);
									create.mutate(undefined);
								}}
							>
						{formError && <p className={errorClass}>{formError}</p>}

						<Field label="Title" htmlFor="title">
							<Input
								ref={titleInputRef}
								id="title"
								type="text"
								autoComplete="off"
								value={title}
								onChange={(e) => {
									setTitle(e.target.value);
									resetSelectionPricingState();
									setSuggestOpen(true);
								}}
								onFocus={() => {
									cancelBlurClose();
									setSuggestOpen(true);
								}}
								onBlur={scheduleBlurClose}
								onKeyDown={(ev) => {
									if (ev.key === "Escape") setSuggestOpen(false);
								}}
								required
								maxLength={500}
								role="combobox"
								aria-expanded={showSuggestions && suggestions.length > 0}
								aria-controls="pc-title-suggestions"
								aria-autocomplete="list"
							/>
							{showSuggestions && (
								<div
									id="pc-title-suggestions"
									role="listbox"
									className={suggestPanelClass}
									onMouseDown={cancelBlurClose}
								>
									{suggestionsQuery.isFetching && (
										<div
											className={css({
												px: "3",
												py: "2",
												fontSize: "sm",
												color: "foregroundMuted",
											})}
										>
											Searching PriceCharting…
										</div>
									)}
									{!suggestionsQuery.isFetching && suggestionsQuery.isError && (
										<div
											className={css({
												px: "3",
												py: "2",
												fontSize: "sm",
												color: "danger",
											})}
										>
											Could not load suggestions (check API token / network).
										</div>
									)}
									{!suggestionsQuery.isFetching &&
										!suggestionsQuery.isError &&
										suggestions.length === 0 && (
											<div
												className={css({
													px: "3",
													py: "2",
													fontSize: "sm",
													color: "foregroundMuted",
												})}
											>
												No matches — keep typing or enter the title manually.
											</div>
										)}
									{suggestions.map((s) => (
										<button
											key={s.id}
											type="button"
											role="option"
											className={suggestRowClass}
											onMouseDown={(e) => e.preventDefault()}
											onClick={() => applySuggestion(s)}
										>
											<span>{s.productName}</span>
											<span
												className={css({
													color: "foregroundMuted",
													ml: "2",
													fontSize: "xs",
												})}
											>
												{s.consoleName}
											</span>
										</button>
									))}
								</div>
							)}
							<p className={mutedTextClass}>
								Type at least 2 characters for suggestions. Choosing one fills
								the exact PriceCharting title and matching console when
								possible.
							</p>
						</Field>

						{selectedPcProductId && (
							<div className={formGroupClass} aria-live="polite">
								<div
									className={css({
										display: "flex",
										gap: "3",
										alignItems: "flex-start",
									})}
								>
									{(coverPreviewQuery.isPending ||
										(Boolean(coverPreviewQuery.data?.previewImageUrl) &&
											!coverPreviewLoadFailed)) && (
										<div className={coverThumbWrapClass}>
											{coverPreviewQuery.isPending ? (
												<span
													className={css({
														fontSize: "xs",
														color: "foregroundMuted",
													})}
												>
													…
												</span>
											) : coverPreviewQuery.data?.previewImageUrl ? (
												<img
													src={coverPreviewQuery.data.previewImageUrl}
													alt=""
													className={coverThumbImgClass}
													loading="lazy"
													decoding="async"
													referrerPolicy="no-referrer"
													onError={() => setCoverPreviewLoadFailed(true)}
												/>
											) : null}
										</div>
									)}
									<div
										className={css({
											flex: "1",
											minWidth: "0",
											display: "flex",
											flexDir: "column",
											gap: "2",
										})}
									>
										<span
											className={css({
												fontSize: "sm",
												fontWeight: "medium",
												color: "foreground",
											})}
										>
											PriceCharting (FMV)
										</span>
										{pricingPreviewQuery.isFetching && (
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
										{!pricingPreviewQuery.isFetching &&
											pricingPreviewQuery.isError && (
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
										{!pricingPreviewQuery.isFetching &&
											!pricingPreviewQuery.isError &&
											pricingPreviewQuery.data && (
												<>
													{(pricingPreviewQuery.data.productName ||
														pricingPreviewQuery.data.consoleName) && (
														<p
															className={css({
																fontSize: "xs",
																color: "foregroundMuted",
																m: "0",
															})}
														>
															{pricingPreviewQuery.data.productName}
															{pricingPreviewQuery.data.consoleName && (
																<> · {pricingPreviewQuery.data.consoleName}</>
															)}
														</p>
													)}
													<dl className={priceDlClass}>
														<dt className={priceDtClass}>Loose</dt>
														<dd className={priceDdClass}>
															{formatPcCents(
																pricingPreviewQuery.data.loosePrice,
															)}
														</dd>
														<dt className={priceDtClass}>CIB</dt>
														<dd className={priceDdClass}>
															{formatPcCents(
																pricingPreviewQuery.data.cibPrice,
															)}
														</dd>
														<dt className={priceDtClass}>New</dt>
														<dd className={priceDdClass}>
															{formatPcCents(
																pricingPreviewQuery.data.newPrice,
															)}
														</dd>
														<dt className={priceDtClass}>Graded</dt>
														<dd className={priceDdClass}>
															{formatPcCents(
																pricingPreviewQuery.data.gradedPrice,
															)}
														</dd>
														{pricingPreviewQuery.data.salesVolume != null && (
															<>
																<dt className={priceDtClass}>Sales vol.</dt>
																<dd className={priceDdClass}>
																	{pricingPreviewQuery.data.salesVolume.toLocaleString()}
																</dd>
															</>
														)}
													</dl>
													<p className={mutedTextClass}>
														Offer price below starts at the PriceCharting value
														for your selected condition; use the slider or type to
														adjust.
													</p>
												</>
											)}
									</div>
								</div>
							</div>
						)}

						<Field label="Console (PriceCharting)" htmlFor="console">
							<Select
								id="console"
								value={priceChartingConsoleId}
								onValueChange={(v) => {
									setPriceChartingConsoleId(v);
									resetSelectionPricingState();
								}}
								disabled={
									platformsQuery.isLoading || sortedConsoles.length === 0
								}
								items={sortedConsoles.map((c) => ({
									value: c.id,
									label: c.name,
								}))}
							/>
						</Field>

						<Field
							label={
								<>
									UPC{" "}
									<span
										className={css({
											color: "foregroundMuted",
											fontWeight: "normal",
										})}
									>
										(optional, 8–14 digits)
									</span>
								</>
							}
							htmlFor="upc"
						>
							<div
								className={css({
									display: "flex",
									gap: "2",
									alignItems: "center",
								})}
							>
								<Input
									id="upc"
									type="text"
									inputMode="numeric"
									autoComplete="off"
									value={upc}
									onChange={(e) => setUpc(e.target.value)}
									className={css({ flex: "1", width: "auto" })}
								/>
								<Button
									type="button"
									variant="secondary"
									size="sm"
									disabled={isScanning}
									onClick={() => cameraInputRef.current?.click()}
									aria-label="Scan barcode with camera"
								>
									<Camera size={16} />
								</Button>
								<input
									ref={cameraInputRef}
									type="file"
									accept="image/*"
									capture="environment"
									style={{ display: "none" }}
									onChange={handleScan}
								/>
							</div>
							{scanError && (
								<p
									className={css({
										fontSize: "xs",
										color: "danger",
										mt: "1",
										mb: "0",
									})}
								>
									{scanError}
								</p>
							)}
						</Field>

						<Field
							label={
								<>
									Publisher{" "}
									<span
										className={css({
											color: "foregroundMuted",
											fontWeight: "normal",
										})}
									>
										(optional)
									</span>
								</>
							}
							htmlFor="publisher"
						>
							<Input
								id="publisher"
								type="text"
								value={publisher}
								onChange={(e) => setPublisher(e.target.value)}
								maxLength={200}
							/>
						</Field>

						<div className={formGroupClass}>
							<Field label="Condition" htmlFor="copy-class">
								<Select
									id="copy-class"
									value={copyClassification}
									onValueChange={(v) =>
										setCopyClassification(v as CopyClassificationTag)
									}
									items={CLASSIFICATION_OPTIONS.map((x) => ({
										value: x,
										label: x.replace(/_/g, " "),
									}))}
								/>
							</Field>

							<Field label="Notes (optional)" htmlFor="copy-notes">
								<Input
									id="copy-notes"
									value={copyNotes}
									onChange={(e) => setCopyNotes(e.target.value)}
									placeholder="e.g. sealed, sticker on box"
									maxLength={2000}
								/>
							</Field>

							<Field label="Paid (optional)" htmlFor="purchase-amt">
								<Input
									id="purchase-amt"
									type="text"
									inputMode="decimal"
									autoComplete="off"
									value={purchaseAmount}
									onChange={(e) => setPurchaseAmount(e.target.value)}
									placeholder="0.00"
								/>
							</Field>

							<Field label="Asking (optional)" htmlFor="offer-amt">
								<Input
									id="offer-amt"
									type="text"
									inputMode="decimal"
									autoComplete="off"
									value={offerAmount}
									onChange={(e) => setOfferAmount(e.target.value)}
									placeholder="0.00"
								/>
								{offerSliderCents && (
									<input
										type="range"
										className={css({
											w: "100%",
											mt: "2",
											accentColor: "accent",
											cursor: "pointer",
										})}
										min={offerSliderCents.minC}
										max={offerSliderCents.maxC}
										step={100}
										value={offerSliderCents.value}
										aria-label="Adjust asking price"
										onChange={(e) =>
											setOfferAmount((Number(e.target.value) / 100).toFixed(2))
										}
									/>
								)}
								{showLowOfferWarning && (
									<output
										className={lowOfferWarningClass}
										htmlFor="offer-amt"
										aria-live="polite"
									>
										Prices under $5 may sell faster but earn less.
									</output>
								)}
							</Field>
						</div>

								<div
									className={cx(formActionsInnerClass, desktopFormActionsClass)}
								>
									<Button
										type="submit"
										variant="primary"
										disabled={create.isPending}
									>
										{create.isPending ? "Adding..." : "Add"}
									</Button>
									<Button
										type="button"
										variant="secondary"
										disabled={create.isPending}
										onClick={() => {
											setFormError(null);
											create.mutate({ stayOnPage: true });
										}}
									>
										{create.isPending ? "Adding..." : "Add and Create Another"}
									</Button>
									<Link
										to="/inventory"
										className={buttonVariants({
											variant: "ghost",
											size: "md",
										})}
									>
										Cancel
									</Link>
								</div>
							</form>
						</div>
					</Card>
				</div>
			</div>
			<div className={mobileFormActionsBarClass}>
				<div className={formActionsInnerClass}>
					<Button
						type="submit"
						form="add-game-form"
						variant="primary"
						disabled={create.isPending}
					>
						{create.isPending ? "Adding..." : "Add"}
					</Button>
					<Button
						type="button"
						variant="secondary"
						disabled={create.isPending}
						onClick={() => {
							setFormError(null);
							create.mutate({ stayOnPage: true });
						}}
					>
						{create.isPending ? "Adding..." : "Add and Create Another"}
					</Button>
					<Link
						to="/inventory"
						className={buttonVariants({ variant: "ghost", size: "md" })}
					>
						Cancel
					</Link>
				</div>
			</div>
		</div>
	);
}
