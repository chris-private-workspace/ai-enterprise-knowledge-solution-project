import type { Metadata } from 'next';

import { ThemeProvider } from '@/lib/providers/theme-provider';

import './globals.css';

export const metadata: Metadata = {
  title: 'EKP — Enterprise Knowledge Platform',
  description: 'Self-built knowledge platform — Drive Project user manuals',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
