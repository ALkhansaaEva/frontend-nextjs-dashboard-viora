import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://backend-fastify-nestjs-viora.vercel.app/v1';

/**
 * Auth token refresh helper
 */
async function refreshAuthToken(request: NextRequest): Promise<{ accessToken: string; refreshToken: string } | null> {
  try {
    // Try to get refresh token from multiple sources
    let refreshToken = request.cookies.get('refreshToken')?.value;
    
    // Check custom header (sent by frontend from localStorage)
    if (!refreshToken) {
      refreshToken = request.headers.get('x-refresh-token') || undefined;
    }
    
    // Also check Authorization header for refresh token (sent by frontend for manual refresh)
    if (!refreshToken) {
      const authHeader = request.headers.get('Authorization');
      if (authHeader?.startsWith('Refresh ')) {
        refreshToken = authHeader.replace('Refresh ', '');
      }
    }

    if (!refreshToken) {
      console.log('[AUTH] No refresh token found');
      return null;
    }

    const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
    const refreshUrl = `${baseUrl}/auth/refresh`;

    console.log('[AUTH] Attempting token refresh...');

    const refreshResponse = await fetch(refreshUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!refreshResponse.ok) {
      console.log('[AUTH] Refresh failed:', refreshResponse.status);
      return null;
    }

    const refreshData = await refreshResponse.json();
    const tokens = refreshData.data || refreshData;
    
    if (tokens.accessToken) {
      console.log('[AUTH] Token refreshed successfully');
      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken || refreshToken,
      };
    }

    return null;
  } catch (error) {
    console.error('[AUTH] Refresh error:', error);
    return null;
  }
}

/**
 * Build response with new auth cookie
 */
function setAuthCookies(response: NextResponse, accessToken: string, refreshToken?: string): NextResponse {
  response.cookies.set('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });

  if (refreshToken) {
    response.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });
  }

  return response;
}

/**
 * Robust proxy handler for Next.js Route Handlers
 * Includes automatic token refresh on 401
 */
export async function proxyRequest(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  let targetUrl = '';
  let response: Response;
  let attempts = 0;
  const MAX_ATTEMPTS = 2;

  let bodyString: string | null = null;
  if (!['GET', 'HEAD', 'DELETE', 'OPTIONS'].includes(request.method)) {
    bodyString = await request.text();
  }

  while (attempts < MAX_ATTEMPTS) {
    attempts++;
    targetUrl = '';
    
    try {
      const { path } = params;
      const pathStr = Array.isArray(path) ? path.join('/') : path;
      const search = request.nextUrl.search;
      
      const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
      const cleanPath = pathStr.startsWith('/') ? pathStr.slice(1) : pathStr;
      targetUrl = `${baseUrl}/${cleanPath}${search}`;

      console.log(`[PROXY] ${request.method} ${request.nextUrl.pathname} -> ${targetUrl} (attempt ${attempts})`);

      // Clone headers and filter out restricted ones
      const headers = new Headers();
      request.headers.forEach((value, key) => {
        if (!['host', 'connection', 'content-length', 'cookie', 'accept-encoding'].includes(key.toLowerCase())) {
          headers.set(key, value);
        }
      });

      // Add access token from cookie if exists
      const accessToken = request.cookies.get('accessToken')?.value;
      if (accessToken) {
        headers.set('Authorization', `Bearer ${accessToken}`);
      }

      // Ensure Content-Type is set
      if (!headers.has('Content-Type') && !['GET', 'HEAD', 'DELETE'].includes(request.method)) {
        headers.set('Content-Type', 'application/json');
      }

      const fetchOptions: RequestInit = {
        method: request.method,
        headers: headers,
        cache: 'no-store',
      };

      // Forward body
      if (bodyString) {
        fetchOptions.body = bodyString;
      }

      response = await fetch(targetUrl, fetchOptions);

      // If 401 and this is first attempt, try to refresh token
      if (response.status === 401 && attempts === 1 && !request.nextUrl.pathname.includes('/auth/')) {
        console.log('[PROXY] Got 401, attempting token refresh...');
        
        const newTokens = await refreshAuthToken(request);
        
        if (newTokens) {
          console.log('[PROXY] Token refreshed, retrying request...');
          
          // Create new request with new token
          const newHeaders = new Headers();
          request.headers.forEach((value, key) => {
            if (!['host', 'connection', 'content-length', 'cookie', 'accept-encoding'].includes(key.toLowerCase())) {
              newHeaders.set(key, value);
            }
          });
          newHeaders.set('Authorization', `Bearer ${newTokens.accessToken}`);

          const retryOptions: RequestInit = {
            method: request.method,
            headers: newHeaders,
            cache: 'no-store',
          };

          if (bodyString) {
            retryOptions.body = bodyString;
          }

          response = await fetch(targetUrl, retryOptions);

          // If retry succeeded (2xx), set new cookies
          if (response.ok) {
            const successResponse = new NextResponse(response.body, {
              status: response.status,
            });
            
            response.headers.forEach((value, key) => {
              if (!['content-encoding', 'transfer-encoding', 'connection'].includes(key.toLowerCase())) {
                successResponse.headers.set(key, value);
              }
            });
            
            return setAuthCookies(successResponse, newTokens.accessToken, newTokens.refreshToken);
          }
        } else {
          console.log('[PROXY] Token refresh failed, returning 401');
        }
      }

      const bodyText = await response.text();
      const proxyHeaders = new Headers();
      response.headers.forEach((value, key) => {
        if (!['content-encoding', 'transfer-encoding', 'content-type', 'connection', 'vary'].includes(key.toLowerCase())) {
          proxyHeaders.set(key, value);
        }
      });

      try {
        const json = JSON.parse(bodyText);
        return NextResponse.json(json, {
          status: response.status,
          headers: proxyHeaders,
        });
      } catch {
        return new NextResponse(bodyText, {
          status: response.status,
          headers: { 'Content-Type': response.headers.get('Content-Type') || 'text/plain', ...Object.fromEntries(proxyHeaders) },
        });
      }
    } catch (error: any) {
      console.error(`[PROXY ERROR] ${request.method} failed:`, error);
      
      // Only retry on network errors, not on HTTP errors
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        console.log('[PROXY] Network error, last attempt:', attempts === MAX_ATTEMPTS);
        if (attempts === MAX_ATTEMPTS) {
          return NextResponse.json(
            { message: 'Network error. Please check your connection.', error: error.message },
            { status: 502 }
          );
        }
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }
      
      return NextResponse.json(
        { 
          message: 'Proxy Error', 
          error: error.message,
          path: request.nextUrl.pathname
        }, 
        { status: 502 }
      );
    }
  }

  // Fallback if all attempts failed
  return NextResponse.json(
    { message: 'Request failed after multiple attempts' },
    { status: 500 }
  );
}

/**
 * Handle OPTIONS requests for CORS
 */
export function handleOptions() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Cookie',
      'Access-Control-Max-Age': '86400',
    },
  });
}