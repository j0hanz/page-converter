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

const INVALID_LOGGED_URL = 'invalid';

function sanitizeLoggedUrl(url: string): string {
  const parsedUrl = URL.parse(url);
  if (!parsedUrl) {
    return INVALID_LOGGED_URL;
  }

  parsedUrl.search = '';
  parsedUrl.hash = '';
  return parsedUrl.toString();
}

function readRequestMetadata(
  request: Request
): Pick<TransformRequestLog, 'isBot' | 'userAgent'> {
  const ua = userAgent({ headers: request.headers });

  return {
    userAgent: ua.ua,
    isBot: ua.isBot,
  };
}

function createBaseLog(
  request: Request,
  startTime: number
): Pick<TransformRequestLog, 'durationMs' | 'isBot' | 'userAgent'> {
  return {
    ...readRequestMetadata(request),
    durationMs: Date.now() - startTime,
  };
}

export function createTransformLog(
  request: Request,
  url: string,
  startTime: number,
  response: TransformResponse
): TransformRequestLog {
  const log: TransformRequestLog = {
    ...createBaseLog(request, startTime),
    url: sanitizeLoggedUrl(url),
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
  return {
    ...createBaseLog(request, startTime),
    url: INVALID_LOGGED_URL,
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
