'use client';

import { createElement, Fragment, type ReactNode } from 'react';

import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import CssBaseline from '@mui/material/CssBaseline';
import InitColorSchemeScript from '@mui/material/InitColorSchemeScript';
import { createTheme, responsiveFontSizes } from '@mui/material/styles';
import { ThemeProvider } from '@mui/material/styles';

const PAPER_ROOT_SX = {
  borderRadius: 16,
  boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
  backdropFilter: 'blur(12.3px)',
  WebkitBackdropFilter: 'blur(12.3px)',
} as const;
const AUTOFILL_TEXT_SX = {
  WebkitBoxShadow: '0 0 0 100px var(--mui-palette-background-default) inset',
  WebkitTextFillColor: 'var(--mui-palette-text-primary)',
  caretColor: 'var(--mui-palette-text-primary)',
} as const;

const theme = responsiveFontSizes(
  createTheme({
    cssVariables: { colorSchemeSelector: 'class' },
    colorSchemes: {
      light: {
        palette: {
          background: {
            default: '#FFFFFF',
            paper: '#ffffffd8',
          },
        },
      },
      dark: {
        palette: {
          background: {
            default: '#0F1214',
            paper: '#0f1214b2',
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
          variant: 'outlined',
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
            '&:-webkit-autofill': {
              ...AUTOFILL_TEXT_SX,
              borderRadius: 'inherit',
            },
            '.dark &:-webkit-autofill': {
              ...AUTOFILL_TEXT_SX,
            },
          },
        },
      },
      MuiTypography: {
        styleOverrides: {
          root: {
            overflowWrap: 'break-word',
          },
        },
      },
    },
  }),
  {
    variants: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'subtitle1', 'subtitle2'],
  }
);

export function AppThemeProviders({ children }: { children: ReactNode }) {
  return createElement(
    Fragment,
    null,
    createElement(InitColorSchemeScript, { attribute: 'class' }),
    createElement(
      AppRouterCacheProvider,
      null,
      createElement(
        ThemeProvider,
        { theme },
        createElement(CssBaseline),
        children
      )
    )
  );
}

export default theme;
