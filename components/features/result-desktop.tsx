'use client';

import type { MouseEvent } from 'react';

import Stack from '@mui/material/Stack';

import {
  ResultActionBar,
  ResultHeaderWithDetails,
  ResultMarkdownPanel,
  type ViewMode,
} from '@/components/features/result-shared';

import type { TransformResult } from '@/lib/api';

export default function ResultDesktop({
  result,
  viewMode,
  onViewModeChange,
}: {
  result: TransformResult;
  viewMode: ViewMode;
  onViewModeChange: (
    event: MouseEvent<HTMLElement>,
    nextViewMode: ViewMode | null
  ) => void;
}) {
  return (
    <Stack spacing={2}>
      <ResultHeaderWithDetails result={result} />

      <Stack
        gap={0.2}
        component="section"
        sx={{ containerType: 'inline-size' }}
      >
        <ResultActionBar
          viewMode={viewMode}
          onViewModeChange={onViewModeChange}
          result={result}
        />
        <ResultMarkdownPanel
          isPreviewMode={viewMode === 'preview'}
          markdown={result.markdown}
        />
      </Stack>
    </Stack>
  );
}
