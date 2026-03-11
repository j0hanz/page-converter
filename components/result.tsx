"use client";

import {
  lazy,
  Suspense,
  type MutableRefObject,
  useEffect,
  useRef,
  useState,
} from "react";
import Stack from "@mui/material/Stack";
import Alert from "@mui/material/Alert";
import Typography from "@mui/material/Typography";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DownloadIcon from "@mui/icons-material/Download";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CodeIcon from "@mui/icons-material/Code";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Tooltip from "@mui/material/Tooltip";
import type { TransformResult } from "@/lib/errors/transform";
import MarkdownSkeleton from "@/components/skeleton";

const MarkdownPreview = lazy(() => import("@/components/markdown-preview"));

interface TransformResultProps {
  result: TransformResult;
}

type ViewMode = "preview" | "code";

const COPY_RESET_DELAY_MS = 2000;
const MARKDOWN_FONT_FAMILY = "var(--font-geist-mono), monospace";

function clearScheduledTimeout(
  timeoutRef: MutableRefObject<ReturnType<typeof setTimeout> | null>,
) {
  if (timeoutRef.current === null) {
    return;
  }

  clearTimeout(timeoutRef.current);
  timeoutRef.current = null;
}

function scheduleCopiedReset(
  timeoutRef: MutableRefObject<ReturnType<typeof setTimeout> | null>,
  onReset: () => void,
) {
  clearScheduledTimeout(timeoutRef);
  timeoutRef.current = setTimeout(() => {
    timeoutRef.current = null;
    onReset();
  }, COPY_RESET_DELAY_MS);
}

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

export default function TransformResultPanel({ result }: TransformResultProps) {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("preview");
  const copyResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  useEffect(() => {
    return () => {
      clearScheduledTimeout(copyResetTimeoutRef);
    };
  }, []);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(result.markdown);
      setCopied(true);
      scheduleCopiedReset(copyResetTimeoutRef, () => {
        setCopied(false);
      });
    } catch {
      // Clipboard API may fail in some contexts
    }
  }

  function handleDownload() {
    downloadMarkdownFile(result.title, result.markdown);
  }

  return (
    <Stack spacing={3}>
      {/* Truncation Warning */}
      {result.truncated && (
        <Alert severity="warning" variant="outlined">
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
          <Stack direction="row">
            <Tooltip title="Preview">
              <IconButton
                size="large"
                aria-label="Preview"
                onClick={() => setViewMode("preview")}
                color={viewMode === "preview" ? "success" : "default"}
              >
                <VisibilityIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Code">
              <IconButton
                size="large"
                aria-label="Code"
                onClick={() => setViewMode("code")}
                color={viewMode === "code" ? "success" : "default"}
              >
                <CodeIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
          <Stack direction="row">
            <Tooltip title={copied ? "Copied!" : "Copy Markdown"}>
              <IconButton
                size="large"
                aria-label="Copy Markdown"
                onClick={handleCopy}
                color={copied ? "success" : "default"}
              >
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Download Markdown">
              <IconButton
                size="large"
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
            p: 2.5,
            maxHeight: 600,
            overflow: "auto",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2,
          }}
        >
          {viewMode === "preview" ? (
            <Suspense fallback={<MarkdownSkeleton />}>
              <MarkdownPreview>{result.markdown}</MarkdownPreview>
            </Suspense>
          ) : (
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
          )}
        </Paper>
      </section>
    </Stack>
  );
}
