import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';

import { responsive } from '@/lib/theme';

interface SkeletonSection {
  headingSize: string;
  headingWidth: string;
  lines: readonly string[];
  mt?: number;
}

const SECTIONS = [
  {
    headingSize: '2.125rem',
    headingWidth: '50%',
    lines: ['100%', '100%', '75%'],
  },
  {
    headingSize: '1.5rem',
    headingWidth: '35%',
    lines: ['100%', '90%', '100%', '60%'],
    mt: 1.5,
  },
  {
    headingSize: '1.5rem',
    headingWidth: '40%',
    lines: ['100%', '85%', '50%'],
    mt: 1.5,
  },
] as const satisfies readonly SkeletonSection[];

const SKELETON_MIN_HEIGHT = {
  xs: `calc(${responsive.panelMaxHeight.xs} - 24px)`,
  sm: `calc(${responsive.panelMaxHeight.sm} - 40px)`,
  md: `calc(${responsive.panelMaxHeight.md} - 40px)`,
} as const;

function SectionSkeleton({
  headingSize,
  headingWidth,
  lines,
  mt,
}: SkeletonSection) {
  return (
    <Box sx={mt ? { mt } : undefined}>
      <Skeleton
        animation="wave"
        variant="text"
        width={headingWidth}
        sx={{ fontSize: headingSize }}
      />
      {lines.map((width, i) => (
        <Skeleton key={i} animation="wave" variant="text" width={width} />
      ))}
    </Box>
  );
}

export function MarkdownSkeleton() {
  return (
    <Stack
      role="status"
      aria-label="Markdown preview loading"
      sx={{ minHeight: SKELETON_MIN_HEIGHT }}
    >
      <SectionSkeleton {...SECTIONS[0]} />
      <SectionSkeleton {...SECTIONS[1]} />
      <Skeleton
        animation="wave"
        variant="rounded"
        sx={{ flexGrow: 1, minHeight: 80, mt: responsive.paragraphMb }}
      />
      <SectionSkeleton {...SECTIONS[2]} />
    </Stack>
  );
}
