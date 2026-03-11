"use client";

import { useEffect, useRef, useState } from "react";
import Stack from "@mui/material/Stack";
import Alert from "@mui/material/Alert";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Grid from "@mui/material/Grid";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CodeIcon from "@mui/icons-material/Code";
import type { TransformResult } from "@/lib/errors/transform";
import MarkdownPreview from "@/components/markdown-preview";

interface TransformResultProps {
  result: TransformResult;
}

interface DetailField {
  key: string;
  label: string;
  value: string;
  truncate?: boolean;
}

export default function TransformResultPanel({ result }: TransformResultProps) {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<"preview" | "code">("preview");
  const copyResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const summaryFields = getSummaryFields(result);
  const metadataFields = getMetadataFields(result);

  useEffect(() => {
    return () => {
      if (copyResetTimeoutRef.current !== null) {
        clearTimeout(copyResetTimeoutRef.current);
      }
    };
  }, []);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(result.markdown);
      setCopied(true);
      if (copyResetTimeoutRef.current !== null) {
        clearTimeout(copyResetTimeoutRef.current);
      }
      copyResetTimeoutRef.current = setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      // Clipboard API may fail in some contexts
    }
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

      {/* Summary Accordion */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="overline">Summary</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <DetailList fields={summaryFields} />
        </AccordionDetails>
      </Accordion>

      {/* Metadata Accordion */}
      {metadataFields.length > 0 && (
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="overline">Metadata</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <DetailList fields={metadataFields} />
          </AccordionDetails>
        </Accordion>
      )}

      {/* Markdown Section */}
      <section>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mb: 2 }}
        >
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="overline">Markdown</Typography>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              size="small"
              onChange={(_event, value: "preview" | "code" | null) => {
                if (value !== null) setViewMode(value);
              }}
              aria-label="markdown view mode"
            >
              <ToggleButton value="preview" aria-label="preview">
                <VisibilityIcon fontSize="small" sx={{ mr: 0.5 }} />
                Preview
              </ToggleButton>
              <ToggleButton value="code" aria-label="code">
                <CodeIcon fontSize="small" sx={{ mr: 0.5 }} />
                Code
              </ToggleButton>
            </ToggleButtonGroup>
          </Stack>
          <Button variant="outlined" size="small" onClick={handleCopy}>
            {copied ? "Copied!" : "Copy Markdown"}
          </Button>
        </Stack>
        <Paper
          variant="outlined"
          sx={{ p: 2, maxHeight: 600, overflow: "auto" }}
        >
          {viewMode === "preview" ? (
            <MarkdownPreview>{result.markdown}</MarkdownPreview>
          ) : (
            <Typography
              component="pre"
              variant="body2"
              sx={{
                fontFamily: "var(--font-geist-mono), monospace",
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

function getSummaryFields(result: TransformResult): DetailField[] {
  return [
    createDetailField("title", "Title", result.title),
    createDetailField("input-url", "Input URL", result.url, true),
    createDetailField("resolved-url", "Resolved URL", result.resolvedUrl, true),
    createDetailField("final-url", "Final URL", result.finalUrl, true),
    createDetailField("cache", "Cache", result.fromCache ? "Cached" : "Fresh"),
    createDetailField(
      "fetched",
      "Fetched",
      new Date(result.fetchedAt).toLocaleString(),
    ),
    createDetailField(
      "size",
      "Size",
      `${result.contentSize.toLocaleString()} chars`,
    ),
  ].filter(isDetailField);
}

function getMetadataFields(result: TransformResult): DetailField[] {
  return [
    createDetailField(
      "description",
      "Description",
      result.metadata.description,
    ),
    createDetailField("author", "Author", result.metadata.author),
    createDetailField("published", "Published", result.metadata.publishedDate),
    createDetailField("modified", "Modified", result.metadata.modifiedDate),
    createDetailField("image", "Image", result.metadata.image, true),
    createDetailField("favicon", "Favicon", result.metadata.favicon, true),
  ].filter(isDetailField);
}

function createDetailField(
  key: string,
  label: string,
  value: string | undefined,
  truncate = false,
): DetailField | null {
  if (!value) {
    return null;
  }

  return { key, label, value, truncate };
}

function isDetailField(field: DetailField | null): field is DetailField {
  return field !== null;
}
