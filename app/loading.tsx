import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { sx, tokens } from '@/lib/theme';

export default function Loading() {
  return (
    <Box
      sx={{
        ...sx.centerFlex,
        minHeight: '50vh',
      }}
    >
      <Stack alignItems="center" spacing={1.5}>
        <CircularProgress size={tokens.sizes.loader} />
        <Typography variant="body2" color="text.secondary">
          Loading…
        </Typography>
      </Stack>
    </Box>
  );
}
