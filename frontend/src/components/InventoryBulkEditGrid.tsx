import {
	CopyClassification,
	type CopyClassification as CopyClassificationType,
} from '@gettin-paid/shared';
import type { QueryClient } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import {
	AllCommunityModule,
	type CellValueChangedEvent,
	type ColDef,
	type GetRowIdParams,
	type ICellRendererParams,
	type RowSelectedEvent,
	type SelectionChangedEvent,
	themeMaterial,
} from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { css, cx } from 'styled-system/css';
import { Button } from '#/components/ui/Button';
import { Field, Select } from '#/components/ui/Input';
import { apiFetchPatch } from '#/lib/api';

const darkTheme = themeMaterial;

export type BulkInventoryGridRow = {
	copyId: string;
	editionId: string;
	title: string;
	consoleLabel: string;
	collectionsLabel: string;
	copyClassification: CopyClassificationType;
	soldAt: string | null;
	fmvLabel: string;
};

const classificationValues = Object.values(
	CopyClassification,
) as CopyClassificationType[];

function classificationDisplay(value: string | undefined): string {
	if (!value) return '';
	return value.replace(/_/g, ' ');
}

type BulkEditGridContext = {
	editionLinkCollectionId?: string;
};

function TitleCell(
	props: ICellRendererParams<
		BulkInventoryGridRow,
		unknown,
		BulkEditGridContext
	>,
) {
	const data = props.data;
	if (!data) return null;
	const collectionId = props.context?.editionLinkCollectionId;
	const linkClass = css({
		color: 'accent',
		textDecoration: 'none',
		_hover: { textDecoration: 'underline' },
	});
	if (collectionId) {
		return (
			<Link
				to="/collections/$collectionId/gameEdition/$editionId"
				params={{ collectionId, editionId: data.editionId }}
				className={linkClass}
			>
				{data.title}
			</Link>
		);
	}
	return (
		<Link
			to="/inventory/$editionId"
			params={{ editionId: data.editionId }}
			className={linkClass}
		>
			{data.title}
		</Link>
	);
}

const gridShellClass = css({
	height: 'min(72vh, 800px)',
	width: '100%',
	minH: '360px',
	borderRadius: 'card',
	overflow: 'hidden',
	borderWidth: '1px',
	borderStyle: 'solid',
	borderColor: 'border',
});

const toolbarClass = css({
	display: 'flex',
	flexWrap: 'wrap',
	alignItems: 'flex-end',
	gap: '3',
	mb: '4',
});

const toolbarFieldClass = css({
	minW: '200px',
	flex: { base: '1 1 200px', md: '0 0 auto' },
});

const hintClass = css({
	fontSize: 'sm',
	color: 'foregroundMuted',
	m: '0',
});

const errorBannerClass = css({
	fontSize: 'sm',
	color: 'danger',
	mb: '3',
});

export type InventoryBulkEditGridProps = {
	rowData: BulkInventoryGridRow[];
	/** When set, title column links use the collection-scoped edition route. */
	editionLinkCollectionId?: string;
};

function invalidateAfterCopyClassificationEdit(queryClient: QueryClient) {
	void queryClient.invalidateQueries({
		queryKey: ['editions'],
		refetchType: 'all',
	});
	void queryClient.invalidateQueries({ queryKey: ['entire-collection'] });
	void queryClient.invalidateQueries({ queryKey: ['collections'] });
	void queryClient.invalidateQueries({
		queryKey: ['collection-summary'],
		refetchType: 'all',
	});
}

export function InventoryBulkEditGrid({
	rowData,
	editionLinkCollectionId,
}: InventoryBulkEditGridProps) {
	const queryClient = useQueryClient();
	const gridRef = useRef<AgGridReact<BulkInventoryGridRow>>(null);
	const [selectionCount, setSelectionCount] = useState(0);
	const [bulkTargetClassification, setBulkTargetClassification] =
		useState<CopyClassificationType>(CopyClassification.CIB);
	const [bulkBusy, setBulkBusy] = useState(false);
	const [bulkError, setBulkError] = useState<string | null>(null);
	const [singleEditError, setSingleEditError] = useState<string | null>(null);

	const bulkClassificationSelectItems = useMemo(
		() =>
			classificationValues.map((v) => ({
				value: v,
				label: classificationDisplay(v),
			})),
		[],
	);

	const refreshSelectionCount = useCallback(() => {
		const api = gridRef.current?.api;
		if (!api) return;
		setSelectionCount(api.getSelectedRows().length);
	}, []);

	const onSelectionChanged = useCallback(
		(_e: SelectionChangedEvent<BulkInventoryGridRow>) => {
			refreshSelectionCount();
		},
		[refreshSelectionCount],
	);

	const onRowSelected = useCallback(
		(_e: RowSelectedEvent<BulkInventoryGridRow>) => {
			refreshSelectionCount();
		},
		[refreshSelectionCount],
	);

	const gridContext = useMemo(
		(): BulkEditGridContext => ({ editionLinkCollectionId }),
		[editionLinkCollectionId],
	);

	const columnDefs = useMemo<ColDef<BulkInventoryGridRow>[]>(
		() => [
			{
				field: 'title',
				headerName: 'Title',
				minWidth: 180,
				flex: 1.2,
				sortable: true,
				filter: 'agTextColumnFilter',
				cellRenderer: TitleCell,
			},
			{
				field: 'consoleLabel',
				headerName: 'Console',
				minWidth: 120,
				flex: 0.8,
				sortable: true,
				filter: 'agTextColumnFilter',
			},
			{
				field: 'collectionsLabel',
				headerName: 'Collections',
				minWidth: 140,
				flex: 1,
				sortable: true,
				filter: 'agTextColumnFilter',
			},
			{
				field: 'copyClassification',
				headerName: 'Classification',
				minWidth: 160,
				flex: 0.9,
				editable: true,
				cellEditor: 'agSelectCellEditor',
				cellEditorParams: {
					values: classificationValues,
				},
				valueFormatter: (p) => classificationDisplay(p.value),
				sortable: true,
				filter: 'agTextColumnFilter',
			},
			{
				field: 'fmvLabel',
				headerName: 'FMV',
				minWidth: 88,
				maxWidth: 110,
				sortable: true,
				filter: 'agTextColumnFilter',
			},
			{
				field: 'soldAt',
				headerName: 'Status',
				minWidth: 100,
				maxWidth: 120,
				valueGetter: (p) => (p.data?.soldAt ? 'Sold' : 'In stock'),
				sortable: true,
				filter: 'agTextColumnFilter',
			},
		],
		[],
	);

	const defaultColDef = useMemo<ColDef<BulkInventoryGridRow>>(
		() => ({
			suppressHeaderMenuButton: true,
		}),
		[],
	);

	const getRowId = useCallback(
		(params: GetRowIdParams<BulkInventoryGridRow>) => params.data.copyId,
		[],
	);

	const onCellValueChanged = useCallback(
		async (ev: CellValueChangedEvent<BulkInventoryGridRow>) => {
			if (ev.colDef.field !== 'copyClassification' || !ev.data) return;
			const copyId = ev.data.copyId;
			const next = ev.newValue as CopyClassificationType;
			const prev = ev.oldValue as CopyClassificationType;
			setSingleEditError(null);
			try {
				await apiFetchPatch(`/copies/${encodeURIComponent(copyId)}`, {
					copyClassification: next,
				});
				invalidateAfterCopyClassificationEdit(queryClient);
			} catch (err) {
				ev.node.setDataValue('copyClassification', prev);
				setSingleEditError(
					err instanceof Error
						? err.message
						: 'Could not update classification.',
				);
			}
		},
		[queryClient],
	);

	const applyClassificationToSelection = useCallback(
		async (copyClassification: CopyClassificationType) => {
			const api = gridRef.current?.api;
			if (!api) return;
			const selected = api.getSelectedRows() as BulkInventoryGridRow[];
			if (selected.length === 0) {
				setBulkError('Select at least one row (checkboxes on the left).');
				return;
			}
			setBulkError(null);
			setBulkBusy(true);
			const failures: string[] = [];
			for (const row of selected) {
				if (row.copyClassification === copyClassification) continue;
				try {
					await apiFetchPatch(`/copies/${encodeURIComponent(row.copyId)}`, {
						copyClassification,
					});
					row.copyClassification = copyClassification;
				} catch (err) {
					failures.push(
						`${row.title}: ${err instanceof Error ? err.message : 'failed'}`,
					);
				}
			}
			api.refreshCells({ force: true });
			invalidateAfterCopyClassificationEdit(queryClient);
			setBulkBusy(false);
			if (failures.length) {
				setBulkError(
					`${failures.length} of ${selected.length} updates failed. ${failures.slice(0, 3).join(' ')}`,
				);
			}
		},
		[queryClient],
	);

	return (
		<div>
			<div className={toolbarClass}>
				<div className={toolbarFieldClass}>
					<Field label="Set selected to" htmlFor="bulk-classification">
						<Select
							id="bulk-classification"
							value={bulkTargetClassification}
							onValueChange={(v) => {
								setBulkTargetClassification(v as CopyClassificationType);
							}}
							items={bulkClassificationSelectItems}
							disabled={bulkBusy}
						/>
					</Field>
				</div>
				<Button
					type="button"
					variant="primary"
					size="sm"
					disabled={selectionCount === 0 || bulkBusy}
					onClick={() => {
						void applyClassificationToSelection(bulkTargetClassification);
					}}
				>
					Update
				</Button>
				<p className={hintClass}>
					{bulkBusy
						? 'Updating…'
						: selectionCount === 0
							? 'Select one or more rows, choose a classification, then click Update. You can still edit cells directly.'
							: `${selectionCount} row${selectionCount === 1 ? '' : 's'} selected.`}
				</p>
			</div>
			{bulkError ? <p className={errorBannerClass}>{bulkError}</p> : null}
			{singleEditError ? (
				<p className={errorBannerClass}>{singleEditError}</p>
			) : null}
			<div className={cx(gridShellClass, 'ag-theme-quartz')}>
				<AgGridReact<BulkInventoryGridRow>
					ref={gridRef}
					modules={[AllCommunityModule]}
					context={gridContext}
					rowData={rowData}
					columnDefs={columnDefs}
					defaultColDef={defaultColDef}
					theme={darkTheme}
					getRowId={getRowId}
					rowSelection={{
						mode: 'multiRow',
						checkboxes: true,
						headerCheckbox: true,
					}}
					selectionColumnDef={{
						pinned: 'left',
						width: 48,
						maxWidth: 56,
						suppressHeaderMenuButton: true,
					}}
					onSelectionChanged={onSelectionChanged}
					onRowSelected={onRowSelected}
					onCellValueChanged={(e) => {
						void onCellValueChanged(e);
					}}
					singleClickEdit
					stopEditingWhenCellsLoseFocus
					animateRows
				/>
			</div>
		</div>
	);
}
