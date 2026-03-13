"use client";

import { lazy, Suspense, useState } from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { MarkdownErrorBoundary } from "@/components/error";
import { MarkdownSkeleton } from "@/components/loading";

const MarkdownPreview = lazy(() => import("@/components/markdown-preview"));

export default function AboutDialog({ markdown }: { markdown: string }) {
  const [open, setOpen] = useState(false);
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
          <InfoOutlinedIcon fontSize="small" sx={{ display: { sm: "none" } }} />
          <InfoOutlinedIcon sx={{ display: { xs: "none", sm: "block" } }} />
        </IconButton>
      </Tooltip>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        aria-labelledby="about-dialog-title"
        maxWidth="sm"
        fullWidth
        fullScreen={fullScreen}
        scroll="paper"
      >
        <DialogContent dividers>
          <MarkdownErrorBoundary>
            <Suspense fallback={<MarkdownSkeleton />}>
              <MarkdownPreview>{markdown}</MarkdownPreview>
            </Suspense>
          </MarkdownErrorBoundary>
        </DialogContent>
        <Button fullWidth size="large" onClick={() => setOpen(false)}>
          Close
        </Button>
      </Dialog>
    </>
  );
}
