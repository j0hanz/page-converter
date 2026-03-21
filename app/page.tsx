import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Metadata } from "next";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Toolbar from "@mui/material/Toolbar";
import Tooltip from "@mui/material/Tooltip";
import GitHubIcon from "@mui/icons-material/GitHub";
import HomeClient from "@/components/home-client";
import AboutDialog from "@/components/about-dialog";
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_REPOSITORY_URL,
  SITE_TAGLINE,
} from "@/lib/site";
import ThemeToggle from "@/components/theme-toggle";

const PUBLIC_DIRECTORY = join(process.cwd(), "public");
const GITHUB_ICON_SX = { fontSize: { xs: "1.25rem", sm: "1.5rem" } } as const;
const HOME_MARKDOWN_FILES = {
  about: "about.md",
  howItWorks: "how-it-works.md",
} as const;

export const metadata: Metadata = {
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: "/",
  },
  twitter: {
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
};

function readPublicMarkdown(fileName: string): Promise<string> {
  return readFile(join(PUBLIC_DIRECTORY, fileName), "utf-8");
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
    <Box sx={{ minHeight: "100dvh", py: { xs: 2, sm: 4, md: 6 } }}>
      <Container maxWidth="lg">
        <Stack spacing={{ xs: 3, sm: 4 }}>
          <Toolbar disableGutters sx={{ alignItems: "flex-start" }}>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h4" component="h1" gutterBottom>
                {SITE_NAME}
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                {SITE_TAGLINE}
              </Typography>
            </Box>
            <Stack direction="row" spacing={{ xs: 1, sm: 2 }}>
              <AboutDialog
                markdown={aboutMarkdown}
                howItWorksMarkdown={howItWorksMarkdown}
              />
              <Tooltip title="View on GitHub">
                <IconButton
                  component="a"
                  href={SITE_REPOSITORY_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  size="small"
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
