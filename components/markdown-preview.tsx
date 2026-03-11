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
import type { CSSProperties } from "react";

interface MarkdownPreviewProps {
  children: string;
}

const remarkPlugins = [remarkGfm];
const MONO_FONT_FAMILY = "var(--font-geist-mono), monospace";

function readTextAlign(style?: CSSProperties) {
  return style?.textAlign;
}

const components: Components = {
  h1: ({ children }) => (
    <Typography variant="h4" gutterBottom sx={{ mt: 2 }}>
      {children}
    </Typography>
  ),
  h2: ({ children }) => (
    <Typography variant="h5" gutterBottom sx={{ mt: 2 }}>
      {children}
    </Typography>
  ),
  h3: ({ children }) => (
    <Typography variant="h6" gutterBottom sx={{ mt: 1.5 }}>
      {children}
    </Typography>
  ),
  h4: ({ children }) => (
    <Typography
      variant="subtitle1"
      gutterBottom
      fontWeight="bold"
      sx={{ mt: 1 }}
    >
      {children}
    </Typography>
  ),
  h5: ({ children }) => (
    <Typography variant="subtitle2" gutterBottom fontWeight="bold">
      {children}
    </Typography>
  ),
  h6: ({ children }) => (
    <Typography variant="subtitle2" gutterBottom color="text.secondary">
      {children}
    </Typography>
  ),
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
    <Box
      component="blockquote"
      sx={{
        borderLeft: 4,
        borderColor: "primary.main",
        pl: 2,
        py: 0.5,
        my: 1,
        color: "text.secondary",
        "& > p": { mb: 0 },
      }}
    >
      {children}
    </Box>
  ),
  code: ({ className, children, node }) => {
    const isBlock =
      className?.startsWith("language-") ||
      node?.position?.start.line !== node?.position?.end.line;
    if (isBlock) {
      return (
        <Paper
          variant="outlined"
          component="pre"
          sx={{
            p: 2,
            my: 1,
            overflow: "auto",
            fontFamily: MONO_FONT_FAMILY,
            fontSize: "0.85rem",
            lineHeight: 1.6,
          }}
        >
          <code>{children}</code>
        </Paper>
      );
    }
    return (
      <Box
        component="code"
        sx={{
          px: 0.6,
          py: 0.2,
          borderRadius: 0.5,
          bgcolor: "action.hover",
          fontFamily: MONO_FONT_FAMILY,
          fontSize: "0.85em",
        }}
      >
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
      sx={{ maxWidth: "100%", height: "auto", my: 1, borderRadius: 1 }}
    />
  ),
  table: ({ children }) => (
    <TableContainer component={Paper} variant="outlined" sx={{ my: 2 }}>
      <Table size="small">{children}</Table>
    </TableContainer>
  ),
  thead: ({ children }) => <TableHead>{children}</TableHead>,
  tbody: ({ children }) => <TableBody>{children}</TableBody>,
  tr: ({ children }) => <TableRow>{children}</TableRow>,
  th: ({ children, style }) => (
    <TableCell
      sx={{
        fontWeight: "bold",
        textAlign: readTextAlign(style as CSSProperties),
      }}
    >
      {children}
    </TableCell>
  ),
  td: ({ children, style }) => (
    <TableCell sx={{ textAlign: readTextAlign(style as CSSProperties) }}>
      {children}
    </TableCell>
  ),
  ul: ({ children }) => (
    <Box component="ul" sx={{ pl: 3, my: 1 }}>
      {children}
    </Box>
  ),
  ol: ({ children }) => (
    <Box component="ol" sx={{ pl: 3, my: 1 }}>
      {children}
    </Box>
  ),
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
