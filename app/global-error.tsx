'use client';

import { ErrorState, type ResettableErrorProps } from '@/components/error';
import { AppThemeProviders } from '@/lib/theme-provider';

export default function GlobalError({ error, reset }: ResettableErrorProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
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
