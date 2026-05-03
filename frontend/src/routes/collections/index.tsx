import { Dialog } from '@base-ui/react';
import type { GameCollectionSummaryDto } from '@gettin-paid/shared';
import { DEFAULT_COLLECTION_BADGE_COLOR } from '@gettin-paid/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { css } from 'styled-system/css';
import { CollectionBadgeColorSwatches } from '#/components/CollectionBadgeColorSwatches';
import { Button, buttonVariants } from '#/components/ui/Button';
import { Card } from '#/components/ui/Card';
import { Field, Input } from '#/components/ui/Input';
import { apiFetch, apiFetchPost } from '#/lib/api';

export const Route = createFileRoute('/collections/')({
	component: CollectionsHubPage,
});

const pageClass = css({ p: '6' });

const headerClass = css({
	display: 'flex',
	flexDir: { base: 'column', sm: 'row' },
	alignItems: { base: 'stretch', sm: 'center' },
	justifyContent: 'space-between',
	gap: '4',
	mb: '6',
});

const titleClass = css({
	fontSize: '2xl',
	fontWeight: 'normal',
	color: 'foreground',
	m: '0',
	letterSpacing: '-0.01em',
});

const gridClass = css({
	display: 'grid',
	gridTemplateColumns: {
		base: '1fr',
		md: 'repeat(2, 1fr)',
		lg: 'repeat(3, 1fr)',
	},
	gap: '4',
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
});

function CollectionsHubPage() {
	const queryClient = useQueryClient();
	const [createOpen, setCreateOpen] = useState(false);
	const [deleteTarget, setDeleteTarget] =
		useState<GameCollectionSummaryDto | null>(null);
	const [newTitle, setNewTitle] = useState('');
	const [newDescription, setNewDescription] = useState('');
	const [newColor, setNewColor] = useState(DEFAULT_COLLECTION_BADGE_COLOR);

	const q = useQuery({
		queryKey: ['collections'],
		queryFn: () => apiFetch<GameCollectionSummaryDto[]>('/collections'),
	});

	const createMut = useMutation({
		mutationFn: () =>
			apiFetchPost<GameCollectionSummaryDto>('/collections', {
				title: newTitle.trim(),
				description: newDescription.trim() || null,
				badgeColor: newColor.trim().toUpperCase(),
			}),
		onSuccess: () => {
			setCreateOpen(false);
			setNewTitle('');
			setNewDescription('');
			setNewColor(DEFAULT_COLLECTION_BADGE_COLOR);
			void queryClient.invalidateQueries({ queryKey: ['collections'] });
		},
	});

	const deleteMut = useMutation({
		mutationFn: (id: string) =>
			apiFetch<void>(`/collections/${encodeURIComponent(id)}`, {
				method: 'DELETE',
			}),
		onSuccess: () => {
			setDeleteTarget(null);
			void queryClient.invalidateQueries({ queryKey: ['collections'] });
			void queryClient.invalidateQueries({ queryKey: ['editions'] });
			void queryClient.invalidateQueries({ queryKey: ['entire-collection'] });
		},
	});

	return (
		<div className={pageClass}>
			<div className={headerClass}>
				<h1 className={titleClass}>Collections</h1>
				<Button
					type="button"
					variant="primary"
					size="sm"
					onClick={() => setCreateOpen(true)}
				>
					<Plus
						size={16}
						strokeWidth={2}
						aria-hidden
						style={{ marginRight: 6 }}
					/>
					New collection
				</Button>
			</div>

			{q.isLoading && (
				<p className={css({ color: 'foregroundMuted', fontSize: 'sm' })}>
					Loading…
				</p>
			)}
			{q.isError && (
				<p className={css({ color: 'danger', fontSize: 'sm' })}>
					{q.error instanceof Error
						? q.error.message
						: 'Could not load collections'}
				</p>
			)}

			{q.data?.length === 0 && !q.isLoading && (
				<Card className={css({ p: '6', textAlign: 'center' })}>
					<p className={css({ color: 'foregroundMuted', mb: '4' })}>
						No collections yet. Create one to group copies from your inventory.
					</p>
					<Button
						type="button"
						variant="primary"
						onClick={() => setCreateOpen(true)}
					>
						Create collection
					</Button>
				</Card>
			)}

			{q.data && q.data.length > 0 && (
				<ul
					className={gridClass}
					style={{ listStyle: 'none', padding: 0, margin: 0 }}
				>
					{q.data.map((c) => (
						<li key={c.id}>
							<Card
								className={css({
									p: '4',
									display: 'flex',
									flexDir: 'column',
									gap: '3',
									h: '100%',
								})}
							>
								<Link
									to="/collections/$collectionId"
									params={{ collectionId: c.id }}
									className={css({
										textDecoration: 'none',
										color: 'foreground',
										fontWeight: 'medium',
										fontSize: 'md',
										_hover: { color: 'link' },
									})}
								>
									{c.title}
								</Link>
								{c.description ? (
									<p
										className={css({
											fontSize: 'sm',
											color: 'foregroundMuted',
											m: '0',
											flex: '1',
											overflow: 'hidden',
											display: '-webkit-box',
											WebkitLineClamp: 3,
											WebkitBoxOrient: 'vertical',
										})}
									>
										{c.description}
									</p>
								) : (
									<span className={css({ flex: '1' })} />
								)}
								<div
									className={css({
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'space-between',
										gap: '2',
									})}
								>
									<span
										className={css({
											display: 'inline-block',
											w: '6',
											h: '6',
											borderRadius: 'sm',
											borderWidth: '1px',
											borderStyle: 'solid',
											borderColor: 'border',
										})}
										style={{ backgroundColor: c.badgeColor }}
										title={c.badgeColor}
									/>
									<div className={css({ display: 'flex', gap: '2' })}>
										<Link
											to="/collections/$collectionId"
											params={{ collectionId: c.id }}
											className={buttonVariants({
												variant: 'secondary',
												size: 'sm',
											})}
										>
											Open
										</Link>
										<Button
											type="button"
											variant="danger"
											size="sm"
											onClick={() => setDeleteTarget(c)}
											aria-label={`Delete ${c.title}`}
										>
											<Trash2 size={16} strokeWidth={1.75} aria-hidden />
										</Button>
									</div>
								</div>
							</Card>
						</li>
					))}
				</ul>
			)}

			<Dialog.Root open={createOpen} onOpenChange={setCreateOpen}>
				<Dialog.Portal>
					<Dialog.Backdrop className={overlayClass} />
					<Dialog.Popup className={modalClass}>
						<Dialog.Title className={modalTitleClass}>
							New collection
						</Dialog.Title>
						<form
							onSubmit={(ev) => {
								ev.preventDefault();
								if (!newTitle.trim() || createMut.isPending) return;
								createMut.mutate();
							}}
						>
							<Field label="Title" htmlFor="coll-title">
								<Input
									id="coll-title"
									value={newTitle}
									onChange={(e) => setNewTitle(e.target.value)}
									autoComplete="off"
									required
								/>
							</Field>
							<Field
								label="Description (optional)"
								htmlFor="coll-desc"
								className={css({ mt: '3' })}
							>
								<textarea
									id="coll-desc"
									value={newDescription}
									onChange={(e) => setNewDescription(e.target.value)}
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
										value={newColor}
										onChange={setNewColor}
									/>
								</div>
							</Field>
							{createMut.isError && (
								<p
									className={css({ color: 'danger', fontSize: 'sm', mt: '2' })}
								>
									{createMut.error instanceof Error
										? createMut.error.message
										: 'Create failed'}
								</p>
							)}
							<div className={footerRowClass}>
								<Button
									type="button"
									variant="secondary"
									onClick={() => setCreateOpen(false)}
									disabled={createMut.isPending}
								>
									Cancel
								</Button>
								<Button
									type="submit"
									variant="primary"
									disabled={createMut.isPending}
								>
									{createMut.isPending ? 'Creating…' : 'Create'}
								</Button>
							</div>
						</form>
					</Dialog.Popup>
				</Dialog.Portal>
			</Dialog.Root>

			<Dialog.Root
				open={deleteTarget !== null}
				onOpenChange={(o) => {
					if (!o) setDeleteTarget(null);
				}}
			>
				<Dialog.Portal>
					<Dialog.Backdrop className={overlayClass} />
					<Dialog.Popup className={modalClass}>
						<Dialog.Title className={modalTitleClass}>
							Delete collection?
						</Dialog.Title>
						<p
							className={css({
								fontSize: 'sm',
								color: 'foregroundMuted',
								m: '0',
							})}
						>
							<strong>{deleteTarget?.title}</strong> will be removed. Copies
							stay in your inventory; they are only unassigned from this
							collection.
						</p>
						<div className={footerRowClass}>
							<Button
								type="button"
								variant="secondary"
								onClick={() => setDeleteTarget(null)}
								disabled={deleteMut.isPending}
							>
								Cancel
							</Button>
							<Button
								type="button"
								variant="primary"
								onClick={() => {
									if (deleteTarget) deleteMut.mutate(deleteTarget.id);
								}}
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
