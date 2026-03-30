'use client';

import {
  type ComponentProps,
  type MouseEvent,
  type ReactNode,
  type SyntheticEvent,
  useState,
} from 'react';

import CodeIcon from '@mui/icons-material/Code';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import VisibilityIcon from '@mui/icons-material/Visibility';
import Avatar from '@mui/material/Avatar';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Fab from '@mui/material/Fab';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import { BaseDialog } from '@/components/ui/dialog';
import { MarkdownErrorBoundary } from '@/components/ui/error';
import MarkdownPreview from '@/components/ui/markdown-preview';

import { type CopyStatus, useFeedback } from '@/hooks/use-feedback';

import type { TransformResult } from '@/lib/api';
import { fluid, sx, tokens } from '@/lib/theme';

export type ViewMode = 'preview' | 'code';
type IconButtonColor = ComponentProps<typeof IconButton>['color'];

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

interface ResultActionBarProps {
  viewMode: ViewMode;
  onViewModeChange: (
    event: MouseEvent<HTMLElement>,
    newMode: ViewMode | null
  ) => void;
  result: TransformResult;
}

const CONFIG = {
  COPY_FEEDBACK_DELAY_MS: 2000,
  DEFAULT_DOWNLOAD_FILE_NAME: 'page',
  MAX_DOWNLOAD_FILE_NAME_LENGTH: 96,
} as const;

const INVALID_DOWNLOAD_FILE_NAME_CHARACTERS = new Set([
  '<',
  '>',
  ':',
  '"',
  '/',
  '\\',
  '|',
  '?',
  '*',
]);

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
] as const satisfies readonly {
  icon: ReactNode;
  label: string;
  value: ViewMode;
}[];

const COPY_STATUS_DETAILS: Record<
  CopyStatus,
  { color: IconButtonColor; message?: string }
> = {
  idle: { color: 'default' },
  copied: { color: 'success', message: 'Copied to clipboard' },
  failed: { color: 'error', message: 'Failed to copy' },
};

const RAW_MARKDOWN_SX = {
  fontFamily: tokens.fonts.mono,
  fontSize: fluid.codeFontSize,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
} as const;

const HEADER_BUTTON_SX = {
  justifyContent: 'flex-start',
  textAlign: 'left',
  width: '100%',
} as const;

const TOGGLE_BUTTON_SX = { border: 0, minWidth: 64, px: 1, py: 0.5 } as const;
const RESULT_TITLE_SX = {
  overflow: 'hidden',
  maxWidth: fluid.truncateWidth,
} as const;
const RESULT_URL_SX = {
  opacity: 0.8,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  maxWidth: fluid.truncateWidth,
} as const;
const MOBILE_RESULT_BAR_SX = {
  ...sx.markdownPanel,
  position: 'relative',
  display: 'block',
  textAlign: 'left',
  border: '1px solid var(--mui-palette-divider)',
  width: '100%',
  minHeight: fluid.panelMaxHeight,
  overflow: 'hidden',
  borderRadius: tokens.radius.panel,
  cursor: 'pointer',
  '&::after': {
    content: '""',
    position: 'absolute',
    inset: 'auto 0 0 0',
    height: '50%',
    background:
      'linear-gradient(to bottom, transparent, var(--mui-palette-background-default))',
    pointerEvents: 'none',
  },
} as const;
const MOBILE_RESULT_FAB_SX = {
  position: 'absolute',
  bottom: 75,
  right: 15,
  zIndex: 1,
  gap: 1,
  display: 'flex',
  flexDirection: 'column',
} as const;

const MOBILE_TABS = [
  {
    id: 'preview',
    label: 'Preview',
    panelId: 'result-tabpanel-preview',
    tabId: 'result-tab-preview',
  },
  {
    id: 'code',
    label: 'Code',
    panelId: 'result-tabpanel-code',
    tabId: 'result-tab-code',
  },
] as const satisfies readonly {
  id: ViewMode;
  label: string;
  panelId: string;
  tabId: string;
}[];

export function isSafeImageUrl(url: string | undefined): url is string {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function sanitizeDownloadFileName(title: string | undefined): string {
  let normalizedTitle = '';

  for (const character of title ?? '') {
    const isControlCharacter = character.charCodeAt(0) < 32;
    normalizedTitle +=
      isControlCharacter || INVALID_DOWNLOAD_FILE_NAME_CHARACTERS.has(character)
        ? ' '
        : character;
  }

  const sanitized = normalizedTitle
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/g, '')
    .slice(0, CONFIG.MAX_DOWNLOAD_FILE_NAME_LENGTH)
    .trim()
    .replace(/[. ]+$/g, '');

  return sanitized || CONFIG.DEFAULT_DOWNLOAD_FILE_NAME;
}

function downloadMarkdownFile(title: string | undefined, markdown: string) {
  const blob = new Blob([markdown], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = `${sanitizeDownloadFileName(title)}.md`;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();

  setTimeout(() => {
    link.remove();
    URL.revokeObjectURL(url);
  }, 0);
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

function getCopyFeedbackMessage(copyStatus: CopyStatus): string | undefined {
  return COPY_STATUS_DETAILS[copyStatus].message;
}

export function PreviewSurface({ markdown }: { markdown: string }) {
  return (
    <Box>
      <MarkdownPreview>{markdown}</MarkdownPreview>
    </Box>
  );
}

export function ResultMarkdownPanel({
  isPreviewMode,
  markdown,
}: {
  isPreviewMode: boolean;
  markdown: string;
}) {
  return (
    <Paper sx={sx.markdownPanel}>
      {isPreviewMode ? (
        <MarkdownErrorBoundary resetKey={markdown}>
          <PreviewSurface markdown={markdown} />
        </MarkdownErrorBoundary>
      ) : (
        <Typography component="pre" variant="body2" sx={RAW_MARKDOWN_SX}>
          {markdown}
        </Typography>
      )}
    </Paper>
  );
}

function DetailRow({ label, value }: ResultDetailItem) {
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

function ResultDetailDialog({
  open,
  onClose,
  result,
}: {
  open: boolean;
  onClose: () => void;
  result: TransformResult;
}) {
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
          <DetailRow key={item.label} {...item} />
        ))}
        {isSafeImageUrl(metadata.image) && (
          <Box
            component="img"
            src={metadata.image}
            alt="Page preview"
            loading="lazy"
            decoding="async"
            sx={{ maxWidth: '100%', borderRadius: 1 }}
          />
        )}
      </Stack>
    </BaseDialog>
  );
}

function ResultHeaderButtonContent({ result }: { result: TransformResult }) {
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
          <Typography variant="body2" sx={RESULT_TITLE_SX} noWrap>
            {title}
          </Typography>
        )}
        <Typography variant="caption" sx={RESULT_URL_SX} noWrap>
          {url}
        </Typography>
      </Stack>
    </Stack>
  );
}

export function ResultHeaderWithDetails({
  result,
}: {
  result: TransformResult;
}) {
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  return (
    <>
      <Box sx={sx.transitionCell}>
        <Tooltip title="View page details">
          <ButtonBase
            onClick={() => {
              setDetailDialogOpen(true);
            }}
            disableRipple
            sx={HEADER_BUTTON_SX}
            aria-label="View page details"
          >
            <ResultHeaderButtonContent result={result} />
          </ButtonBase>
        </Tooltip>
      </Box>
      {detailDialogOpen ? (
        <ResultDetailDialog
          open
          onClose={() => {
            setDetailDialogOpen(false);
          }}
          result={result}
        />
      ) : null}
    </>
  );
}

export function ResultActionBar({
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
              sx={TOGGLE_BUTTON_SX}
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
        message={getCopyFeedbackMessage(copyStatus)}
      />
    </>
  );
}

function MobileResultTabPanel({
  children,
  tab,
  visible,
}: {
  children: ReactNode;
  tab: ViewMode;
  visible: boolean;
}) {
  const definition = MOBILE_TABS.find((currentTab) => currentTab.id === tab);
  const fallbackDefinition = MOBILE_TABS[0];
  const panelId = definition?.panelId ?? fallbackDefinition.panelId;
  const tabId = definition?.tabId ?? fallbackDefinition.tabId;

  return (
    <div role="tabpanel" hidden={!visible} id={panelId} aria-labelledby={tabId}>
      {visible ? children : null}
    </div>
  );
}

function MobileResultBar({
  markdown,
  onOpen,
}: {
  markdown: string;
  onOpen: () => void;
}) {
  return (
    <ButtonBase
      onClick={onOpen}
      aria-label="View result"
      component="div"
      sx={MOBILE_RESULT_BAR_SX}
    >
      <MarkdownErrorBoundary resetKey={markdown}>
        <PreviewSurface markdown={markdown} />
      </MarkdownErrorBoundary>
    </ButtonBase>
  );
}

function MobileResultFab({ result }: { result: TransformResult }) {
  const { clearCopyFeedback, copyFeedbackOpen, copyStatus, handleCopy } =
    useFeedback();

  return (
    <>
      <Box sx={MOBILE_RESULT_FAB_SX}>
        <Fab
          size="small"
          color={
            copyStatus === 'copied'
              ? 'success'
              : copyStatus === 'failed'
                ? 'error'
                : 'default'
          }
          onClick={() => handleCopy(result.markdown)}
          aria-label="Copy Markdown"
        >
          <ContentCopyIcon fontSize="small" />
        </Fab>
        <Fab
          size="small"
          onClick={() => downloadMarkdownFile(result.title, result.markdown)}
          aria-label="Download Markdown"
        >
          <Badge variant="dot" color="warning" invisible={!result.truncated}>
            <DownloadIcon fontSize="small" />
          </Badge>
        </Fab>
      </Box>

      <Snackbar
        open={copyFeedbackOpen}
        autoHideDuration={CONFIG.COPY_FEEDBACK_DELAY_MS}
        onClose={clearCopyFeedback}
        message={getCopyFeedbackMessage(copyStatus)}
      />
    </>
  );
}

function MobileResultDialog({
  open,
  onClose,
  result,
  viewMode,
  onTabChange,
}: {
  open: boolean;
  onClose: () => void;
  result: TransformResult;
  viewMode: ViewMode;
  onTabChange: (event: SyntheticEvent, nextTab: ViewMode) => void;
}) {
  return (
    <BaseDialog
      open={open}
      onClose={onClose}
      titleId="mobile-result-dialog-title"
      title={result.title ?? 'Result'}
      hiddenTitle
      fullScreen
      header={
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={viewMode}
            onChange={onTabChange}
            variant="fullWidth"
            aria-label="Result view tabs"
          >
            {MOBILE_TABS.map((tab) => (
              <Tab
                key={tab.id}
                value={tab.id}
                label={tab.label}
                id={tab.tabId}
                aria-controls={tab.panelId}
              />
            ))}
          </Tabs>
        </Box>
      }
    >
      <MobileResultTabPanel tab="preview" visible={viewMode === 'preview'}>
        <MarkdownErrorBoundary resetKey={result.markdown}>
          <PreviewSurface markdown={result.markdown} />
        </MarkdownErrorBoundary>
      </MobileResultTabPanel>
      <MobileResultTabPanel tab="code" visible={viewMode === 'code'}>
        <Typography component="pre" variant="body2" sx={RAW_MARKDOWN_SX}>
          {result.markdown}
        </Typography>
      </MobileResultTabPanel>
      <MobileResultFab result={result} />
    </BaseDialog>
  );
}

export function MobileResultPresentation({
  mobileDialogOpen,
  onClose,
  onOpen,
  onTabChange,
  result,
  viewMode,
}: {
  mobileDialogOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
  onTabChange: (event: SyntheticEvent, nextTab: ViewMode) => void;
  result: TransformResult;
  viewMode: ViewMode;
}) {
  return (
    <>
      {!mobileDialogOpen ? (
        <MobileResultBar markdown={result.markdown} onOpen={onOpen} />
      ) : null}
      {mobileDialogOpen ? (
        <MobileResultDialog
          open
          onClose={onClose}
          result={result}
          viewMode={viewMode}
          onTabChange={onTabChange}
        />
      ) : null}
    </>
  );
}
