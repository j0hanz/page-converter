import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";

export default function Loading() {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "50vh",
      }}
    >
      <Stack alignItems="center" spacing={1.5}>
        <CircularProgress size={32} />
        <Typography variant="body2" color="text.secondary">
          Loading…
        </Typography>
      </Stack>
    </Box>
  );
}
