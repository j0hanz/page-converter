'use client';

import {
  lazy,
  type MouseEvent,
  type ReactNode,
  Suspense,
  type SyntheticEvent,
  useEffect,
  useRef,
  useState,
} from 'react';

import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Tooltip from '@mui/material/Tooltip';

import { BaseDialog } from '@/components/ui/dialog';
import { CenterMessage, MarkdownErrorBoundary } from '@/components/ui/error';
import { MarkdownSkeleton } from '@/components/ui/loading';

import { sx } from '@/lib/theme';

const MarkdownPreview = lazy(() => import('@/components/ui/markdown-preview'));
const ABOUT_CONTENT_ENDPOINT = '/api/home-content';

interface AboutDialogContent {
  markdown: string;
  howItWorksMarkdown: string;
}
type AboutDialogLoadState =
  | { status: 'idle' | 'loading' }
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

interface TabPanelProps {
  children: ReactNode;
  tab: AboutTabId;
  visible: boolean;
}

function TabPanel({ children, tab, visible }: TabPanelProps) {
  const { panelId, tabId } =
    ABOUT_TABS.find((t) => t.id === tab) ?? ABOUT_TABS[0];

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

export default function AboutDialog() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<AboutTabId>('overview');
  const [loadState, setLoadState] = useState<AboutDialogLoadState>({
    status: 'idle',
  });
  const requestControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      requestControllerRef.current?.abort();
      requestControllerRef.current = null;
    };
  }, []);

  function startLoadingContent(): void {
    if (loadState.status === 'loading' || loadState.status === 'ready') {
      return;
    }

    const controller = new AbortController();
    requestControllerRef.current = controller;
    setLoadState({ status: 'loading' });

    void readAboutDialogContent(controller.signal)
      .then((content) => {
        if (requestControllerRef.current !== controller) {
          return;
        }

        requestControllerRef.current = null;
        setLoadState({ status: 'ready', content });
      })
      .catch((error: unknown) => {
        if (
          requestControllerRef.current !== controller ||
          (error instanceof Error && error.name === 'AbortError')
        ) {
          return;
        }

        requestControllerRef.current = null;
        setLoadState({ status: 'error' });
      });
  }

  function handleTabChange(_event: SyntheticEvent, nextTab: AboutTabId) {
    setTab(nextTab);
  }

  function handleOpen() {
    setOpen(true);
    startLoadingContent();
  }

  function handleClose() {
    setOpen(false);
  }

  function handleRetry(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    startLoadingContent();
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
    <>
      <Tooltip title="About">
        <IconButton
          onClick={handleOpen}
          aria-label="About Fetch URL"
          size="small"
          disableRipple={true}
        >
          <InfoOutlinedIcon sx={sx.headerIcon} />
        </IconButton>
      </Tooltip>

      {open ? (
        <BaseDialog
          open
          onClose={handleClose}
          titleId="about-dialog-title"
          title="About"
          hiddenTitle
          header={header}
        >
          {loadState.status === 'loading' || loadState.status === 'idle' ? (
            <MarkdownSkeleton />
          ) : null}

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
      ) : null}
    </>
  );
}
