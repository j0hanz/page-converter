import Paper from '@mui/material/Paper';
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
      <Typography variant="body2" color="text.disabled">
        Start by entering a URL above
      </Typography>
    </Paper>
  );
}
