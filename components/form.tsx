'use client';

import { useId, useImperativeHandle, useRef } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';

export interface TransformFormHandle {
  clear: () => void;
}

interface TransformFormProps {
  ref?: React.Ref<TransformFormHandle>;
  loading: boolean;
  onSubmit: (url: string) => void;
}

const URL_INPUT_SX = { flexGrow: 1, flex: { md: '2 1 0' } } as const;
const ACTION_BUTTON_SX = {
  maxWidth: { sm: 125 },
  flex: { md: '1 1 0' },
} as const;

export default function TransformForm({
  ref,
  loading,
  onSubmit,
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

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inputRef.current) {
      onSubmit(inputRef.current.value);
    }
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        sx={{ mb: 1.5 }}
      >
        <TextField
          id={urlInputId}
          inputRef={inputRef}
          label="Paste a public URL to convert"
          type="url"
          required
          fullWidth
          placeholder="https://example.com"
          defaultValue=""
          disabled={loading}
          variant="outlined"
          size="small"
          sx={URL_INPUT_SX}
        />
        <Button
          type="submit"
          variant="contained"
          fullWidth
          disabled={loading}
          size="small"
          sx={ACTION_BUTTON_SX}
        >
          {loading ? 'Converting...' : 'Convert'}
        </Button>
      </Stack>
    </Box>
  );
}
