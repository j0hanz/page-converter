'use client';

import type {
  ComponentProps,
  CSSProperties,
  ElementType,
  ReactNode,
} from 'react';

import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
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

import { MONO_FONT_FAMILY } from '@/lib/theme';

const remarkPlugins = [remarkGfm];
const MARKDOWN_ROOT_SX = {
  '& > :first-of-type': { mt: 0 },
  '& > :last-child': { mb: 0 },
} as const;
const BLOCKQUOTE_SX = {
  borderLeft: 3,
  borderColor: 'divider',
  bgcolor: 'action.selected',
  borderRadius: 1,
  px: 2,
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
  borderRadius: 1,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
} as const;
const INLINE_CODE_SX = {
  px: 0.5,
  py: 0.25,
  bgcolor: 'action.hover',
  borderRadius: 1,
  fontFamily: MONO_FONT_FAMILY,
  fontSize: '0.85em',
  border: 1,
  borderColor: 'divider',
} as const;
const IMAGE_SX = {
  maxWidth: '100%',
  height: 'auto',
  my: 2,
  display: 'block',
  border: 1,
  borderColor: 'divider',
  borderRadius: 1,
} as const;
const CODE_BLOCK_WRAPPER_SX = {
  position: 'relative',
} as const;
const LANG_CHIP_SX = {
  position: 'absolute',
  top: 8,
  right: 8,
  fontFamily: MONO_FONT_FAMILY,
  height: 20,
  opacity: 0.7,
  zIndex: 1,
} as const;
const LINK_SX = {
  textUnderlineOffset: '0.18em',
  textDecorationThickness: '0.08em',
  transition: 'all 0.2s ease',
  '&:hover': { textDecorationThickness: '0.12em' },
} as const;
const PARAGRAPH_SX = { mb: { xs: 1, sm: 1.5 } } as const;
const LIST_ITEM_SX = { mb: { xs: 0.5, sm: 1 } } as const;
const CHECKBOX_SX = {
  p: 0,
  mr: 0.5,
  verticalAlign: 'middle',
  pointerEvents: 'none',
} as const;
const HEADING_BORDER_SX = {
  my: 1.5,
  pb: 0.5,
  borderBottom: 1,
  borderColor: 'divider',
} as const;
const TABLE_CONTAINER_SX = { my: 2, overflowX: 'auto' } as const;
const TABLE_ROW_SX = {
  '&:nth-of-type(odd)': { bgcolor: 'action.selected' },
  '&:last-child td, &:last-child th': { border: 0 },
} as const;

interface MarkdownNodeProps {
  children?: ReactNode;
}

interface TableCellRendererProps extends MarkdownNodeProps {
  style?: Pick<CSSProperties, 'textAlign'>;
}

interface HeadingRendererOptions {
  bordered?: boolean;
  color?: ComponentProps<typeof Typography>['color'];
  component?: ElementType;
  fontWeight?: ComponentProps<typeof Typography>['fontWeight'];
}

function createHeadingRenderer(
  variant: ComponentProps<typeof Typography>['variant'],
  marginTop: number,
  options: HeadingRendererOptions = {}
) {
  const { bordered = false, color, component, fontWeight } = options;

  return function HeadingRenderer({ children }: { children?: ReactNode }) {
    return (
      <Typography
        variant={variant}
        {...(component && { component })}
        gutterBottom
        color={color}
        fontWeight={fontWeight}
        sx={
          bordered ? { mt: marginTop, ...HEADING_BORDER_SX } : { mt: marginTop }
        }
      >
        {children}
      </Typography>
    );
  };
}

function createTableCellRenderer(
  fontWeight?: ComponentProps<typeof Typography>['fontWeight']
) {
  return function TableCellRenderer({
    children,
    style,
  }: TableCellRendererProps) {
    return (
      <TableCell
        sx={{
          verticalAlign: 'top',
          ...(fontWeight && { fontWeight }),
          textAlign: style?.textAlign,
        }}
      >
        {children}
      </TableCell>
    );
  };
}

function createListRenderer(component: 'ul' | 'ol') {
  return function ListRenderer({ children }: MarkdownNodeProps) {
    return (
      <Box component={component} sx={{ pl: 3, my: 2 }}>
        {children}
      </Box>
    );
  };
}

const components: Components = {
  h1: createHeadingRenderer('h4', 2, { bordered: true, component: 'h1' }),
  h2: createHeadingRenderer('h5', 2, { bordered: true, component: 'h2' }),
  h3: createHeadingRenderer('h6', 1.5, { component: 'h3' }),
  h4: createHeadingRenderer('subtitle1', 1, {
    component: 'h4',
    fontWeight: 'bold',
  }),
  h5: createHeadingRenderer('subtitle2', 0, {
    component: 'h5',
    fontWeight: 'bold',
  }),
  h6: createHeadingRenderer('subtitle2', 0, {
    color: 'text.secondary',
    component: 'h6',
  }),
  p: ({ children }) => (
    <Typography variant="body1" sx={PARAGRAPH_SX}>
      {children}
    </Typography>
  ),
  a: ({ href, children }) => (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      underline="hover"
      sx={LINK_SX}
    >
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
      const language = className?.replace('language-', '');
      return (
        <Box sx={CODE_BLOCK_WRAPPER_SX}>
          {language && (
            <Chip
              label={language}
              size="small"
              variant="outlined"
              sx={LANG_CHIP_SX}
            />
          )}
          <Paper variant="outlined" component="pre" sx={BLOCK_CODE_SX}>
            <code>{children}</code>
          </Paper>
        </Box>
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
  input: ({ checked }) => (
    <Checkbox
      checked={checked ?? false}
      size="small"
      disableRipple
      tabIndex={-1}
      sx={CHECKBOX_SX}
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
      <Table size="small" aria-label="data table">
        {children}
      </Table>
    </TableContainer>
  ),
  thead: ({ children }) => (
    <TableHead sx={{ bgcolor: 'action.hover' }}>{children}</TableHead>
  ),
  tbody: ({ children }) => <TableBody>{children}</TableBody>,
  tr: ({ children }) => (
    <TableRow hover sx={TABLE_ROW_SX}>
      {children}
    </TableRow>
  ),
  th: createTableCellRenderer('bold'),
  td: createTableCellRenderer(),
  ul: createListRenderer('ul'),
  ol: createListRenderer('ol'),
  li: ({ children }) => (
    <Typography component="li" variant="body1" sx={LIST_ITEM_SX}>
      {children}
    </Typography>
  ),
};

export default function MarkdownPreview({ children }: { children: string }) {
  return (
    <Box component="article" sx={MARKDOWN_ROOT_SX}>
      <Markdown remarkPlugins={remarkPlugins} components={components}>
        {children}
      </Markdown>
    </Box>
  );
}
