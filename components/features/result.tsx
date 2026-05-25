'use client';

import { type MouseEvent, type SyntheticEvent, useState } from 'react';

import dynamic from 'next/dynamic';

import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

import {
  ResultActionBar,
  ResultHeaderWithDetails,
  ResultMarkdownPanel,
  type ViewMode,
} from '@/components/features/result-content';
import { MarkdownSkeleton } from '@/components/ui/loading';

import type { TransformResult } from '@/lib/api';

interface TransformResultProps {
  result: TransformResult;
}

const ResultMobile = dynamic(
  () => import('@/components/features/result-mobile'),
  { loading: () => <MarkdownSkeleton /> }
);

function useResultPresentationState() {
  const [viewMode, setViewMode] = useState<ViewMode>('preview');
  const [mobileDialogOpen, setMobileDialogOpen] = useState(false);

  function updateViewMode(nextViewMode: ViewMode | null): void {
    if (nextViewMode === null || nextViewMode === viewMode) {
      return;
    }

    setViewMode(nextViewMode);
  }

  const closeMobileDialog = () => {
    setMobileDialogOpen(false);
  };

  const handleTabChange = (_event: SyntheticEvent, nextTab: ViewMode) => {
    updateViewMode(nextTab);
  };

  const handleViewModeChange = (
    _event: MouseEvent<HTMLElement>,
    nextViewMode: ViewMode | null
  ) => {
    updateViewMode(nextViewMode);
  };

  const openMobileDialog = () => {
    setMobileDialogOpen(true);
  };

  return {
    closeMobileDialog,
    handleTabChange,
    handleViewModeChange,
    mobileDialogOpen,
    openMobileDialog,
    viewMode,
  };
}

export default function TransformResultPanel({ result }: TransformResultProps) {
  const {
    closeMobileDialog,
    handleTabChange,
    handleViewModeChange,
    mobileDialogOpen,
    openMobileDialog,
    viewMode,
  } = useResultPresentationState();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'), {
    noSsr: true,
  });

  if (isMobile) {
    return (
      <ResultMobile
        mobileDialogOpen={mobileDialogOpen}
        onClose={closeMobileDialog}
        onOpen={openMobileDialog}
        onTabChange={handleTabChange}
        result={result}
        viewMode={viewMode}
      />
    );
  }

  return (
    <Stack spacing={2}>
      <ResultHeaderWithDetails result={result} />

      <Stack
        component="section"
        sx={{ gap: 0.2, containerType: 'inline-size' }}
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
