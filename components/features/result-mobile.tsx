'use client';

import type { ReactNode, SyntheticEvent } from 'react';

import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Fab from '@mui/material/Fab';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';

import {
  CopyFeedbackSnackbar,
  PreviewSurface,
  RAW_MARKDOWN_SX,
  ResultHeaderWithDetails,
  useResultDocumentActions,
  type ViewMode,
} from '@/components/features/result-shared';
import { BaseDialog } from '@/components/ui/dialog';
import { MarkdownErrorBoundary } from '@/components/ui/error';

import type { TransformResult } from '@/lib/api';
import { fluid, sx, tokens } from '@/lib/theme';

const MOBILE_RESULT_BAR_SX = {
  ...sx.markdownPanel,
  position: 'relative',
  display: 'block',
  textAlign: 'left',
  border: 1,
  borderColor: 'divider',
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
  const documentActions = useResultDocumentActions(result);

  return (
    <>
      <Box sx={MOBILE_RESULT_FAB_SX}>
        <Fab
          size="small"
          color={documentActions.copyStatusColor}
          onClick={documentActions.handleCopyMarkdown}
          aria-label="Copy Markdown"
        >
          <ContentCopyIcon fontSize="small" />
        </Fab>
        <Fab
          size="small"
          onClick={documentActions.handleDownload}
          aria-label="Download Markdown"
        >
          <Badge variant="dot" color="warning" invisible={!result.truncated}>
            <DownloadIcon fontSize="small" />
          </Badge>
        </Fab>
      </Box>

      <CopyFeedbackSnackbar
        open={documentActions.copyFeedbackOpen}
        onClose={documentActions.clearCopyFeedback}
        message={documentActions.copyStatusMessage}
      />
    </>
  );
}

function MobileResultDialogHeader({
  onTabChange,
  viewMode,
}: {
  onTabChange: (event: SyntheticEvent, nextTab: ViewMode) => void;
  viewMode: ViewMode;
}) {
  return (
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
  );
}

function MobileResultDialogPanels({
  result,
  viewMode,
}: {
  result: TransformResult;
  viewMode: ViewMode;
}) {
  return (
    <>
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
        <MobileResultDialogHeader
          viewMode={viewMode}
          onTabChange={onTabChange}
        />
      }
    >
      <MobileResultDialogPanels result={result} viewMode={viewMode} />
      <MobileResultFab result={result} />
    </BaseDialog>
  );
}

export default function ResultMobile({
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
    <Stack spacing={2}>
      <ResultHeaderWithDetails result={result} />
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
    </Stack>
  );
}
