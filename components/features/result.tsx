'use client';

import {
  type ComponentProps,
  type MouseEvent,
  type ReactNode,
  useState,
} from 'react';

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
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import { BaseDialog } from '@/components/ui/dialog';
import { MarkdownErrorBoundary } from '@/components/ui/error';
import {
  MarkdownSkeleton,
  ResultHeaderSkeleton,
} from '@/components/ui/loading';
import MarkdownPreview from '@/components/ui/markdown-preview';
import { type CopyStatus, useFeedback } from '@/hooks/use-feedback';
import { usePreview } from '@/hooks/use-preview';
import type { TransformResult } from '@/lib/api';
import { sx, tokens } from '@/lib/theme';

interface TransformResultProps {
  result: TransformResult;
}

type ViewMode = 'preview' | 'code';
type IconButtonColor = ComponentProps<typeof IconButton>['color'];

interface PreviewTransitionState {
  isPending: boolean;
  previewTransitionDuration: number;
  previewMarkdown: string | null;
}

interface ResultActionButtonProps {
  ariaLabel: string;
  title: string;
  onClick: () => void;
  children: ReactNode;
  color?: IconButtonColor;
}

interface ResultDetailItem {
  label: string;
  value: ReactNode;
}

interface TransitionSwapProps {
  busy?: boolean;
  content: ReactNode;
  fallback: ReactNode;
  showFallback: boolean;
  timeout: number;
}

const CONFIG = {
  COPY_FEEDBACK_DELAY_MS: 2000,
  DEFAULT_DOWNLOAD_FILE_NAME: 'page',
} as const;

const VIEW_MODE_OPTIONS = [
  {
    icon: <VisibilityIcon fontSize="small" />,
    label: 'Preview',
    value: 'preview',
  },
  {
    icon: <CodeIcon fontSize="small" />,
    label: 'Code',
    value: 'code',
  },
] as const satisfies ReadonlyArray<{
  icon: ReactNode;
  label: string;
  value: ViewMode;
}>;

const COPY_STATUS_DETAILS: Record<
  CopyStatus,
  { color: IconButtonColor; message?: string }
> = {
  idle: { color: 'default' },
  copied: { color: 'success', message: 'Copied to clipboard' },
  failed: { color: 'error', message: 'Failed to copy' },
};

function isSafeImageUrl(url: string | undefined): url is string {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

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

function createResultDetailItems({
  contentSize,
  metadata,
  truncated,
  url,
}: TransformResult): ResultDetailItem[] {
  const items: ResultDetailItem[] = [{ label: 'URL:', value: url }];

  if (metadata.description) {
    items.push({ label: 'Info:', value: metadata.description });
  }

  items.push({ label: 'Size:', value: formatBytes(contentSize) });

  if (truncated) {
    items.push({ label: 'Truncated:', value: 'Yes' });
  }

  return items;
}

function TransitionSwap({
  busy = false,
  content,
  fallback,
  showFallback,
  timeout,
}: TransitionSwapProps) {
  return (
    <Box aria-busy={busy || undefined}>
      <Fade
        in={showFallback}
        appear
        timeout={timeout}
        mountOnEnter
        unmountOnExit
      >
        <Box>{fallback}</Box>
      </Fade>
      <Fade in={!showFallback} timeout={timeout} mountOnEnter unmountOnExit>
        <Box>{content}</Box>
      </Fade>
    </Box>
  );
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

function PreviewSurface({
  markdown,
  previewState,
}: {
  markdown: string;
  previewState: PreviewTransitionState;
}) {
  const { isPending, previewTransitionDuration } = previewState;

  return (
    <TransitionSwap
      busy={isPending}
      showFallback={isPending}
      timeout={previewTransitionDuration}
      fallback={<MarkdownSkeleton />}
      content={<MarkdownPreview>{markdown}</MarkdownPreview>}
    />
  );
}

function ResultMarkdownPanel({
  isPreviewMode,
  markdown,
  previewState,
}: {
  isPreviewMode: boolean;
  markdown: string;
  previewState: PreviewTransitionState;
}) {
  return (
    <Paper sx={sx.markdownPanel}>
      <Box sx={{ display: isPreviewMode ? 'block' : 'none' }}>
        <MarkdownErrorBoundary resetKey={markdown}>
          <PreviewSurface
            markdown={previewState.previewMarkdown ?? ''}
            previewState={previewState}
          />
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
    <Stack direction="row" gap={2}>
      <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
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
  const { metadata, title } = result;
  const detailItems = createResultDetailItems(result);

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
        {detailItems.map((item) => (
          <DetailRow key={item.label} label={item.label} value={item.value} />
        ))}
        {isSafeImageUrl(metadata.image) && (
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

function ResultHeaderButtonContent({ result }: TransformResultProps) {
  const { metadata, title, url } = result;

  return (
    <Stack direction="row" gap={1.5} alignItems="center">
      <Avatar
        src={isSafeImageUrl(metadata.favicon) ? metadata.favicon : undefined}
        sx={{
          width: tokens.sizes.avatar,
          height: tokens.sizes.avatar,
        }}
        alt={title ?? url}
        variant="square"
      >
        {title?.[0]}
      </Avatar>
      <Stack sx={{ minWidth: 0 }}>
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
  );
}

function ResultHeaderWithDetails({
  result,
  previewState,
}: TransformResultProps & {
  previewState: PreviewTransitionState;
}) {
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const { isPending, previewTransitionDuration } = previewState;

  return (
    <>
      <TransitionSwap
        showFallback={isPending}
        timeout={previewTransitionDuration}
        fallback={
          <Box sx={sx.transitionCell}>
            <ResultHeaderSkeleton />
          </Box>
        }
        content={
          <Box sx={sx.transitionCell}>
            <Tooltip title="View page details">
              <ButtonBase
                onClick={() => setDetailDialogOpen(true)}
                disableRipple={true}
                sx={sx.headerButton}
                aria-label="View page details"
              >
                <ResultHeaderButtonContent result={result} />
              </ButtonBase>
            </Tooltip>
          </Box>
        }
      />
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
    event: MouseEvent<HTMLElement>,
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
    useFeedback();
  const copyStatusDetails = COPY_STATUS_DETAILS[copyStatus];

  function handleDownload() {
    downloadMarkdownFile(result.title, result.markdown);
  }

  return (
    <>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ flexWrap: 'wrap', gap: 1 }}
      >
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={onViewModeChange}
          size="small"
          aria-label="View mode"
        >
          {VIEW_MODE_OPTIONS.map((option) => (
            <ToggleButton
              key={option.value}
              sx={sx.toggleButton}
              value={option.value}
              aria-label={option.label}
            >
              {option.icon}
            </ToggleButton>
          ))}
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

export default function TransformResultPanel({ result }: TransformResultProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('preview');
  const previewState = usePreview(result.markdown);

  function handleViewModeChange(
    _event: MouseEvent<HTMLElement>,
    nextViewMode: ViewMode | null
  ): void {
    if (nextViewMode === null) {
      return;
    }

    setViewMode(nextViewMode);
  }

  return (
    <Stack spacing={2}>
      {result.truncated && (
        <Alert severity="warning">
          Content was truncated. The full page may be too large to return in one
          response.
        </Alert>
      )}

      <ResultHeaderWithDetails result={result} previewState={previewState} />

      <Stack
        gap={0.2}
        component="section"
        sx={{ containerType: 'inline-size' }}
      >
        <ResultActionBar
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          result={result}
        />
        <ResultMarkdownPanel
          isPreviewMode={viewMode === 'preview'}
          markdown={result.markdown}
          previewState={previewState}
        />
      </Stack>
    </Stack>
  );
}
