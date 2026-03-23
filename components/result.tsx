'use client';

import { type ReactNode, startTransition, useEffect, useState } from 'react';

import CodeIcon from '@mui/icons-material/Code';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import VisibilityIcon from '@mui/icons-material/Visibility';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
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

import { BaseDialog } from '@/components/dialog';
import { MarkdownErrorBoundary } from '@/components/error';
import { MarkdownSkeleton } from '@/components/loading';
import MarkdownPreview from '@/components/markdown-preview';
import type { TransformResult } from '@/lib/api';
import { sx, tokens } from '@/lib/theme';

// ============================================================================
// Types & Interfaces
// ============================================================================

interface TransformResultProps {
  result: TransformResult;
}

type ViewMode = 'preview' | 'code';
type CopyStatus = 'idle' | 'copied' | 'failed';
type IconButtonColor = React.ComponentProps<typeof IconButton>['color'];

// ============================================================================
// Constants & Styles
// ============================================================================

const CONFIG = {
  COPY_FEEDBACK_DELAY_MS: 2000,
  DEFAULT_DOWNLOAD_FILE_NAME: 'page',
} as const;

const COPY_STATUS_DETAILS: Record<
  CopyStatus,
  { color: IconButtonColor; message?: string }
> = {
  idle: { color: 'default' },
  copied: { color: 'success', message: 'Copied to clipboard' },
  failed: { color: 'error', message: 'Failed to copy' },
};

// ============================================================================
// Utility Functions
// ============================================================================

function downloadMarkdownFile(title: string | undefined, markdown: string) {
  const blob = new Blob([markdown], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  let attached = false;

  try {
    link.href = url;
    link.download = `${title || CONFIG.DEFAULT_DOWNLOAD_FILE_NAME}.md`;
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

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

// ============================================================================
// Hooks
// ============================================================================

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

function useCopyFeedback() {
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle');

  async function handleCopy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
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

// ============================================================================
// Sub-Components
// ============================================================================

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

function PreviewContent({ markdown }: { markdown: string }) {
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

function ResultMarkdownPanel({
  isPreviewMode,
  markdown,
}: {
  isPreviewMode: boolean;
  markdown: string;
}) {
  return (
    <Paper sx={sx.markdownPanel}>
      <Box sx={{ display: isPreviewMode ? 'block' : 'none' }}>
        <MarkdownErrorBoundary resetKey={markdown}>
          <PreviewContent markdown={markdown} />
        </MarkdownErrorBoundary>
      </Box>
      <Box sx={{ display: !isPreviewMode ? 'block' : 'none' }}>
        <Typography component="pre" variant="body2" sx={sx.rawMarkdown}>
          {markdown}
        </Typography>
      </Box>
    </Paper>
  );
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Stack direction="row" gap={2.5}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ wordBreak: 'break-word', minWidth: 0 }}>
        {value}
      </Typography>
    </Stack>
  );
}

interface ResultDetailDialogProps {
  open: boolean;
  onClose: () => void;
  result: TransformResult;
}

function ResultDetailDialog({
  open,
  onClose,
  result,
}: ResultDetailDialogProps) {
  const { title, url, metadata, contentSize, truncated } = result;

  return (
    <BaseDialog
      open={open}
      onClose={onClose}
      titleId="result-detail-title"
      title={
        <Typography variant="subtitle1" sx={{ minWidth: 0 }}>
          {title ?? 'Page Details'}
        </Typography>
      }
      maxWidth="sm"
    >
      <Stack gap={2}>
        <DetailRow label="URL:" value={url} />
        {metadata.description && (
          <DetailRow label="Info:" value={metadata.description} />
        )}
        <DetailRow label="Size:" value={formatBytes(contentSize)} />
        {truncated && <DetailRow label="Truncated:" value="Yes" />}
        {metadata.image && (
          <Box
            component="img"
            src={metadata.image}
            alt="Page preview"
            sx={{ maxWidth: '100%', borderRadius: 1 }}
          />
        )}
      </Stack>
    </BaseDialog>
  );
}

function ResultHeaderWithDetails({ result }: TransformResultProps) {
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const { title, url, metadata, fromCache } = result;

  return (
    <>
      <Tooltip title="View page details">
        <ButtonBase
          onClick={() => setDetailDialogOpen(true)}
          disableRipple={true}
          sx={sx.headerButton}
          aria-label="View page details"
        >
          <Stack direction="row" gap={1.5} alignItems="center">
            <Badge
              variant="dot"
              color="success"
              invisible={!fromCache}
              overlap="circular"
            >
              <Avatar
                src={metadata.favicon || undefined}
                sx={{ width: tokens.sizes.avatar, height: tokens.sizes.avatar }}
                alt={title ?? url}
                variant="square"
              >
                {title?.[0]}
              </Avatar>
            </Badge>
            <Stack>
              {title && (
                <Typography variant="body2" sx={sx.truncatedText} noWrap>
                  {title}
                </Typography>
              )}
              <Typography variant="caption" sx={sx.resultUrl} noWrap>
                {url}
              </Typography>
            </Stack>
          </Stack>
        </ButtonBase>
      </Tooltip>
      <ResultDetailDialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        result={result}
      />
    </>
  );
}

interface ResultActionBarProps {
  viewMode: ViewMode;
  onViewModeChange: (
    event: React.MouseEvent<HTMLElement>,
    newMode: ViewMode | null
  ) => void;
  result: TransformResult;
}

function ResultActionBar({
  viewMode,
  onViewModeChange,
  result,
}: ResultActionBarProps) {
  const { clearCopyFeedback, copyFeedbackOpen, copyStatus, handleCopy } =
    useCopyFeedback();
  const copyStatusDetails = COPY_STATUS_DETAILS[copyStatus];

  function handleDownload() {
    downloadMarkdownFile(result.title, result.markdown);
  }

  return (
    <>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={onViewModeChange}
          size="small"
          aria-label="View mode"
        >
          <ToggleButton
            sx={sx.toggleButton}
            value="preview"
            aria-label="Preview"
          >
            <VisibilityIcon fontSize="small" />
          </ToggleButton>
          <ToggleButton sx={sx.toggleButton} value="code" aria-label="Code">
            <CodeIcon fontSize="small" />
          </ToggleButton>
        </ToggleButtonGroup>
        <Stack direction="row" spacing={1}>
          <ResultActionButton
            ariaLabel="Copy Markdown"
            title="Copy Markdown"
            onClick={() => handleCopy(result.markdown)}
            color={copyStatusDetails.color}
          >
            <ContentCopyIcon fontSize="small" />
          </ResultActionButton>
          <ResultActionButton
            ariaLabel="Download Markdown"
            title="Download Markdown"
            onClick={handleDownload}
          >
            <Badge variant="dot" color="warning" invisible={!result.truncated}>
              <DownloadIcon fontSize="small" />
            </Badge>
          </ResultActionButton>
        </Stack>
      </Stack>

      <Snackbar
        open={copyFeedbackOpen}
        autoHideDuration={CONFIG.COPY_FEEDBACK_DELAY_MS}
        onClose={clearCopyFeedback}
        message={copyStatusDetails.message}
      />
    </>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function TransformResultPanel({ result }: TransformResultProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('preview');

  function handleViewModeChange(
    _event: React.MouseEvent<HTMLElement>,
    nextViewMode: ViewMode | null
  ) {
    if (nextViewMode !== null) {
      setViewMode(nextViewMode);
    }
  }

  return (
    <Stack spacing={3}>
      {result.truncated && (
        <Alert severity="warning">
          Content was truncated. The full page may be too large to return in one
          response.
        </Alert>
      )}

      <ResultHeaderWithDetails result={result} />

      <Stack gap={0.2} sx={{ pt: 1 }} component="section">
        <ResultActionBar
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          result={result}
        />
        <ResultMarkdownPanel
          isPreviewMode={viewMode === 'preview'}
          markdown={result.markdown}
        />
      </Stack>
    </Stack>
  );
}
