import { Link } from '@tanstack/react-router';
import type { LucideIcon } from 'lucide-react';
import type { ComponentProps } from 'react';
import { css } from 'styled-system/css';

const navLinkClass = css({
	display: 'flex',
	alignItems: 'center',
	gap: '3',
	px: '3',
	py: '2',
	borderRadius: 'card',
	fontSize: 'base',
	color: 'foregroundMuted',
	fontWeight: 'normal',
	cursor: 'pointer',
	textDecoration: 'none',
	transition: 'background-color 120ms ease, color 120ms ease',
	userSelect: 'none',
	_hover: {
		bg: 'navHover',
		color: 'foreground',
	},
	'&[data-status="active"]': {
		bg: 'navActive',
		color: 'foreground',
		fontWeight: 'medium',
	},
});

const externalLinkClass = css({
	display: 'flex',
	alignItems: 'center',
	gap: '3',
	px: '3',
	py: '2',
	borderRadius: 'card',
	fontSize: 'base',
	color: 'foregroundMuted',
	fontWeight: 'normal',
	cursor: 'pointer',
	textDecoration: 'none',
	transition: 'background-color 120ms ease, color 120ms ease',
	_hover: {
		bg: 'navHover',
		color: 'foreground',
	},
});

interface NavItemProps {
	to: string;
	label: string;
	icon: LucideIcon;
	external?: boolean;
	/** Passed to TanStack Router `Link` — use `{ exact: true }` so `/inventory` does not match `/inventory/add`. */
	activeOptions?: ComponentProps<typeof Link>['activeOptions'];
	/** e.g. close mobile drawer after navigation */
	onNavigate?: () => void;
}

export function NavItem({
	to,
	label,
	icon: Icon,
	external,
	activeOptions,
	onNavigate,
}: NavItemProps) {
	if (external) {
		return (
			<a
				href={to}
				target="_blank"
				rel="noopener noreferrer"
				className={externalLinkClass}
				onClick={() => onNavigate?.()}
			>
				<Icon size={16} strokeWidth={1.5} />
				<span>{label}</span>
			</a>
		);
	}

	return (
		<Link
			to={to}
			className={navLinkClass}
			onClick={() => onNavigate?.()}
			{...(activeOptions !== undefined ? { activeOptions } : {})}
		>
			<Icon size={16} strokeWidth={1.5} />
			<span>{label}</span>
		</Link>
	);
}
