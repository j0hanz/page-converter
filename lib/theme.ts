"use client";

import { createTheme, responsiveFontSizes } from "@mui/material/styles";

const theme = responsiveFontSizes(
  createTheme({
    cssVariables: { colorSchemeSelector: "class" },
    colorSchemes: {
      light: {
        palette: {
          background: {
            default: "#FFFFFF",
            paper: "rgba(255, 255, 255, 0.8)",
          },
        },
      },
      dark: {
        palette: {
          background: {
            default: "#393939",
            paper: "rgba(57, 57, 57, 0.74)",
          },
        },
      },
    },
    typography: {
      fontFamily: "var(--font-geist-sans)",
    },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            boxShadow: "0 4px 30px rgba(0, 0, 0, 0.1)",
            backdropFilter: "blur(12.3px)",
            WebkitBackdropFilter: "blur(12.3px)",
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          input: {
            "&:-webkit-autofill": {
              WebkitBoxShadow:
                "0 0 0 100px var(--mui-palette-background-default) inset",
              WebkitTextFillColor: "var(--mui-palette-text-primary)",
              caretColor: "var(--mui-palette-text-primary)",
              borderRadius: "inherit",
            },
            ".dark &:-webkit-autofill": {
              WebkitBoxShadow:
                "0 0 0 100px var(--mui-palette-background-default) inset",
              WebkitTextFillColor: "var(--mui-palette-text-primary)",
              caretColor: "var(--mui-palette-text-primary)",
            },
          },
        },
      },
    },
  }),
);

export default theme;
