import type { ComponentProps, CSSProperties, ReactNode } from 'react';

import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';

import type { Components } from 'react-markdown';

const TABLE_CONTAINER_SX = { my: 2, overflowX: 'auto' } as const;
const TABLE_ROW_STRIPED_SX = {
  '&:nth-of-type(odd)': { bgcolor: 'action.selected' },
  '&:last-child td, &:last-child th': { border: 0 },
} as const;

interface TableCellRendererProps {
  children?: ReactNode;
  style?: Pick<CSSProperties, 'textAlign'>;
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

export const markdownTableComponents: Partial<Components> = {
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
    <TableRow hover sx={TABLE_ROW_STRIPED_SX}>
      {children}
    </TableRow>
  ),
  th: createTableCellRenderer('bold'),
  td: createTableCellRenderer(),
};
