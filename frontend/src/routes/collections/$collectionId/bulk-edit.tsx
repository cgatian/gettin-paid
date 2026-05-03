import type { GameEditionDto } from '@gettin-paid/shared';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { lazy, Suspense, useMemo } from 'react';
import { css } from 'styled-system/css';
import { Button, buttonVariants } from '#/components/ui/Button';
import { apiFetch } from '#/lib/api';
import { editionsToBulkRows } from '#/lib/editionsToBulkRows';

const InventoryBulkEditGrid = lazy(() =>
	import('#/components/InventoryBulkEditGrid').then((m) => ({
		default: m.InventoryBulkEditGrid,
	})),
);

export const Route = createFileRoute('/collections/$collectionId/bulk-edit')({
	component: CollectionBulkEditPage,
});

const pageClass = css({ p: '6' });

const headerClass = css({
	display: 'flex',
	flexDir: { base: 'column', md: 'row' },
	alignItems: { base: 'stretch', md: 'flex-start' },
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

const leadClass = css({
	fontSize: 'sm',
	color: 'foregroundMuted',
	m: '0',
	mt: '2',
	maxW: '720px',
	lineHeight: '1.5',
});

const errorCardClass = css({
	bg: 'rgba(192,57,43,0.08)',
	borderWidth: '1px',
	borderStyle: 'solid',
	borderColor: 'rgba(192,57,43,0.2)',
	borderRadius: 'card',
	p: '4',
	mb: '4',
});

function CollectionBulkEditPage() {
	const { collectionId } = Route.useParams();

	const { data, isLoading, isError, error, refetch } = useQuery({
		queryKey: ['editions', 'collection', collectionId, 'bulk-edit'],
		queryFn: () =>
			apiFetch<GameEditionDto[]>(
				`/editions?collection=${encodeURIComponent(collectionId)}`,
			),
	});

	const rowData = useMemo(
		() => (data?.length ? editionsToBulkRows(data) : []),
		[data],
	);

	return (
		<div className={pageClass}>
			<div className={headerClass}>
				<div>
					<h1 className={titleClass}>Bulk edit copies in collection</h1>
					<p className={leadClass}>
						Only copies assigned to this collection are listed (including sold if
						they still carry the tag). Select rows, pick a classification, then
						click <strong>Update</strong>, or edit a cell directly. Title links open
						the collection view for each game.
					</p>
				</div>
				<Link
					to="/collections/$collectionId"
					params={{ collectionId }}
					className={buttonVariants({ variant: 'secondary', size: 'sm' })}
				>
					← Back to collection
				</Link>
			</div>

			{isLoading && (
				<p className={css({ color: 'foregroundMuted', fontSize: 'sm' })}>
					Loading copies…
				</p>
			)}

			{isError && (
				<div className={errorCardClass}>
					<p
						className={css({
							fontWeight: 'semibold',
							color: 'danger',
							m: '0 0 8px 0',
						})}
					>
						Could not load collection copies.
					</p>
					<p
						className={css({
							fontSize: 'sm',
							color: 'foregroundMuted',
							m: '0 0 12px 0',
						})}
					>
						{error instanceof Error ? error.message : 'Unknown error'}
					</p>
					<Button
						type="button"
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

			{data && rowData.length === 0 && !isLoading && (
				<p className={css({ color: 'foregroundMuted', fontSize: 'sm' })}>
					No copies in this collection yet. Assign copies from a game&apos;s page.
				</p>
			)}

			{data && rowData.length > 0 && (
				<Suspense
					fallback={
						<p className={css({ color: 'foregroundMuted', fontSize: 'sm' })}>
							Loading grid…
						</p>
					}
				>
					<InventoryBulkEditGrid
						rowData={rowData}
						editionLinkCollectionId={collectionId}
					/>
				</Suspense>
			)}
		</div>
	);
}
