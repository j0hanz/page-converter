import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
};
const SECURITY_HEADER_ENTRIES = Object.entries(SECURITY_HEADERS);

export function proxy(_request: NextRequest) {
  const response = NextResponse.next();

  for (const [key, value] of SECURITY_HEADER_ENTRIES) {
    response.headers.set(key, value);
  }

  return response;
}
