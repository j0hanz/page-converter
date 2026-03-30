'use client';

import { useId } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';

interface TransformFormProps {
  ref?: React.Ref<HTMLFormElement>;
  action: (formData: FormData) => void;
  isPending: boolean;
}

function SubmitButton({ isPending }: { isPending: boolean }) {
  return (
    <Button
      type="submit"
      variant="contained"
      color="primary"
      fullWidth
      loading={isPending}
      disabled={isPending}
    >
      Convert
    </Button>
  );
}

export default function TransformForm({
  ref,
  action,
  isPending,
}: TransformFormProps) {
  const urlInputId = useId();

  return (
    <Box component="form" ref={ref} action={action}>
      <Grid container spacing={1} sx={{ mb: 1.5 }}>
        <Grid size={{ xs: 12, sm: 8 }}>
          <TextField
            id={urlInputId}
            name="url"
            label="Enter URL to convert"
            type="url"
            autoComplete="url"
            required
            fullWidth
            disabled={isPending}
            placeholder="https://..."
            size="small"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <SubmitButton isPending={isPending} />
        </Grid>
      </Grid>
    </Box>
  );
}
