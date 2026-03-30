import type { ComponentProps, ElementType, ReactNode } from 'react';

import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';

import Markdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { markdownTableComponents } from '@/components/ui/table';

import { fluid, tokens } from '@/lib/theme';

const remarkPlugins = [remarkGfm];

const SAFE_LINK_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);
const IMAGE_PROTOCOLS = new Set(['http:', 'https:']);
const LIST_SX = { pl: 3, my: 2 };
const MARKDOWN_ROOT_SX = {
  '& > :first-of-type': { mt: 0 },
  '& > :last-child': { mb: 0 },
} as const;
const BLOCKQUOTE_SX = {
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
} as const;
const CODE_BLOCK_SX = {
  p: 2,
  overflow: 'auto',
  fontFamily: tokens.fonts.mono,
  fontSize: '0.875rem',
  bgcolor: 'action.hover',
  borderRadius: tokens.radius.code,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
} as const;
const INLINE_CODE_SX = {
  px: 0.5,
  py: 0.25,
  bgcolor: 'action.hover',
  borderRadius: tokens.radius.code,
  fontFamily: tokens.fonts.mono,
  fontSize: '0.85em',
  border: 1,
  borderColor: 'divider',
} as const;
const IMAGE_SX = {
  maxWidth: '100%',
  height: 'auto',
  maxHeight: '60vh',
} as const;
const CODE_BLOCK_WRAPPER_SX = { position: 'relative' } as const;
const LANGUAGE_CHIP_SX = {
  position: 'absolute',
  top: 4,
  right: 4,
  fontFamily: tokens.fonts.mono,
  height: tokens.sizes.chipHeight,
  opacity: 0.6,
  zIndex: 1,
  fontSize: '0.7rem',
  backgroundColor: 'unset',
} as const;
const LINK_SX = {
  textUnderlineOffset: '0.18em',
  textDecorationThickness: '0.08em',
  transition: 'all 0.2s ease',
  '&:hover': { textDecorationThickness: '0.12em' },
} as const;
const PARAGRAPH_SX = { mb: fluid.paragraphMb } as const;
const LIST_ITEM_SX = { mb: fluid.listItemMb } as const;
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

function isSafeUrl(value: unknown, protocols: Set<string>): value is string {
  if (typeof value !== 'string') return false;
  try {
    return protocols.has(new URL(value).protocol);
  } catch {
    return false;
  }
}

interface HeadingConfig {
  variant: ComponentProps<typeof Typography>['variant'];
  mt: number;
  component: ElementType;
  bordered?: boolean;
  fontWeight?: ComponentProps<typeof Typography>['fontWeight'];
  color?: ComponentProps<typeof Typography>['color'];
}

const HEADINGS: [string, HeadingConfig][] = [
  ['h1', { variant: 'h4', mt: 2, component: 'h1', bordered: true }],
  ['h2', { variant: 'h5', mt: 2, component: 'h2', bordered: true }],
  ['h3', { variant: 'h6', mt: 1.5, component: 'h3' }],
  ['h4', { variant: 'subtitle1', mt: 1, component: 'h4', fontWeight: 'bold' }],
  ['h5', { variant: 'subtitle2', mt: 0, component: 'h5', fontWeight: 'bold' }],
  [
    'h6',
    { variant: 'subtitle2', mt: 0, component: 'h6', color: 'text.secondary' },
  ],
];

const headingComponents = Object.fromEntries(
  HEADINGS.map(
    ([tag, { variant, mt, component, bordered, fontWeight, color }]) => [
      tag,
      ({ children }: { children?: ReactNode }) => (
        <Typography
          variant={variant}
          component={component}
          gutterBottom
          color={color}
          fontWeight={fontWeight}
          sx={bordered ? { mt, ...HEADING_BORDER_SX } : { mt }}
        >
          {children}
        </Typography>
      ),
    ]
  )
) as Pick<Components, 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'>;

function CodeRenderer({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  const isBlock =
    className?.startsWith('language-') ||
    (typeof children === 'string' && children.includes('\n'));

  if (!isBlock) {
    return (
      <Box component="code" sx={INLINE_CODE_SX}>
        {children}
      </Box>
    );
  }

  const language = className?.replace('language-', '');
  return (
    <Box sx={CODE_BLOCK_WRAPPER_SX}>
      {language && <Chip label={language} size="small" sx={LANGUAGE_CHIP_SX} />}
      <Paper variant="outlined" component="pre" sx={CODE_BLOCK_SX}>
        <code>{children}</code>
      </Paper>
    </Box>
  );
}

function LinkRenderer({
  href,
  children,
}: {
  href?: string;
  children?: ReactNode;
}) {
  if (!isSafeUrl(href, SAFE_LINK_PROTOCOLS)) {
    return (
      <Typography component="span" variant="inherit">
        {children}
      </Typography>
    );
  }
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      underline="hover"
      sx={LINK_SX}
    >
      {children}
    </Link>
  );
}

function ImageRenderer({ src, alt }: { src?: string | Blob; alt?: string }) {
  if (!isSafeUrl(src, IMAGE_PROTOCOLS)) return null;
  return (
    <Box
      component="img"
      src={src}
      alt={alt ?? ''}
      loading="lazy"
      decoding="async"
      sx={IMAGE_SX}
    />
  );
}

const components: Components = {
  ...markdownTableComponents,
  ...headingComponents,
  p: ({ children }) => (
    <Typography variant="body1" sx={PARAGRAPH_SX}>
      {children}
    </Typography>
  ),
  a: LinkRenderer,
  blockquote: ({ children }) => (
    <Box component="blockquote" sx={BLOCKQUOTE_SX}>
      {children}
    </Box>
  ),
  code: CodeRenderer,
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
  img: ImageRenderer,
  ul: ({ children }) => (
    <Box component="ul" sx={LIST_SX}>
      {children}
    </Box>
  ),
  ol: ({ children }) => (
    <Box component="ol" sx={LIST_SX}>
      {children}
    </Box>
  ),
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
