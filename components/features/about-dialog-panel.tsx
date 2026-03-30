'use client';

import { lazy, Suspense, type SyntheticEvent, useState } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import type { DialogProps } from '@mui/material/Dialog';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';

import { BaseDialog } from '@/components/ui/dialog';
import { MarkdownErrorBoundary } from '@/components/ui/error';
import { MarkdownSkeleton } from '@/components/ui/loading';

const MarkdownPreview = lazy(() => import('@/components/ui/markdown-preview'));

type AboutTabId = 'overview' | 'how-it-works';

interface AboutTabDefinition {
  content: string;
  id: AboutTabId;
  label: string;
  panelId: string;
  tabId: string;
}

interface AboutDialogPanelProps {
  aboutMarkdown: string | null;
  contentLoadFailed: boolean;
  howItWorksMarkdown: string | null;
  isContentLoading: boolean;
  onClose: NonNullable<DialogProps['onClose']>;
  onRetry: () => void;
  open: boolean;
}

const ABOUT_TABS = [
  {
    id: 'overview',
    label: 'Overview',
    panelId: 'about-tabpanel-overview',
    tabId: 'about-tab-overview',
  },
  {
    id: 'how-it-works',
    label: 'How It Works',
    panelId: 'about-tabpanel-how-it-works',
    tabId: 'about-tab-how-it-works',
  },
] as const satisfies readonly Omit<AboutTabDefinition, 'content'>[];

function TabPanel({
  children,
  tab,
  visible,
}: {
  children: string;
  tab: AboutTabId;
  visible: boolean;
}) {
  const { panelId, tabId } =
    ABOUT_TABS.find((currentTab) => currentTab.id === tab) ?? ABOUT_TABS[0];

  return (
    <div role="tabpanel" hidden={!visible} id={panelId} aria-labelledby={tabId}>
      {visible ? <MarkdownTabPanel>{children}</MarkdownTabPanel> : null}
    </div>
  );
}

function MarkdownTabPanel({ children }: { children: string }) {
  return (
    <MarkdownErrorBoundary resetKey={children}>
      <Suspense fallback={<MarkdownSkeleton />}>
        <MarkdownPreview>{children}</MarkdownPreview>
      </Suspense>
    </MarkdownErrorBoundary>
  );
}

function createAboutTabDefinitions(contentById: Record<AboutTabId, string>) {
  return ABOUT_TABS.map((tab) => ({
    ...tab,
    content: contentById[tab.id],
  }));
}

function AboutDialogLoadingState() {
  return <MarkdownSkeleton />;
}

function AboutDialogErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <Box
      sx={{
        minHeight: 240,
        display: 'grid',
        placeItems: 'center',
        gap: 2,
        textAlign: 'center',
      }}
    >
      <Box>
        <Typography variant="subtitle1">
          Failed to load About content.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Try again to load the help content for this dialog.
        </Typography>
      </Box>
      <Button variant="contained" onClick={onRetry}>
        Retry
      </Button>
    </Box>
  );
}

export default function AboutDialogPanel({
  aboutMarkdown,
  contentLoadFailed,
  howItWorksMarkdown,
  isContentLoading,
  onClose,
  onRetry,
  open,
}: AboutDialogPanelProps) {
  const [tab, setTab] = useState<AboutTabId>('overview');
  const tabs = createAboutTabDefinitions({
    overview: aboutMarkdown ?? '',
    'how-it-works': howItWorksMarkdown ?? '',
  });

  function handleTabChange(_event: SyntheticEvent, nextTab: AboutTabId) {
    setTab(nextTab);
  }

  return (
    <BaseDialog
      open={open}
      onClose={onClose}
      titleId="about-dialog-title"
      title="About"
      hiddenTitle
      header={
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={tab}
            onChange={handleTabChange}
            variant="fullWidth"
            aria-label="About dialog tabs"
          >
            {tabs.map((tabDefinition) => (
              <Tab
                key={tabDefinition.id}
                value={tabDefinition.id}
                label={tabDefinition.label}
                id={tabDefinition.tabId}
                aria-controls={tabDefinition.panelId}
              />
            ))}
          </Tabs>
        </Box>
      }
    >
      {contentLoadFailed ? (
        <AboutDialogErrorState onRetry={onRetry} />
      ) : isContentLoading && !aboutMarkdown && !howItWorksMarkdown ? (
        <AboutDialogLoadingState />
      ) : (
        tabs.map((tabDefinition) => (
          <TabPanel
            key={tabDefinition.id}
            tab={tabDefinition.id}
            visible={tab === tabDefinition.id}
          >
            {tabDefinition.content}
          </TabPanel>
        ))
      )}
    </BaseDialog>
  );
}
