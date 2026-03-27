'use client';

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
import { sx } from '@/lib/theme';

const remarkPlugins = [remarkGfm];

const SAFE_LINK_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);
const IMAGE_PROTOCOLS = new Set(['http:', 'https:']);
const LIST_SX = { pl: 3, my: 2 };

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
          sx={bordered ? { mt, ...sx.headingBorder } : { mt }}
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
      <Box component="code" sx={sx.inlineCode}>
        {children}
      </Box>
    );
  }

  const language = className?.replace('language-', '');
  return (
    <Box sx={sx.codeBlockWrapper}>
      {language && <Chip label={language} size="small" sx={sx.langChip} />}
      <Paper variant="outlined" component="pre" sx={sx.codeBlock}>
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
      sx={sx.link}
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
      sx={sx.image}
    />
  );
}

const components: Components = {
  ...markdownTableComponents,
  ...headingComponents,
  p: ({ children }) => (
    <Typography variant="body1" sx={sx.paragraph}>
      {children}
    </Typography>
  ),
  a: LinkRenderer,
  blockquote: ({ children }) => (
    <Box component="blockquote" sx={sx.blockquote}>
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
      sx={sx.checkbox}
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
    <Typography component="li" variant="body1" sx={sx.listItem}>
      {children}
    </Typography>
  ),
};

export default function MarkdownPreview({ children }: { children: string }) {
  return (
    <Box component="article" sx={sx.markdownRoot}>
      <Markdown remarkPlugins={remarkPlugins} components={components}>
        {children}
      </Markdown>
    </Box>
  );
}
