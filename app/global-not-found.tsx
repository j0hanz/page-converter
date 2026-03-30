import Button from '@mui/material/Button';
import InitColorSchemeScript from '@mui/material/InitColorSchemeScript';

import AppLink from '@/components/ui/app-link';
import { StatusShell } from '@/components/ui/error';

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
              <Button component={AppLink} href="/" variant="contained">
                Go home
              </Button>
            }
          />
        </AppThemeProviders>
      </body>
    </html>
  );
}
