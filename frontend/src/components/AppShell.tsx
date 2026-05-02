import { Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { css, cx } from "styled-system/css";
import { Sidebar } from "#/components/Sidebar";

const shellClass = css({
	display: "flex",
	h: "100vh",
	overflow: "hidden",
	bg: "background",
	fontFamily: "sans",
});

const overlayClass = css({
	display: "none",
	mdDown: {
		display: "block",
		position: "fixed",
		inset: "0",
		zIndex: "40",
		bg: "rgba(0,0,0,0.45)",
		opacity: "0",
		pointerEvents: "none",
		transition: "opacity {durations.normal} {easings.default}",
	},
});

const overlayOpenClass = css({
	mdDown: {
		opacity: "1",
		pointerEvents: "auto",
	},
});

const mainClass = css({
	flex: "1",
	overflowY: "auto",
	display: "flex",
	flexDir: "column",
	minW: "0",
	borderLeftWidth: "1px",
	borderLeftStyle: "solid",
	borderLeftColor: "borderSubtle",
	mdDown: {
		borderLeftWidth: "0",
	},
});

const mobileBarClass = css({
	display: "none",
	mdDown: {
		display: "flex",
		alignItems: "center",
		h: "topbar",
		flexShrink: "0",
		px: "3",
		gap: "3",
		borderBottomWidth: "1px",
		borderBottomStyle: "solid",
		borderBottomColor: "borderSubtle",
		bg: "background",
	},
});

const menuBtnClass = css({
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	w: "10",
	h: "10",
	borderRadius: "card",
	color: "foreground",
	cursor: "pointer",
	borderWidth: "0",
	bg: "transparent",
	transition: "background-color {durations.fast} {easings.default}",
	_hover: {
		bg: "navHover",
	},
});

const mobileTitleClass = css({
	fontSize: "md",
	fontWeight: "semibold",
	color: "foreground",
	letterSpacing: "-0.01em",
});

const mainScrollClass = css({
	flex: "1",
	minH: "0",
	overflowY: "auto",
});

export function AppShell({ children }: { children: React.ReactNode }) {
	const [mobileOpen, setMobileOpen] = useState(false);

	useEffect(() => {
		if (!mobileOpen) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") setMobileOpen(false);
		};
		document.addEventListener("keydown", onKey);
		const prev = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			document.removeEventListener("keydown", onKey);
			document.body.style.overflow = prev;
		};
	}, [mobileOpen]);

	return (
		<div className={shellClass}>
			<Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
			<button
				type="button"
				aria-label="Close menu"
				aria-hidden={!mobileOpen}
				tabIndex={mobileOpen ? 0 : -1}
				className={cx(overlayClass, mobileOpen && overlayOpenClass)}
				onClick={() => setMobileOpen(false)}
			/>
			<main className={mainClass}>
				<div className={mobileBarClass}>
					<button
						type="button"
						className={menuBtnClass}
						aria-expanded={mobileOpen}
						aria-controls="app-sidebar"
						onClick={() => setMobileOpen((o) => !o)}
					>
						<Menu size={22} strokeWidth={1.75} aria-hidden />
					</button>
					<span className={mobileTitleClass}>Gettin&apos; Paid</span>
				</div>
				<div className={mainScrollClass}>{children}</div>
			</main>
		</div>
	);
}
