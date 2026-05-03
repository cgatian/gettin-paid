import { css } from 'styled-system/css';

const wrapClass = css({
	display: 'flex',
	flexDir: { base: 'column', md: 'row' },
	alignItems: 'center',
	gap: '6',
});

const legendClass = css({
	listStyle: 'none',
	margin: '0',
	padding: '0',
	display: 'flex',
	flexDir: 'column',
	gap: '2',
	fontSize: 'sm',
	color: 'foregroundMuted',
	minW: '0',
	flex: '1',
});

const legendItemClass = css({
	display: 'flex',
	alignItems: 'center',
	gap: '2',
});

const swatchClass = css({
	w: '3',
	h: '3',
	borderRadius: 'sm',
	flexShrink: '0',
});

const valueClass = css({
	color: 'foreground',
	fontWeight: 'medium',
	ml: 'auto',
	pl: '2',
});

function polarToCartesian(
	cx: number,
	cy: number,
	r: number,
	angleInDegrees: number,
) {
	const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
	return {
		x: cx + r * Math.cos(angleInRadians),
		y: cy + r * Math.sin(angleInRadians),
	};
}

function describeSlice(
	cx: number,
	cy: number,
	r: number,
	startAngle: number,
	endAngle: number,
) {
	const start = polarToCartesian(cx, cy, r, endAngle);
	const end = polarToCartesian(cx, cy, r, startAngle);
	const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
	return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
}

const PIE_MAX_SLICES = 10;

function mergeSlicesForPie(
	items: { label: string; value: number }[],
): { label: string; value: number }[] {
	const positive = items.filter((x) => x.value > 0);
	const total = positive.reduce((s, x) => s + x.value, 0);
	if (total === 0) return [];
	if (positive.length <= PIE_MAX_SLICES) return positive;

	const head = positive.slice(0, PIE_MAX_SLICES - 1);
	const tail = positive.slice(PIE_MAX_SLICES - 1);
	const otherSum = tail.reduce((s, x) => s + x.value, 0);
	return [...head, { label: 'Other', value: otherSum }];
}

function hueForIndex(i: number) {
	return (i * 47 + 198) % 360;
}

export interface GamesPerSystemPieProps {
	/** Count of games (editions) per label */
	slices: { label: string; value: number }[];
	emptyLabel?: string;
}

export function GamesPerSystemPie({
	slices,
	emptyLabel = 'No games to chart yet.',
}: GamesPerSystemPieProps) {
	const pieData = mergeSlicesForPie(slices);
	const total = pieData.reduce((s, d) => s + d.value, 0);

	if (total === 0) {
		return (
			<p
				className={css({
					fontSize: 'sm',
					color: 'foregroundMuted',
					m: '0',
					py: '6',
					textAlign: 'center',
				})}
			>
				{emptyLabel}
			</p>
		);
	}

	const cx = 100;
	const cy = 100;
	const r = 88;
	let angle = 0;

	return (
		<div className={wrapClass}>
			<svg
				width="200"
				height="200"
				viewBox="0 0 200 200"
				role="img"
				aria-label={`Games by system: ${pieData
					.map((d) => `${d.label} ${d.value}`)
					.join(', ')}`}
			>
				<title>
					{`Games by system — ${pieData
						.map((d) => `${d.label}: ${d.value}`)
						.join('; ')}`}
				</title>
				{pieData.map((d, i) => {
					const sweep = (d.value / total) * 360;
					const start = angle;
					const end = angle + sweep;
					angle = end;
					const path = describeSlice(cx, cy, r, start, end);
					const fill = `hsl(${hueForIndex(i)} 58% 52% / 0.92)`;
					return (
						<path
							key={`${d.label}-${start}-${end}`}
							d={path}
							fill={fill}
							stroke="rgba(0,0,0,0.35)"
							strokeWidth="1"
						/>
					);
				})}
			</svg>
			<ul className={legendClass}>
				{pieData.map((d, i) => {
					const pct = ((d.value / total) * 100).toFixed(1);
					return (
						<li key={`${d.label}-${d.value}`} className={legendItemClass}>
							<span
								className={swatchClass}
								style={{
									background: `hsl(${hueForIndex(i)} 58% 52%)`,
								}}
							/>
							<span className={css({ minW: '0', flex: '1' })}>{d.label}</span>
							<span className={valueClass}>
								{d.value} ({pct}%)
							</span>
						</li>
					);
				})}
			</ul>
		</div>
	);
}
