'use client';

import { lazy, Suspense, type SyntheticEvent, useState } from 'react';

import Box from '@mui/material/Box';
import type { DialogProps } from '@mui/material/Dialog';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';

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
  aboutMarkdown: string;
  howItWorksMarkdown: string;
  onClose: NonNullable<DialogProps['onClose']>;
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

export default function AboutDialogPanel({
  aboutMarkdown,
  howItWorksMarkdown,
  onClose,
  open,
}: AboutDialogPanelProps) {
  const [tab, setTab] = useState<AboutTabId>('overview');
  const tabs = createAboutTabDefinitions({
    overview: aboutMarkdown,
    'how-it-works': howItWorksMarkdown,
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
      {tabs.map((tabDefinition) => (
        <TabPanel
          key={tabDefinition.id}
          tab={tabDefinition.id}
          visible={tab === tabDefinition.id}
        >
          {tabDefinition.content}
        </TabPanel>
      ))}
    </BaseDialog>
  );
}
