import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import HomeClient from "@/components/home-client";

export default function Home() {
  return (
    <Box sx={{ minHeight: "100dvh", py: { xs: 3, sm: 5, md: 8 } }}>
      <Container maxWidth="md">
        <Stack spacing={{ xs: 2.5, sm: 4 }}>
          <div>
            <Typography variant="h4" component="h1" fontWeight="bold">
              Page Converter
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Turn web pages into clean Markdown
            </Typography>
          </div>

          <HomeClient />
        </Stack>
      </Container>
    </Box>
  );
}
