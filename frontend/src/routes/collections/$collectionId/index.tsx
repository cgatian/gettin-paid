import type { DashboardSummaryDto, GameCollectionSummaryDto, GameEditionDto } from '@gettin-paid/shared';
import { coerceCollectionBadgeColor, DEFAULT_COLLECTION_BADGE_COLOR } from '@gettin-paid/shared';
import { Dialog } from '@base-ui/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { Settings } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { css } from 'styled-system/css';
import { CollectionBadgeColorSwatches } from '#/components/CollectionBadgeColorSwatches';
import { DashboardSummaryPanel } from '#/components/DashboardSummaryPanel';
import { InventoryEditionList } from '#/components/InventoryEditionList';
import { Button, buttonVariants } from '#/components/ui/Button';
import { Field, Input } from '#/components/ui/Input';
import { apiFetch, apiFetchPatch } from '#/lib/api';

export const Route = createFileRoute('/collections/$collectionId/')({
	component: CollectionDetailPage,
});

const pageClass = css({ p: '6' });

const topRowClass = css({
	display: 'flex',
	flexDir: { base: 'column', md: 'row' },
	alignItems: { base: 'stretch', md: 'flex-start' },
	justifyContent: 'space-between',
	gap: '4',
	mb: '6',
});

const titleBlockClass = css({ minW: '0', flex: '1' });

const titleClass = css({
	fontSize: '2xl',
	fontWeight: 'normal',
	color: 'foreground',
	m: '0 0 8px 0',
	letterSpacing: '-0.01em',
});

const descClass = css({
	fontSize: 'sm',
	color: 'foregroundMuted',
	m: '0',
	lineHeight: '1.5',
});

const overlayClass = css({
	position: 'fixed',
	inset: '0',
	bg: 'rgba(0,0,0,0.55)',
	zIndex: 'modal',
});

const modalClass = css({
	position: 'fixed',
	left: '50%',
	top: '50%',
	transform: 'translate(-50%, -50%)',
	zIndex: 'modal',
	w: 'min(440px, calc(100vw - 32px))',
	maxH: '90vh',
	overflow: 'auto',
	bg: 'surface',
	borderRadius: 'card',
	borderWidth: '1px',
	borderStyle: 'solid',
	borderColor: 'border',
	p: '5',
	boxShadow: '0 16px 48px rgba(0,0,0,0.45)',
});

const modalTitleClass = css({
	fontSize: 'lg',
	fontWeight: 'medium',
	mb: '4',
	m: '0',
});

const footerRowClass = css({
	display: 'flex',
	justifyContent: 'flex-end',
	gap: '2',
	mt: '4',
	flexWrap: 'wrap',
});

const searchBlockClass = css({
	display: 'flex',
	alignItems: 'center',
	gap: '2',
	p: '4',
	borderRadius: 'card',
	bg: 'surface',
	borderWidth: '1px',
	borderStyle: 'solid',
	borderColor: 'border',
	mb: '4',
	minW: '0',
});

function CollectionDetailPage() {
	const { collectionId } = Route.useParams();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [titleFilter, setTitleFilter] = useState('');
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [editTitle, setEditTitle] = useState('');
	const [editDescription, setEditDescription] = useState('');
	const [editColor, setEditColor] = useState(DEFAULT_COLLECTION_BADGE_COLOR);

	const metaQ = useQuery({
		queryKey: ['collection', collectionId],
		queryFn: () =>
			apiFetch<GameCollectionSummaryDto>(
				`/collections/${encodeURIComponent(collectionId)}`,
			),
	});

	const summaryQ = useQuery({
		queryKey: ['collection-summary', collectionId],
		queryFn: () =>
			apiFetch<DashboardSummaryDto>(
				`/collections/${encodeURIComponent(collectionId)}/summary`,
			),
	});

	const editionsQ = useQuery({
		queryKey: ['editions', 'collection', collectionId],
		queryFn: () =>
			apiFetch<GameEditionDto[]>(
				`/editions?collection=${encodeURIComponent(collectionId)}`,
			),
	});

	const filteredEditions = useMemo(() => {
		const data = editionsQ.data;
		if (!data?.length) return [];
		const needle = titleFilter.trim().toLowerCase();
		if (!needle) return data;
		return data.filter((e) => e.title.toLowerCase().includes(needle));
	}, [editionsQ.data, titleFilter]);

	useEffect(() => {
		if (!settingsOpen || !metaQ.data) return;
		setEditTitle(metaQ.data.title);
		setEditDescription(metaQ.data.description ?? '');
		setEditColor(coerceCollectionBadgeColor(metaQ.data.badgeColor));
	}, [settingsOpen, metaQ.data]);

	const patchMut = useMutation({
		mutationFn: () =>
			apiFetchPatch<GameCollectionSummaryDto>(
				`/collections/${encodeURIComponent(collectionId)}`,
				{
					title: editTitle.trim(),
					description: editDescription.trim() || null,
					badgeColor: coerceCollectionBadgeColor(editColor),
				},
			),
		onSuccess: () => {
			setSettingsOpen(false);
			void queryClient.invalidateQueries({ queryKey: ['collection', collectionId] });
			void queryClient.invalidateQueries({ queryKey: ['collection-summary', collectionId] });
			void queryClient.invalidateQueries({ queryKey: ['collections'] });
			void queryClient.invalidateQueries({ queryKey: ['editions'] });
		},
	});

	const deleteMut = useMutation({
		mutationFn: () =>
			apiFetch<void>(`/collections/${encodeURIComponent(collectionId)}`, {
				method: 'DELETE',
			}),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ['collections'] });
			void queryClient.invalidateQueries({ queryKey: ['collection-summary'] });
			void queryClient.invalidateQueries({ queryKey: ['editions'] });
			void queryClient.invalidateQueries({ queryKey: ['entire-collection'] });
			void navigate({ to: '/collections' });
		},
	});

	const c = metaQ.data;

	return (
		<div className={pageClass}>
			<div className={topRowClass}>
				<div className={titleBlockClass}>
					<h1 className={titleClass}>
						{c?.title ?? (metaQ.isLoading ? '…' : 'Collection')}
					</h1>
					{c?.description ? <p className={descClass}>{c.description}</p> : null}
				</div>
				<div className={css({ display: 'flex', gap: '2', flexShrink: '0' })}>
					<Button
						type="button"
						variant="secondary"
						size="sm"
						onClick={() => setSettingsOpen(true)}
						disabled={!c}
						aria-label="Collection settings"
					>
						<Settings size={18} strokeWidth={1.75} aria-hidden />
					</Button>
					<Link
						to="/collections"
						className={buttonVariants({ variant: 'ghost', size: 'sm' })}
					>
						All collections
					</Link>
				</div>
			</div>

			{summaryQ.isLoading && (
				<p className={css({ color: 'foregroundMuted', fontSize: 'sm', mb: '4' })}>
					Loading metrics…
				</p>
			)}
			{summaryQ.isError && (
				<p className={css({ color: 'danger', fontSize: 'sm', mb: '4' })}>
					{summaryQ.error instanceof Error
						? summaryQ.error.message
						: 'Could not load metrics'}
				</p>
			)}
			{summaryQ.data && (
				<div className={css({ mb: '8' })}>
					<DashboardSummaryPanel
						data={summaryQ.data}
						pieEmptyLabel="No games in this collection yet."
						gamesPerSystemEmptyHint="Assign copies to this collection from Games to see the breakdown."
						fmvCardTitle="Collection FMV (snapshot)"
						fmvCopyLabel="assigned"
					/>
				</div>
			)}

			<div className={searchBlockClass}>
				<label
					htmlFor="coll-detail-filter"
					className={css({ fontSize: 'sm', color: 'foregroundMuted', flexShrink: '0' })}
				>
					Search:
				</label>
				<Input
					id="coll-detail-filter"
					type="search"
					placeholder="Filter by title…"
					value={titleFilter}
					onChange={(e) => setTitleFilter(e.target.value)}
					autoComplete="off"
					className={css({ flex: '1', minW: '0' })}
				/>
			</div>

			{editionsQ.isLoading && (
				<p className={css({ color: 'foregroundMuted', fontSize: 'sm' })}>
					Loading titles…
				</p>
			)}
			{editionsQ.isError && (
				<p className={css({ color: 'danger', fontSize: 'sm' })}>
					{editionsQ.error instanceof Error
						? editionsQ.error.message
						: 'Could not load titles'}
				</p>
			)}

			{editionsQ.data && editionsQ.data.length === 0 && !editionsQ.isLoading && (
				<p className={css({ color: 'foregroundMuted', fontSize: 'sm' })}>
					No games in this collection yet (no copies are assigned to it).
				</p>
			)}

			{editionsQ.data &&
				editionsQ.data.length > 0 &&
				filteredEditions.length === 0 && (
					<p className={css({ color: 'foregroundMuted', fontSize: 'sm' })}>
						No titles match your search.
					</p>
				)}

			{filteredEditions.length > 0 && (
				<InventoryEditionList
					editions={filteredEditions}
					gameLinksCollectionId={collectionId}
				/>
			)}

			<Dialog.Root open={settingsOpen} onOpenChange={setSettingsOpen}>
				<Dialog.Portal>
					<Dialog.Backdrop className={overlayClass} />
					<Dialog.Popup className={modalClass}>
						<Dialog.Title className={modalTitleClass}>Collection settings</Dialog.Title>
						<form
							onSubmit={(ev) => {
								ev.preventDefault();
								if (!editTitle.trim() || patchMut.isPending) return;
								patchMut.mutate();
							}}
						>
							<Field label="Title" htmlFor="set-coll-title">
								<Input
									id="set-coll-title"
									value={editTitle}
									onChange={(e) => setEditTitle(e.target.value)}
									required
								/>
							</Field>
							<Field
								label="Description (optional)"
								htmlFor="set-coll-desc"
								className={css({ mt: '3' })}
							>
								<textarea
									id="set-coll-desc"
									value={editDescription}
									onChange={(e) => setEditDescription(e.target.value)}
									rows={3}
									className={css({
										w: '100%',
										mt: '1',
										p: '2',
										borderRadius: 'btn',
										borderWidth: '1px',
										borderStyle: 'solid',
										borderColor: 'border',
										bg: 'background',
										color: 'foreground',
										fontSize: 'sm',
										resize: 'vertical',
									})}
								/>
							</Field>
							<Field label="Badge color" className={css({ mt: '3' })}>
								<div className={css({ mt: '1' })}>
									<CollectionBadgeColorSwatches
										value={editColor}
										onChange={setEditColor}
									/>
								</div>
							</Field>
							{patchMut.isError && (
								<p className={css({ color: 'danger', fontSize: 'sm', mt: '2' })}>
									{patchMut.error instanceof Error
										? patchMut.error.message
										: 'Save failed'}
								</p>
							)}
							<div className={footerRowClass}>
								<Button
									type="button"
									variant="danger"
									onClick={() => setDeleteOpen(true)}
									disabled={patchMut.isPending || deleteMut.isPending}
								>
									Delete Collection
								</Button>
								<Button
									type="button"
									variant="secondary"
									onClick={() => setSettingsOpen(false)}
									disabled={patchMut.isPending}
								>
									Cancel
								</Button>
								<Button type="submit" variant="primary" disabled={patchMut.isPending}>
									{patchMut.isPending ? 'Saving…' : 'Save'}
								</Button>
							</div>
						</form>
					</Dialog.Popup>
				</Dialog.Portal>
			</Dialog.Root>

			<Dialog.Root open={deleteOpen} onOpenChange={setDeleteOpen}>
				<Dialog.Portal>
					<Dialog.Backdrop className={overlayClass} />
					<Dialog.Popup className={modalClass}>
						<Dialog.Title className={modalTitleClass}>Delete this collection?</Dialog.Title>
						<p className={css({ fontSize: 'sm', color: 'foregroundMuted', m: '0' })}>
							Copies remain in your inventory; they are only unassigned from this
							collection.
						</p>
						<div className={footerRowClass}>
							<Button
								type="button"
								variant="secondary"
								onClick={() => setDeleteOpen(false)}
								disabled={deleteMut.isPending}
							>
								Cancel
							</Button>
							<Button
								type="button"
								variant="primary"
								onClick={() => deleteMut.mutate()}
								disabled={deleteMut.isPending}
							>
								{deleteMut.isPending ? 'Deleting…' : 'Delete'}
							</Button>
						</div>
						{deleteMut.isError && (
							<p className={css({ color: 'danger', fontSize: 'sm', mt: '2' })}>
								{deleteMut.error instanceof Error
									? deleteMut.error.message
									: 'Delete failed'}
							</p>
						)}
					</Dialog.Popup>
				</Dialog.Portal>
			</Dialog.Root>
		</div>
	);
}
