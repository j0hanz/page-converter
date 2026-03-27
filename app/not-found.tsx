import Link from 'next/link';

import Button from '@mui/material/Button';

import { StatusShell } from '@/components/ui/status-shell';

export default function NotFound() {
  return (
    <StatusShell
      title="Page not found"
      message="The page you are looking for does not exist."
      minHeight="50vh"
      action={
        <Button component={Link} href="/" variant="contained">
          Go home
        </Button>
      }
    />
  );
}
