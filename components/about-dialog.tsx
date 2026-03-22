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
import DialogActions from '@mui/material/DialogActions';
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
  panelId: string;
  tabId: string;
}

const ABOUT_ICON_SX = { fontSize: { xs: '1.25rem', sm: '1.5rem' } } as const;
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
  const hasRenderedRef = useRef(visible);
  const { panelId, tabId } =
    ABOUT_TABS.find((t) => t.id === tab) ?? ABOUT_TABS[0];

  if (visible && !hasRenderedRef.current) {
    hasRenderedRef.current = true;
  }

  return (
    <div role="tabpanel" hidden={!visible} id={panelId} aria-labelledby={tabId}>
      {(hasRenderedRef.current || visible) && children}
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
          aria-label="About Fetch URL"
          size="small"
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
                id={tabDefinition.tabId}
                aria-controls={tabDefinition.panelId}
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
        <DialogActions>
          <Button fullWidth size="large" onClick={handleClose}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
