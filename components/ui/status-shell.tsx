import type { ReactNode } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

interface StatusShellProps {
  action: ReactNode;
  children?: ReactNode;
  message: ReactNode;
  minHeight: string;
  title: ReactNode;
}

const STATUS_SHELL_CONTAINER_SX = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  p: 4,
} as const;

const STATUS_MESSAGE_SX = { maxWidth: '45ch' } as const;

export function StatusShell({
  action,
  children,
  message,
  minHeight,
  title,
}: StatusShellProps) {
  return (
    <Box sx={{ ...STATUS_SHELL_CONTAINER_SX, minHeight }}>
      <Stack spacing={2} alignItems="center">
        <Typography variant="h6" color="error">
          {title}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          textAlign="center"
          sx={STATUS_MESSAGE_SX}
        >
          {message}
        </Typography>
        {children}
        {action}
      </Stack>
    </Box>
  );
}
