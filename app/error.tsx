"use client";

import { useEffect } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Route error:", error);
  }, [error]);

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "50vh",
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
          {error.message || "An unexpected error occurred."}
        </Typography>
        <Button variant="contained" onClick={reset}>
          Try again
        </Button>
      </Stack>
    </Box>
  );
}
