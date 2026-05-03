import { Input as BaseInput, Select as BaseSelect } from '@base-ui/react';
import { ChevronDown } from 'lucide-react';
import {
	forwardRef,
	type InputHTMLAttributes,
	type LabelHTMLAttributes,
	type ReactNode,
	type RefObject,
} from 'react';
import { css, cx } from 'styled-system/css';

export const inputClass = css({
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
	fontSize: 'base',
	outline: 'none',
	fontFamily: 'sans',
	_focus: { borderColor: 'accent' },
	_placeholder: { color: 'foregroundMuted' },
});

const selectTriggerClass = css({
	display: 'flex',
	alignItems: 'center',
	justifyContent: 'space-between',
	gap: '2',
	width: '100%',
	borderWidth: '1px',
	borderStyle: 'solid',
	borderColor: 'border',
	bg: 'background',
	color: 'foreground',
	borderRadius: 'btn',
	px: '3',
	py: '2',
	fontSize: 'base',
	outline: 'none',
	fontFamily: 'sans',
	cursor: 'pointer',
	textAlign: 'left',
	_focus: { borderColor: 'accent' },
	'&[data-popup-open]': { borderColor: 'accent' },
	_disabled: { opacity: '0.5', cursor: 'not-allowed' },
});

const selectPopupClass = css({
	bg: 'surface',
	borderWidth: '1px',
	borderStyle: 'solid',
	borderColor: 'border',
	borderRadius: 'btn',
	boxShadow: 'md',
	overflowY: 'auto',
	maxHeight: '240px',
	minWidth: 'var(--anchor-width)',
	/** Above Dialog backdrop (100) / panel (101) so options receive clicks. */
	zIndex: 200,
	py: '1',
});

const selectListClass = css({
	bg: 'surface',
});

const selectItemClass = css({
	px: '3',
	py: '2',
	fontSize: 'base',
	color: 'foreground',
	cursor: 'pointer',
	outline: 'none',
	'&[data-highlighted]': { bg: 'navHover' },
	'&[data-selected]': { fontWeight: 'medium' },
});

const labelClass = css({
	display: 'block',
	fontSize: 'sm',
	fontWeight: 'medium',
	color: 'foregroundMuted',
	mb: '1',
});

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

interface SelectItem {
	value: string;
	label: string;
}

interface SelectProps {
	id?: string;
	value: string;
	onValueChange: (value: string) => void;
	items: SelectItem[];
	disabled?: boolean;
	className?: string;
	/** Render the list inside this node (e.g. dialog popup ref) so modal dialogs keep pointer events. */
	portalContainer?: RefObject<HTMLElement | null>;
}

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
	children: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
	{ className, ...props },
	ref,
) {
	return (
		<BaseInput ref={ref} className={cx(inputClass, className)} {...props} />
	);
});

export function Select({
	id,
	value,
	onValueChange,
	items,
	disabled,
	className,
	portalContainer,
}: SelectProps) {
	return (
		<BaseSelect.Root
			value={value}
			onValueChange={(v) => {
				if (v != null) onValueChange(v);
			}}
			disabled={disabled}
			items={items}
		>
			<BaseSelect.Trigger id={id} className={cx(selectTriggerClass, className)}>
				<BaseSelect.Value />
				<ChevronDown size={14} />
			</BaseSelect.Trigger>
			<BaseSelect.Portal container={portalContainer}>
				<BaseSelect.Positioner
					alignItemWithTrigger={false}
					positionMethod="fixed"
					side="bottom"
					sideOffset={4}
				>
					<BaseSelect.Popup className={selectPopupClass}>
						<BaseSelect.List className={selectListClass}>
							{items.map((item) => (
								<BaseSelect.Item
									key={item.value}
									value={item.value}
									className={selectItemClass}
								>
									<BaseSelect.ItemText>{item.label}</BaseSelect.ItemText>
								</BaseSelect.Item>
							))}
						</BaseSelect.List>
					</BaseSelect.Popup>
				</BaseSelect.Positioner>
			</BaseSelect.Portal>
		</BaseSelect.Root>
	);
}

export function Label({ className, children, ...props }: LabelProps) {
	return (
		// biome-ignore lint/a11y/noLabelWithoutControl: mirrors native <label>; pair with controls via Field/htmlFor or wrap inputs.
		<label className={cx(labelClass, className)} {...props}>
			{children}
		</label>
	);
}

interface FieldProps {
	label: ReactNode;
	htmlFor?: string;
	children: ReactNode;
	className?: string;
}

const fieldWrapClass = css({ display: 'block', position: 'relative' });

export function Field({ label, htmlFor, children, className }: FieldProps) {
	return (
		<div className={cx(fieldWrapClass, className)}>
			<Label htmlFor={htmlFor}>{label}</Label>
			{children}
		</div>
	);
}
