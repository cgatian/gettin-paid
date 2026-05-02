const tokens = {
  "colors.background": {
    "value": "#13111C",
    "variable": "var(--colors-background)"
  },
  "colors.surface": {
    "value": "#1C1A28",
    "variable": "var(--colors-surface)"
  },
  "colors.border": {
    "value": "#33323E",
    "variable": "var(--colors-border)"
  },
  "colors.borderSubtle": {
    "value": "rgba(255,255,255,0.12)",
    "variable": "var(--colors-border-subtle)"
  },
  "colors.borderFaint": {
    "value": "rgba(255,255,255,0.08)",
    "variable": "var(--colors-border-faint)"
  },
  "colors.foreground": {
    "value": "#FFFFFF",
    "variable": "var(--colors-foreground)"
  },
  "colors.foregroundMuted": {
    "value": "#A1A0AB",
    "variable": "var(--colors-foreground-muted)"
  },
  "colors.accent": {
    "value": "#853BCE",
    "variable": "var(--colors-accent)"
  },
  "colors.accentHover": {
    "value": "#6e28b5",
    "variable": "var(--colors-accent-hover)"
  },
  "colors.accentGreen": {
    "value": "#42946E",
    "variable": "var(--colors-accent-green)"
  },
  "colors.navActive": {
    "value": "rgba(255,255,255,0.06)",
    "variable": "var(--colors-nav-active)"
  },
  "colors.navHover": {
    "value": "rgba(255,255,255,0.04)",
    "variable": "var(--colors-nav-hover)"
  },
  "colors.danger": {
    "value": "#c0392b",
    "variable": "var(--colors-danger)"
  },
  "colors.dangerHover": {
    "value": "#a93226",
    "variable": "var(--colors-danger-hover)"
  },
  "fonts.sans": {
    "value": "\"Inter\", ui-sans-serif, system-ui, sans-serif",
    "variable": "var(--fonts-sans)"
  },
  "fonts.mono": {
    "value": "\"JetBrains Mono\", \"Fira Code\", ui-monospace, monospace",
    "variable": "var(--fonts-mono)"
  },
  "fontSizes.xs": {
    "value": "10px",
    "variable": "var(--font-sizes-xs)"
  },
  "fontSizes.sm": {
    "value": "12px",
    "variable": "var(--font-sizes-sm)"
  },
  "fontSizes.base": {
    "value": "14px",
    "variable": "var(--font-sizes-base)"
  },
  "fontSizes.md": {
    "value": "16px",
    "variable": "var(--font-sizes-md)"
  },
  "fontSizes.lg": {
    "value": "20px",
    "variable": "var(--font-sizes-lg)"
  },
  "fontSizes.xl": {
    "value": "24px",
    "variable": "var(--font-sizes-xl)"
  },
  "fontSizes.2xl": {
    "value": "28px",
    "variable": "var(--font-sizes-2xl)"
  },
  "fontSizes.3xl": {
    "value": "36px",
    "variable": "var(--font-sizes-3xl)"
  },
  "fontWeights.normal": {
    "value": "400",
    "variable": "var(--font-weights-normal)"
  },
  "fontWeights.medium": {
    "value": "500",
    "variable": "var(--font-weights-medium)"
  },
  "fontWeights.semibold": {
    "value": "600",
    "variable": "var(--font-weights-semibold)"
  },
  "fontWeights.bold": {
    "value": "700",
    "variable": "var(--font-weights-bold)"
  },
  "radii.sm": {
    "value": "4px",
    "variable": "var(--radii-sm)"
  },
  "radii.btn": {
    "value": "6px",
    "variable": "var(--radii-btn)"
  },
  "radii.card": {
    "value": "8px",
    "variable": "var(--radii-card)"
  },
  "radii.full": {
    "value": "9999px",
    "variable": "var(--radii-full)"
  },
  "sizes.sidebar": {
    "value": "220px",
    "variable": "var(--sizes-sidebar)"
  },
  "sizes.topbar": {
    "value": "56px",
    "variable": "var(--sizes-topbar)"
  },
  "sizes.breakpoint-sm": {
    "value": "640px",
    "variable": "var(--sizes-breakpoint-sm)"
  },
  "sizes.breakpoint-md": {
    "value": "768px",
    "variable": "var(--sizes-breakpoint-md)"
  },
  "sizes.breakpoint-lg": {
    "value": "1024px",
    "variable": "var(--sizes-breakpoint-lg)"
  },
  "sizes.breakpoint-xl": {
    "value": "1280px",
    "variable": "var(--sizes-breakpoint-xl)"
  },
  "sizes.breakpoint-2xl": {
    "value": "1536px",
    "variable": "var(--sizes-breakpoint-2xl)"
  },
  "spacing.0": {
    "value": "0px",
    "variable": "var(--spacing-0)"
  },
  "spacing.1": {
    "value": "4px",
    "variable": "var(--spacing-1)"
  },
  "spacing.2": {
    "value": "8px",
    "variable": "var(--spacing-2)"
  },
  "spacing.3": {
    "value": "12px",
    "variable": "var(--spacing-3)"
  },
  "spacing.4": {
    "value": "16px",
    "variable": "var(--spacing-4)"
  },
  "spacing.5": {
    "value": "20px",
    "variable": "var(--spacing-5)"
  },
  "spacing.6": {
    "value": "24px",
    "variable": "var(--spacing-6)"
  },
  "spacing.8": {
    "value": "32px",
    "variable": "var(--spacing-8)"
  },
  "spacing.10": {
    "value": "40px",
    "variable": "var(--spacing-10)"
  },
  "spacing.12": {
    "value": "48px",
    "variable": "var(--spacing-12)"
  },
  "spacing.16": {
    "value": "64px",
    "variable": "var(--spacing-16)"
  },
  "durations.fast": {
    "value": "120ms",
    "variable": "var(--durations-fast)"
  },
  "durations.normal": {
    "value": "180ms",
    "variable": "var(--durations-normal)"
  },
  "easings.default": {
    "value": "ease",
    "variable": "var(--easings-default)"
  },
  "breakpoints.sm": {
    "value": "640px",
    "variable": "var(--breakpoints-sm)"
  },
  "breakpoints.md": {
    "value": "768px",
    "variable": "var(--breakpoints-md)"
  },
  "breakpoints.lg": {
    "value": "1024px",
    "variable": "var(--breakpoints-lg)"
  },
  "breakpoints.xl": {
    "value": "1280px",
    "variable": "var(--breakpoints-xl)"
  },
  "breakpoints.2xl": {
    "value": "1536px",
    "variable": "var(--breakpoints-2xl)"
  },
  "spacing.-0": {
    "value": "calc(var(--spacing-0) * -1)",
    "variable": "var(--spacing-0)"
  },
  "spacing.-1": {
    "value": "calc(var(--spacing-1) * -1)",
    "variable": "var(--spacing-1)"
  },
  "spacing.-2": {
    "value": "calc(var(--spacing-2) * -1)",
    "variable": "var(--spacing-2)"
  },
  "spacing.-3": {
    "value": "calc(var(--spacing-3) * -1)",
    "variable": "var(--spacing-3)"
  },
  "spacing.-4": {
    "value": "calc(var(--spacing-4) * -1)",
    "variable": "var(--spacing-4)"
  },
  "spacing.-5": {
    "value": "calc(var(--spacing-5) * -1)",
    "variable": "var(--spacing-5)"
  },
  "spacing.-6": {
    "value": "calc(var(--spacing-6) * -1)",
    "variable": "var(--spacing-6)"
  },
  "spacing.-8": {
    "value": "calc(var(--spacing-8) * -1)",
    "variable": "var(--spacing-8)"
  },
  "spacing.-10": {
    "value": "calc(var(--spacing-10) * -1)",
    "variable": "var(--spacing-10)"
  },
  "spacing.-12": {
    "value": "calc(var(--spacing-12) * -1)",
    "variable": "var(--spacing-12)"
  },
  "spacing.-16": {
    "value": "calc(var(--spacing-16) * -1)",
    "variable": "var(--spacing-16)"
  },
  "colors.colorPalette": {
    "value": "var(--colors-color-palette)",
    "variable": "var(--colors-color-palette)"
  }
}

export function token(path, fallback) {
  return tokens[path]?.value || fallback
}

function tokenVar(path, fallback) {
  return tokens[path]?.variable || fallback
}

token.var = tokenVar