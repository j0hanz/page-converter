'use client';

import {
  lazy,
  type MouseEvent,
  type ReactNode,
  Suspense,
  type SyntheticEvent,
  useEffect,
  useState,
} from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import type { DialogProps } from '@mui/material/Dialog';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';

import { BaseDialog } from '@/components/ui/dialog';
import { CenterMessage, MarkdownErrorBoundary } from '@/components/ui/error';
import { MarkdownSkeleton } from '@/components/ui/loading';

const MarkdownPreview = lazy(() => import('@/components/ui/markdown-preview'));
const ABOUT_CONTENT_ENDPOINT = '/api/home-content';

interface AboutDialogContent {
  markdown: string;
  howItWorksMarkdown: string;
}

type AboutDialogLoadState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; content: AboutDialogContent };

type AboutTabId = 'overview' | 'how-it-works';

interface AboutTabDefinition {
  content: string;
  id: AboutTabId;
  label: string;
  panelId: string;
  tabId: string;
}

interface AboutDialogPanelProps {
  onClose: NonNullable<DialogProps['onClose']>;
  open: boolean;
}

interface TabPanelProps {
  children: ReactNode;
  tab: AboutTabId;
  visible: boolean;
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

function TabPanel({ children, tab, visible }: TabPanelProps) {
  const { panelId, tabId } =
    ABOUT_TABS.find((currentTab) => currentTab.id === tab) ?? ABOUT_TABS[0];

  return (
    <div role="tabpanel" hidden={!visible} id={panelId} aria-labelledby={tabId}>
      {visible ? children : null}
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

function isAboutDialogContent(value: unknown): value is AboutDialogContent {
  return (
    typeof value === 'object' &&
    value !== null &&
    'markdown' in value &&
    'howItWorksMarkdown' in value &&
    typeof value.markdown === 'string' &&
    typeof value.howItWorksMarkdown === 'string'
  );
}

async function readAboutDialogContent(
  signal: AbortSignal
): Promise<AboutDialogContent> {
  const response = await fetch(ABOUT_CONTENT_ENDPOINT, { signal });
  if (!response.ok) {
    throw new Error('Failed to load About content.');
  }

  const data: unknown = await response.json();
  if (!isAboutDialogContent(data)) {
    throw new Error('Failed to load About content.');
  }

  return data;
}

export default function AboutDialogPanel({
  onClose,
  open,
}: AboutDialogPanelProps) {
  const [tab, setTab] = useState<AboutTabId>('overview');
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [loadState, setLoadState] = useState<AboutDialogLoadState>({
    status: 'loading',
  });

  useEffect(() => {
    const controller = new AbortController();

    setLoadState({ status: 'loading' });

    void readAboutDialogContent(controller.signal)
      .then((content) => {
        if (controller.signal.aborted) {
          return;
        }

        setLoadState({ status: 'ready', content });
      })
      .catch(() => {
        if (controller.signal.aborted) {
          return;
        }

        setLoadState({ status: 'error' });
      });

    return () => {
      controller.abort();
    };
  }, [loadAttempt]);

  function handleRetry(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    setLoadAttempt((currentAttempt) => currentAttempt + 1);
  }

  function handleTabChange(_event: SyntheticEvent, nextTab: AboutTabId) {
    setTab(nextTab);
  }

  const tabs =
    loadState.status === 'ready'
      ? createAboutTabDefinitions({
          overview: loadState.content.markdown,
          'how-it-works': loadState.content.howItWorksMarkdown,
        })
      : [];

  const header =
    loadState.status === 'ready' ? (
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
    ) : undefined;

  return (
    <BaseDialog
      open={open}
      onClose={onClose}
      titleId="about-dialog-title"
      title="About"
      hiddenTitle
      header={header}
    >
      {loadState.status === 'loading' ? <MarkdownSkeleton /> : null}

      {loadState.status === 'error' ? (
        <CenterMessage message="Failed to load About content.">
          <Button onClick={handleRetry} sx={{ mt: 2 }}>
            Try again
          </Button>
        </CenterMessage>
      ) : null}

      {loadState.status === 'ready'
        ? tabs.map((tabDefinition) => (
            <TabPanel
              key={tabDefinition.id}
              tab={tabDefinition.id}
              visible={tab === tabDefinition.id}
            >
              <MarkdownTabPanel>{tabDefinition.content}</MarkdownTabPanel>
            </TabPanel>
          ))
        : null}
    </BaseDialog>
  );
}
