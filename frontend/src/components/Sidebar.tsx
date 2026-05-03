import { Link } from '@tanstack/react-router';
import {
	Archive,
	FilePlus,
	Info,
	LayoutDashboard,
	Settings,
	X,
} from 'lucide-react';
import { css } from 'styled-system/css';
import { NavItem } from '#/components/ui/NavItem';

const sidebarClass = css({
	w: 'sidebar',
	flexShrink: '0',
	h: '100vh',
	display: 'flex',
	flexDir: 'column',
	overflow: 'hidden',
	pt: '10',
	bg: 'background',
	mdDown: {
		position: 'fixed',
		left: '0',
		top: '0',
		zIndex: '50',
		transform: 'translateX(-100%)',
		transition: 'transform {durations.normal} {easings.default}',
		boxShadow: '4px 0 28px rgba(0,0,0,0.45)',
		'&[data-open="true"]': {
			transform: 'translateX(0)',
		},
	},
});

const logoAreaClass = css({
	h: '12',
	display: 'flex',
	alignItems: 'center',
	justifyContent: 'space-between',
	px: '4',
	gap: '3',
	flexShrink: '0',
});

const logoClass = css({
	display: 'flex',
	alignItems: 'center',
	gap: '2',
	textDecoration: 'none',
	color: 'foreground',
	minW: '0',
});

const logoIconClass = css({
	w: '6',
	h: '6',
	bg: 'accent',
	borderRadius: 'sm',
	display: 'flex',
	alignItems: 'center',
	justifyContent: 'center',
	fontSize: 'xs',
	fontWeight: 'bold',
	color: 'foreground',
	flexShrink: '0',
});

const logoTextClass = css({
	fontSize: 'base',
	fontWeight: 'semibold',
	color: 'foreground',
	letterSpacing: '-0.01em',
});

const closeBtnClass = css({
	display: 'none',
	mdDown: {
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		w: '10',
		h: '10',
		flexShrink: '0',
		borderRadius: 'card',
		color: 'foregroundMuted',
		cursor: 'pointer',
		borderWidth: '0',
		bg: 'transparent',
		transition:
			'background-color {durations.fast} {easings.default}, color {durations.fast} {easings.default}',
		_hover: {
			bg: 'navHover',
			color: 'foreground',
		},
	},
});

const navClass = css({
	flex: '1',
	overflowY: 'auto',
	px: '2',
	py: '2',
	display: 'flex',
	flexDir: 'column',
	gap: '1',
});

const dividerClass = css({
	h: '1px',
	bg: 'border',
	mx: '3',
	my: '2',
	flexShrink: '0',
});

const navSectionClass = css({
	display: 'flex',
	flexDir: 'column',
	gap: '1',
});

const navFooterClass = css({
	display: 'flex',
	flexDir: 'column',
	gap: '1',
	mt: 'auto',
	pt: '2',
	flexShrink: '0',
});

export interface SidebarProps {
	mobileOpen: boolean;
	onClose: () => void;
}

export function Sidebar({ mobileOpen, onClose }: SidebarProps) {
	return (
		<aside
			id="app-sidebar"
			className={sidebarClass}
			data-open={mobileOpen ? 'true' : 'false'}
		>
			<div className={logoAreaClass}>
				<Link to="/" className={logoClass} onClick={onClose}>
					<div className={logoIconClass}>
						<span>G</span>
					</div>
					<span className={logoTextClass}>Gettin&apos; Paid</span>
				</Link>
				<button
					type="button"
					className={closeBtnClass}
					aria-label="Close menu"
					onClick={onClose}
				>
					<X size={20} strokeWidth={1.75} aria-hidden />
				</button>
			</div>

			<nav className={navClass} aria-label="Main">
				<div className={navSectionClass}>
					<NavItem
						to="/dashboard"
						label="Dashboard"
						icon={LayoutDashboard}
						onNavigate={onClose}
					/>
					<NavItem
						to="/inventory"
						label="Inventory"
						icon={Archive}
						activeOptions={{ exact: true }}
						onNavigate={onClose}
					/>
					<NavItem
						to="/inventory/add"
						label="Add Game"
						icon={FilePlus}
						onNavigate={onClose}
					/>
					<NavItem
						to="/settings"
						label="Settings"
						icon={Settings}
						onNavigate={onClose}
					/>
				</div>

				<div className={navFooterClass}>
					<div className={dividerClass} />
					<NavItem to="/about" label="About" icon={Info} onNavigate={onClose} />
				</div>
			</nav>
		</aside>
	);
}
