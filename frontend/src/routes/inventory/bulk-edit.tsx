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

export const Route = createFileRoute('/inventory/bulk-edit')({
	component: InventoryBulkEditPage,
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

function InventoryBulkEditPage() {
	const { data, isLoading, isError, error, refetch } = useQuery({
		queryKey: ['editions', 'bulk-edit', 'all-copies'],
		queryFn: () =>
			apiFetch<GameEditionDto[]>(`/editions?includeSoldCopies=true`),
	});

	const rowData = useMemo(
		() => (data?.length ? editionsToBulkRows(data) : []),
		[data],
	);

	return (
		<div className={pageClass}>
			<div className={headerClass}>
				<div>
					<h1 className={titleClass}>Bulk edit copies</h1>
					<p className={leadClass}>
						Every copy in your library is listed below (including sold). Select
						rows with the checkboxes, pick a classification in the dropdown,
						then click <strong>Update</strong> to apply it to the selection. You
						can also double-click a classification cell to edit one copy. FMV
						reflects each row&apos;s classification against the latest snapshot.
					</p>
				</div>
				<Link
					to="/inventory"
					className={buttonVariants({ variant: 'secondary', size: 'sm' })}
				>
					← Back to games
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
						Could not load inventory.
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
					No copies to show yet. Add games from the main list.
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
					<InventoryBulkEditGrid rowData={rowData} />
				</Suspense>
			)}
		</div>
	);
}
