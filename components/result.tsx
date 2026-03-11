"use client";

import { useEffect, useRef, useState } from "react";
import Stack from "@mui/material/Stack";
import Alert from "@mui/material/Alert";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import ButtonGroup from "@mui/material/ButtonGroup";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DownloadIcon from "@mui/icons-material/Download";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Tooltip from "@mui/material/Tooltip";
import Grid from "@mui/material/Grid";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";
import type { TransformResult } from "@/lib/errors/transform";
import { lazy, Suspense } from "react";

const MarkdownPreview = lazy(() => import("@/components/markdown-preview"));

interface TransformResultProps {
  result: TransformResult;
}

interface DetailField {
  key: string;
  label: string;
  value: string;
  truncate?: boolean;
}

interface DetailFieldConfig {
  key: string;
  label: string;
  getValue: (result: TransformResult) => string | undefined;
  truncate?: boolean;
}

type ViewMode = "preview" | "code";

const COPY_RESET_DELAY_MS = 2000;
const MARKDOWN_FONT_FAMILY = "var(--font-geist-mono), monospace";
const SUMMARY_FIELD_CONFIGS: readonly DetailFieldConfig[] = [
  {
    key: "title",
    label: "Title",
    getValue: (result) => result.title,
  },
  {
    key: "input-url",
    label: "Input URL",
    getValue: (result) => result.url,
    truncate: true,
  },
  {
    key: "resolved-url",
    label: "Resolved URL",
    getValue: (result) => result.resolvedUrl,
    truncate: true,
  },
  {
    key: "final-url",
    label: "Final URL",
    getValue: (result) => result.finalUrl,
    truncate: true,
  },
  {
    key: "cache",
    label: "Cache",
    getValue: (result) => (result.fromCache ? "Cached" : "Fresh"),
  },
  {
    key: "fetched",
    label: "Fetched",
    getValue: (result) => new Date(result.fetchedAt).toLocaleString(),
  },
  {
    key: "size",
    label: "Size",
    getValue: (result) => `${result.contentSize.toLocaleString()} chars`,
  },
] as const;
const METADATA_FIELD_CONFIGS: readonly DetailFieldConfig[] = [
  {
    key: "description",
    label: "Description",
    getValue: (result) => result.metadata.description,
  },
  {
    key: "author",
    label: "Author",
    getValue: (result) => result.metadata.author,
  },
  {
    key: "published",
    label: "Published",
    getValue: (result) => result.metadata.publishedDate,
  },
  {
    key: "modified",
    label: "Modified",
    getValue: (result) => result.metadata.modifiedDate,
  },
  {
    key: "image",
    label: "Image",
    getValue: (result) => result.metadata.image,
    truncate: true,
  },
  {
    key: "favicon",
    label: "Favicon",
    getValue: (result) => result.metadata.favicon,
    truncate: true,
  },
] as const;

export default function TransformResultPanel({ result }: TransformResultProps) {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("preview");
  const copyResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const summaryFields = buildDetailFields(result, SUMMARY_FIELD_CONFIGS);
  const metadataFields = buildDetailFields(result, METADATA_FIELD_CONFIGS);

  function clearCopyResetTimeout() {
    if (copyResetTimeoutRef.current === null) {
      return;
    }

    clearTimeout(copyResetTimeoutRef.current);
    copyResetTimeoutRef.current = null;
  }

  function scheduleCopyReset() {
    clearCopyResetTimeout();
    copyResetTimeoutRef.current = setTimeout(() => {
      copyResetTimeoutRef.current = null;
      setCopied(false);
    }, COPY_RESET_DELAY_MS);
  }

  useEffect(() => {
    return clearCopyResetTimeout;
  }, []);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(result.markdown);
      setCopied(true);
      scheduleCopyReset();
    } catch {
      // Clipboard API may fail in some contexts
    }
  }

  function handleDownload() {
    const blob = new Blob([result.markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${result.title || "page"}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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

      {/* Details Accordion */}
      <DetailAccordion
        title="Details"
        sections={[
          { label: "Summary", fields: summaryFields },
          ...(metadataFields.length > 0
            ? [{ label: "Metadata", fields: metadataFields }]
            : []),
        ]}
      />

      {/* Markdown Section */}
      <section>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mb: 2 }}
        >
          <ButtonGroup size="small" aria-label="markdown view mode">
            <Button
              color={viewMode === "preview" ? "primary" : "inherit"}
              variant="contained"
              onClick={() => setViewMode("preview")}
            >
              Preview
            </Button>
            <Button
              color={viewMode === "code" ? "primary" : "inherit"}
              variant="contained"
              onClick={() => setViewMode("code")}
            >
              Code
            </Button>
          </ButtonGroup>
          <Stack direction="row" spacing={1}>
            <Tooltip title={copied ? "Copied!" : "Copy Markdown"}>
              <IconButton
                size="small"
                onClick={handleCopy}
                color={copied ? "success" : "default"}
              >
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Download Markdown">
              <IconButton size="small" onClick={handleDownload}>
                <DownloadIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
        <Paper
          variant="outlined"
          sx={{ p: 2, maxHeight: 600, overflow: "auto" }}
        >
          {viewMode === "preview" ? (
            <Suspense
              fallback={
                <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                  <CircularProgress />
                </Box>
              }
            >
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

interface DetailSection {
  label: string;
  fields: DetailField[];
}

function DetailAccordion({
  title,
  sections,
}: {
  title: string;
  sections: DetailSection[];
}) {
  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="overline">{title}</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={2}>
          {sections.map((section) => (
            <div key={section.label}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mb: 0.5, display: "block" }}
              >
                {section.label}
              </Typography>
              <DetailList fields={section.fields} />
            </div>
          ))}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}

function DetailList({ fields }: { fields: DetailField[] }) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Grid container spacing={1}>
        {fields.map((field) => (
          <DetailListRow key={field.key} field={field} />
        ))}
      </Grid>
    </Paper>
  );
}

function DetailListRow({ field }: { field: DetailField }) {
  return (
    <>
      <Grid size={4}>
        <Typography variant="body2" fontWeight="medium" color="text.secondary">
          {field.label}
        </Typography>
      </Grid>
      <Grid size={8}>
        <Typography variant="body2" noWrap={field.truncate}>
          {field.value}
        </Typography>
      </Grid>
    </>
  );
}

function buildDetailFields(
  result: TransformResult,
  configs: readonly DetailFieldConfig[],
): DetailField[] {
  return configs.flatMap((config) => {
    const value = config.getValue(result);
    if (!value) {
      return [];
    }

    return [
      {
        key: config.key,
        label: config.label,
        value,
        truncate: config.truncate,
      },
    ];
  });
}
