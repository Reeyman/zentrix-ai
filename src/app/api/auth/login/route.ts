import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { applySessionCookies } from '@/lib/auth-session'
import { getSupabaseBrowserConfig } from '@/lib/runtime-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const supabaseConfig = getSupabaseBrowserConfig()

    if (!supabaseConfig) {
      return NextResponse.json(
        { error: 'Supabase authentication is not configured' },
        { status: 503 }
      )
    }

    const supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      )
    }

    if (!data.session || !data.user) {
      return NextResponse.json(
        { error: 'Authentication succeeded but no session was returned' },
        { status: 401 }
      )
    }

    const response = NextResponse.json({
      success: true,
      data: {
        user: {
          id: data.user.id,
          email: data.user.email ?? null,
        },
        session: {
          expiresAt: data.session.expires_at ?? null,
        },
      },
      message: 'Signed in successfully',
      timestamp: new Date().toISOString(),
    })

    applySessionCookies(response, data.session)

    return response

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
