import Link from 'next/link';

import Button from '@mui/material/Button';
import InitColorSchemeScript from '@mui/material/InitColorSchemeScript';

import { StatusShell } from '@/components/ui/status-shell';

import { geistMono, geistSans } from '@/lib/fonts';
import { AppThemeProviders } from '@/lib/theme-provider';

export default function GlobalNotFound() {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body>
        <InitColorSchemeScript attribute="class" />
        <AppThemeProviders>
          <StatusShell
            title="Page not found"
            message="The page you are looking for does not exist."
            minHeight="100dvh"
            action={
              <Link href="/">
                <Button component="span" variant="contained">
                  Go home
                </Button>
              </Link>
            }
          />
        </AppThemeProviders>
      </body>
    </html>
  );
}
