import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cva, cx } from "styled-system/css";

const buttonVariants = cva({
	base: {
		display: "inline-flex",
		alignItems: "center",
		gap: "2",
		cursor: "pointer",
		fontWeight: "medium",
		fontSize: "base",
		fontFamily: "sans",
		borderRadius: "btn",
		borderWidth: "1px",
		borderStyle: "solid",
		transition:
			"background-color 120ms ease, border-color 120ms ease, color 120ms ease",
		whiteSpace: "nowrap",
		userSelect: "none",
		textDecoration: "none",
		lineHeight: "1.4",
		outline: "none",
		_focusVisible: {
			ringWidth: "2px",
			ringColor: "accent",
			ringOffset: "2px",
		},
		_disabled: {
			opacity: "0.5",
			cursor: "not-allowed",
		},
	},
	variants: {
		variant: {
			primary: {
				bg: "accent",
				color: "foreground",
				borderColor: "accent",
				_hover: { bg: "accentHover", borderColor: "accentHover" },
			},
			secondary: {
				bg: "transparent",
				color: "foreground",
				borderColor: "border",
				_hover: { bg: "navActive", borderColor: "borderSubtle" },
			},
			ghost: {
				bg: "transparent",
				color: "foregroundMuted",
				borderColor: "transparent",
				_hover: { bg: "navHover", color: "foreground" },
			},
			danger: {
				bg: "danger",
				color: "foreground",
				borderColor: "danger",
				_hover: { bg: "dangerHover", borderColor: "dangerHover" },
			},
			success: {
				bg: "accentGreen",
				color: "foreground",
				borderColor: "accentGreen",
				_hover: { bg: "accentGreenHover", borderColor: "accentGreenHover" },
			},
		},
		size: {
			sm: { px: "3", py: "1", fontSize: "sm" },
			md: { px: "4", py: "2", fontSize: "base" },
			lg: { px: "5", py: "3", fontSize: "md" },
		},
	},
	defaultVariants: {
		variant: "secondary",
		size: "md",
	},
});

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: ButtonVariant;
	size?: ButtonSize;
	children: ReactNode;
}

export function Button({
	variant,
	size,
	className,
	children,
	type = "button",
	...props
}: ButtonProps) {
	return (
		<button
			type={type}
			className={cx(buttonVariants({ variant, size }), className)}
			{...props}
		>
			{children}
		</button>
	);
}

export { buttonVariants };
