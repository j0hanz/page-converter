'use client';

import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { responsive, sx } from '@/lib/theme';

export default function PreviewPlaceholder() {
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
      <Stack sx={{ flex: 1, opacity: 0.5 }} alignItems="center">
        <Typography variant="body2" color="text.secondary">
          Enter a URL above to convert
        </Typography>
      </Stack>
    </Paper>
  );
}
