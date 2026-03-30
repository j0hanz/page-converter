'use client';

import { useEffect, useState } from 'react';

import dynamic from 'next/dynamic';

import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import type { DialogProps } from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';

import { sx } from '@/lib/theme';

const loadAboutDialogPanel = () =>
  import('@/components/features/about-dialog-panel');
const AboutDialogPanel = dynamic(loadAboutDialogPanel);

interface HomeContentPayload {
  aboutMarkdown: string;
  howItWorksMarkdown: string;
}

interface HomeContentResponse {
  aboutMarkdown?: unknown;
  howItWorksMarkdown?: unknown;
  markdown?: unknown;
}

let homeContentPromise: Promise<HomeContentPayload> | undefined;

function mapHomeContentPayload(data: HomeContentResponse): HomeContentPayload {
  const aboutMarkdown =
    typeof data.aboutMarkdown === 'string'
      ? data.aboutMarkdown
      : typeof data.markdown === 'string'
        ? data.markdown
        : null;
  const howItWorksMarkdown =
    typeof data.howItWorksMarkdown === 'string'
      ? data.howItWorksMarkdown
      : null;

  if (!aboutMarkdown || !howItWorksMarkdown) {
    throw new Error('Invalid home content response.');
  }

  return { aboutMarkdown, howItWorksMarkdown };
}

async function fetchHomeContent(): Promise<HomeContentPayload> {
  const response = await fetch('/api/home-content', {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error('Failed to load About content.');
  }

  return mapHomeContentPayload((await response.json()) as HomeContentResponse);
}

function loadHomeContent(): Promise<HomeContentPayload> {
  homeContentPromise ??= fetchHomeContent().catch((error: unknown) => {
    homeContentPromise = undefined;
    throw error;
  });

  return homeContentPromise;
}

function prefetchHomeContent(): void {
  void loadHomeContent().catch(() => {});
}

export default function AboutDialog() {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState<HomeContentPayload | null>(null);
  const [isContentLoading, setIsContentLoading] = useState(false);
  const [contentLoadFailed, setContentLoadFailed] = useState(false);

  const handleClose: NonNullable<DialogProps['onClose']> = () => {
    setOpen(false);
  };

  useEffect(() => {
    if (!open || content || isContentLoading) {
      return;
    }

    let cancelled = false;

    setIsContentLoading(true);
    setContentLoadFailed(false);

    void loadHomeContent()
      .then((nextContent) => {
        if (cancelled) {
          return;
        }

        setContent(nextContent);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setContentLoadFailed(true);
      })
      .finally(() => {
        if (!cancelled) {
          setIsContentLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [content, isContentLoading, open]);

  function handlePrefetch() {
    void loadAboutDialogPanel();
    prefetchHomeContent();
  }

  return (
    <>
      <Tooltip title="About">
        <IconButton
          onClick={() => {
            setOpen(true);
          }}
          onFocus={() => {
            handlePrefetch();
          }}
          onMouseEnter={() => {
            handlePrefetch();
          }}
          aria-label="About Fetch URL"
          size="small"
          disableRipple={true}
        >
          <InfoOutlinedIcon sx={sx.headerIcon} />
        </IconButton>
      </Tooltip>

      {open ? (
        <AboutDialogPanel
          aboutMarkdown={content?.aboutMarkdown ?? null}
          howItWorksMarkdown={content?.howItWorksMarkdown ?? null}
          contentLoadFailed={contentLoadFailed}
          isContentLoading={isContentLoading}
          open={open}
          onClose={handleClose}
          onRetry={() => {
            setContent(null);
            setContentLoadFailed(false);
          }}
        />
      ) : null}
    </>
  );
}
