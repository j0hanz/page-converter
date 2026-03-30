'use client';

import type { MouseEvent, ReactNode } from 'react';

import Button from '@mui/material/Button';
import Dialog, { type DialogProps } from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { visuallyHidden } from '@mui/utils';

interface BaseDialogProps extends Omit<
  DialogProps,
  'children' | 'fullScreen' | 'onClose' | 'title'
> {
  children: ReactNode;
  actions?: ReactNode;
  fullScreen?: boolean;
  header?: ReactNode;
  hiddenTitle?: boolean;
  onClose: NonNullable<DialogProps['onClose']>;
  title: ReactNode;
  titleId: string;
}

export function BaseDialog({
  actions,
  children,
  fullScreen,
  header,
  hiddenTitle,
  maxWidth,
  onClose,
  open,
  title,
  titleId,
  ...dialogProps
}: BaseDialogProps) {
  const theme = useTheme();
  const smallScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const isFullScreen = fullScreen ?? smallScreen;

  function handleDefaultClose(event: MouseEvent<HTMLButtonElement>) {
    onClose(event, 'escapeKeyDown');
  }

  return (
    <Dialog
      aria-labelledby={titleId}
      fullWidth
      maxWidth={maxWidth}
      onClose={onClose}
      open={open}
      scroll="paper"
      fullScreen={isFullScreen}
      {...dialogProps}
    >
      <DialogTitle id={titleId} sx={hiddenTitle ? visuallyHidden : undefined}>
        {title}
      </DialogTitle>
      {header}
      <DialogContent dividers>{children}</DialogContent>
      <DialogActions>
        {actions ?? (
          <Button fullWidth onClick={handleDefaultClose}>
            Close
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
