import { NextRequest } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://backend-fastify-nestjs-viora.vercel.app/v1';

export const dynamic = 'force-dynamic';

async function handler(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl;
    const backendPath = pathname.replace('/api/proxy', '');
    const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
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

    const data = await res.arrayBuffer();
    const responseHeaders = new Headers();
    const allowedHeaders = ['content-type', 'content-length', 'cache-control', 'etag', 'last-modified', 'x-request-id', 'x-ratelimit-remaining', 'x-ratelimit-limit'];
    allowedHeaders.forEach(h => {
      const val = res.headers.get(h);
      if (val) responseHeaders.set(h, val);
    });

    return new Response(data, {
      status: res.status,
      headers: responseHeaders,
    });
  } catch (error: any) {
    console.error('[PROXY ERROR]', error);
    return Response.json(
      { message: 'Proxy Error', error: error?.message },
      { status: 502 },
    );
  }
}

export async function GET(request: NextRequest) { return handler(request); }
export async function POST(request: NextRequest) { return handler(request); }
export async function PUT(request: NextRequest) { return handler(request); }
export async function PATCH(request: NextRequest) { return handler(request); }
export async function DELETE(request: NextRequest) { return handler(request); }
