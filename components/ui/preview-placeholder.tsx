import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { fluid, sx } from '@/lib/theme';

export default function PreviewPlaceholder() {
  return (
    <Paper
      sx={{
        ...sx.markdownPanel,
        minHeight: fluid.panelMaxHeight,
        display: 'grid',
        alignContent: 'center',
        justifyContent: 'center',
      }}
    >
      <Stack sx={{ opacity: 0.8 }} alignItems="center">
        <Typography variant="body2" color="text.secondary">
          Enter a URL above to convert
        </Typography>
      </Stack>
    </Paper>
  );
}
