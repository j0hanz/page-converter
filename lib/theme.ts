"use client";

import { createTheme, responsiveFontSizes } from "@mui/material/styles";

const theme = responsiveFontSizes(
  createTheme({
    cssVariables: true,
    colorSchemes: { dark: true },
    typography: {
      fontFamily: "var(--font-geist-sans)",
    },
    components: {
      MuiOutlinedInput: {
        styleOverrides: {
          input: {
            "&:-webkit-autofill": {
              WebkitBoxShadow:
                "0 0 0 100px var(--mui-palette-background-default) inset",
              WebkitTextFillColor: "var(--mui-palette-text-primary)",
            },
          },
        },
      },
    },
  }),
);

export default theme;
