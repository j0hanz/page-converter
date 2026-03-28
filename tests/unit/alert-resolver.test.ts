import { describe, expect, it } from 'vitest';

import { resolveErrorAlert } from '@/components/ui/alert';

import type { TransformErrorCode } from '@/lib/api';

describe('resolveErrorAlert', () => {
  it.each<{
    code: TransformErrorCode;
    statusCode?: number;
    severity: string;
    title: string;
  }>([
    {
      code: 'VALIDATION_ERROR',
      severity: 'warning',
      title: 'Invalid Input',
    },
    {
      code: 'FETCH_ERROR',
      severity: 'error',
      title: 'Connection Error',
    },
    {
      code: 'ABORTED',
      severity: 'info',
      title: 'Cancelled',
    },
    {
      code: 'QUEUE_FULL',
      severity: 'warning',
      title: 'Server Busy',
    },
    {
      code: 'INTERNAL_ERROR',
      severity: 'error',
      title: 'Internal Error',
    },
    {
      code: 'HTTP_ERROR',
      severity: 'error',
      title: 'HTTP Error',
    },
  ])(
    'returns severity=$severity title=$title for code=$code',
    ({ code, statusCode, severity, title }) => {
      const result = resolveErrorAlert(code, statusCode);
      expect(result.severity).toBe(severity);
      expect(result.title).toBe(title);
      expect(result.icon).toBeDefined();
    }
  );

  describe('HTTP_ERROR status code overrides', () => {
    it('returns Not Found for 404', () => {
      const result = resolveErrorAlert('HTTP_ERROR', 404);
      expect(result.severity).toBe('error');
      expect(result.title).toBe('Not Found');
    });

    it('returns Forbidden for 403', () => {
      const result = resolveErrorAlert('HTTP_ERROR', 403);
      expect(result.severity).toBe('error');
      expect(result.title).toBe('Forbidden');
    });

    it('returns Rate Limited for 429', () => {
      const result = resolveErrorAlert('HTTP_ERROR', 429);
      expect(result.severity).toBe('warning');
      expect(result.title).toBe('Rate Limited');
    });

    it('returns Server Error for 500', () => {
      const result = resolveErrorAlert('HTTP_ERROR', 500);
      expect(result.severity).toBe('error');
      expect(result.title).toBe('Server Error');
    });

    it('returns Server Error for 502', () => {
      const result = resolveErrorAlert('HTTP_ERROR', 502);
      expect(result.severity).toBe('error');
      expect(result.title).toBe('Server Error');
    });

    it('falls back to HTTP Error for unknown status codes', () => {
      const result = resolveErrorAlert('HTTP_ERROR', 418);
      expect(result.severity).toBe('error');
      expect(result.title).toBe('HTTP Error');
    });

    it('falls back to HTTP Error when statusCode is undefined', () => {
      const result = resolveErrorAlert('HTTP_ERROR');
      expect(result.severity).toBe('error');
      expect(result.title).toBe('HTTP Error');
    });
  });
});
