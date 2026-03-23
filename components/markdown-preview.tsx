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

import { markdownTableComponents } from '@/components/table';
import { sx } from '@/lib/theme';

const remarkPlugins = [remarkGfm];

interface MarkdownNodeProps {
  children?: ReactNode;
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
          bordered ? { mt: marginTop, ...sx.headingBorder } : { mt: marginTop }
        }
      >
        {children}
      </Typography>
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
  ...markdownTableComponents,
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
    <Typography variant="body1" sx={sx.paragraph}>
      {children}
    </Typography>
  ),
  a: ({ href, children }) => (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      underline="hover"
      sx={sx.link}
    >
      {children}
    </Link>
  ),
  blockquote: ({ children }) => (
    <Box component="blockquote" sx={sx.blockquote}>
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
        <Box sx={sx.codeBlockWrapper}>
          {language && (
            <Chip
              label={language}
              size="small"
              variant="outlined"
              sx={sx.langChip}
            />
          )}
          <Paper variant="outlined" component="pre" sx={sx.codeBlock}>
            <code>{children}</code>
          </Paper>
        </Box>
      );
    }
    return (
      <Box component="code" sx={sx.inlineCode}>
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
      sx={sx.checkbox}
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
      sx={sx.image}
    />
  ),
  ul: createListRenderer('ul'),
  ol: createListRenderer('ol'),
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
