import { createTheme, responsiveFontSizes } from '@mui/material/styles';

// ── Module augmentation for custom palette ──────────────────────
declare module '@mui/material/styles' {
  interface PaletteOptions {
    brand?: { primary: string; secondary: string };
  }
  interface Palette {
    brand: { primary: string; secondary: string };
  }
}

// ── Design tokens ───────────────────────────────────────────────
export const tokens = {
  fonts: {
    mono: 'var(--font-geist-mono), ui-monospace, monospace',
    sans: 'var(--font-geist-sans), system-ui, sans-serif',
  },
  radius: { panel: 6, code: 1 },
  blur: { paper: '12.5px', dialog: '12.5px' },
  sizes: { avatar: 32, chipHeight: 20, loader: 32 },
  scrollbar: { width: 'none' as const },
} as const;

// ── Fluid design tokens ─────────────────────────────────────────
export const fluid = {
  pagePt: 'clamp(0.5rem, 0.25rem + 1.5vw, 1.5rem)',
  containerGap: 'clamp(0.75rem, 0.5rem + 0.5vw, 1rem)',
  codeFontSize: '0.85rem',
  truncateWidth: 'clamp(30ch, 15ch + 25vw, 70ch)',
  panelMaxHeight: 'clamp(55dvh, 50dvh + 5vw, 65dvh)',
  paragraphMb: 'clamp(0.5rem, 0.375rem + 0.25vw, 0.75rem)',
  listItemMb: 'clamp(0.25rem, 0.125rem + 0.25vw, 0.5rem)',
  logoSize: 'clamp(1.5rem, 1.25rem + 0.5vw, 2rem)',
} as const;

// ── Shared sx presets ───────────────────────────────────────────
export const sx = {
  // Layout
  centerFlex: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flexColumn: { flex: 1, display: 'flex', flexDirection: 'column' },
  headerIcon: { fontSize: 'clamp(1.25rem, 1rem + 0.5vw, 1.5rem)' },

  // Markdown elements
  markdownRoot: {
    '& > :first-of-type': { mt: 0 },
    '& > :last-child': { mb: 0 },
  },
  blockquote: {
    borderLeft: 3,
    borderColor: 'divider',
    bgcolor: 'action.selected',
    borderRadius: tokens.radius.code,
    px: 2,
    py: 1,
    my: 2,
    mx: 0,
    fontStyle: 'italic',
    color: 'text.secondary',
    '& > p': { mb: 0 },
  },
  codeBlock: {
    p: 2,
    overflow: 'auto',

    fontFamily: tokens.fonts.mono,
    fontSize: '0.875rem',
    bgcolor: 'action.hover',
    borderRadius: tokens.radius.code,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  inlineCode: {
    px: 0.5,
    py: 0.25,
    bgcolor: 'action.hover',
    borderRadius: tokens.radius.code,
    fontFamily: tokens.fonts.mono,
    fontSize: '0.85em',
    border: 1,
    borderColor: 'divider',
  },
  image: { maxWidth: '100%', height: 'auto', maxHeight: '60vh' },
  codeBlockWrapper: { position: 'relative' },
  langChip: {
    position: 'absolute',
    top: 4,
    right: 4,
    fontFamily: tokens.fonts.mono,
    height: tokens.sizes.chipHeight,
    opacity: 0.6,
    zIndex: 1,
    fontSize: '0.7rem',
    backgroundColor: 'unset',
  },
  link: {
    textUnderlineOffset: '0.18em',
    textDecorationThickness: '0.08em',
    transition: 'all 0.2s ease',
    '&:hover': { textDecorationThickness: '0.12em' },
  },
  paragraph: { mb: fluid.paragraphMb },
  listItem: { mb: fluid.listItemMb },
  checkbox: {
    p: 0,
    mr: 0.5,
    verticalAlign: 'middle',
    pointerEvents: 'none',
  },
  headingBorder: {
    my: 1.5,
    pb: 0.5,
    borderBottom: 1,
    borderColor: 'divider',
  },

  // Result panel
  markdownPanel: {
    p: { '@': 1.5, '@sm': 2.5 },
    flex: 1,
    maxHeight: fluid.panelMaxHeight,
    overflow: 'auto',
  },
  rawMarkdown: {
    fontFamily: tokens.fonts.mono,
    fontSize: fluid.codeFontSize,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  truncatedText: {
    overflow: 'hidden',
    maxWidth: fluid.truncateWidth,
  },
  resultUrl: {
    opacity: 0.8,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: fluid.truncateWidth,
  },
  toggleButton: { border: 0, minWidth: 64, px: 1, py: 0.5 },
  headerButton: {
    justifyContent: 'flex-start',
    textAlign: 'left',
    width: '100%',
  },
  transitionGrid: {
    flex: 1,
    display: 'grid',
    alignItems: 'start',
    containerType: 'inline-size',
  },
  transitionCell: { gridArea: '1 / 1' },

  // Table
  tableContainer: { my: 2, overflowX: 'auto' },
  tableRowStriped: {
    '&:nth-of-type(odd)': { bgcolor: 'action.selected' },
    '&:last-child td, &:last-child th': { border: 0 },
  },
} as const;

// ── Internal style constants ────────────────────────────────────
const PAPER_ROOT_SX = {
  borderRadius: tokens.radius.panel,
  boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
  backdropFilter: `blur(${tokens.blur.paper})`,
  WebkitBackdropFilter: `blur(${tokens.blur.paper})`,
} as const;
const AUTOFILL_TEXT_SX = {
  WebkitBoxShadow: '0 0 0 100px var(--mui-palette-background-default) inset',
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
          background: { default: '#FEFBFF', paper: '#FFFFFF' },
          brand: { primary: '#141314', secondary: '#000000' },
        },
      },
      dark: {
        palette: {
          background: { default: '#141314', paper: '#000000' },
          brand: { primary: '#FEFBFF', secondary: '#FFFFFF' },
        },
      },
    },
    typography: {
      fontFamily: tokens.fonts.sans,
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          html: {
            scrollbarWidth: tokens.scrollbar.width,
          },
          '*, *::before, *::after': {
            scrollbarWidth: 'inherit',
          },
        },
      },
      MuiAlert: {
        defaultProps: {
          variant: 'outlined',
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: ({ theme }) => ({
            ...theme.applyStyles('dark', {
              background: 'rgba(63, 63, 63, 0.71)',
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
            borderRadius: 0,
            boxShadow: 'none',
            backdropFilter: 'none',
            WebkitBackdropFilter: 'none',
          },
        },
      },
      MuiToolbar: {
        defaultProps: {
          disableGutters: true,
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
          },
        },
      },
      MuiStack: {
        defaultProps: {
          useFlexGap: true,
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
