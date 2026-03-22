'use client';

import { type ReactNode, startTransition, useEffect, useState } from 'react';

import CodeIcon from '@mui/icons-material/Code';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import VisibilityIcon from '@mui/icons-material/Visibility';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Fade from '@mui/material/Fade';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import { MarkdownErrorBoundary } from '@/components/error';
import {
  MARKDOWN_PANEL_MAX_HEIGHT,
  MarkdownSkeleton,
} from '@/components/loading';
import MarkdownPreview from '@/components/markdown-preview';
import type { TransformResult } from '@/lib/api';
import { MONO_FONT_FAMILY } from '@/lib/theme';

interface TransformResultProps {
  result: TransformResult;
}

interface PreviewContentProps {
  markdown: string;
}

type ViewMode = 'preview' | 'code';

const COPY_FEEDBACK_DELAY_MS = 2000;
const DEFAULT_DOWNLOAD_FILE_NAME = 'page';
const TOGGLE_BUTTON_SX = { border: 0, minWidth: 50 } as const;
const MARKDOWN_PANEL_SX = {
  p: { xs: 2, sm: 2.5 },
  flex: 1,
  maxHeight: { xs: 350, sm: 450, md: MARKDOWN_PANEL_MAX_HEIGHT },
  overflow: 'auto',
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 1.5,
} as const;
const RAW_MARKDOWN_SX = {
  fontFamily: MONO_FONT_FAMILY,
  fontSize: { xs: '0.8125rem', sm: '0.875rem' },
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
} as const;

function downloadMarkdownFile(title: string | undefined, markdown: string) {
  const blob = new Blob([markdown], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  let attached = false;

  try {
    link.href = url;
    link.download = `${title || DEFAULT_DOWNLOAD_FILE_NAME}.md`;
    document.body.appendChild(link);
    attached = true;
    link.click();
  } finally {
    if (attached) {
      link.remove();
    }

    URL.revokeObjectURL(url);
  }
}

type CopyStatus = 'idle' | 'copied' | 'failed';

type IconButtonColor = React.ComponentProps<typeof IconButton>['color'];
const COPY_STATUS_DETAILS: Record<
  CopyStatus,
  { color: IconButtonColor; message?: string }
> = {
  idle: { color: 'default' },
  copied: { color: 'success', message: 'Copied to clipboard' },
  failed: { color: 'error', message: 'Failed to copy' },
};

interface ResultActionButtonProps {
  ariaLabel: string;
  title: string;
  onClick: () => void;
  children: ReactNode;
  color?: IconButtonColor;
}

function ResultActionButton({
  ariaLabel,
  title,
  onClick,
  children,
  color = 'default',
}: ResultActionButtonProps) {
  return (
    <Tooltip title={title}>
      <IconButton aria-label={ariaLabel} onClick={onClick} color={color}>
        {children}
      </IconButton>
    </Tooltip>
  );
}

function PreviewContent({ markdown }: PreviewContentProps) {
  const { isPending, previewMarkdown, previewTransitionDuration } =
    usePreviewMarkdown(markdown);

  return (
    <Box aria-busy={isPending}>
      <Fade
        in={isPending}
        appear
        timeout={previewTransitionDuration}
        mountOnEnter
        unmountOnExit
      >
        <Box>
          <MarkdownSkeleton />
        </Box>
      </Fade>
      <Fade
        in={!isPending}
        timeout={previewTransitionDuration}
        mountOnEnter
        unmountOnExit
      >
        <Box>
          <MarkdownPreview>{previewMarkdown ?? ''}</MarkdownPreview>
        </Box>
      </Fade>
    </Box>
  );
}

function usePreviewMarkdown(markdown: string) {
  const theme = useTheme();
  const [previewMarkdown, setPreviewMarkdown] = useState<string | null>(null);
  const isPending = previewMarkdown !== markdown;
  const previewTransitionDuration = theme.transitions.duration.shortest;
  const previewRevealDelay = theme.transitions.duration.shorter;

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      startTransition(() => {
        setPreviewMarkdown(markdown);
      });
    }, previewRevealDelay);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [markdown, previewRevealDelay]);

  return { isPending, previewMarkdown, previewTransitionDuration };
}

function useCopyFeedback(markdown: string) {
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle');

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopyStatus('copied');
    } catch {
      setCopyStatus('failed');
    }
  }

  function clearCopyFeedback() {
    setCopyStatus('idle');
  }

  return {
    clearCopyFeedback,
    copyFeedbackOpen: copyStatus !== 'idle',
    copyStatus,
    handleCopy,
  };
}

interface ResultMarkdownPanelProps {
  isPreviewMode: boolean;
  markdown: string;
}

function ResultMarkdownPanel({
  isPreviewMode,
  markdown,
}: ResultMarkdownPanelProps) {
  return (
    <Paper sx={MARKDOWN_PANEL_SX}>
      <Box sx={{ display: isPreviewMode ? 'block' : 'none' }}>
        <MarkdownErrorBoundary resetKey={markdown}>
          <PreviewContent markdown={markdown} />
        </MarkdownErrorBoundary>
      </Box>
      <Box sx={{ display: !isPreviewMode ? 'block' : 'none' }}>
        <Typography component="pre" variant="body2" sx={RAW_MARKDOWN_SX}>
          {markdown}
        </Typography>
      </Box>
    </Paper>
  );
}

function useResultModel(result: TransformResult) {
  const [viewMode, setViewMode] = useState<ViewMode>('preview');
  const { clearCopyFeedback, copyFeedbackOpen, copyStatus, handleCopy } =
    useCopyFeedback(result.markdown);

  function handleViewModeChange(
    _event: React.MouseEvent<HTMLElement>,
    nextViewMode: ViewMode | null
  ) {
    if (nextViewMode !== null) {
      setViewMode(nextViewMode);
    }
  }

  function handleDownload() {
    downloadMarkdownFile(result.title, result.markdown);
  }

  return {
    clearCopyFeedback,
    copyFeedbackOpen,
    copyStatus,
    copyStatusDetails: COPY_STATUS_DETAILS[copyStatus],
    handleCopy,
    handleDownload,
    handleViewModeChange,
    isPreviewMode: viewMode === 'preview',
    viewMode,
  };
}

export default function TransformResultPanel({ result }: TransformResultProps) {
  const {
    clearCopyFeedback,
    copyFeedbackOpen,
    copyStatusDetails,
    handleCopy,
    handleDownload,
    handleViewModeChange,
    isPreviewMode,
    viewMode,
  } = useResultModel(result);

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
      <Stack gap={0.2} sx={{ pt: 2 }} component="section">
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={handleViewModeChange}
            size="small"
            aria-label="View mode"
          >
            <ToggleButton
              sx={TOGGLE_BUTTON_SX}
              value="preview"
              aria-label="Preview"
            >
              <VisibilityIcon fontSize="small" />
            </ToggleButton>
            <ToggleButton sx={TOGGLE_BUTTON_SX} value="code" aria-label="Code">
              <CodeIcon fontSize="small" />
            </ToggleButton>
          </ToggleButtonGroup>
          <Stack direction="row" spacing={1}>
            <ResultActionButton
              ariaLabel="Copy Markdown"
              title="Copy Markdown"
              onClick={() => {
                void handleCopy();
              }}
              color={copyStatusDetails.color}
            >
              <ContentCopyIcon fontSize="small" />
            </ResultActionButton>
            <ResultActionButton
              ariaLabel="Download Markdown"
              title="Download Markdown"
              onClick={handleDownload}
            >
              <DownloadIcon fontSize="small" />
            </ResultActionButton>
          </Stack>
        </Stack>
        <ResultMarkdownPanel
          isPreviewMode={isPreviewMode}
          markdown={result.markdown}
        />
      </Stack>

      <Snackbar
        open={copyFeedbackOpen}
        autoHideDuration={COPY_FEEDBACK_DELAY_MS}
        onClose={clearCopyFeedback}
        message={copyStatusDetails.message}
      />
    </Stack>
  );
}
