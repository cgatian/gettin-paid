import { Combobox } from '@base-ui/react/combobox';
import type { GameCollectionSummaryDto } from '@gettin-paid/shared';
import { Check, ChevronDown, X } from 'lucide-react';
import { type ReactNode, type RefObject, useMemo } from 'react';
import { css } from 'styled-system/css';
import { Label } from '#/components/ui/Input';

type ComboItem = { value: string; label: string };

const inputGroupClass = css({
	display: 'flex',
	alignItems: 'center',
	flexWrap: 'wrap',
	gap: '2',
	width: '100%',
	minH: '40px',
	borderWidth: '1px',
	borderStyle: 'solid',
	borderColor: 'border',
	bg: 'background',
	color: 'foreground',
	borderRadius: 'btn',
	px: '2',
	py: '1',
	outline: 'none',
	fontFamily: 'sans',
	_focusWithin: { borderColor: 'accent' },
	'&[data-disabled]': { opacity: '0.5', cursor: 'not-allowed' },
});

const chipsClass = css({
	display: 'flex',
	flexWrap: 'wrap',
	alignItems: 'center',
	gap: '1',
	minW: '0',
});

const chipClass = css({
	display: 'inline-flex',
	alignItems: 'center',
	gap: '1',
	maxW: '100%',
	px: '2',
	py: '0.5',
	fontSize: 'xs',
	fontWeight: 'medium',
	borderRadius: 'sm',
	bg: 'navHover',
	color: 'foreground',
	borderWidth: '1px',
	borderStyle: 'solid',
	borderColor: 'borderSubtle',
});

const chipRemoveClass = css({
	display: 'inline-flex',
	alignItems: 'center',
	justifyContent: 'center',
	p: '0.5',
	m: '0',
	border: 'none',
	bg: 'transparent',
	color: 'foregroundMuted',
	cursor: 'pointer',
	borderRadius: 'sm',
	_hover: { color: 'foreground', bg: 'navActive' },
});

const inputInnerClass = css({
	flex: '1',
	minW: '80px',
	border: 'none',
	bg: 'transparent',
	color: 'foreground',
	fontSize: 'sm',
	outline: 'none',
	py: '1',
	px: '1',
	fontFamily: 'sans',
});

const triggerClass = css({
	display: 'inline-flex',
	alignItems: 'center',
	justifyContent: 'center',
	flexShrink: '0',
	p: '1',
	m: '0',
	border: 'none',
	bg: 'transparent',
	color: 'foregroundMuted',
	cursor: 'pointer',
	borderRadius: 'sm',
	_hover: { color: 'foreground', bg: 'navHover' },
});

const clearBtnClass = css({
	display: 'inline-flex',
	alignItems: 'center',
	justifyContent: 'center',
	flexShrink: '0',
	p: '1',
	m: '0',
	border: 'none',
	bg: 'transparent',
	color: 'foregroundMuted',
	cursor: 'pointer',
	borderRadius: 'sm',
	_hover: { color: 'foreground', bg: 'navHover' },
});

const popupClass = css({
	bg: 'surface',
	borderWidth: '1px',
	borderStyle: 'solid',
	borderColor: 'border',
	borderRadius: 'btn',
	boxShadow: 'md',
	overflowY: 'auto',
	maxH: '240px',
	minW: 'var(--anchor-width)',
	zIndex: '200',
	py: '1',
});

const listClass = css({
	bg: 'surface',
});

const itemClass = css({
	display: 'flex',
	alignItems: 'center',
	gap: '2',
	px: '3',
	py: '2',
	fontSize: 'sm',
	color: 'foreground',
	cursor: 'pointer',
	outline: 'none',
	'&[data-highlighted]': { bg: 'navHover' },
});

const itemIndicatorClass = css({
	display: 'inline-flex',
	w: '4',
	flexShrink: '0',
	color: 'accent',
});

const emptyClass = css({
	px: '3',
	py: '2',
	fontSize: 'sm',
	color: 'foregroundMuted',
});

export type CollectionsMultiComboboxProps = {
	id: string;
	label: ReactNode;
	collections: GameCollectionSummaryDto[];
	valueIds: string[];
	onValueChange: (ids: string[]) => void;
	disabled?: boolean;
	placeholder?: string;
	/** Render the popup inside this node (e.g. dialog) so it stacks above the backdrop. */
	portalContainer?: RefObject<HTMLElement | null>;
};

export function CollectionsMultiCombobox({
	id,
	label,
	collections,
	valueIds,
	onValueChange,
	disabled,
	placeholder = 'Search collections…',
	portalContainer,
}: CollectionsMultiComboboxProps) {
	const items: ComboItem[] = useMemo(
		() =>
			collections.map((c) => ({
				value: c.id,
				label: c.title,
			})),
		[collections],
	);

	const selectedItems = useMemo(() => {
		const byId = new Map(items.map((i) => [i.value, i]));
		return valueIds
			.map((vid) => byId.get(vid))
			.filter((x): x is ComboItem => x != null);
	}, [valueIds, items]);

	return (
		<div>
			<Label htmlFor={id}>{label}</Label>
			<Combobox.Root
				multiple
				items={items}
				value={selectedItems}
				onValueChange={(next) => {
					if (Array.isArray(next)) {
						onValueChange(next.map((i) => i.value));
					}
				}}
				disabled={disabled}
				isItemEqualToValue={(a, b) => a.value === b.value}
			>
				<Combobox.InputGroup className={inputGroupClass}>
					<Combobox.Value placeholder="">
						{(selected: ComboItem[]) => (
							<>
								{selected.length > 0 && (
									<Combobox.Chips className={chipsClass}>
										{selected.map((item) => (
											<Combobox.Chip key={item.value} className={chipClass}>
												<span
													className={css({
														overflow: 'hidden',
														textOverflow: 'ellipsis',
														whiteSpace: 'nowrap',
													})}
												>
													{item.label}
												</span>
												<Combobox.ChipRemove
													className={chipRemoveClass}
													aria-label={`Remove ${item.label}`}
												>
													<X size={12} strokeWidth={2} aria-hidden />
												</Combobox.ChipRemove>
											</Combobox.Chip>
										))}
									</Combobox.Chips>
								)}
								<Combobox.Input
									id={id}
									className={inputInnerClass}
									placeholder={placeholder}
									autoComplete="off"
								/>
							</>
						)}
					</Combobox.Value>
					<Combobox.Clear
						className={clearBtnClass}
						aria-label="Clear collections"
					>
						<X size={14} strokeWidth={2} aria-hidden />
					</Combobox.Clear>
					<Combobox.Trigger
						className={triggerClass}
						aria-label="Open collections"
					>
						<ChevronDown size={14} aria-hidden />
					</Combobox.Trigger>
				</Combobox.InputGroup>

				<Combobox.Portal container={portalContainer}>
					<Combobox.Positioner
						sideOffset={4}
						align="start"
						positionMethod="fixed"
					>
						<Combobox.Popup className={popupClass}>
							<Combobox.Empty>
								<div className={emptyClass}>No collections match.</div>
							</Combobox.Empty>
							<Combobox.List className={listClass}>
								{(item: ComboItem) => (
									<Combobox.Item
										key={item.value}
										value={item}
										className={itemClass}
									>
										<Combobox.ItemIndicator className={itemIndicatorClass}>
											<Check size={12} strokeWidth={2.5} aria-hidden />
										</Combobox.ItemIndicator>
										<span>{item.label}</span>
									</Combobox.Item>
								)}
							</Combobox.List>
						</Combobox.Popup>
					</Combobox.Positioner>
				</Combobox.Portal>
			</Combobox.Root>
		</div>
	);
}
