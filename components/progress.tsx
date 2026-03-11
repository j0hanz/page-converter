"use client";

import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";

interface TransformProgressProps {
  progress: number;
  total: number;
}

function computePercentage(progress: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((progress / total) * 100);
}

export default function TransformProgress({
  progress,
  total,
}: TransformProgressProps) {
  const percentage = computePercentage(progress, total);

  return (
    <Stack direction="row" spacing={2} alignItems="center" sx={{ py: 4 }}>
      <Box sx={{ position: "relative", display: "inline-flex" }}>
        <CircularProgress value={percentage} size={44} />
        <Box
          sx={{
            top: 0,
            left: 0,
            bottom: 0,
            right: 0,
            position: "absolute",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography
            variant="caption"
            component="div"
            color="text.secondary"
          >{`${percentage}%`}</Typography>
        </Box>
      </Box>
    </Stack>
  );
}
