'use client';

import {
  type MouseEvent,
  startTransition,
  type SyntheticEvent,
  useState,
} from 'react';

import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

import {
  MobileResultPresentation,
  ResultActionBar,
  ResultHeaderWithDetails,
  ResultMarkdownPanel,
  type ViewMode,
} from '@/components/features/result-content';

import type { TransformResult } from '@/lib/api';

interface TransformResultProps {
  result: TransformResult;
}

export default function TransformResultPanel({ result }: TransformResultProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('preview');
  const [mobileDialogOpen, setMobileDialogOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'), {
    noSsr: true,
  });

  function handleViewModeChange(
    _event: MouseEvent<HTMLElement>,
    nextViewMode: ViewMode | null
  ): void {
    if (nextViewMode === null || nextViewMode === viewMode) {
      return;
    }

    startTransition(() => {
      setViewMode(nextViewMode);
    });
  }

  function handleTabChange(_event: SyntheticEvent, nextTab: ViewMode) {
    if (nextTab === viewMode) {
      return;
    }

    startTransition(() => {
      setViewMode(nextTab);
    });
  }

  if (isMobile) {
    return (
      <Stack spacing={2}>
        <ResultHeaderWithDetails result={result} />
        <MobileResultPresentation
          mobileDialogOpen={mobileDialogOpen}
          onClose={() => {
            setMobileDialogOpen(false);
          }}
          onOpen={() => {
            setMobileDialogOpen(true);
          }}
          onTabChange={handleTabChange}
          result={result}
          viewMode={viewMode}
        />
      </Stack>
    );
  }

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
          onViewModeChange={handleViewModeChange}
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
