'use client';

import type { ReactNode } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { BaseDialog } from '@/components/ui/dialog';

import type { TransformResult } from '@/lib/api';
import { sx } from '@/lib/theme';

interface ResultDetailItem {
  label: string;
  value: ReactNode;
}

function isSafeImageUrl(url: string | undefined): url is string {
  if (!url) return false;

  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;

  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;

  return `${(kb / 1024).toFixed(1)} MB`;
}

function createResultDetailItems({
  contentSize,
  metadata,
  truncated,
  url,
}: TransformResult): ResultDetailItem[] {
  const items: ResultDetailItem[] = [{ label: 'URL:', value: url }];

  if (metadata.description) {
    items.push({ label: 'Info:', value: metadata.description });
  }

  items.push({ label: 'Size:', value: formatBytes(contentSize) });

  if (truncated) {
    items.push({ label: 'Truncated:', value: 'Yes' });
  }

  return items;
}

function DetailRow({ label, value }: ResultDetailItem) {
  return (
    <Stack direction="row" gap={2}>
      <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{ wordBreak: 'break-word', ...sx.minWidthZero }}
      >
        {value}
      </Typography>
    </Stack>
  );
}

export default function ResultDetailDialog({
  open,
  onClose,
  result,
}: {
  open: boolean;
  onClose: () => void;
  result: TransformResult;
}) {
  const { metadata, title } = result;
  const detailItems = createResultDetailItems(result);

  return (
    <BaseDialog
      open={open}
      onClose={onClose}
      titleId="result-detail-title"
      title={
        <Typography variant="subtitle1" sx={sx.minWidthZero}>
          {title ?? 'Page Details'}
        </Typography>
      }
      maxWidth="sm"
    >
      <Stack gap={2}>
        {detailItems.map((item) => (
          <DetailRow key={item.label} {...item} />
        ))}
        {isSafeImageUrl(metadata.image) && (
          <Box
            component="img"
            src={metadata.image}
            alt="Page preview"
            loading="lazy"
            decoding="async"
            sx={{ maxWidth: '100%', borderRadius: 1 }}
          />
        )}
      </Stack>
    </BaseDialog>
  );
}
