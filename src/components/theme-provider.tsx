/**
 * GLOBAL THEME PROVIDER
 *
 * Wraps the application with next-themes ThemeProvider for dark mode support.
 * Configured with class-based theme switching.
 */

'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { type ReactNode } from 'react';

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </NextThemesProvider>
  );
}
