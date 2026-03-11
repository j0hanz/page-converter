"use client";

import Box from "@mui/material/Box";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

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

export default function TransformProgress({
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
