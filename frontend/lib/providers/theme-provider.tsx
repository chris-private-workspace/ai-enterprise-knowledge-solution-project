'use client';

/**
 * C09 + C10 — theme provider wrapper (W13 D1 F1.3 ThemeProvider integration).
 *
 * Wraps next-themes so the root layout can stay a server component while the
 * provider boundary lives in a client island. Class-based dark mode toggle
 * targets `<html class="dark">` per Tailwind config + globals.css :root + .dark
 * layers (W12 D2 F2 Option C tokens).
 */

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ComponentProps } from 'react';

type ThemeProviderProps = ComponentProps<typeof NextThemesProvider>;

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
