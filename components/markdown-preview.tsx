"use client";

import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Typography from "@mui/material/Typography";
import Link from "@mui/material/Link";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import type { Components } from "react-markdown";
import type { ComponentProps, CSSProperties, ReactNode } from "react";

interface MarkdownPreviewProps {
  children: string;
}

const remarkPlugins = [remarkGfm];
type TypographyVariant = ComponentProps<typeof Typography>["variant"];
type FontWeight = ComponentProps<typeof Typography>["fontWeight"];
type TextAlignStyle = Pick<CSSProperties, "textAlign">;
interface RendererChildrenProps {
  children?: ReactNode;
}
const BLOCKQUOTE_SX = {
  borderLeft: 4,
  borderColor: "primary.main",
  pl: 2,
  py: 0.5,
  my: 1,
  color: "text.secondary",
  "& > p": { mb: 0 },
} as const;
const BLOCK_CODE_SX = {
  px: 2,
  py: 1,
  overflow: "auto",
} as const;
const INLINE_CODE_SX = {
  px: 0.4,
  py: 0.2,
  bgcolor: "action.hover",
  borderRadius: 0.5,
} as const;
const IMAGE_SX = {
  maxWidth: "100%",
  height: "auto",
  my: 1,
  borderRadius: 1,
} as const;
const LIST_SX = { pl: 3, my: 1 } as const;
const TABLE_CONTAINER_SX = { my: 2 } as const;

interface TableCellRendererProps extends RendererChildrenProps {
  style?: TextAlignStyle;
}

function readTextAlign(style?: TextAlignStyle) {
  return style?.textAlign;
}

function createHeadingRenderer(
  variant: TypographyVariant,
  marginTop: number,
  props: Partial<ComponentProps<typeof Typography>> = {},
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
          ...(fontWeight ? { fontWeight } : {}),
          textAlign: readTextAlign(style),
        }}
      >
        {children}
      </TableCell>
    );
  };
}

function createListRenderer(component: "ul" | "ol") {
  return function ListRenderer({ children }: RendererChildrenProps) {
    return (
      <Box component={component} sx={LIST_SX}>
        {children}
      </Box>
    );
  };
}

const components: Components = {
  h1: createHeadingRenderer("h4", 2),
  h2: createHeadingRenderer("h5", 2),
  h3: createHeadingRenderer("h6", 1.5),
  h4: createHeadingRenderer("subtitle1", 1, { fontWeight: "bold" }),
  h5: createHeadingRenderer("subtitle2", 0, { fontWeight: "bold" }),
  h6: createHeadingRenderer("subtitle2", 0, { color: "text.secondary" }),
  p: ({ children }) => (
    <Typography variant="body1" paragraph>
      {children}
    </Typography>
  ),
  a: ({ href, children }) => (
    <Link href={href} target="_blank" rel="noopener noreferrer">
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
      className?.startsWith("language-") ||
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
      sx={{ p: 0, mr: 0.5 }}
    />
  ),
  hr: () => <Divider sx={{ my: 2 }} />,
  img: ({ src, alt }) => (
    <Box
      component="img"
      src={src}
      alt={alt ?? ""}
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
  thead: ({ children }) => <TableHead>{children}</TableHead>,
  tbody: ({ children }) => <TableBody>{children}</TableBody>,
  tr: ({ children }) => <TableRow>{children}</TableRow>,
  th: createTableCellRenderer("bold"),
  td: createTableCellRenderer(),
  ul: createListRenderer("ul"),
  ol: createListRenderer("ol"),
  li: ({ children }) => (
    <Typography component="li" variant="body1" sx={{ mb: 0.5 }}>
      {children}
    </Typography>
  ),
};

export default function MarkdownPreview({ children }: MarkdownPreviewProps) {
  return (
    <Markdown remarkPlugins={remarkPlugins} components={components}>
      {children}
    </Markdown>
  );
}
