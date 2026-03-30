import { Suspense } from 'react';

import type { Metadata, Viewport } from 'next';

import GitHubIcon from '@mui/icons-material/GitHub';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import InitColorSchemeScript from '@mui/material/InitColorSchemeScript';
import Stack from '@mui/material/Stack';
import Toolbar from '@mui/material/Toolbar';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import AboutDialog from '@/components/features/about-dialog';
import Footer from '@/components/ui/footer';
import LogoIcon from '@/components/ui/logo-icon';
import ThemeToggle from '@/components/ui/theme-toggle';

import { geistMono, geistSans } from '@/lib/fonts';
import { readHomePageMarkdown } from '@/lib/home-content';
import {
  resolveSiteUrl,
  SITE_CATEGORY,
  SITE_CREATOR,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_NAME,
  SITE_REPOSITORY_URL,
} from '@/lib/site';
import { fluid, sx } from '@/lib/theme';
import { AppThemeProviders } from '@/lib/theme-provider';

const metadataBase = resolveSiteUrl();

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ebebeb' },
    { media: '(prefers-color-scheme: dark)', color: '#202020' },
  ],
};

export const metadata: Metadata = {
  metadataBase,
  applicationName: SITE_NAME,
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [...SITE_KEYWORDS],
  authors: [{ name: SITE_CREATOR }],
  creator: SITE_CREATOR,
  publisher: SITE_CREATOR,
  category: SITE_CATEGORY,
  referrer: 'origin-when-cross-origin',
  formatDetection: {
    address: false,
    email: false,
    telephone: false,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: SITE_NAME,
  },
  twitter: {
    card: 'summary_large_image',
  },
};

async function AboutDialogContent() {
  const { aboutMarkdown, howItWorksMarkdown } = await readHomePageMarkdown();

  return (
    <AboutDialog
      markdown={aboutMarkdown}
      howItWorksMarkdown={howItWorksMarkdown}
    />
  );
}

function AboutDialogFallback() {
  return (
    <IconButton
      disabled
      size="small"
      aria-label="About Fetch URL"
      disableRipple
    >
      <InfoOutlinedIcon sx={sx.headerIcon} />
    </IconButton>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body>
        <Box
          component="a"
          href="#main-content"
          sx={{
            position: 'absolute',
            left: '-9999px',
            top: 'auto',
            '&:focus': {
              position: 'fixed',
              top: 8,
              left: 8,
              zIndex: 'tooltip',
              bgcolor: 'background.paper',
              color: 'text.primary',
              px: 2,
              py: 1,
              borderRadius: 1,
              boxShadow: 3,
            },
          }}
        >
          Skip to content
        </Box>
        <InitColorSchemeScript attribute="class" />
        <AppThemeProviders>
          <Box
            sx={{
              minHeight: '100dvh',
              display: 'flex',
              flexDirection: 'column',
              pt: fluid.pagePt,
            }}
          >
            <Container
              maxWidth="lg"
              sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: fluid.containerGap,
              }}
            >
              <AppBar>
                <Toolbar sx={{ justifyContent: 'space-between' }}>
                  <Stack
                    direction="row"
                    gap={1.5}
                    alignItems="center"
                    sx={{ minWidth: 0 }}
                  >
                    <LogoIcon
                      sx={{
                        fontSize: fluid.logoSize,
                      }}
                    />
                    <Typography variant="h4" component="h1" noWrap>
                      {SITE_NAME}
                    </Typography>
                  </Stack>
                  <Stack
                    direction="row"
                    sx={{ gap: 'clamp(0.5rem, 0.25rem + 0.5vw, 1rem)' }}
                    alignItems="center"
                  >
                    <Suspense fallback={<AboutDialogFallback />}>
                      <AboutDialogContent />
                    </Suspense>
                    <Tooltip title="View on GitHub">
                      <IconButton
                        component="a"
                        href={SITE_REPOSITORY_URL}
                        target="_blank"
                        size="small"
                        disableRipple={true}
                        rel="noopener noreferrer"
                        aria-label="View on GitHub"
                      >
                        <GitHubIcon sx={sx.headerIcon} />
                      </IconButton>
                    </Tooltip>
                    <ThemeToggle />
                  </Stack>
                </Toolbar>
              </AppBar>

              <Box component="main" id="main-content" sx={sx.flexColumn}>
                {children}
              </Box>
              <Footer />
            </Container>
          </Box>
        </AppThemeProviders>
      </body>
    </html>
  );
}
