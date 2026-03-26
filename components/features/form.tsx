'use client';

import { useId, useImperativeHandle, useRef } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';

export interface TransformFormHandle {
  clear: () => void;
}

interface TransformFormProps {
  ref?: React.Ref<TransformFormHandle>;
  loading: boolean;
  action: (formData: FormData) => void;
}

export default function TransformForm({
  ref,
  loading,
  action,
}: TransformFormProps) {
  const urlInputId = useId();
  const formRef = useRef<HTMLFormElement>(null);

  useImperativeHandle(ref, () => ({
    clear() {
      formRef.current?.reset();
    },
  }));

  return (
    <Box component="form" ref={formRef} action={action}>
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
            placeholder="https://..."
            disabled={loading}
            size="small"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Button type="submit" variant="contained" fullWidth loading={loading}>
            Convert
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
}
