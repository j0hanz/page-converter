"use client";

import { lazy, Suspense, useState } from "react";
import Stack from "@mui/material/Stack";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DownloadIcon from "@mui/icons-material/Download";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CodeIcon from "@mui/icons-material/Code";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Snackbar from "@mui/material/Snackbar";
import Tooltip from "@mui/material/Tooltip";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import type { TransformResult } from "@/lib/api";
import { MarkdownErrorBoundary } from "@/components/error";
import { MarkdownSkeleton } from "@/components/loading";

const MarkdownPreview = lazy(() => import("@/components/markdown-preview"));

export const MARKDOWN_PANEL_MAX_HEIGHT = 500;

interface TransformResultProps {
  result: TransformResult;
}

type ViewMode = "preview" | "code";

const COPY_FEEDBACK_DELAY_MS = 2000;
const MARKDOWN_FONT_FAMILY = "'Geist Mono Variable', monospace";

function downloadMarkdownFile(title: string | undefined, markdown: string) {
  const blob = new Blob([markdown], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  try {
    link.href = url;
    link.download = `${title || "page"}.md`;
    document.body.appendChild(link);
    link.click();
  } finally {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

type CopyStatus = "idle" | "copied" | "failed";

export default function TransformResultPanel({ result }: TransformResultProps) {
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");
  const [viewMode, setViewMode] = useState<ViewMode>("preview");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(result.markdown);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    }
  }

  function handleDownload() {
    downloadMarkdownFile(result.title, result.markdown);
  }

  return (
    <Stack spacing={3}>
      {/* Truncation Warning */}
      {result.truncated && (
        <Alert severity="warning">
          Content was truncated. The full page may be too large to return in one
          response.
        </Alert>
      )}

      {/* Markdown Section */}
      <section>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_e, v: ViewMode | null) => {
              if (v !== null) setViewMode(v);
            }}
            size="small"
            aria-label="View mode"
          >
            <ToggleButton
              sx={{ border: 0, minWidth: 50 }}
              value="preview"
              aria-label="Preview"
            >
              <VisibilityIcon fontSize="small" />
            </ToggleButton>
            <ToggleButton
              sx={{ border: 0, minWidth: 50 }}
              value="code"
              aria-label="Code"
            >
              <CodeIcon fontSize="small" />
            </ToggleButton>
          </ToggleButtonGroup>
          <Stack direction="row" spacing={1}>
            <Tooltip title="Copy Markdown">
              <IconButton
                aria-label="Copy Markdown"
                onClick={handleCopy}
                color={
                  copyStatus === "failed"
                    ? "error"
                    : copyStatus === "copied"
                      ? "success"
                      : "default"
                }
              >
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Download Markdown">
              <IconButton
                aria-label="Download Markdown"
                onClick={handleDownload}
              >
                <DownloadIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
        <Paper
          sx={{
            p: { xs: 1.5, sm: 2.5 },
            maxHeight: { xs: 350, sm: 450, md: MARKDOWN_PANEL_MAX_HEIGHT },
            overflow: "auto",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2,
          }}
        >
          <Box sx={{ display: viewMode === "preview" ? "block" : "none" }}>
            <MarkdownErrorBoundary>
              <Suspense fallback={<MarkdownSkeleton />}>
                <MarkdownPreview>{result.markdown}</MarkdownPreview>
              </Suspense>
            </MarkdownErrorBoundary>
          </Box>
          <Box sx={{ display: viewMode === "code" ? "block" : "none" }}>
            <Typography
              component="pre"
              variant="body2"
              sx={{
                fontFamily: MARKDOWN_FONT_FAMILY,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {result.markdown}
            </Typography>
          </Box>
        </Paper>
      </section>

      <Snackbar
        open={copyStatus !== "idle"}
        autoHideDuration={COPY_FEEDBACK_DELAY_MS}
        onClose={() => setCopyStatus("idle")}
        message={
          copyStatus === "copied" ? "Copied to clipboard" : "Failed to copy"
        }
      />
    </Stack>
  );
}
