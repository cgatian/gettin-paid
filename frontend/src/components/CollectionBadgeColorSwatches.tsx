import { COLLECTION_BADGE_COLORS } from '@gettin-paid/shared';
import { css } from 'styled-system/css';

const rowClass = css({
	display: 'flex',
	flexWrap: 'wrap',
	gap: '2',
	alignItems: 'center',
});

const swatchClass = css({
	w: '9',
	h: '9',
	borderRadius: 'md',
	borderWidth: '2px',
	borderStyle: 'solid',
	cursor: 'pointer',
	padding: '0',
	flexShrink: '0',
	transition: 'transform 100ms ease, box-shadow 100ms ease',
	_hover: { transform: 'scale(1.06)' },
});

export function CollectionBadgeColorSwatches({
	value,
	onChange,
	'aria-label': ariaLabel = 'Badge color',
}: {
	value: string;
	onChange: (hex: string) => void;
	'aria-label'?: string;
}) {
	const current = value.trim().toUpperCase();
	return (
		<div className={rowClass} role="group" aria-label={ariaLabel}>
			{COLLECTION_BADGE_COLORS.map((hex) => {
				const active = current === hex;
				return (
					<button
						key={hex}
						type="button"
						className={swatchClass}
						style={{
							backgroundColor: hex,
							borderColor: active ? 'var(--colors-accent)' : 'var(--colors-border)',
							outline: active ? '2px solid var(--colors-accent)' : 'none',
							outlineOffset: 2,
						}}
						onClick={() => onChange(hex)}
						aria-pressed={active}
						title={hex}
					/>
				);
			})}
		</div>
	);
}
