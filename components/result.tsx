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
import Paper from "@mui/material/Paper";
import Grid from "@mui/material/Grid";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
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
      <DetailAccordion title="Summary" fields={summaryFields} />

      {/* Metadata Accordion */}
      {metadataFields.length > 0 && (
        <DetailAccordion title="Metadata" fields={metadataFields} />
      )}

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

function DetailAccordion({
  title,
  fields,
}: {
  title: string;
  fields: DetailField[];
}) {
  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="overline">{title}</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <DetailList fields={fields} />
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
