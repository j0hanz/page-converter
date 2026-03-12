"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

interface ErrorStateProps {
  error: Error & { digest?: string };
  fallbackMessage: string;
  minHeight: string;
  reset: () => void;
}

export default function ErrorState({
  error,
  fallbackMessage,
  minHeight,
  reset,
}: ErrorStateProps) {
  return (
    <Box
      sx={{
        display: "flex",
        minHeight,
        alignItems: "center",
        justifyContent: "center",
        p: 4,
      }}
    >
      <Stack spacing={2} alignItems="center">
        <Typography variant="h6" color="error">
          Something went wrong
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          textAlign="center"
          sx={{ maxWidth: 400 }}
        >
          {error.message || fallbackMessage}
        </Typography>
        <Button variant="contained" onClick={reset}>
          Try again
        </Button>
      </Stack>
    </Box>
  );
}
