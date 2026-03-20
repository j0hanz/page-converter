"use client";

import {
  lazy,
  Suspense,
  useRef,
  useState,
  type ReactNode,
  type SyntheticEvent,
} from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Tooltip from "@mui/material/Tooltip";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import { visuallyHidden } from "@mui/utils";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { MarkdownErrorBoundary } from "@/components/error";
import { MarkdownSkeleton } from "@/components/loading";

const MarkdownPreview = lazy(() => import("@/components/markdown-preview"));
const ABOUT_TAB_LABELS = ["Overview", "How It Works"] as const;

interface AboutDialogProps {
  markdown: string;
  howItWorksMarkdown: string;
}

const ABOUT_ICON_SX = { fontSize: { xs: "1.25rem", sm: "1.5rem" } } as const;

interface TabPanelProps {
  children: ReactNode;
  panelId: string;
  tabId: string;
  visible: boolean;
}

function TabPanel({ children, panelId, tabId, visible }: TabPanelProps) {
  const hasRenderedRef = useRef(visible);

  if (visible && !hasRenderedRef.current) {
    hasRenderedRef.current = true;
  }

  return (
    <div role="tabpanel" hidden={!visible} id={panelId} aria-labelledby={tabId}>
      {(hasRenderedRef.current || visible) && children}
    </div>
  );
}

function readTabA11yProps(index: number) {
  return {
    id: `about-tab-${index}`,
    "aria-controls": `about-tabpanel-${index}`,
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

export default function AboutDialog({
  markdown,
  howItWorksMarkdown,
}: AboutDialogProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState(0);
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const tabPanels = [markdown, howItWorksMarkdown] as const;

  function handleTabChange(_event: SyntheticEvent, nextTab: number) {
    setTab(nextTab);
  }

  return (
    <>
      <Tooltip title="About">
        <IconButton
          onClick={() => setOpen(true)}
          size="small"
          aria-label="About Page Converter"
        >
          <InfoOutlinedIcon sx={ABOUT_ICON_SX} />
        </IconButton>
      </Tooltip>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        aria-labelledby="about-dialog-title"
        fullWidth
        fullScreen={fullScreen}
        scroll="paper"
      >
        <DialogTitle id="about-dialog-title" sx={visuallyHidden}>
          About
        </DialogTitle>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs
            value={tab}
            onChange={handleTabChange}
            variant="fullWidth"
            aria-label="About dialog tabs"
          >
            {ABOUT_TAB_LABELS.map((label, index) => (
              <Tab key={label} label={label} {...readTabA11yProps(index)} />
            ))}
          </Tabs>
        </Box>
        <DialogContent dividers>
          {tabPanels.map((content, index) => (
            <TabPanel
              key={ABOUT_TAB_LABELS[index]}
              panelId={`about-tabpanel-${index}`}
              tabId={`about-tab-${index}`}
              visible={tab === index}
            >
              <MarkdownTabPanel>{content}</MarkdownTabPanel>
            </TabPanel>
          ))}
        </DialogContent>
        <Button fullWidth size="large" onClick={() => setOpen(false)}>
          Close
        </Button>
      </Dialog>
    </>
  );
}
