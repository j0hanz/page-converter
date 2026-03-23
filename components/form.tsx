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
  const inputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    clear() {
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    },
  }));

  return (
    <Box component="form" action={action}>
      <Grid container spacing={1} sx={{ mb: 1.5 }}>
        <Grid size={{ xs: 12, sm: 8 }}>
          <TextField
            id={urlInputId}
            inputRef={inputRef}
            name="url"
            label="Paste a public URL to convert"
            type="url"
            required
            fullWidth
            placeholder="https://example.com"
            defaultValue=""
            disabled={loading}
            variant="outlined"
            size="small"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={loading}
          >
            {loading ? 'Converting...' : 'Convert'}
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
}
