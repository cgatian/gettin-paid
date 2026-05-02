import { defineConfig } from "@pandacss/dev";

export default defineConfig({
	preflight: true,
	jsxFramework: "react",
	include: ["./src/**/*.{ts,tsx}"],
	exclude: [],
	outdir: "styled-system",

	theme: {
		keyframes: {
			fadeUp: {
				from: { opacity: "0", transform: "translateY(8px)" },
				to: { opacity: "1", transform: "translateY(0)" },
			},
			fadeIn: {
				from: { opacity: "0" },
				to: { opacity: "1" },
			},
		},
		tokens: {
			colors: {
				background: { value: "#13111C" },
				surface: { value: "#1C1A28" },
				border: { value: "#33323E" },
				borderSubtle: { value: "rgba(255,255,255,0.12)" },
				borderFaint: { value: "rgba(255,255,255,0.08)" },
				foreground: { value: "#FFFFFF" },
				foregroundMuted: { value: "#A1A0AB" },
				accent: { value: "#853BCE" },
				accentHover: { value: "#6e28b5" },
				accentGreen: { value: "#42946E" },
				accentGreenHover: { value: "#357a5a" },
				navActive: { value: "rgba(255,255,255,0.06)" },
				navHover: { value: "rgba(255,255,255,0.04)" },
				danger: { value: "#c0392b" },
				dangerHover: { value: "#a93226" },
				link: { value: "#58a6ff" },
				linkHover: { value: "#79b8ff" },
			},
			fonts: {
				sans: { value: '"Inter", ui-sans-serif, system-ui, sans-serif' },
				mono: {
					value: '"JetBrains Mono", "Fira Code", ui-monospace, monospace',
				},
			},
			fontSizes: {
				xs: { value: "10px" },
				sm: { value: "12px" },
				base: { value: "14px" },
				md: { value: "16px" },
				lg: { value: "20px" },
				xl: { value: "24px" },
				"2xl": { value: "28px" },
				"3xl": { value: "36px" },
			},
			fontWeights: {
				normal: { value: "400" },
				medium: { value: "500" },
				semibold: { value: "600" },
				bold: { value: "700" },
			},
			radii: {
				sm: { value: "4px" },
				btn: { value: "6px" },
				card: { value: "8px" },
				full: { value: "9999px" },
			},
			sizes: {
				sidebar: { value: "220px" },
				topbar: { value: "56px" },
			},
			spacing: {
				"0": { value: "0px" },
				"1": { value: "4px" },
				"2": { value: "8px" },
				"3": { value: "12px" },
				"4": { value: "16px" },
				"5": { value: "20px" },
				"6": { value: "24px" },
				"8": { value: "32px" },
				"10": { value: "40px" },
				"12": { value: "48px" },
				"16": { value: "64px" },
			},
			durations: {
				fast: { value: "120ms" },
				normal: { value: "180ms" },
			},
			easings: {
				default: { value: "ease" },
			},
		},
	},
});
