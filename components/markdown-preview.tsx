'use client';

import type { ComponentProps, CSSProperties, ReactNode } from 'react';

import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import Divider from '@mui/material/Divider';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';

import Markdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownPreviewProps {
  children: string;
}

const remarkPlugins = [remarkGfm];
const MONO_FONT_FAMILY = "'Geist Mono Variable', monospace";
type TypographyVariant = ComponentProps<typeof Typography>['variant'];
type FontWeight = ComponentProps<typeof Typography>['fontWeight'];
type TextAlignStyle = Pick<CSSProperties, 'textAlign'>;
interface RendererChildrenProps {
  children?: ReactNode;
}
const MARKDOWN_ROOT_SX = {
  '& > :first-of-type': { mt: 0 },
  '& > :last-child': { mb: 0 },
} as const;
const BLOCKQUOTE_SX = {
  borderLeft: 3,
  borderColor: 'divider',
  bgcolor: 'action.selected',
  borderRadius: 1.5,
  pl: 2,
  pr: 2,
  py: 1,
  my: 2,
  mx: 0,
  fontStyle: 'italic',
  color: 'text.secondary',
  '& > p': { mb: 0 },
} as const;
const BLOCK_CODE_SX = {
  p: 2,
  overflow: 'auto',
  fontFamily: MONO_FONT_FAMILY,
  fontSize: '0.875rem',
  bgcolor: 'action.hover',
  borderRadius: 1.5,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
} as const;
const INLINE_CODE_SX = {
  px: 0.5,
  py: 0.25,
  bgcolor: 'action.hover',
  borderRadius: 0.5,
  fontFamily: MONO_FONT_FAMILY,
  fontSize: '0.85em',
  border: 1,
  borderColor: 'divider',
} as const;
const IMAGE_SX = {
  maxWidth: '100%',
  height: 'auto',
  my: 1,
  borderRadius: 1,
  display: 'block',
  border: 1,
  borderColor: 'divider',
} as const;
const LIST_SX = { pl: 3, my: 1 } as const;
const LINK_SX = {
  fontWeight: 500,
  textUnderlineOffset: '0.18em',
  textDecorationThickness: '0.08em',
  transition: 'all 0.2s ease',
  '&:hover': { textDecorationThickness: '0.12em' },
} as const;
const PARAGRAPH_SX = {
  mb: { xs: 1, sm: 1.5 },
  lineHeight: 1.75,
} as const;
const TABLE_CONTAINER_SX = { my: 2, overflowX: 'auto' } as const;
const TABLE_CELL_SX = { verticalAlign: 'top' } as const;

interface TableCellRendererProps extends RendererChildrenProps {
  style?: TextAlignStyle;
}

function readTextAlign(style?: TextAlignStyle) {
  return style?.textAlign;
}

function createHeadingRenderer(
  variant: TypographyVariant,
  marginTop: number,
  props: Partial<ComponentProps<typeof Typography>> = {}
) {
  return function HeadingRenderer({ children }: RendererChildrenProps) {
    return (
      <Typography
        variant={variant}
        gutterBottom
        sx={{ mt: marginTop }}
        {...props}
      >
        {children}
      </Typography>
    );
  };
}

function createTableCellRenderer(fontWeight?: FontWeight) {
  return function TableCellRenderer({
    children,
    style,
  }: TableCellRendererProps) {
    return (
      <TableCell
        sx={{
          ...TABLE_CELL_SX,
          ...(fontWeight ? { fontWeight } : {}),
          textAlign: readTextAlign(style),
        }}
      >
        {children}
      </TableCell>
    );
  };
}

function createListRenderer(component: 'ul' | 'ol') {
  return function ListRenderer({ children }: RendererChildrenProps) {
    return (
      <Box component={component} sx={LIST_SX}>
        {children}
      </Box>
    );
  };
}

const components: Components = {
  h1: createHeadingRenderer('h4', 2, {
    sx: { mt: 2, borderBottom: 1, borderColor: 'divider', pb: 0.5 },
  }),
  h2: createHeadingRenderer('h5', 2, {
    sx: { mt: 2, borderBottom: 1, borderColor: 'divider', pb: 0.5 },
  }),
  h3: createHeadingRenderer('h6', 1.5),
  h4: createHeadingRenderer('subtitle1', 1, { fontWeight: 'bold' }),
  h5: createHeadingRenderer('subtitle2', 0, { fontWeight: 'bold' }),
  h6: createHeadingRenderer('subtitle2', 0, { color: 'text.secondary' }),
  p: ({ children }) => (
    <Typography variant="body1" sx={PARAGRAPH_SX}>
      {children}
    </Typography>
  ),
  a: ({ href, children }) => (
    <Link href={href} target="_blank" rel="noopener noreferrer" sx={LINK_SX}>
      {children}
    </Link>
  ),
  blockquote: ({ children }) => (
    <Box component="blockquote" sx={BLOCKQUOTE_SX}>
      {children}
    </Box>
  ),
  code: ({ className, children, node }) => {
    const isBlock =
      className?.startsWith('language-') ||
      node?.position?.start.line !== node?.position?.end.line;
    if (isBlock) {
      return (
        <Paper variant="outlined" component="pre" sx={BLOCK_CODE_SX}>
          <code>{children}</code>
        </Paper>
      );
    }
    return (
      <Box component="code" sx={INLINE_CODE_SX}>
        {children}
      </Box>
    );
  },
  pre: ({ children }) => <>{children}</>,
  del: ({ children }) => (
    <Typography component="del" variant="inherit">
      {children}
    </Typography>
  ),
  input: ({ checked, disabled }) => (
    <Checkbox
      checked={checked ?? false}
      disabled={disabled}
      size="small"
      sx={{ p: 0, mr: 0.5, verticalAlign: 'middle', pointerEvents: 'none' }}
    />
  ),
  hr: () => <Divider sx={{ my: 2 }} />,
  img: ({ src, alt }) => (
    <Box
      component="img"
      src={typeof src === 'string' ? src : undefined}
      alt={alt ?? ''}
      loading="lazy"
      decoding="async"
      sx={IMAGE_SX}
    />
  ),
  table: ({ children }) => (
    <TableContainer
      component={Paper}
      variant="outlined"
      sx={TABLE_CONTAINER_SX}
    >
      <Table size="small">{children}</Table>
    </TableContainer>
  ),
  thead: ({ children }) => (
    <TableHead sx={{ bgcolor: 'action.hover' }}>{children}</TableHead>
  ),
  tbody: ({ children }) => <TableBody>{children}</TableBody>,
  tr: ({ children }) => (
    <TableRow
      hover
      sx={{
        '&:nth-of-type(odd)': { bgcolor: 'action.hover' },
        '&:last-child td, &:last-child th': { border: 0 },
      }}
    >
      {children}
    </TableRow>
  ),
  th: createTableCellRenderer('bold'),
  td: createTableCellRenderer(),
  ul: createListRenderer('ul'),
  ol: createListRenderer('ol'),
  li: ({ children }) => (
    <Typography
      component="li"
      variant="body1"
      sx={{ mb: 0.5, lineHeight: 1.75 }}
    >
      {children}
    </Typography>
  ),
};

export default function MarkdownPreview({ children }: MarkdownPreviewProps) {
  return (
    <Box component="article" sx={MARKDOWN_ROOT_SX}>
      <Markdown remarkPlugins={remarkPlugins} components={components}>
        {children}
      </Markdown>
    </Box>
  );
}
