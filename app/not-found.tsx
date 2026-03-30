import type { Metadata } from 'next';
import Link from 'next/link';

import Button from '@mui/material/Button';

import { StatusShell } from '@/components/ui/status-shell';

export const metadata: Metadata = {
  title: 'Page not found',
};

export default function NotFound() {
  return (
    <StatusShell
      title="Page not found"
      message="The page you are looking for does not exist."
      minHeight="50vh"
      action={
        <Link href="/">
          <Button component="span" variant="contained">
            Go home
          </Button>
        </Link>
      }
    />
  );
}
