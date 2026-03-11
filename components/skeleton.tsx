import Skeleton from "@mui/material/Skeleton";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";

const MARKDOWN_PANEL_MAX_HEIGHT = 600;
const SKELETON_PADDING_OFFSET = 25;
const INTRO_LINE_WIDTHS = ["100%", "100%", "75%"] as const;
const OUTRO_LINE_WIDTHS = ["100%", "85%", "50%"] as const;

const WAVE = "wave" as const;

function TextLine({ width = "100%" }: { width?: string }) {
  return <Skeleton animation={WAVE} variant="text" width={width} />;
}

function Heading({ fontSize, width }: { fontSize: string; width: string }) {
  return (
    <Skeleton animation={WAVE} variant="text" width={width} sx={{ fontSize }} />
  );
}

function renderTextLines(widths: readonly string[]) {
  return widths.map((width, index) => (
    <TextLine key={`${width}-${index}`} width={width} />
  ));
}

export default function MarkdownSkeleton() {
  return (
    <Stack
      spacing={1}
      sx={{ height: MARKDOWN_PANEL_MAX_HEIGHT - SKELETON_PADDING_OFFSET }}
    >
      <Heading fontSize="2rem" width="50%" />
      {renderTextLines(INTRO_LINE_WIDTHS)}
      <Box sx={{ mt: 1 }}>
        <Heading fontSize="1.5rem" width="35%" />
      </Box>
      {renderTextLines(["100%", "90%", "100%", "60%"])}
      <Skeleton
        animation={WAVE}
        variant="rounded"
        sx={{ flexGrow: 1, minHeight: 80 }}
      />
      <Box sx={{ mt: 0.5 }}>
        <Heading fontSize="1.5rem" width="40%" />
      </Box>
      {renderTextLines(OUTRO_LINE_WIDTHS)}
    </Stack>
  );
}
