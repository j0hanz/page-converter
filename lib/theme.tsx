import { createTheme, responsiveFontSizes } from '@mui/material/styles';

// ── Design tokens ───────────────────────────────────────────────
export const tokens = {
  fonts: {
    mono: 'var(--font-geist-mono), ui-monospace, monospace',
    sans: 'var(--font-geist-sans), system-ui, sans-serif',
  },
  radius: { panel: 4, code: 2, button: 6 },
  blur: { paper: '15px', dialog: '15px' },
  sizes: { avatar: 32, chipHeight: 20, loader: 32 },
} as const;
export const fluid = {
  pagePt: 'clamp(0.25rem, 0.25rem + 0.25vw, 1rem)',
  headerGap: 'clamp(0.5rem, 0.25rem + 0.5vw, 0.75rem)',
  containerGap: 'clamp(0.75rem, 0.5rem + 0.5vw, 1rem)',
  codeFontSize: '0.85rem',
  truncateWidth: 'clamp(30ch, 15ch + 25vw, 70ch)',
  panelMaxHeight: 'clamp(50dvh, 50dvh + 5vw, 70dvh)',
  paragraphMb: 'clamp(0.5rem, 0.375rem + 0.25vw, 0.75rem)',
  listItemMb: 'clamp(0.25rem, 0.125rem + 0.25vw, 0.5rem)',
  logoSize: 'clamp(1.5rem, 1.25rem + 0.5vw, 2rem)',
} as const;

// ── Shared sx presets ───────────────────────────────────────────
export const sx = {
  flexColumn: { flex: 1, display: 'flex', flexDirection: 'column' },
  headerIcon: { fontSize: 'clamp(1.25rem, 1rem + 0.5vw, 1.5rem)' },
  headerDivider: {
    border: 0,
    width: '1px',
    height: 'clamp(1rem, 1rem + 0.5vw, 1.25rem)',
    display: 'block',
    bgcolor: 'divider',
  },
  minWidthZero: { minWidth: 0 },

  // Result panel
  markdownPanel: {
    p: { xs: 2, sm: 3 },
    flex: 1,
    maxHeight: fluid.panelMaxHeight,
    overflow: 'auto',
  },
  transitionGrid: {
    flex: 1,
    display: 'grid',
    alignItems: 'start',
    containerType: 'inline-size',
  },
  transitionCell: { gridArea: '1 / 1', minWidth: 0 },
} as const;

// ── Internal style constants ────────────────────────────────────
const AUTOFILL_TEXT_SX = {
  WebkitBoxShadow: '0 0 0 100px var(--mui-palette-background-paper) inset',
  WebkitTextFillColor: 'var(--mui-palette-text-primary)',
  caretColor: 'var(--mui-palette-text-primary)',
} as const;

// ── Theme ───────────────────────────────────────────────────────
export const theme = responsiveFontSizes(
  createTheme({
    cssVariables: { colorSchemeSelector: 'class' },
    colorSchemes: {
      light: {
        palette: {
          primary: { main: '#09090b', contrastText: '#ffffff' },
          background: { default: '#fafafa', paper: '#ffffff' },
          text: { primary: '#09090b', secondary: '#52525b' },
          divider: 'rgba(0, 0, 0, 0.15)',
        },
      },
      dark: {
        palette: {
          primary: { main: '#fafafa', contrastText: '#000000' },
          background: { default: '#09090b', paper: '#18181b' },
          text: { primary: '#fafafa', secondary: '#a1a1aa' },
          divider: 'rgba(255, 255, 255, 0.15)',
        },
      },
    },
    shape: {
      borderRadius: tokens.radius.button,
    },
    typography: {
      button: {
        textTransform: 'none',
        fontWeight: 500,
      },
    },
    components: {
      MuiAlert: {
        defaultProps: {
          variant: 'outlined',
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: tokens.radius.button,
            boxShadow: 'none',
            textTransform: 'none',
            fontWeight: 500,
            '&:hover': {
              boxShadow: 'none',
            },
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: ({ theme }) => ({
            ...theme.applyStyles('dark', {
              background: 'rgba(46, 46, 46, 0.72)',
              backdropFilter: `blur(${tokens.blur.dialog})`,
              WebkitBackdropFilter: `blur(${tokens.blur.dialog})`,
            }),
          }),
        },
      },
      MuiAppBar: {
        defaultProps: {
          position: 'sticky',
          color: 'transparent',
          elevation: 0,
        },
        styleOverrides: {
          root: {
            borderBottom: '1px solid var(--mui-palette-divider)',
          },
        },
      },
      MuiToolbar: { defaultProps: { disableGutters: true } },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: tokens.radius.button,
          },
          input: {
            '&:-webkit-autofill': {
              ...AUTOFILL_TEXT_SX,
              borderRadius: 'inherit',
            },
          },
        },
      },
      MuiStack: {
        defaultProps: {
          useFlexGap: true,
        },
      },
      MuiFormLabel: {
        styleOverrides: {
          asterisk: {
            color: 'var(--mui-palette-error-main)',
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
