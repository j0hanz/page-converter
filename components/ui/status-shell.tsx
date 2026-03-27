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

export function StatusShell({
  action,
  children,
  message,
  minHeight,
  title,
}: StatusShellProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        minHeight,
        alignItems: 'center',
        justifyContent: 'center',
        p: 4,
      }}
    >
      <Stack spacing={2} alignItems="center">
        <Typography variant="h6" color="error">
          {title}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          textAlign="center"
          sx={{ maxWidth: '45ch' }}
        >
          {message}
        </Typography>
        {children}
        {action}
      </Stack>
    </Box>
  );
}
