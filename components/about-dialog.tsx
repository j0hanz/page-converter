'use client';

import {
  lazy,
  type ReactNode,
  Suspense,
  type SyntheticEvent,
  useRef,
  useState,
} from 'react';

import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import { useTheme } from '@mui/material/styles';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Tooltip from '@mui/material/Tooltip';
import useMediaQuery from '@mui/material/useMediaQuery';
import { visuallyHidden } from '@mui/utils';

import { MarkdownErrorBoundary } from '@/components/error';
import { MarkdownSkeleton } from '@/components/loading';

const MarkdownPreview = lazy(() => import('@/components/markdown-preview'));

interface AboutDialogProps {
  markdown: string;
  howItWorksMarkdown: string;
}

type AboutTabId = 'overview' | 'how-it-works';

interface AboutTabDefinition {
  content: string;
  id: AboutTabId;
  label: string;
}

const ABOUT_ICON_SX = { fontSize: { xs: '1.25rem', sm: '1.5rem' } } as const;
const ABOUT_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'how-it-works', label: 'How It Works' },
] as const satisfies readonly Pick<AboutTabDefinition, 'id' | 'label'>[];

interface TabPanelProps {
  children: ReactNode;
  tab: AboutTabId;
  visible: boolean;
}

function TabPanel({ children, tab, visible }: TabPanelProps) {
  const hasRenderedRef = useRef(visible);
  const { panelId, tabId } = readTabDomIds(tab);

  if (visible && !hasRenderedRef.current) {
    hasRenderedRef.current = true;
  }

  return (
    <div role="tabpanel" hidden={!visible} id={panelId} aria-labelledby={tabId}>
      {(hasRenderedRef.current || visible) && children}
    </div>
  );
}

function readTabDomIds(tabId: AboutTabId) {
  return {
    panelId: `about-tabpanel-${tabId}`,
    tabId: `about-tab-${tabId}`,
  };
}

function readTabA11yProps(tabId: AboutTabId) {
  const { panelId, tabId: resolvedTabId } = readTabDomIds(tabId);

  return {
    id: resolvedTabId,
    'aria-controls': panelId,
  };
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

export default function AboutDialog({
  markdown,
  howItWorksMarkdown,
}: AboutDialogProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<AboutTabId>('overview');
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const tabs = createAboutTabDefinitions({
    overview: markdown,
    'how-it-works': howItWorksMarkdown,
  });

  function handleTabChange(_event: SyntheticEvent, nextTab: AboutTabId) {
    setTab(nextTab);
  }

  function handleOpen() {
    setOpen(true);
  }

  function handleClose() {
    setOpen(false);
  }

  return (
    <>
      <Tooltip title="About">
        <IconButton
          onClick={handleOpen}
          size="small"
          aria-label="About Fetch URL"
        >
          <InfoOutlinedIcon sx={ABOUT_ICON_SX} />
        </IconButton>
      </Tooltip>

      <Dialog
        open={open}
        onClose={handleClose}
        aria-labelledby="about-dialog-title"
        fullWidth
        fullScreen={fullScreen}
        scroll="paper"
      >
        <DialogTitle id="about-dialog-title" sx={visuallyHidden}>
          About
        </DialogTitle>
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
                {...readTabA11yProps(tabDefinition.id)}
              />
            ))}
          </Tabs>
        </Box>
        <DialogContent dividers>
          {tabs.map((tabDefinition) => (
            <TabPanel
              key={tabDefinition.id}
              tab={tabDefinition.id}
              visible={tab === tabDefinition.id}
            >
              <MarkdownTabPanel>{tabDefinition.content}</MarkdownTabPanel>
            </TabPanel>
          ))}
        </DialogContent>
        <Button fullWidth size="large" onClick={handleClose}>
          Close
        </Button>
      </Dialog>
    </>
  );
}
