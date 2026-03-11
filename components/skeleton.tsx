import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";

const MARKDOWN_PANEL_MAX_HEIGHT = 600;
const SKELETON_PADDING_OFFSET = 32;

export default function MarkdownSkeleton() {
  return (
    <Stack
      spacing={1.5}
      sx={{ height: MARKDOWN_PANEL_MAX_HEIGHT - SKELETON_PADDING_OFFSET }}
    >
      <Skeleton
        animation="wave"
        variant="text"
        width="45%"
        sx={{ fontSize: "2rem" }}
      />
      <Skeleton animation="wave" variant="text" />
      <Skeleton animation="wave" variant="text" />
      <Skeleton animation="wave" variant="text" width="80%" />
      <Skeleton
        animation="wave"
        variant="rectangular"
        sx={{ flexGrow: 1, borderRadius: 1 }}
      />
      <Skeleton
        animation="wave"
        variant="text"
        width="55%"
        sx={{ fontSize: "1.5rem" }}
      />
      <Skeleton animation="wave" variant="text" />
      <Skeleton animation="wave" variant="text" width="70%" />
    </Stack>
  );
}
