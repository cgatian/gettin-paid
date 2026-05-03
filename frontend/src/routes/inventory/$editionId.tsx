import { Dialog } from '@base-ui/react';
import {
	CopyClassification,
	type EditionDetailDto,
	type FetchEditionCoverResponseDto,
	labelPriceChartingConsole,
	type OwnedCopyDto,
	type PriceChartingPricingPreviewDto,
	priceChartingProductBrowseUrl,
	snapshotFmvCentsForClassification,
} from '@gettin-paid/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { css, cx } from 'styled-system/css';
import { Badge } from '#/components/ui/Badge';
import { Button } from '#/components/ui/Button';
import {
	Card,
	cardBody,
	cardHeader,
	formGroupClass,
} from '#/components/ui/Card';
import { Field, Input, inputClass, Label, Select } from '#/components/ui/Input';
import { apiFetch, apiFetchPost, getApiBase } from '#/lib/api';
import { formatMoneyAmount, formatPcCents } from '#/lib/money';
import { playSaleSavedConfetti } from '#/lib/saleConfetti';

export const Route = createFileRoute('/inventory/$editionId')({
	component: EditionDetail,
});

const CLASSIFICATION_OPTIONS = Object.values(CopyClassification);

/** Anchor cents for offer slider + autofill; aligns with Add game flow. */
function baseOfferCentsPreview(
	data: Pick<
		PriceChartingPricingPreviewDto,
		'loosePrice' | 'cibPrice' | 'newPrice' | 'gradedPrice'
	>,
	classification: CopyClassification,
): number | null {
	const mapped = snapshotFmvCentsForClassification(data, classification);
	if (mapped != null) return mapped;
	return data.cibPrice ?? data.loosePrice ?? null;
}

/** Single FMV row label in modals; matches PriceCharting column names where applicable. */
function fmvRowLabel(classification: CopyClassification): string {
	switch (classification) {
		case CopyClassification.LOOSE:
			return 'Loose';
		case CopyClassification.CIB:
			return 'CIB';
		case CopyClassification.SEALED:
			return 'New';
		case CopyClassification.GRADED_SLAB:
			return 'Graded';
		default:
			return classification.replace(/_/g, ' ');
	}
}

/** Normalize stored offer for the edit/add inputs so cents match the slider. */
function formatStoredOfferForInput(raw: string | null | undefined): string {
	const t = raw?.trim() ?? '';
	if (!t) return '';
	const n = Number.parseFloat(t.replace(/,/g, ''));
	return Number.isFinite(n) ? n.toFixed(2) : t;
}

function snapshotToPricingPreview(
	s: NonNullable<EditionDetailDto['snapshot']>,
): Pick<
	PriceChartingPricingPreviewDto,
	| 'productName'
	| 'consoleName'
	| 'loosePrice'
	| 'cibPrice'
	| 'newPrice'
	| 'gradedPrice'
	| 'salesVolume'
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
	display: 'grid',
	gridTemplateColumns: 'auto 1fr',
	columnGap: '4',
	rowGap: '1',
	fontSize: 'sm',
	margin: '0',
});

const priceDtClass = css({
	color: 'foregroundMuted',
	fontWeight: 'normal',
	margin: '0',
});
const priceDdClass = css({ margin: '0', color: 'foreground' });

const mutedHelpClass = css({
	color: 'foregroundMuted',
	fontSize: 'xs',
	mt: '1',
	mb: '0',
});

const lowOfferWarningClass = css({
	display: 'block',
	mt: '2',
	mb: '0',
	fontSize: 'sm',
	color: 'foreground',
	bg: 'rgba(180, 120, 0, 0.08)',
	borderWidth: '1px',
	borderStyle: 'solid',
	borderColor: 'rgba(180, 120, 0, 0.22)',
	borderRadius: 'btn',
	px: '3',
	py: '2',
});

function editionDetailCoverSrc(
	e: Pick<EditionDetailDto, 'id' | 'coverFetchedAt' | 'hasCover'>,
): string | null {
	if (!e.hasCover || !e.coverFetchedAt) return null;
	const base = getApiBase().replace(/\/$/, '');
	const t = Date.parse(e.coverFetchedAt);
	if (!Number.isFinite(t)) return null;
	return `${base}/api/editions/${encodeURIComponent(e.id)}/cover?t=${t}`;
}

function editionConsoleBadge(
	e: Pick<
		EditionDetailDto,
		'priceChartingConsoleId' | 'priceChartingConsoleName'
	>,
) {
	return (
		e.priceChartingConsoleName ??
		labelPriceChartingConsole(e.priceChartingConsoleId)
	);
}

const pageClass = css({ p: '6' });

const backLinkClass = css({
	display: 'inline-flex',
	alignItems: 'center',
	gap: '1',
	fontSize: 'sm',
	color: 'link',
	textDecoration: 'none',
	mb: '5',
	_hover: { color: 'linkHover' },
	transition: 'color 120ms ease',
});

const pageHeaderClass = css({ mb: '6' });

const pageTitleClass = css({
	fontSize: '2xl',
	fontWeight: 'normal',
	color: 'foreground',
	mb: '2',
	letterSpacing: '-0.01em',
});

const metaRowClass = css({
	display: 'flex',
	alignItems: 'center',
	gap: '2',
	flexWrap: 'wrap',
});

const metaTextClass = css({
	fontSize: 'sm',
	color: 'foregroundMuted',
});

const externalLinkClass = css({
	fontSize: 'sm',
	color: 'link',
	textDecoration: 'underline',
	textUnderlineOffset: '2px',
	_hover: { color: 'linkHover' },
});

const gridClass = css({
	display: 'flex',
	flexDir: 'column',
	gap: '4',
	mb: '4',
});

const cardTitleClass = css({
	fontSize: 'base',
	fontWeight: 'medium',
	color: 'foreground',
});

const emptyTextClass = css({
	fontSize: 'sm',
	color: 'foregroundMuted',
	margin: '0',
});

const dlClass = css({
	display: 'grid',
	gridTemplateColumns: 'auto 1fr',
	columnGap: '2',
	rowGap: '1',
	margin: '0',
});

const dtClass = css({ fontSize: 'sm', color: 'foregroundMuted' });

const ddClass = css({
	fontSize: 'sm',
	fontWeight: 'medium',
	color: 'accentGreen',
	margin: '0',
});

const fetchedAtClass = css({
	fontSize: 'xs',
	color: 'foregroundMuted',
	mb: '2',
});

const copiesTableScrollClass = css({
	overflowX: { base: 'visible', md: 'auto' },
	mb: '4',
});

const copiesTableMinClass = css({
	minWidth: { base: '0', md: '740px' },
});

const copiesGridCols =
	'minmax(90px, 100px) minmax(96px, 120px) minmax(72px, 96px) minmax(72px, 96px) minmax(100px, 140px) minmax(0, 1fr) auto';

const copiesHeaderRowClass = css({
	display: { base: 'none', md: 'grid' },
	gridTemplateColumns: copiesGridCols,
	gap: '3',
	alignItems: 'center',
	px: '2',
	pb: '2',
	mb: '2',
	borderBottomWidth: '1px',
	borderBottomStyle: 'solid',
	borderBottomColor: 'border',
	fontSize: 'xs',
	fontWeight: 'medium',
	color: 'foregroundMuted',
	textTransform: 'uppercase',
	letterSpacing: '0.05em',
});

const copyDataRowClass = css({
	display: { base: 'flex', md: 'grid' },
	flexDir: { base: 'column', md: undefined },
	gridTemplateColumns: { md: copiesGridCols },
	gap: '3',
	alignItems: { base: 'stretch', md: 'center' },
	px: '2',
	py: '3',
	fontSize: 'sm',
	borderRadius: { base: 'btn', md: '0' },
	borderWidth: { base: '1px', md: '0' },
	borderStyle: 'solid',
	borderColor: 'borderSubtle',
	mb: { base: '3', md: '0' },
	borderBottomWidth: { base: '1px', md: '1px' },
	borderBottomStyle: 'solid',
	borderBottomColor: 'borderSubtle',
	'&:last-child': {
		mb: { base: '0', md: '0' },
		borderBottomWidth: { md: '0' },
	},
});

const copyRowSoldClass = css({
	bg: { md: 'rgba(66, 148, 110, 0.06)' },
	borderColor: { md: 'rgba(66, 148, 110, 0.22)' },
});

const copyFieldPairClass = css({
	display: { base: 'flex', md: 'contents' },
	flexDir: { base: 'row', md: undefined },
	justifyContent: { base: 'space-between', md: undefined },
	alignItems: { base: 'baseline', md: undefined },
	gap: { base: '4', md: undefined },
	minWidth: '0',
});

const copyFieldPairNotesClass = css({
	display: { base: 'flex', md: 'contents' },
	flexDir: { base: 'column', md: undefined },
	alignItems: { base: 'stretch', md: undefined },
	gap: { base: '1', md: undefined },
	minWidth: '0',
});

const copyMobileLabelClass = css({
	display: { base: 'block', md: 'none' },
	fontSize: 'xs',
	fontWeight: 'medium',
	color: 'foregroundMuted',
	textTransform: 'uppercase',
	letterSpacing: '0.05em',
	flexShrink: '0',
});

const copyCellMutedClass = css({
	fontSize: 'sm',
	color: 'foregroundMuted',
	fontVariantNumeric: 'tabular-nums',
});

const copyCellClass = css({
	fontSize: 'sm',
	color: 'foreground',
	fontVariantNumeric: 'tabular-nums',
});

const copyNotesCellClass = css({
	fontSize: 'sm',
	color: 'foregroundMuted',
	minWidth: '0',
	overflow: { base: 'visible', md: 'hidden' },
	textOverflow: { base: 'clip', md: 'ellipsis' },
	whiteSpace: { base: 'normal', md: 'nowrap' },
	wordBreak: 'break-word',
});

const copyActionsCellClass = css({
	display: 'flex',
	flexDir: { base: 'column', md: 'row' },
	flexWrap: 'wrap',
	gap: '2',
	width: { base: '100%', md: 'auto' },
	alignSelf: { base: 'stretch', md: 'auto' },
	justifyContent: { base: 'stretch', md: 'flex-end' },
	'& button': {
		width: { base: '100%', md: 'auto' },
	},
});

const copyClassClass = css({
	fontWeight: 'medium',
	color: 'foreground',
});

const addCopyFormInnerClass = css({
	display: 'flex',
	flexDir: 'column',
	gap: '3',
});

const formRowClass = css({
	display: 'flex',
	flexDir: { base: 'column', sm: 'row' },
	gap: '3',
	alignItems: { base: 'stretch', sm: 'flex-end' },
	flexWrap: 'wrap',
});

const fieldClass = css({ flex: '1', minWidth: '120px' });

const errorBannerClass = css({
	bg: 'rgba(192,57,43,0.08)',
	borderWidth: '1px',
	borderStyle: 'solid',
	borderColor: 'rgba(192,57,43,0.2)',
	borderRadius: 'btn',
	px: '3',
	py: '2',
	fontSize: 'sm',
	color: 'danger',
	mb: '3',
});

const stateTextClass = css({
	color: 'foregroundMuted',
	fontSize: 'sm',
	p: '6',
});

function pad2(n: number) {
	return String(n).padStart(2, '0');
}

function toDatetimeLocalValue(d: Date) {
	return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function isoToDatetimeLocal(iso: string) {
	return toDatetimeLocalValue(new Date(iso));
}

/** `YYYY-MM-DD` → ISO string at local noon (sale date without time-of-day). */
function dateOnlyToUtcIso(dateStr: string): string {
	const t = dateStr.trim();
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
	if (!m) throw new Error('Invalid date');
	const y = Number(m[1]);
	const mo = Number(m[2]);
	const d = Number(m[3]);
	return new Date(y, mo - 1, d, 12, 0, 0, 0).toISOString();
}

const textInputClass = css({
	display: 'block',
	width: '100%',
	borderWidth: '1px',
	borderStyle: 'solid',
	borderColor: 'border',
	bg: 'background',
	color: 'foreground',
	borderRadius: 'btn',
	px: '3',
	py: '2',
	fontSize: 'sm',
	outline: 'none',
	fontFamily: 'sans',
	_focus: { borderColor: 'accent' },
	_placeholder: { color: 'foregroundMuted' },
});

/** `type="date"` / `type="time"`: 16px avoids iOS zoom; native pickers stay usable on mobile. */
const nativeDateOrTimeInputClass = cx(
	textInputClass,
	css({
		fontSize: 'md',
		lineHeight: '1.25',
	}),
);

const overlayClass = css({
	position: 'fixed',
	inset: 0,
	bg: 'rgba(0,0,0,0.45)',
	zIndex: 100,
});

const modalPanelClass = css({
	position: 'fixed',
	bg: 'surface',
	zIndex: 101,
	display: 'flex',
	flexDir: 'column',
	overflow: 'hidden',
	p: '0',
	/** Mobile: full height, top-aligned. sm+: centered in overlay. */
	top: { base: '0', sm: '50%' },
	bottom: { base: '0', sm: 'auto' },
	left: { base: '0', sm: '50%' },
	right: { base: '0', sm: 'auto' },
	transform: { base: 'none', sm: 'translate(-50%, -50%)' },
	width: { base: '100%', sm: 'calc(100% - 2rem)' },
	maxWidth: { base: '100%', sm: '420px' },
	maxHeight: {
		sm: 'min(90dvh, calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 2rem))',
	},
	borderStyle: 'solid',
	borderColor: 'border',
	borderRadius: { base: '0', sm: 'card' },
	borderWidth: { base: '0', sm: '1px' },
	boxShadow: { base: 'none', sm: 'md' },
});

/** Wider copy modals — keep full width on small screens. */
const modalPanelMax520Class = css({
	maxWidth: { base: '100%', sm: '520px' },
});

const modalPanelMax460Class = css({
	maxWidth: { base: '100%', sm: '460px' },
});

const modalTitleClass = css({
	fontSize: 'lg',
	fontWeight: 'medium',
	color: 'foreground',
	mb: '4',
	mt: '0',
	flexShrink: '0',
	pt: {
		base: 'calc({spacing.5} + env(safe-area-inset-top, 0px))',
		sm: '5',
	},
	pl: 'calc({spacing.5} + env(safe-area-inset-left, 0px))',
	pr: 'calc({spacing.5} + env(safe-area-inset-right, 0px))',
});

const modalBodyScrollClass = css({
	flex: '1',
	minH: '0',
	overflowY: 'auto',
	WebkitOverflowScrolling: 'touch',
	overscrollBehavior: 'contain',
	pl: 'calc({spacing.5} + env(safe-area-inset-left, 0px))',
	pr: 'calc({spacing.5} + env(safe-area-inset-right, 0px))',
	pb: '4',
});

const modalFooterClass = css({
	flexShrink: '0',
	display: 'flex',
	flexDir: { base: 'column-reverse', sm: 'row' },
	gap: '3',
	justifyContent: { base: 'stretch', sm: 'flex-end' },
	pt: '3',
	pb: 'calc({spacing.5} + env(safe-area-inset-bottom, 0px))',
	pl: 'calc({spacing.5} + env(safe-area-inset-left, 0px))',
	pr: 'calc({spacing.5} + env(safe-area-inset-right, 0px))',
	borderTopWidth: '1px',
	borderTopStyle: 'solid',
	borderTopColor: 'border',
	bg: 'surface',
});

const modalFormColumnClass = css({
	display: 'flex',
	flexDir: 'column',
	flex: '1',
	minH: '0',
	overflow: 'hidden',
	width: '100%',
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
	const [notes, setNotes] = useState('');
	const [sellCopyId, setSellCopyId] = useState<string | null>(null);
	const [sellAmount, setSellAmount] = useState('');
	const [sellDateOnly, setSellDateOnly] = useState(() =>
		toDatetimeLocalValue(new Date()).slice(0, 10),
	);
	const [sellError, setSellError] = useState<string | null>(null);

	const [editCopyId, setEditCopyId] = useState<string | null>(null);
	const [editClassification, setEditClassification] =
		useState<CopyClassification>(CopyClassification.CIB);
	const [editNotes, setEditNotes] = useState('');
	const [editOfferAmount, setEditOfferAmount] = useState('');
	const [editCopyError, setEditCopyError] = useState<string | null>(null);
	const [addCopyModalOpen, setAddCopyModalOpen] = useState(false);
	const [addCopyOfferAmount, setAddCopyOfferAmount] = useState('');
	const [addCopyPurchaseAmount, setAddCopyPurchaseAmount] = useState('');
	const addCopyDialogPopupRef = useRef<HTMLDivElement>(null);
	const editCopyDialogPopupRef = useRef<HTMLDivElement>(null);
	/** Tracks classification when Edit copy opened; used to apply FMV only after user changes class. */
	const prevEditClassificationForOfferRef = useRef<CopyClassification | null>(
		null,
	);
	/** True when Edit copy opened with no offer text (may still get FMV once pricing/slider is ready). */
	const editOpenedWithEmptyOfferRef = useRef(false);
	/** After first FMV fill from slider for an opened-empty copy; avoids refilling if user clears the field. */
	const editOfferSliderHydratedRef = useRef(false);

	const q = useQuery({
		queryKey: ['edition', editionId],
		queryFn: () => apiFetch<EditionDetailDto>(`/editions/${editionId}`),
	});

	const addCopyPricingQuery = useQuery({
		queryKey: ['product-pricing', q.data?.priceChartingProductId] as const,
		queryFn: () => {
			const sp = new URLSearchParams();
			sp.set('productId', q.data?.priceChartingProductId ?? '');
			return apiFetch<PriceChartingPricingPreviewDto>(
				`/product-pricing?${sp.toString()}`,
			);
		},
		enabled:
			(addCopyModalOpen || editCopyId !== null) &&
			Boolean(q.data?.priceChartingProductId),
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
		const n = Number.parseFloat(t.replace(/,/g, ''));
		return Number.isFinite(n) ? n : null;
	}, [addCopyOfferAmount]);

	const addCopyShowLowOfferWarning =
		addCopyOfferAmountNumeric != null && addCopyOfferAmountNumeric < 5;

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

	const editCopyBaseOfferCents = useMemo(() => {
		if (!addCopyEffectivePricing) return null;
		return baseOfferCentsPreview(addCopyEffectivePricing, editClassification);
	}, [addCopyEffectivePricing, editClassification]);

	const editOfferAmountNumeric = useMemo(() => {
		const t = editOfferAmount.trim();
		if (!t) return null;
		const n = Number.parseFloat(t.replace(/,/g, ''));
		return Number.isFinite(n) ? n : null;
	}, [editOfferAmount]);

	const editCopyShowLowOfferWarning =
		editOfferAmountNumeric != null && editOfferAmountNumeric < 5;

	const editCopyOfferSliderCents = useMemo(() => {
		if (editCopyBaseOfferCents == null) return null;
		const parsedCents =
			editOfferAmountNumeric != null
				? Math.round(editOfferAmountNumeric * 100)
				: editCopyBaseOfferCents;
		const minC = Math.max(
			100,
			Math.floor((editCopyBaseOfferCents * 0.5) / 100) * 100,
		);
		const maxC = Math.max(
			Math.ceil((editCopyBaseOfferCents * 2) / 100) * 100,
			minC + 100,
		);
		return {
			minC,
			maxC,
			value: Math.min(maxC, Math.max(minC, parsedCents)),
		};
	}, [editCopyBaseOfferCents, editOfferAmountNumeric]);

	/** Keep text input aligned with the range slider after clamp (classification / FMV range changes). */
	useEffect(() => {
		if (editCopyId === null || !editCopyOfferSliderCents) return;
		if (editOfferAmountNumeric == null) return;
		const rawCents = Math.round(editOfferAmountNumeric * 100);
		const clamped = editCopyOfferSliderCents.value;
		if (rawCents !== clamped) {
			setEditOfferAmount((clamped / 100).toFixed(2));
		}
	}, [
		editCopyId,
		editCopyOfferSliderCents?.value,
		editCopyOfferSliderCents?.minC,
		editCopyOfferSliderCents?.maxC,
		editOfferAmountNumeric,
		editCopyOfferSliderCents,
	]);

	/** Opened with no offer and no snapshot FMV: when slider becomes available, match input to slider once. */
	useEffect(() => {
		if (editCopyId === null) return;
		if (!editOpenedWithEmptyOfferRef.current) return;
		if (!editCopyOfferSliderCents) return;
		if (editOfferSliderHydratedRef.current) return;
		editOfferSliderHydratedRef.current = true;
		setEditOfferAmount((editCopyOfferSliderCents.value / 100).toFixed(2));
	}, [editCopyId, editCopyOfferSliderCents]);

	useEffect(() => {
		if (!addCopyModalOpen) return;
		if (addCopyBaseOfferCents == null) return;
		setAddCopyOfferAmount((addCopyBaseOfferCents / 100).toFixed(2));
	}, [addCopyModalOpen, addCopyBaseOfferCents]);

	/** When classification changes in Edit copy, set offer (and slider) to FMV for that class. */
	useEffect(() => {
		if (editCopyId === null) return;
		if (editCopyBaseOfferCents == null) return;
		const prev = prevEditClassificationForOfferRef.current;
		if (prev !== editClassification) {
			prevEditClassificationForOfferRef.current = editClassification;
			setEditOfferAmount((editCopyBaseOfferCents / 100).toFixed(2));
		}
	}, [editCopyId, editClassification, editCopyBaseOfferCents]);

	const refresh = useMutation({
		mutationFn: () =>
			apiFetch<EditionDetailDto>(`/editions/${editionId}/refresh-market`, {
				method: 'POST',
			}),
		onSuccess: (data) => {
			setRefreshError(null);
			queryClient.setQueryData(['edition', editionId], data);
			void queryClient.invalidateQueries({ queryKey: ['editions'] });
			void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
		},
		onError: (e) => {
			setRefreshError(e instanceof Error ? e.message : 'Refresh failed');
		},
	});

	const fetchCoverArt = useMutation({
		mutationFn: (force: boolean) =>
			apiFetchPost<FetchEditionCoverResponseDto>(
				`/editions/${editionId}/fetch-cover${force ? '?force=true' : ''}`,
			),
		onSuccess: (data) => {
			setFetchCoverError(null);
			const { coverAlreadyStored: _skipped, ...edition } = data;
			void _skipped;
			queryClient.setQueryData(['edition', editionId], edition);
			void queryClient.invalidateQueries({ queryKey: ['editions'] });
		},
		onError: (e) => {
			setFetchCoverError(
				e instanceof Error ? e.message : 'Could not fetch cover',
			);
		},
	});

	const addCopy = useMutation({
		mutationFn: () =>
			apiFetch<OwnedCopyDto>(`/editions/${editionId}/copies`, {
				method: 'POST',
				body: JSON.stringify({
					copyClassification: classification,
					classificationNotes: notes.trim() || undefined,
					...(addCopyPurchaseAmount.trim()
						? {
								purchaseAmount: addCopyPurchaseAmount.trim(),
								purchaseCurrency: 'USD',
							}
						: {}),
					...(addCopyOfferAmount.trim()
						? {
								offerAmount: addCopyOfferAmount.trim(),
								offerCurrency: 'USD',
							}
						: {}),
				}),
			}),
		onSuccess: () => {
			setCopyError(null);
			setNotes('');
			setAddCopyOfferAmount('');
			setAddCopyPurchaseAmount('');
			setAddCopyModalOpen(false);
			void q.refetch();
			void queryClient.invalidateQueries({ queryKey: ['editions'] });
			void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
		},
		onError: (e) => {
			setCopyError(e instanceof Error ? e.message : 'Could not add copy');
		},
	});

	function closeAddCopyModal() {
		setAddCopyModalOpen(false);
		setCopyError(null);
		setAddCopyOfferAmount('');
		setAddCopyPurchaseAmount('');
	}

	function openSellModal(c: OwnedCopyDto) {
		setAddCopyModalOpen(false);
		setEditCopyId(null);
		setEditCopyError(null);
		setSellCopyId(c.id);
		const edition = q.data;
		if (c.soldAt != null && c.soldAmount?.trim()) {
			setSellAmount(formatStoredOfferForInput(c.soldAmount));
		} else {
			let initial = formatStoredOfferForInput(c.offerAmount);
			if (!initial && edition?.snapshot) {
				const cents = baseOfferCentsPreview(
					snapshotToPricingPreview(edition.snapshot),
					c.copyClassification,
				);
				if (cents != null) initial = (cents / 100).toFixed(2);
			}
			setSellAmount(initial);
		}
		setSellDateOnly(
			c.soldAt
				? isoToDatetimeLocal(c.soldAt).slice(0, 10)
				: toDatetimeLocalValue(new Date()).slice(0, 10),
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
		prevEditClassificationForOfferRef.current = c.copyClassification;
		setEditNotes(c.classificationNotes ?? '');

		const edition = q.data;
		let initialOffer = formatStoredOfferForInput(c.offerAmount);
		if (!initialOffer && edition?.snapshot) {
			const cents = baseOfferCentsPreview(
				snapshotToPricingPreview(edition.snapshot),
				c.copyClassification,
			);
			if (cents != null) initialOffer = (cents / 100).toFixed(2);
		}
		setEditOfferAmount(initialOffer);
		editOpenedWithEmptyOfferRef.current = !initialOffer;
		editOfferSliderHydratedRef.current = false;

		setEditCopyError(null);
	}

	function closeEditCopyModal() {
		setEditCopyId(null);
		prevEditClassificationForOfferRef.current = null;
		editOpenedWithEmptyOfferRef.current = false;
		editOfferSliderHydratedRef.current = false;
		setEditCopyError(null);
	}

	const updateCopyMeta = useMutation({
		mutationFn: async () => {
			const id = editCopyId;
			if (!id) throw new Error('No copy selected');
			const trimmedOffer = editOfferAmount.trim();
			const body: Record<string, unknown> = {
				copyClassification: editClassification,
				classificationNotes: editNotes.trim() || null,
			};
			if (trimmedOffer) {
				body.offerAmount = trimmedOffer;
				body.offerCurrency = 'USD';
			} else {
				body.offerAmount = null;
				body.offerCurrency = null;
			}
			return apiFetch<OwnedCopyDto>(`/copies/${id}`, {
				method: 'PATCH',
				body: JSON.stringify(body),
			});
		},
		onSuccess: () => {
			closeEditCopyModal();
			void q.refetch();
			void queryClient.invalidateQueries({ queryKey: ['editions'] });
			void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
		},
		onError: (e) => {
			setEditCopyError(
				e instanceof Error ? e.message : 'Could not update copy',
			);
		},
	});

	const markSold = useMutation({
		mutationFn: async () => {
			const id = sellCopyId;
			if (!id) throw new Error('No copy selected');
			const amt = sellAmount.trim();
			if (!amt) throw new Error('Enter the sale amount');
			let soldAtIso: string;
			try {
				soldAtIso = dateOnlyToUtcIso(sellDateOnly);
			} catch {
				throw new Error('Invalid sale date');
			}
			return apiFetch<OwnedCopyDto>(`/copies/${id}`, {
				method: 'PATCH',
				body: JSON.stringify({
					soldAmount: amt,
					soldCurrency: 'USD',
					soldAt: soldAtIso,
				}),
			});
		},
		onSuccess: () => {
			closeSellModal();
			queueMicrotask(() => playSaleSavedConfetti());
			void q.refetch();
			void queryClient.invalidateQueries({ queryKey: ['editions'] });
			void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
		},
		onError: (e) => {
			setSellError(e instanceof Error ? e.message : 'Could not save sale');
		},
	});

	const deleteGame = useMutation({
		mutationFn: () =>
			apiFetch<void>(`/editions/${editionId}`, { method: 'DELETE' }),
		onSuccess: () => {
			setDeleteModalOpen(false);
			setDeleteError(null);
			void queryClient.removeQueries({ queryKey: ['edition', editionId] });
			void queryClient.invalidateQueries({ queryKey: ['editions'] });
			void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
			void navigate({ to: '/inventory' });
		},
		onError: (e) => {
			setDeleteError(e instanceof Error ? e.message : 'Could not delete game');
		},
	});

	const copiesSorted = useMemo(() => {
		const copies = q.data?.copies;
		if (!copies) return [];
		return [...copies].sort((a, b) => {
			const aSold = a.soldAt != null ? 1 : 0;
			const bSold = b.soldAt != null ? 1 : 0;
			return aSold - bSold;
		});
	}, [q.data?.copies]);

	const sellingCopy = useMemo(() => {
		const edition = q.data;
		if (!edition || sellCopyId === null) return undefined;
		return edition.copies.find((c) => c.id === sellCopyId);
	}, [q.data, sellCopyId]);

	const sellAmountNumeric = useMemo(() => {
		const t = sellAmount.trim();
		if (!t) return null;
		const n = Number.parseFloat(t.replace(/,/g, ''));
		return Number.isFinite(n) ? n : null;
	}, [sellAmount]);

	const sellSliderAnchorDollars = useMemo(() => {
		const c = sellingCopy;
		const edition = q.data;
		if (!c || !edition) return null;
		if (c.soldAt != null && c.soldAmount?.trim()) {
			const sold = Number.parseFloat(c.soldAmount.replace(/,/g, ''));
			if (Number.isFinite(sold) && sold > 0) return sold;
		}
		const offerTrim = c.offerAmount?.trim();
		if (offerTrim) {
			const o = Number.parseFloat(offerTrim.replace(/,/g, ''));
			if (Number.isFinite(o) && o > 0) return o;
		}
		if (edition.snapshot) {
			const cents = baseOfferCentsPreview(
				snapshotToPricingPreview(edition.snapshot),
				c.copyClassification,
			);
			if (cents != null) return cents / 100;
		}
		return null;
	}, [sellingCopy, q.data]);

	const sellSliderDollars = useMemo(() => {
		const anchor = sellSliderAnchorDollars;
		const parsed = sellAmountNumeric;
		let minD: number;
		let maxD: number;
		if (anchor != null && anchor > 0) {
			minD = Math.max(1, Math.floor(anchor * 0.5));
			maxD = Math.max(Math.ceil(anchor * 2), minD + 1);
		} else {
			minD = 1;
			maxD = 500;
		}
		const raw =
			parsed != null && Number.isFinite(parsed)
				? Math.round(parsed)
				: anchor != null && anchor > 0
					? Math.round(anchor)
					: minD;
		const value = Math.min(maxD, Math.max(minD, raw));
		return { minD, maxD, value };
	}, [sellSliderAnchorDollars, sellAmountNumeric]);

	useEffect(() => {
		if (sellCopyId === null) return;
		if (sellAmountNumeric == null) return;
		const rounded = Math.round(sellAmountNumeric);
		if (rounded !== sellSliderDollars.value) {
			setSellAmount(sellSliderDollars.value.toFixed(2));
		}
	}, [sellCopyId, sellSliderDollars.value, sellAmountNumeric]);

	if (q.isLoading) {
		return <p className={stateTextClass}>Loading…</p>;
	}

	if (q.isError || !q.data) {
		return (
			<div className={pageClass}>
				<p className={css({ color: 'danger', mb: '3' })}>
					{q.error instanceof Error ? q.error.message : 'Edition not found'}
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
						display: 'flex',
						flexDir: { base: 'column', md: 'row' },
						gap: '6',
						alignItems: { base: 'stretch', md: 'flex-start' },
						mb: '2',
					})}
				>
					<div
						className={css({
							flexShrink: '0',
							width: { base: '100%', md: '160px' },
							maxW: '100%',
						})}
					>
						{editionDetailCoverSrc(e) ? (
							<img
								src={editionDetailCoverSrc(e) ?? ''}
								alt={e.title}
								className={css({
									width: '100%',
									maxH: '240px',
									objectFit: 'contain',
									borderRadius: 'card',
									borderWidth: '1px',
									borderStyle: 'solid',
									borderColor: 'border',
									bg: 'surface',
								})}
							/>
						) : (
							<div
								className={css({
									width: '100%',
									minH: '120px',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									borderRadius: 'card',
									borderWidth: '1px',
									borderStyle: 'dashed',
									borderColor: 'border',
									color: 'foregroundMuted',
									fontSize: 'sm',
								})}
							>
								No cover yet
							</div>
						)}
					</div>
					<div className={css({ flex: '1', minW: '0' })}>
						<div
							className={css({
								display: 'flex',
								flexDir: { base: 'column', sm: 'row' },
								justifyContent: { base: 'flex-start', sm: 'space-between' },
								alignItems: { base: 'flex-start', sm: 'flex-start' },
								gap: '4',
								flexWrap: 'wrap',
								mb: '2',
							})}
						>
							<h1 className={cx(pageTitleClass, css({ mb: '0' }))}>
								{e.title}
							</h1>
							<div
								className={css({
									display: 'flex',
									flexWrap: 'wrap',
									gap: '2',
									alignItems: 'center',
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
											? 'Cover…'
											: e.hasCover
												? 'Refresh cover'
												: 'Fetch cover'}
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
								display: 'flex',
								flexDir: 'column',
								alignItems: 'flex-start',
								gap: '1',
							})}
						>
							<div className={metaRowClass}>
								<Badge variant="default">{editionConsoleBadge(e)}</Badge>
								{e.upc != null && e.upc !== '' ? (
									<span className={metaTextClass}>UPC {e.upc}</span>
								) : (
									<span className={metaTextClass}>No UPC</span>
								)}
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
							<p className={css({ fontSize: 'sm', color: 'danger', mt: '2' })}>
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
							{refresh.isPending ? 'Refreshing…' : 'Refresh'}
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
													margin: '0',
													fontSize: 'sm',
													color: 'foreground',
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
								display: 'flex',
								alignItems: 'center',
								gap: '2',
								flexWrap: 'wrap',
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
								setAddCopyOfferAmount('');
								setAddCopyPurchaseAmount('');
								setAddCopyModalOpen(true);
							}}
						>
							+ Add copy
						</Button>
					</div>
					<div className={cardBody}>
						{e.copies.length === 0 ? (
							<p className={emptyTextClass}>
								No copies logged yet. Use{' '}
								<strong className={css({ color: 'foreground' })}>
									Add copy
								</strong>{' '}
								above to log one.
							</p>
						) : (
							<div className={copiesTableScrollClass}>
								<div className={copiesTableMinClass}>
									<div className={copiesHeaderRowClass}>
										<span>Status</span>
										<span>Class</span>
										<span className={css({ textAlign: 'right' })}>Paid</span>
										<span className={css({ textAlign: 'right' })}>Offer</span>
										<span>Sale</span>
										<span>Notes</span>
										<span />
									</div>
									{copiesSorted.map((c: OwnedCopyDto) => (
										<div
											key={c.id}
											className={cx(
												copyDataRowClass,
												c.soldAt != null && copyRowSoldClass,
											)}
										>
											<div className={copyFieldPairClass}>
												<span className={copyMobileLabelClass}>Status</span>
												<span
													className={css({
														textAlign: { base: 'right', md: 'left' },
													})}
												>
													<Badge
														variant={c.soldAt != null ? 'green' : 'purple'}
													>
														{c.soldAt != null ? 'Sold' : 'Available'}
													</Badge>
												</span>
											</div>
											<div className={copyFieldPairClass}>
												<span className={copyMobileLabelClass}>Class</span>
												<span
													className={cx(
														copyClassClass,
														css({
															textAlign: { base: 'right', md: 'left' },
														}),
													)}
												>
													{c.copyClassification.replace(/_/g, ' ')}
												</span>
											</div>
											<div className={copyFieldPairClass}>
												<span className={copyMobileLabelClass}>Paid</span>
												<span className={css({ textAlign: 'right' })}>
													{c.purchaseAmount != null ? (
														<span className={copyCellClass}>
															{formatMoneyAmount(c.purchaseAmount)}
														</span>
													) : (
														<span className={copyCellMutedClass}>—</span>
													)}
												</span>
											</div>
											<div className={copyFieldPairClass}>
												<span className={copyMobileLabelClass}>Offer</span>
												<span className={css({ textAlign: 'right' })}>
													{c.offerAmount != null ? (
														<span className={copyCellClass}>
															{formatMoneyAmount(c.offerAmount)}
														</span>
													) : (
														<span className={copyCellMutedClass}>—</span>
													)}
												</span>
											</div>
											<div className={copyFieldPairClass}>
												<span className={copyMobileLabelClass}>Sale</span>
												<div
													className={css({
														textAlign: { base: 'right', md: 'left' },
														minWidth: '0',
													})}
												>
													{c.soldAt != null ? (
														<span
															className={css({
																fontSize: 'sm',
																color: 'accentGreen',
																fontWeight: 'medium',
															})}
														>
															{formatMoneyAmount(c.soldAmount ?? '0')} ·{' '}
															{new Date(c.soldAt).toLocaleDateString()}
														</span>
													) : (
														<span className={copyCellMutedClass}>—</span>
													)}
												</div>
											</div>
											<div className={copyFieldPairNotesClass}>
												<span className={copyMobileLabelClass}>Notes</span>
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
														: '—'}
												</div>
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
													{c.soldAt != null ? 'Edit sale' : 'Mark sold'}
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
						ref={addCopyDialogPopupRef}
						className={cx(modalPanelClass, modalPanelMax520Class)}
					>
						<form
							className={modalFormColumnClass}
							onSubmit={(ev) => {
								ev.preventDefault();
								setCopyError(null);
								addCopy.mutate();
							}}
						>
							<Dialog.Title className={modalTitleClass}>
								Add copy
								<span
									className={css({
										display: 'block',
										fontSize: 'xs',
										fontWeight: 'normal',
										color: 'foregroundMuted',
										mt: '1',
									})}
								>
									{e.title}
								</span>
							</Dialog.Title>
							<div className={cx(addCopyFormInnerClass, modalBodyScrollClass)}>
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
												label: x.replace(/_/g, ' '),
											}))}
											portalContainer={addCopyDialogPopupRef}
										/>
									</div>
									<div className={css({ flex: '2', minWidth: '120px' })}>
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
												fontSize: 'sm',
												fontWeight: 'medium',
												color: 'foreground',
											})}
										>
											PriceCharting (FMV)
										</span>
										{e.priceChartingProductId &&
											addCopyPricingQuery.isFetching &&
											!addCopyEffectivePricing && (
												<p
													className={css({
														fontSize: 'sm',
														color: 'foregroundMuted',
														mb: '0',
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
														fontSize: 'sm',
														color: 'danger',
														mb: '0',
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
															fontSize: 'xs',
															color: 'foregroundMuted',
															m: '0',
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

									<Field label="Asking (optional)" htmlFor="add-copy-offer-amt">
										<Input
											id="add-copy-offer-amt"
											type="text"
											inputMode="decimal"
											autoComplete="off"
											value={addCopyOfferAmount}
											onChange={(ev) => setAddCopyOfferAmount(ev.target.value)}
											placeholder="0.00"
											className={inputClass}
										/>
										{addCopyOfferSliderCents && (
											<input
												type="range"
												className={css({
													w: '100%',
													mt: '2',
													accentColor: 'accent',
													cursor: 'pointer',
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
												htmlFor="add-copy-offer-amt"
												aria-live="polite"
											>
												Prices under $5 may sell faster but earn less.
											</output>
										)}
									</Field>
								</div>
							</div>

							<div className={modalFooterClass}>
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
									{addCopy.isPending ? 'Adding…' : 'Add copy'}
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
						ref={editCopyDialogPopupRef}
						className={cx(modalPanelClass, modalPanelMax460Class)}
					>
						<form
							className={modalFormColumnClass}
							onSubmit={(ev) => {
								ev.preventDefault();
								setEditCopyError(null);
								updateCopyMeta.mutate();
							}}
						>
							<Dialog.Title className={modalTitleClass}>
								Edit copy
								{editingCopy && (
									<span
										className={css({
											display: 'block',
											fontSize: 'xs',
											fontWeight: 'normal',
											color: 'foregroundMuted',
											mt: '1',
										})}
									>
										{e.title}
									</span>
								)}
							</Dialog.Title>
							<div
								className={cx(
									modalBodyScrollClass,
									css({
										display: 'flex',
										flexDir: 'column',
										gap: '3',
									}),
								)}
							>
								{editCopyError && (
									<p className={errorBannerClass}>{editCopyError}</p>
								)}
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
											label: x.replace(/_/g, ' '),
										}))}
										portalContainer={editCopyDialogPopupRef}
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
								{(e.snapshot || e.priceChartingProductId) && (
									<div className={formGroupClass} aria-live="polite">
										<span
											className={css({
												fontSize: 'sm',
												fontWeight: 'medium',
												color: 'foreground',
											})}
										>
											PriceCharting (FMV)
										</span>
										{e.priceChartingProductId &&
											addCopyPricingQuery.isFetching &&
											!addCopyEffectivePricing && (
												<p
													className={css({
														fontSize: 'sm',
														color: 'foregroundMuted',
														mb: '0',
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
														fontSize: 'sm',
														color: 'danger',
														mb: '0',
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
															fontSize: 'xs',
															color: 'foregroundMuted',
															m: '0',
														})}
													>
														{addCopyEffectivePricing.productName}
														{addCopyEffectivePricing.consoleName && (
															<> · {addCopyEffectivePricing.consoleName}</>
														)}
													</p>
												)}
												<dl className={priceDlClass}>
													<dt className={priceDtClass}>
														{fmvRowLabel(editClassification)}
													</dt>
													<dd className={priceDdClass}>
														{formatPcCents(editCopyBaseOfferCents)}
													</dd>
												</dl>
											</>
										)}
									</div>
								)}
								<div>
									<Label htmlFor="edit-offer-amt">
										Offer / asking price (optional)
									</Label>
									<input
										id="edit-offer-amt"
										type="text"
										inputMode="decimal"
										autoComplete="off"
										value={editOfferAmount}
										onChange={(ev) => setEditOfferAmount(ev.target.value)}
										placeholder="0.00"
										className={textInputClass}
									/>
									{editCopyOfferSliderCents && (
										<input
											type="range"
											className={css({
												w: '100%',
												mt: '2',
												accentColor: 'accent',
												cursor: 'pointer',
											})}
											min={editCopyOfferSliderCents.minC}
											max={editCopyOfferSliderCents.maxC}
											step={100}
											value={editCopyOfferSliderCents.value}
											aria-label="Adjust asking price"
											onChange={(ev) =>
												setEditOfferAmount(
													(Number(ev.target.value) / 100).toFixed(2),
												)
											}
										/>
									)}
									{editCopyShowLowOfferWarning && (
										<output
											className={lowOfferWarningClass}
											htmlFor="edit-offer-amt"
											aria-live="polite"
										>
											Prices under $5 may sell faster but earn less.
										</output>
									)}
									<p
										className={css({
											fontSize: 'xs',
											color: 'foregroundMuted',
											mt: '1',
											mb: '0',
										})}
									>
										Leave amount empty to remove a proposed price.
									</p>
								</div>
							</div>

							<div className={modalFooterClass}>
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
									{updateCopyMeta.isPending ? 'Saving…' : 'Save changes'}
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
						<form
							className={modalFormColumnClass}
							onSubmit={(ev) => {
								ev.preventDefault();
								setSellError(null);
								markSold.mutate();
							}}
						>
							<Dialog.Title className={modalTitleClass}>
								{sellingCopy?.soldAt != null
									? 'Edit sale'
									: 'Mark copy as sold'}
							</Dialog.Title>
							<div
								className={cx(
									modalBodyScrollClass,
									css({
										display: 'flex',
										flexDir: 'column',
										gap: '3',
									}),
								)}
							>
								{sellError && <p className={errorBannerClass}>{sellError}</p>}
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
									<p
										className={css({
											fontSize: 'xs',
											color: 'foregroundMuted',
											mt: '1',
											mb: '0',
										})}
									>
										{sellingCopy?.soldAt != null
											? 'Adjust the recorded sale amount.'
											: sellSliderAnchorDollars != null
												? 'Defaults to your proposed price (FMV if unset). Use the slider for quick $1 steps.'
												: 'Use the slider for quick $1 steps.'}
									</p>
									<input
										type="range"
										className={css({
											w: '100%',
											mt: '2',
											accentColor: 'accent',
											cursor: 'pointer',
										})}
										min={sellSliderDollars.minD}
										max={sellSliderDollars.maxD}
										step={1}
										value={sellSliderDollars.value}
										aria-label="Adjust sale amount in whole dollars"
										onChange={(ev) =>
											setSellAmount(Number(ev.target.value).toFixed(2))
										}
									/>
									<p
										className={css({
											fontSize: 'xs',
											color: 'foregroundMuted',
											mt: '1',
											mb: '0',
											fontVariantNumeric: 'tabular-nums',
										})}
									>
										${sellSliderDollars.minD} – ${sellSliderDollars.maxD} · step
										$1
									</p>
								</div>
								<div>
									<Label htmlFor="sell-date">Sold date</Label>
									<input
										id="sell-date"
										type="date"
										autoComplete="off"
										value={sellDateOnly}
										onChange={(ev) => {
											const d = ev.target.value;
											if (d) setSellDateOnly(d);
										}}
										className={nativeDateOrTimeInputClass}
									/>
								</div>
							</div>
							<div className={modalFooterClass}>
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
									{markSold.isPending ? 'Saving…' : 'Save sale'}
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
						<div className={modalBodyScrollClass}>
							<p
								className={css({
									fontSize: 'sm',
									color: 'foregroundMuted',
									lineHeight: '1.5',
									margin: '0',
									mb: '4',
								})}
							>
								This permanently removes{' '}
								<strong className={css({ color: 'foreground' })}>
									{e.title}
								</strong>{' '}
								and all copies you logged, including sale records. The market
								snapshot is removed too. This cannot be undone.
							</p>
							{deleteError && <p className={errorBannerClass}>{deleteError}</p>}
						</div>
						<div className={modalFooterClass}>
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
								{deleteGame.isPending ? 'Deleting…' : 'Delete game'}
							</Button>
						</div>
					</Dialog.Popup>
				</Dialog.Portal>
			</Dialog.Root>
		</div>
	);
}
