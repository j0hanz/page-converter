import type { Metadata } from 'next';

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import GitHubIcon from '@mui/icons-material/GitHub';
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
import { SITE_DESCRIPTION, SITE_NAME, SITE_REPOSITORY_URL } from '@/lib/site';
import { HEADER_ICON_SX, responsive } from '@/lib/theme';

const CONTENT_DIRECTORY = join(process.cwd(), 'content');
const HOME_MARKDOWN_FILES = {
  about: 'about.md',
  howItWorks: 'how-it-works.md',
} as const;

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

async function readPublicMarkdown(fileName: string): Promise<string> {
  try {
    return await readFile(join(CONTENT_DIRECTORY, fileName), 'utf-8');
  } catch (error) {
    console.error(`Failed to read markdown file: ${fileName}`, error);
    return '';
  }
}

async function readHomePageMarkdown() {
  const [aboutMarkdown, howItWorksMarkdown] = await Promise.all([
    readPublicMarkdown(HOME_MARKDOWN_FILES.about),
    readPublicMarkdown(HOME_MARKDOWN_FILES.howItWorks),
  ]);

  return { aboutMarkdown, howItWorksMarkdown };
}

export default async function Home() {
  const { aboutMarkdown, howItWorksMarkdown } = await readHomePageMarkdown();

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
              <AboutDialog
                markdown={aboutMarkdown}
                howItWorksMarkdown={howItWorksMarkdown}
              />
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
