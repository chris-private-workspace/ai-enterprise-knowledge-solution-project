/**
 * EKP design tokens — visual identity layer (per architecture.md §5.1).
 *
 * Per OQ-Q10 default: W1 uses neutral grayscale + 1 accent until W4 designer pass.
 * NEVER hardcode color/spacing in components — always reference tokens here.
 *
 * Constraints (per CLAUDE.md §3.2 + architecture.md §5.1 + §7):
 * - 100% custom values, NOT copied from Dify
 * - Layout patterns can borrow from Dify; visual identity must be distinctly EKP
 */

export const ekpTokens = {
  colors: {
    primary: 'oklch(0.42 0.04 260)',
    'primary-foreground': 'oklch(0.98 0 0)',
    accent: 'oklch(0.55 0.10 260)',
    'accent-foreground': 'oklch(0.98 0 0)',
    background: 'oklch(1 0 0)',
    foreground: 'oklch(0.15 0 0)',
    muted: 'oklch(0.96 0 0)',
    'muted-foreground': 'oklch(0.45 0 0)',
    border: 'oklch(0.92 0 0)',
    success: 'oklch(0.65 0.16 145)',
    warning: 'oklch(0.78 0.16 80)',
    destructive: 'oklch(0.57 0.22 25)',
    'destructive-foreground': 'oklch(0.98 0 0)',
  },
  radius: {
    sm: '0.25rem',
    md: '0.5rem',
    lg: '0.75rem',
  },
  fontFamily: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
    mono: ['JetBrains Mono', 'monospace'],
  },
};

export type EkpTokens = typeof ekpTokens;
