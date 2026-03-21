import type { Metadata } from 'next';

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import GitHubIcon from '@mui/icons-material/GitHub';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Toolbar from '@mui/material/Toolbar';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import AboutDialog from '@/components/about-dialog';
import HomeClient from '@/components/home-client';
import LogoIcon from '@/components/logo-icon';
import ThemeToggle from '@/components/theme-toggle';
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_REPOSITORY_URL,
  SITE_TAGLINE,
} from '@/lib/site';

const PUBLIC_DIRECTORY = join(process.cwd(), 'public');
const GITHUB_ICON_SX = { fontSize: { xs: '1.25rem', sm: '1.5rem' } } as const;
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

function readPublicMarkdown(fileName: string): Promise<string> {
  return readFile(join(PUBLIC_DIRECTORY, fileName), 'utf-8');
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
    <Box sx={{ minHeight: '100dvh', py: { xs: 2, sm: 3, md: 4 } }}>
      <Container maxWidth="lg">
        <Stack spacing={{ xs: 2.5, sm: 3 }}>
          <Toolbar disableGutters sx={{ alignItems: 'flex-start' }}>
            <Box sx={{ flexGrow: 1 }}>
              <Stack
                direction="row"
                spacing={1}
                sx={{ mb: 0.5 }}
                alignItems="center"
              >
                <LogoIcon
                  sx={{
                    fontSize: { xs: '1.4rem', sm: '1.6rem', md: '1.8rem' },
                  }}
                />
                <Typography variant="h4" component="h1">
                  {SITE_NAME}
                </Typography>
              </Stack>
              <Typography variant="subtitle2" color="text.secondary">
                {SITE_TAGLINE}
              </Typography>
            </Box>
            <Stack
              direction="row"
              spacing={{ xs: 1, sm: 1.5 }}
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
                  rel="noopener noreferrer"
                  aria-label="View on GitHub"
                >
                  <GitHubIcon sx={GITHUB_ICON_SX} />
                </IconButton>
              </Tooltip>
              <ThemeToggle />
            </Stack>
          </Toolbar>

          <HomeClient />
        </Stack>
      </Container>
    </Box>
  );
}
