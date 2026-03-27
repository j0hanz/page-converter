import type { ReactNode } from 'react';

import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';

import { responsive, sx } from '@/lib/theme';

interface CenterMessageProps {
  message: ReactNode;
  secondaryText?: ReactNode;
  color?: string;
  action?: ReactNode;
  children?: ReactNode;
}

export default function CenterMessage({
  message,
  secondaryText,
  color = 'text.secondary',
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
        gap: 2,
      }}
    >
      <Typography variant="body1" color={color}>
        {message}
      </Typography>
      {secondaryText && (
        <Typography variant="body2" color="text.secondary">
          {secondaryText}
        </Typography>
      )}
      {action}
      {children}
    </Paper>
  );
}
