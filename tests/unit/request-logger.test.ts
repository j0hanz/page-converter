import { describe, expect, it, vi } from 'vitest';

import type { TransformResponse } from '@/lib/api';
import {
  createTransformLog,
  createValidationLog,
  logTransformOutcome,
} from '@/lib/request-logger';

vi.mock('next/server', () => ({
  userAgent: vi.fn(({ headers }: { headers: Headers }) => ({
    ua: headers.get('user-agent') ?? '',
    isBot: false,
    browser: {},
    device: {},
    engine: {},
    os: {},
    cpu: {},
  })),
}));

function createRequest(ua = 'TestAgent/1.0'): Request {
  return new Request('http://localhost/api/transform', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': ua },
  });
}

const SUCCESS_RESPONSE: TransformResponse = {
  ok: true,
  result: {
    url: 'https://example.com',
    metadata: {},
    markdown: '# Test',
    fetchedAt: '2026-01-01T00:00:00.000Z',
    contentSize: 6,
    truncated: false,
  },
};

const ERROR_RESPONSE: TransformResponse = {
  ok: false,
  error: {
    code: 'FETCH_ERROR',
    message: 'Upstream unavailable',
    retryable: true,
  },
};

describe('request-logger', () => {
  describe('createTransformLog', () => {
    it('builds a success log with user-agent info', () => {
      const log = createTransformLog(
        createRequest(),
        'https://example.com',
        Date.now() - 150,
        SUCCESS_RESPONSE
      );

      expect(log).toMatchObject({
        url: 'https://example.com/',
        userAgent: 'TestAgent/1.0',
        isBot: false,
        outcome: 'success',
      });
      expect(log.durationMs).toBeGreaterThanOrEqual(0);
      expect(log.errorCode).toBeUndefined();
    });

    it('removes query strings and fragments from logged URLs', () => {
      const log = createTransformLog(
        createRequest(),
        'https://example.com/docs/page?token=secret#section',
        Date.now() - 50,
        SUCCESS_RESPONSE
      );

      expect(log.url).toBe('https://example.com/docs/page');
    });

    it('includes errorCode for error responses', () => {
      const log = createTransformLog(
        createRequest(),
        'https://example.com',
        Date.now(),
        ERROR_RESPONSE
      );

      expect(log.outcome).toBe('error');
      expect(log.errorCode).toBe('FETCH_ERROR');
    });
  });

  describe('createValidationLog', () => {
    it('returns a validation error log', () => {
      const log = createValidationLog(createRequest(), Date.now() - 50);

      expect(log).toMatchObject({
        url: 'invalid',
        userAgent: 'TestAgent/1.0',
        isBot: false,
        outcome: 'error',
        errorCode: 'VALIDATION_ERROR',
      });
      expect(log.durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('logTransformOutcome', () => {
    it('writes structured JSON to stdout', () => {
      const spy = vi.spyOn(console, 'info').mockImplementation(() => {});

      logTransformOutcome({
        url: 'https://example.com',
        userAgent: 'Bot/1.0',
        isBot: true,
        durationMs: 200,
        outcome: 'success',
      });

      expect(spy).toHaveBeenCalledOnce();
      const raw: unknown = spy.mock.calls[0]?.[0];
      expect(raw).toBeDefined();
      const parsed = JSON.parse(raw as string) as Record<string, unknown>;
      expect(parsed.type).toBe('transform');
      expect(parsed.url).toBe('https://example.com');
      expect(parsed.durationMs).toBe(200);

      spy.mockRestore();
    });

    it('silently swallows logging errors', () => {
      const spy = vi.spyOn(console, 'info').mockImplementation(() => {
        throw new Error('write failed');
      });

      expect(() =>
        logTransformOutcome({
          url: 'https://example.com',
          userAgent: '',
          isBot: false,
          durationMs: 0,
          outcome: 'error',
          errorCode: 'FETCH_ERROR',
        })
      ).not.toThrow();

      spy.mockRestore();
    });
  });
});
