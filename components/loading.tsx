'use client';

import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

interface TransformProgressProps {
  progress: number;
  total: number;
  message?: string;
}

function computePercentage(progress: number, total: number): number {
  if (total <= 0) return 0;

  const percentage = Math.round((progress / total) * 100);
  return Math.min(Math.max(percentage, 0), 100);
}

export function TransformProgress({
  progress,
  total,
  message,
}: TransformProgressProps) {
  const percentage = computePercentage(progress, total);

  return (
    <Stack spacing={1.5} sx={{ py: 2 }}>
      <Stack direction="row" spacing={2} alignItems="center">
        <Box sx={{ flex: 1 }}>
          <LinearProgress
            aria-label="Transform progress"
            variant="determinate"
            value={percentage}
            color="inherit"
          />
        </Box>
      </Stack>
      {message && (
        <Typography variant="caption" color="text.disabled">
          {message}
        </Typography>
      )}
    </Stack>
  );
}

const INTRO_LINE_WIDTHS = ['100%', '100%', '75%'] as const;
const BODY_LINE_WIDTHS = ['100%', '90%', '100%', '60%'] as const;
const OUTRO_LINE_WIDTHS = ['100%', '85%', '50%'] as const;
interface MarkdownSkeletonSection {
  heading: {
    fontSize: string;
    width: string;
  };
  lineWidths: readonly string[];
  marginTop?: number;
}

const MARKDOWN_SKELETON_SECTIONS: readonly MarkdownSkeletonSection[] = [
  {
    heading: { fontSize: '2rem', width: '50%' },
    lineWidths: INTRO_LINE_WIDTHS,
  },
  {
    heading: { fontSize: '1.5rem', width: '35%' },
    lineWidths: BODY_LINE_WIDTHS,
    marginTop: 1,
  },
  {
    heading: { fontSize: '1.5rem', width: '40%' },
    lineWidths: OUTRO_LINE_WIDTHS,
    marginTop: 0.5,
  },
] as const;
type MarkdownSkeletonItem =
  | { type: 'section'; section: MarkdownSkeletonSection }
  | { type: 'block' };

const MARKDOWN_SKELETON_LAYOUT: readonly MarkdownSkeletonItem[] = [
  { type: 'section', section: MARKDOWN_SKELETON_SECTIONS[0] },
  { type: 'section', section: MARKDOWN_SKELETON_SECTIONS[1] },
  { type: 'block' },
  { type: 'section', section: MARKDOWN_SKELETON_SECTIONS[2] },
] as const;

function TextLine({ width = '100%' }: { width?: string }) {
  return <Skeleton animation="wave" variant="text" width={width} />;
}

function Heading({ fontSize, width }: { fontSize: string; width: string }) {
  return (
    <Skeleton animation="wave" variant="text" width={width} sx={{ fontSize }} />
  );
}

function renderTextLines(widths: readonly string[]) {
  return widths.map((width, index) => (
    <TextLine key={`${width}-${index}`} width={width} />
  ));
}

function renderMarkdownSkeletonSection(
  section: MarkdownSkeletonSection,
  index: number
) {
  return (
    <Box
      key={`${section.heading.width}-${index}`}
      sx={section.marginTop ? { mt: section.marginTop } : undefined}
    >
      <Heading
        fontSize={section.heading.fontSize}
        width={section.heading.width}
      />
      {renderTextLines(section.lineWidths)}
    </Box>
  );
}

function renderMarkdownSkeletonItem(item: MarkdownSkeletonItem, index: number) {
  if (item.type === 'block') {
    return (
      <Skeleton
        key={`block-${index}`}
        animation="wave"
        variant="rounded"
        sx={{ flexGrow: 1, minHeight: 80 }}
      />
    );
  }

  return renderMarkdownSkeletonSection(item.section, index);
}

export function MarkdownSkeleton() {
  return (
    <Stack
      role="status"
      aria-label="Markdown preview loading"
      spacing={1}
      sx={{ maxHeight: '70dvh', overflow: 'hidden' }}
    >
      {MARKDOWN_SKELETON_LAYOUT.map(renderMarkdownSkeletonItem)}
    </Stack>
  );
}
