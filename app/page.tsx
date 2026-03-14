import { readFile } from "node:fs/promises";
import { join } from "node:path";
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
import ThemeToggle from "@/components/theme-toggle";

export default async function Home() {
  const [markdown, howItWorksMarkdown] = await Promise.all([
    readFile(join(process.cwd(), "public", "about.md"), "utf-8"),
    readFile(join(process.cwd(), "public", "how-it-works.md"), "utf-8"),
  ]);
  return (
    <Box sx={{ minHeight: "100dvh", py: { xs: 2, sm: 4, md: 6 } }}>
      <Container maxWidth="lg">
        <Stack spacing={{ xs: 3, sm: 4 }}>
          <Toolbar disableGutters sx={{ alignItems: "flex-start" }}>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h4" component="h1" gutterBottom>
                Page Converter
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                Turn web pages into clean Markdown
              </Typography>
            </Box>
            <Stack direction="row" spacing={{ xs: 1, sm: 2 }}>
              <AboutDialog
                markdown={markdown}
                howItWorksMarkdown={howItWorksMarkdown}
              />
              <Tooltip title="View on GitHub">
                <IconButton
                  component="a"
                  href="https://github.com/j0hanz/page-converter"
                  target="_blank"
                  rel="noopener noreferrer"
                  size="small"
                  aria-label="View on GitHub"
                >
                  <GitHubIcon
                    sx={{ fontSize: { xs: "1.25rem", sm: "1.5rem" } }}
                  />
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
