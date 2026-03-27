'use client';

import InitColorSchemeScript from '@mui/material/InitColorSchemeScript';

import { ErrorState, type ResettableErrorProps } from '@/components/ui/error';

import { geistMono, geistSans } from '@/lib/fonts';
import { AppThemeProviders } from '@/lib/theme-provider';

export default function GlobalError({ error, reset }: ResettableErrorProps) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body>
        <InitColorSchemeScript attribute="class" />
        <AppThemeProviders>
          <ErrorState
            error={error}
            fallbackMessage="A critical error occurred."
            minHeight="100dvh"
            reset={reset}
          />
        </AppThemeProviders>
      </body>
    </html>
  );
}
