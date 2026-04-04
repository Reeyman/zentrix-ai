import { NextResponse } from 'next/server'
import { clearSessionCookies } from '@/lib/auth-session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: 'Signed out successfully',
    timestamp: new Date().toISOString(),
  })

  clearSessionCookies(response)

  return response
}
