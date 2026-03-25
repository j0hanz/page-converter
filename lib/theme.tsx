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
    mono: "'Geist Mono Variable', monospace",
    sans: "'Geist Variable', sans-serif",
  },
  radius: { panel: 16, code: 1 },
  blur: { paper: '12.3px', dialog: '17.5px' },
  sizes: { avatar: 32, chipHeight: 20, loader: 32 },
  scrollbar: { width: 'none' as const },
} as const;

// ── Responsive value maps ───────────────────────────────────────
export const responsive = {
  pagePt: { xs: 2, sm: 3, md: 4 },
  containerGap: { xs: 1.5, sm: 2 },
  panelPadding: { xs: 1.5, sm: 2.5 },
  codeFontSize: { xs: '0.8125rem', sm: '0.875rem' },
  truncateWidth: { xs: '30ch', sm: '50ch', md: '70ch' },
  panelMaxHeight: { xs: '50dvh', sm: '55dvh', md: '60dvh' },
  paragraphMb: { xs: 1, sm: 1.5 },
  listItemMb: { xs: 0.5, sm: 1 },
  logoSize: { xs: '1.5rem', sm: '2rem' },
} as const;

// ── Shared sx presets ───────────────────────────────────────────
export const HEADER_ICON_SX = {
  fontSize: { xs: '1.25rem', sm: '1.5rem' },
} as const;

export const sx = {
  // Layout
  centerFlex: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flexColumn: { flex: 1, display: 'flex', flexDirection: 'column' },

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
  paragraph: { mb: responsive.paragraphMb },
  listItem: { mb: responsive.listItemMb },
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
    p: responsive.panelPadding,
    flex: 1,
    maxHeight: responsive.panelMaxHeight,
    overflow: 'auto',
  },
  rawMarkdown: {
    fontFamily: tokens.fonts.mono,
    fontSize: responsive.codeFontSize,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  truncatedText: {
    overflow: 'hidden',
    maxWidth: responsive.truncateWidth,
  },
  resultUrl: {
    opacity: 0.8,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: responsive.truncateWidth,
  },
  toggleButton: { border: 0 },
  headerButton: {
    justifyContent: 'flex-start',
    textAlign: 'left',
    width: '100%',
  },
  transitionGrid: { flex: 1, display: 'grid', alignItems: 'start' },
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
          paper: {
            '.dark &': {
              background: 'rgba(63, 63, 63, 0.71)',
              backdropFilter: `blur(${tokens.blur.dialog})`,
              WebkitBackdropFilter: `blur(${tokens.blur.dialog})`,
            },
          },
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
            '.dark &:-webkit-autofill': {
              ...AUTOFILL_TEXT_SX,
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
