import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
};

export function proxy(request: NextRequest) {
  const response = NextResponse.next();

  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }

  // Basic edge protection for API
  if (request.nextUrl.pathname.startsWith('/api/transform')) {
    if (request.method !== 'POST') {
      return new NextResponse('Method Not Allowed', {
        status: 405,
        headers: response.headers,
      });
    }

    const userAgent = request.headers.get('user-agent') ?? '';
    if (userAgent.includes('bot') || userAgent.trim() === '') {
      return new NextResponse('Forbidden', {
        status: 403,
        headers: response.headers,
      });
    }
  }

  return response;
}
