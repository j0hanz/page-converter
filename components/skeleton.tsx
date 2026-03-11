import Skeleton from "@mui/material/Skeleton";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";

const MARKDOWN_PANEL_MAX_HEIGHT = 600;
const SKELETON_PADDING_OFFSET = 25;

const WAVE = "wave" as const;

function TextLine({ width = "100%" }: { width?: string }) {
  return <Skeleton animation={WAVE} variant="text" width={width} />;
}

function Heading({ fontSize, width }: { fontSize: string; width: string }) {
  return (
    <Skeleton animation={WAVE} variant="text" width={width} sx={{ fontSize }} />
  );
}

export default function MarkdownSkeleton() {
  return (
    <Stack
      spacing={1}
      sx={{ height: MARKDOWN_PANEL_MAX_HEIGHT - SKELETON_PADDING_OFFSET }}
    >
      <Heading fontSize="2rem" width="50%" />
      <TextLine />
      <TextLine />
      <TextLine width="75%" />
      <Box sx={{ mt: 1 }}>
        <Heading fontSize="1.5rem" width="35%" />
      </Box>
      <TextLine />
      <TextLine width="90%" />
      <TextLine />
      <TextLine width="60%" />
      <Skeleton
        animation={WAVE}
        variant="rounded"
        sx={{ flexGrow: 1, minHeight: 80 }}
      />
      <Box sx={{ mt: 0.5 }}>
        <Heading fontSize="1.5rem" width="40%" />
      </Box>
      <TextLine />
      <TextLine width="85%" />
      <TextLine width="50%" />
    </Stack>
  );
}
