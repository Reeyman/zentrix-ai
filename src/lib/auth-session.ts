import { createClient, type Session, type User } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseBrowserConfig } from '@/lib/runtime-config'

export const ACCESS_TOKEN_COOKIE_NAME = 'adai-access-token'
export const REFRESH_TOKEN_COOKIE_NAME = 'adai-refresh-token'
export const AUTH_USER_ID_HEADER = 'x-authenticated-user-id'
export const AUTH_USER_EMAIL_HEADER = 'x-authenticated-user-email'

const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7

export type AuthenticatedRequestUser = {
  id: string
  email: string | null
}

function createSupabaseAuthClient() {
  const config = getSupabaseBrowserConfig()

  if (!config) {
    return null
  }

  return createClient(config.url, config.anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

function createCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  }
}

export function applySessionCookies(response: NextResponse, session: Session) {
  response.cookies.set(
    ACCESS_TOKEN_COOKIE_NAME,
    session.access_token,
    createCookieOptions(Math.max(session.expires_in ?? AUTH_COOKIE_MAX_AGE_SECONDS, 60)),
  )
  response.cookies.set(
    REFRESH_TOKEN_COOKIE_NAME,
    session.refresh_token,
    createCookieOptions(AUTH_COOKIE_MAX_AGE_SECONDS),
  )
}

export function clearSessionCookies(response: NextResponse) {
  response.cookies.set(ACCESS_TOKEN_COOKIE_NAME, '', createCookieOptions(0))
  response.cookies.set(REFRESH_TOKEN_COOKIE_NAME, '', createCookieOptions(0))
}

export async function resolveUserFromAccessToken(accessToken?: string | null) {
  if (!accessToken) {
    return null
  }

  const supabase = createSupabaseAuthClient()

  if (!supabase) {
    return null
  }

  const { data, error } = await supabase.auth.getUser(accessToken)

  if (error || !data.user) {
    return null
  }

  return data.user
}

export async function resolveUserFromRequestTokens(accessToken?: string | null, refreshToken?: string | null) {
  const directUser = await resolveUserFromAccessToken(accessToken)

  if (directUser) {
    return {
      user: directUser,
      refreshedSession: null as Session | null,
    }
  }

  if (!refreshToken) {
    return {
      user: null,
      refreshedSession: null as Session | null,
    }
  }

  const supabase = createSupabaseAuthClient()

  if (!supabase) {
    return {
      user: null,
      refreshedSession: null as Session | null,
    }
  }

  const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken })

  if (error || !data.session || !data.user) {
    return {
      user: null,
      refreshedSession: null as Session | null,
    }
  }

  return {
    user: data.user,
    refreshedSession: data.session,
  }
}

export async function resolveUserFromRequest(request: NextRequest) {
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE_NAME)?.value ?? null
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE_NAME)?.value ?? null

  return resolveUserFromRequestTokens(accessToken, refreshToken)
}

export function appendAuthenticatedUserHeaders(requestHeaders: Headers, user: User) {
  requestHeaders.set(AUTH_USER_ID_HEADER, user.id)
  requestHeaders.set(AUTH_USER_EMAIL_HEADER, user.email ?? '')
}

export function clearAuthenticatedUserHeaders(requestHeaders: Headers) {
  requestHeaders.delete(AUTH_USER_ID_HEADER)
  requestHeaders.delete(AUTH_USER_EMAIL_HEADER)
}

export function getAuthenticatedUserFromHeaders(headerStore: Pick<Headers, 'get'>): AuthenticatedRequestUser | null {
  const userId = headerStore.get(AUTH_USER_ID_HEADER)

  if (!userId) {
    return null
  }

  return {
    id: userId,
    email: headerStore.get(AUTH_USER_EMAIL_HEADER),
  }
}

export function normalizeRedirectTarget(value?: string | null) {
  const candidate = value?.trim()

  if (!candidate || !candidate.startsWith('/') || candidate.startsWith('//')) {
    return '/app/overview'
  }

  return candidate
}

export function buildLoginRedirectUrl(request: NextRequest) {
  const url = new URL('/login', request.url)
  const redirectTarget = `${request.nextUrl.pathname}${request.nextUrl.search}`

  if (redirectTarget && redirectTarget !== '/login') {
    url.searchParams.set('redirectTo', redirectTarget)
  }

  return url
}
