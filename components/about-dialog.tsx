"use client";

import { lazy, Suspense, useState } from "react";
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
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { MarkdownErrorBoundary } from "@/components/error";
import { MarkdownSkeleton } from "@/components/loading";

const MarkdownPreview = lazy(() => import("@/components/markdown-preview"));

interface AboutDialogProps {
  markdown: string;
  howItWorksMarkdown: string;
}

interface TabPanelProps {
  children: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`about-tabpanel-${index}`}
      aria-labelledby={`about-tab-${index}`}
    >
      {value === index && children}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `about-tab-${index}`,
    "aria-controls": `about-tabpanel-${index}`,
  };
}

export default function AboutDialog({
  markdown,
  howItWorksMarkdown,
}: AboutDialogProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState(0);
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <>
      <Tooltip title="About">
        <IconButton
          onClick={() => setOpen(true)}
          size="small"
          aria-label="About Page Converter"
        >
          <InfoOutlinedIcon
            sx={{ fontSize: { xs: "1.25rem", sm: "1.5rem" } }}
          />
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
        <DialogTitle id="about-dialog-title" sx={{ display: "none" }}>
          About
        </DialogTitle>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs
            value={tab}
            onChange={(_e, v: number) => setTab(v)}
            variant="fullWidth"
            aria-label="About dialog tabs"
          >
            <Tab label="Overview" {...a11yProps(0)} />
            <Tab label="How It Works" {...a11yProps(1)} />
          </Tabs>
        </Box>
        <DialogContent dividers>
          <TabPanel value={tab} index={0}>
            <MarkdownErrorBoundary>
              <Suspense fallback={<MarkdownSkeleton />}>
                <MarkdownPreview>{markdown}</MarkdownPreview>
              </Suspense>
            </MarkdownErrorBoundary>
          </TabPanel>
          <TabPanel value={tab} index={1}>
            <MarkdownErrorBoundary>
              <Suspense fallback={<MarkdownSkeleton />}>
                <MarkdownPreview>{howItWorksMarkdown}</MarkdownPreview>
              </Suspense>
            </MarkdownErrorBoundary>
          </TabPanel>
        </DialogContent>
        <Button fullWidth size="large" onClick={() => setOpen(false)}>
          Close
        </Button>
      </Dialog>
    </>
  );
}
