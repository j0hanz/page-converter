import 'server-only';

import { userAgent } from 'next/server';

import type { TransformResponse } from '@/lib/api';

interface TransformRequestLog {
  url: string;
  userAgent: string;
  isBot: boolean;
  durationMs: number;
  outcome: 'success' | 'error';
  errorCode?: string;
}

function sanitizeLoggedUrl(url: string): string {
  const parsedUrl = URL.parse(url);
  if (!parsedUrl) {
    return 'invalid';
  }

  parsedUrl.search = '';
  parsedUrl.hash = '';
  return parsedUrl.toString();
}

export function createTransformLog(
  request: Request,
  url: string,
  startTime: number,
  response: TransformResponse
): TransformRequestLog {
  const ua = userAgent({ headers: request.headers });
  const log: TransformRequestLog = {
    url: sanitizeLoggedUrl(url),
    userAgent: ua.ua,
    isBot: ua.isBot,
    durationMs: Date.now() - startTime,
    outcome: response.ok ? 'success' : 'error',
  };

  if (!response.ok) {
    log.errorCode = response.error.code;
  }

  return log;
}

export function createValidationLog(
  request: Request,
  startTime: number
): TransformRequestLog {
  const ua = userAgent({ headers: request.headers });

  return {
    url: 'invalid',
    userAgent: ua.ua,
    isBot: ua.isBot,
    durationMs: Date.now() - startTime,
    outcome: 'error',
    errorCode: 'VALIDATION_ERROR',
  };
}

export function logTransformOutcome(log: TransformRequestLog): void {
  try {
    console.info(JSON.stringify({ type: 'transform', ...log }));
  } catch {
    // Never let logging failures propagate
  }
}
