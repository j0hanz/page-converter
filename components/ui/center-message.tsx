import type { ReactNode } from 'react';

import Paper from '@mui/material/Paper';

import TransformAlert from '@/components/ui/alert';

import type { TransformErrorCode } from '@/lib/api';
import { fluid, sx } from '@/lib/theme';

interface CenterMessageProps {
  code?: TransformErrorCode;
  message: ReactNode;
  statusCode?: number;
  children?: ReactNode;
}

export default function CenterMessage({
  code = 'INTERNAL_ERROR',
  message,
  statusCode,
  children,
}: CenterMessageProps) {
  return (
    <Paper
      sx={{
        ...sx.markdownPanel,
        minHeight: fluid.panelMaxHeight,
        display: 'grid',
        alignContent: 'center',
      }}
    >
      <TransformAlert code={code} message={message} statusCode={statusCode} />
      {children}
    </Paper>
  );
}
