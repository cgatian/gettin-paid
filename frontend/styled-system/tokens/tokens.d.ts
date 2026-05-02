/* eslint-disable */
export type Token =
	| `colors.${ColorToken}`
	| `fonts.${FontToken}`
	| `fontSizes.${FontSizeToken}`
	| `fontWeights.${FontWeightToken}`
	| `radii.${RadiusToken}`
	| `sizes.${SizeToken}`
	| `spacing.${SpacingToken}`
	| `durations.${DurationToken}`
	| `easings.${EasingToken}`
	| `breakpoints.${BreakpointToken}`;

export type ColorPalette =
	| "background"
	| "surface"
	| "border"
	| "borderSubtle"
	| "borderFaint"
	| "foreground"
	| "foregroundMuted"
	| "accent"
	| "accentHover"
	| "accentGreen"
	| "accentGreenHover"
	| "navActive"
	| "navHover"
	| "danger"
	| "dangerHover"
	| "link"
	| "linkHover";

export type ColorToken =
	| "background"
	| "surface"
	| "border"
	| "borderSubtle"
	| "borderFaint"
	| "foreground"
	| "foregroundMuted"
	| "accent"
	| "accentHover"
	| "accentGreen"
	| "accentGreenHover"
	| "navActive"
	| "navHover"
	| "danger"
	| "dangerHover"
	| "link"
	| "linkHover"
	| "colorPalette";

export type FontToken = "sans" | "mono";

export type FontSizeToken =
	| "xs"
	| "sm"
	| "base"
	| "md"
	| "lg"
	| "xl"
	| "2xl"
	| "3xl";

export type FontWeightToken = "normal" | "medium" | "semibold" | "bold";

export type RadiusToken = "sm" | "btn" | "card" | "full";

export type SizeToken =
	| "sidebar"
	| "topbar"
	| "breakpoint-sm"
	| "breakpoint-md"
	| "breakpoint-lg"
	| "breakpoint-xl"
	| "breakpoint-2xl";

export type SpacingToken =
	| "0"
	| "1"
	| "2"
	| "3"
	| "4"
	| "5"
	| "6"
	| "8"
	| "10"
	| "12"
	| "16"
	| "-0"
	| "-1"
	| "-2"
	| "-3"
	| "-4"
	| "-5"
	| "-6"
	| "-8"
	| "-10"
	| "-12"
	| "-16";

export type DurationToken = "fast" | "normal";

export type EasingToken = "default";

export type BreakpointToken = "sm" | "md" | "lg" | "xl" | "2xl";

export type Tokens = {
	colors: ColorToken;
	fonts: FontToken;
	fontSizes: FontSizeToken;
	fontWeights: FontWeightToken;
	radii: RadiusToken;
	sizes: SizeToken;
	spacing: SpacingToken;
	durations: DurationToken;
	easings: EasingToken;
	breakpoints: BreakpointToken;
} & { [token: string]: never };

export type TokenCategory =
	| "aspectRatios"
	| "zIndex"
	| "opacity"
	| "colors"
	| "fonts"
	| "fontSizes"
	| "fontWeights"
	| "lineHeights"
	| "letterSpacings"
	| "sizes"
	| "cursor"
	| "shadows"
	| "spacing"
	| "radii"
	| "borders"
	| "borderWidths"
	| "durations"
	| "easings"
	| "animations"
	| "blurs"
	| "gradients"
	| "breakpoints"
	| "assets";
