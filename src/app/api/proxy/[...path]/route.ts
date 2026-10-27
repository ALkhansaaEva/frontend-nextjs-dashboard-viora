import { NextRequest, NextResponse } from 'next/server';
import { readAuthSessionEnvelope } from '@/lib/auth/session-envelope';

import { apiBaseUrl } from '@/lib/api/base-url';

export const dynamic = 'force-dynamic';

const SESSION_RESPONSE_PATHS = new Set([
  '/auth/email/login',
  '/auth/email/register',
  '/auth/refresh',
  '/auth/google/callback',
  // Redeems the backend's single-use OAuth handoff and sets the session.
  '/auth/google/session',
  '/auth/facebook/callback',
  // A verified TOTP factor upgrades the session to aal2; without this the
  // proxy would keep replaying the original aal1 cookie and admin routes
  // would answer 403 "MFA verification required" forever.
  '/auth/mfa/verify-enable',
]);

function clearSessionCookies(response: NextResponse) {
  const options = { path: '/', maxAge: 0 } as const;
  response.cookies.set('accessToken', '', options);
  response.cookies.set('refreshToken', '', options);
}

async function handler(request: NextRequest) {
  const baseUrl = apiBaseUrl();
  if (!baseUrl) {
    return NextResponse.json(
      {
        statusCode: 503,
        message:
          'Backend API is not configured. Set NEXT_PUBLIC_API_URL (for example https://api.example.com/v1) and restart the server.',
      },
      { status: 503 },
    );
  }
  try {
    const { pathname } = request.nextUrl;
    const backendPath = pathname.replace('/api/proxy', '');
    const targetUrl = `${baseUrl}${backendPath}${request.nextUrl.search}`;

    const headers = new Headers();
    request.headers.forEach((value, key) => {
      const kl = key.toLowerCase();
      if (!['host', 'connection', 'content-length', 'cookie', 'accept-encoding'].includes(kl)) {
        headers.set(key, value);
      }
    });

    const accessToken = request.cookies.get('accessToken')?.value;
    if (accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`);
    }

    const body = ['GET', 'HEAD'].includes(request.method) ? undefined : await request.arrayBuffer();

    const res = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
      cache: 'no-store',
    });

    // Server-sent events must be forwarded as a live stream; buffering the body
    // (as every other proxied response is) would never deliver a frame.
    if ((res.headers.get('content-type') || '').startsWith('text/event-stream')) {
      return new Response(res.body, {
        status: res.status,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no',
        },
      });
    }

    const data = await res.arrayBuffer();
    const responseHeaders = new Headers();
    const allowedHeaders = ['content-type', 'content-length', 'cache-control', 'etag', 'last-modified', 'x-request-id', 'x-ratelimit-remaining', 'x-ratelimit-limit'];
    allowedHeaders.forEach(h => {
      const val = res.headers.get(h);
      if (val) responseHeaders.set(h, val);
    });

    const response = new NextResponse(data, {
      status: res.status,
      headers: responseHeaders,
    });

    if (res.ok && SESSION_RESPONSE_PATHS.has(backendPath)) {
      try {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const session = readAuthSessionEnvelope(
            JSON.parse(new TextDecoder().decode(data)),
          );
          if (session) {
            const secure = process.env.NODE_ENV === 'production';
            response.cookies.set('accessToken', session.accessToken, {
              httpOnly: true,
              secure,
              sameSite: 'lax',
              path: '/',
              maxAge: session.expiresIn,
            });
            if (session.refreshToken) {
              response.cookies.set('refreshToken', session.refreshToken, {
                httpOnly: true,
                secure,
                sameSite: 'lax',
                path: '/',
                maxAge: 60 * 60 * 24 * 7,
              });
            }
          }
        }
      } catch {
        // Preserve the successful upstream response; malformed auth payloads
        // are rejected by the client contract and never become cookies.
      }
    }

    if (
      backendPath === '/auth/logout' ||
      (backendPath === '/auth/refresh' && !res.ok)
    ) {
      clearSessionCookies(response);
    }

    return response;
  } catch (error: unknown) {
    console.error('[PROXY ERROR]', error);
    const message = error instanceof Error ? error.message : 'Unknown proxy error';
    return Response.json(
      { message: 'Proxy Error', error: message },
      { status: 502 },
    );
  }
}

export async function GET(request: NextRequest) { return handler(request); }
export async function POST(request: NextRequest) { return handler(request); }
export async function PUT(request: NextRequest) { return handler(request); }
export async function PATCH(request: NextRequest) { return handler(request); }
export async function DELETE(request: NextRequest) { return handler(request); }
