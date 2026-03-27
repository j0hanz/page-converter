import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';

import { responsive } from '@/lib/theme';

export default function Loading() {
  return (
    <Box
      role="status"
      aria-label="Loading page"
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        pt: responsive.pagePt,
      }}
    >
      <Container
        maxWidth="lg"
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: responsive.containerGap,
        }}
      >
        {/* AppBar placeholder */}
        <Skeleton variant="rectangular" height={56} sx={{ borderRadius: 1 }} />

        {/* Form input + button row */}
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Skeleton
            variant="rectangular"
            height={56}
            sx={{ flex: 1, borderRadius: 1 }}
          />
          <Skeleton
            variant="rectangular"
            width={100}
            height={56}
            sx={{ borderRadius: 1 }}
          />
        </Stack>

        {/* Preview panel */}
        <Skeleton
          variant="rectangular"
          sx={{ flex: 1, minHeight: 200, borderRadius: 1 }}
        />
      </Container>
    </Box>
  );
}
