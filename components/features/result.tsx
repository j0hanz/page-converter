'use client';

import {
  type MouseEvent,
  type SyntheticEvent,
  useDeferredValue,
  useState,
} from 'react';

import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

import {
  MobileResultPresentation,
  type PreviewTransitionState,
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
  const previewMarkdown = useDeferredValue(result.markdown);
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const previewState: PreviewTransitionState = {
    isPending: previewMarkdown !== result.markdown,
    previewMarkdown,
    previewTransitionDuration: theme.transitions.duration.shortest,
  };

  function handleViewModeChange(
    _event: MouseEvent<HTMLElement>,
    nextViewMode: ViewMode | null
  ): void {
    if (nextViewMode === null) {
      return;
    }

    setViewMode(nextViewMode);
  }

  function handleTabChange(_event: SyntheticEvent, nextTab: ViewMode) {
    setViewMode(nextTab);
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
          previewState={previewState}
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
          previewState={previewState}
        />
      </Stack>
    </Stack>
  );
}
