import { Suspense } from 'react';

import type { Metadata } from 'next';

import GitHubIcon from '@mui/icons-material/GitHub';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Toolbar from '@mui/material/Toolbar';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import AboutDialog from '@/components/features/about-dialog';
import HomeClient from '@/components/features/home-client';
import LogoIcon from '@/components/ui/logo-icon';
import ThemeToggle from '@/components/ui/theme-toggle';

import { readHomePageMarkdown } from '@/lib/home-content';
import { SITE_DESCRIPTION, SITE_NAME, SITE_REPOSITORY_URL } from '@/lib/site';
import { HEADER_ICON_SX, responsive } from '@/lib/theme';

export const metadata: Metadata = {
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: '/',
  },
  twitter: {
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
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
      <InfoOutlinedIcon sx={HEADER_ICON_SX} />
    </IconButton>
  );
}

export default function Home() {
  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        pt: responsive.pagePt,
      }}
    >
      <Container
        maxWidth="lg"
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: responsive.containerGap,
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
                  fontSize: responsive.logoSize,
                }}
              />
              <Typography variant="h4" component="h1" noWrap>
                {SITE_NAME}
              </Typography>
            </Stack>
            <Stack
              direction="row"
              spacing={{ xs: 1, sm: 2 }}
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
                  <GitHubIcon sx={HEADER_ICON_SX} />
                </IconButton>
              </Tooltip>
              <ThemeToggle />
            </Stack>
          </Toolbar>
        </AppBar>

        <HomeClient />
      </Container>
    </Box>
  );
}
