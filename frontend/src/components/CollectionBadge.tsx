import type { GameCollectionSummaryDto } from '@gettin-paid/shared';
import { css, cx } from 'styled-system/css';

const badgeClass = css({
	display: 'inline-flex',
	alignItems: 'center',
	borderRadius: 'sm',
	px: '2',
	py: '0.5',
	fontSize: 'xs',
	fontWeight: 'semibold',
	lineHeight: '1.2',
	maxW: '100%',
	overflow: 'hidden',
	textOverflow: 'ellipsis',
	whiteSpace: 'nowrap',
	borderWidth: '1px',
	borderStyle: 'solid',
});

export function CollectionBadge({
	collection,
	className,
}: {
	collection: GameCollectionSummaryDto;
	className?: string;
}) {
	const hex = collection.badgeColor;
	return (
		<span
			className={cx(badgeClass, className)}
			style={{
				backgroundColor: `${hex}22`,
				borderColor: `${hex}55`,
				color: 'var(--colors-foreground)',
			}}
			title={collection.title}
		>
			{collection.title}
		</span>
	);
}
