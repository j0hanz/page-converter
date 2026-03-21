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

interface TransformResultProps {
  result: TransformResult;
}

interface PreviewContentProps {
  markdown: string;
}

type ViewMode = 'preview' | 'code';

const COPY_FEEDBACK_DELAY_MS = 2000;
const DEFAULT_DOWNLOAD_FILE_NAME = 'page';
const MARKDOWN_FONT_FAMILY = "'Geist Mono Variable', monospace";
const TOGGLE_BUTTON_SX = { border: 0, minWidth: 50 } as const;
const MARKDOWN_PANEL_SX = {
  p: { xs: 1.5, sm: 2.5 },
  maxHeight: { xs: 350, sm: 450, md: MARKDOWN_PANEL_MAX_HEIGHT },
  overflow: 'auto',
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 2,
} as const;
const RAW_MARKDOWN_SX = {
  fontFamily: MARKDOWN_FONT_FAMILY,
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
const COPY_STATUS_COLOR: Record<CopyStatus, IconButtonColor> = {
  idle: 'default',
  copied: 'success',
  failed: 'error',
};
const COPY_STATUS_MESSAGE: Record<Exclude<CopyStatus, 'idle'>, string> = {
  copied: 'Copied to clipboard',
  failed: 'Failed to copy',
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

export default function TransformResultPanel({ result }: TransformResultProps) {
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle');
  const [viewMode, setViewMode] = useState<ViewMode>('preview');
  const isPreviewMode = viewMode === 'preview';
  const copyFeedbackOpen = copyStatus !== 'idle';

  function handleViewModeChange(
    _event: React.MouseEvent<HTMLElement>,
    nextViewMode: ViewMode | null
  ) {
    if (nextViewMode !== null) {
      setViewMode(nextViewMode);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(result.markdown);
      setCopyStatus('copied');
    } catch {
      setCopyStatus('failed');
    }
  }

  function handleDownload() {
    downloadMarkdownFile(result.title, result.markdown);
  }

  function clearCopyFeedback() {
    setCopyStatus('idle');
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
              onClick={handleCopy}
              color={COPY_STATUS_COLOR[copyStatus]}
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
        <Paper sx={MARKDOWN_PANEL_SX}>
          <Box sx={{ display: isPreviewMode ? 'block' : 'none' }}>
            <MarkdownErrorBoundary resetKey={result.markdown}>
              <PreviewContent markdown={result.markdown} />
            </MarkdownErrorBoundary>
          </Box>
          <Box sx={{ display: !isPreviewMode ? 'block' : 'none' }}>
            <Typography component="pre" variant="body2" sx={RAW_MARKDOWN_SX}>
              {result.markdown}
            </Typography>
          </Box>
        </Paper>
      </section>

      <Snackbar
        open={copyFeedbackOpen}
        autoHideDuration={COPY_FEEDBACK_DELAY_MS}
        onClose={clearCopyFeedback}
        message={
          copyStatus === 'idle' ? undefined : COPY_STATUS_MESSAGE[copyStatus]
        }
      />
    </Stack>
  );
}
