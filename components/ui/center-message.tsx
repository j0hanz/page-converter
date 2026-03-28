import type { ReactNode } from 'react';

import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Paper from '@mui/material/Paper';

import { responsive, sx } from '@/lib/theme';

interface CenterMessageProps {
  title?: ReactNode;
  message: ReactNode;
  color?: string;
  action?: ReactNode;
  children?: ReactNode;
}

export default function CenterMessage({
  title,
  message,
  color: _color,
  action,
  children,
}: CenterMessageProps) {
  return (
    <Paper
      sx={{
        ...sx.markdownPanel,
        minHeight: responsive.panelMaxHeight,
        display: 'grid',
        alignContent: 'center',
        justifyContent: 'center',
      }}
    >
      <Alert variant="standard" severity="error" sx={{ p: 2 }}>
        <AlertTitle sx={{ fontWeight: 400, pb: 2 }}>{title}</AlertTitle>
        {message}
      </Alert>
      {action}
      {children}
    </Paper>
  );
}
