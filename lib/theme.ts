"use client";

import { createTheme, responsiveFontSizes } from "@mui/material/styles";

const PAPER_ROOT_SX = {
  borderRadius: 16,
  boxShadow: "0 4px 30px rgba(0, 0, 0, 0.1)",
  backdropFilter: "blur(12.3px)",
  WebkitBackdropFilter: "blur(12.3px)",
} as const;
const AUTOFILL_TEXT_SX = {
  WebkitBoxShadow: "0 0 0 100px var(--mui-palette-background-default) inset",
  WebkitTextFillColor: "var(--mui-palette-text-primary)",
  caretColor: "var(--mui-palette-text-primary)",
} as const;

const theme = responsiveFontSizes(
  createTheme({
    cssVariables: { colorSchemeSelector: "class" },
    colorSchemes: {
      light: {
        palette: {
          background: {
            default: "#ebebeb",
            paper: "#ffffffd8",
          },
        },
      },
      dark: {
        palette: {
          background: {
            default: "#202020",
            paper: "#000000d3",
          },
        },
      },
    },
    typography: {
      fontFamily: "'Geist Variable', sans-serif",
    },
    components: {
      MuiAlert: {
        defaultProps: {
          variant: "outlined",
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: PAPER_ROOT_SX,
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          input: {
            "&:-webkit-autofill": {
              ...AUTOFILL_TEXT_SX,
              borderRadius: "inherit",
            },
            ".dark &:-webkit-autofill": {
              ...AUTOFILL_TEXT_SX,
            },
          },
        },
      },
    },
  }),
);

export default theme;
