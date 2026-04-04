import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import {
  appendAuthenticatedUserHeaders,
  applySessionCookies,
  buildLoginRedirectUrl,
  clearAuthenticatedUserHeaders,
  clearSessionCookies,
  normalizeRedirectTarget,
  resolveUserFromRequest,
} from '@/lib/auth-session'
import { getSupabaseBrowserConfig } from '@/lib/runtime-config'
import { apiLimiter, authLimiter } from '@/lib/rate-limiter'

const LEGACY_ROUTE_REDIRECTS: Record<string, string> = {
  '/app/users': '/app/settings/users',
  '/app/roles': '/app/settings/roles',
  '/app/integrations': '/app/settings/integrations',
  '/app/audit': '/app/settings/audit',
  '/app/audit-log': '/app/settings/audit',
  '/app/billing': '/app/settings/billing',
}

const PUBLIC_API_ROUTES = new Set([
  '/api/health',
  '/api/auth/login',
  '/api/auth/signup',
  '/api/auth/logout',
])

function isProtectedAppRoute(pathname: string) {
  return pathname === '/app' || pathname.startsWith('/app/')
}

function isProtectedApiRoute(pathname: string) {
  return pathname.startsWith('/api/') && !PUBLIC_API_ROUTES.has(pathname)
}

function applyResponseHeaders(response: NextResponse, request: NextRequest) {
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  if (request.nextUrl.pathname.startsWith('/api/')) {
    const allowedOrigin = process.env.ALLOWED_ORIGIN?.trim() || request.nextUrl.origin
    response.headers.set('Access-Control-Allow-Origin', allowedOrigin)
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-workspace-id')
    
    // Apply rate limiting headers
    const isAuthRoute = request.nextUrl.pathname.startsWith('/api/auth/')
    const limiter = isAuthRoute ? authLimiter : apiLimiter
    const rateLimitHeaders = limiter.getRateLimitHeaders(request)
    
    Object.entries(rateLimitHeaders).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
  }
}

export async function middleware(req: NextRequest) {
  // Apply rate limiting to API routes
  if (req.nextUrl.pathname.startsWith('/api/')) {
    const isAuthRoute = req.nextUrl.pathname.startsWith('/api/auth/')
    const limiter = isAuthRoute ? authLimiter : apiLimiter
    
    if (!limiter.isAllowed(req)) {
      const response = NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded',
          timestamp: new Date().toISOString(),
        },
        { status: 429 }
      )
      applyResponseHeaders(response, req)
      response.headers.set('Retry-After', '60')
      return response
    }
  }

  const redirectTarget = LEGACY_ROUTE_REDIRECTS[req.nextUrl.pathname]

  if (redirectTarget) {
    const response = NextResponse.redirect(new URL(redirectTarget, req.url))
    applyResponseHeaders(response, req)
    return response
  }

  if (req.method === 'OPTIONS' && req.nextUrl.pathname.startsWith('/api/')) {
    const response = new NextResponse(null, { status: 204 })
    applyResponseHeaders(response, req)
    return response
  }

  const requestHeaders = new Headers(req.headers)
  const authConfigured = Boolean(getSupabaseBrowserConfig())

  if (!authConfigured) {
    clearAuthenticatedUserHeaders(requestHeaders)
    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
    applyResponseHeaders(response, req)
    return response
  }

  const { user, refreshedSession } = await resolveUserFromRequest(req)

  if (user) {
    appendAuthenticatedUserHeaders(requestHeaders, user)
  } else {
    clearAuthenticatedUserHeaders(requestHeaders)
  }

  if (user && req.nextUrl.pathname === '/login') {
    const redirectPath = normalizeRedirectTarget(req.nextUrl.searchParams.get('redirectTo'))
    const response = NextResponse.redirect(new URL(redirectPath, req.url))

    if (refreshedSession) {
      applySessionCookies(response, refreshedSession)
    }

    applyResponseHeaders(response, req)
    return response
  }

  if (!user && isProtectedAppRoute(req.nextUrl.pathname)) {
    const response = NextResponse.redirect(buildLoginRedirectUrl(req))
    clearSessionCookies(response)
    applyResponseHeaders(response, req)
    return response
  }

  if (!user && isProtectedApiRoute(req.nextUrl.pathname)) {
    const response = NextResponse.json(
      {
        success: false,
        error: 'Authentication required',
        timestamp: new Date().toISOString(),
      },
      { status: 401 },
    )
    clearSessionCookies(response)
    applyResponseHeaders(response, req)
    return response
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  if (refreshedSession) {
    applySessionCookies(response, refreshedSession)
  }

  applyResponseHeaders(response, req)
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}
