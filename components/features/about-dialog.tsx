'use client';

import { useState } from 'react';

import dynamic from 'next/dynamic';

import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import type { DialogProps } from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';

import { sx } from '@/lib/theme';

const loadAboutDialogPanel = () =>
  import('@/components/features/about-dialog-panel');
const AboutDialogPanel = dynamic(loadAboutDialogPanel);

export default function AboutDialog() {
  const [open, setOpen] = useState(false);

  const handleClose: NonNullable<DialogProps['onClose']> = () => {
    setOpen(false);
  };

  return (
    <>
      <Tooltip title="About">
        <IconButton
          onClick={() => {
            setOpen(true);
          }}
          onFocus={() => {
            void loadAboutDialogPanel();
          }}
          onMouseEnter={() => {
            void loadAboutDialogPanel();
          }}
          aria-label="About Fetch URL"
          size="small"
          disableRipple={true}
        >
          <InfoOutlinedIcon sx={sx.headerIcon} />
        </IconButton>
      </Tooltip>

      {open ? <AboutDialogPanel open={open} onClose={handleClose} /> : null}
    </>
  );
}
