import { NextRequest, NextResponse } from 'next/server'
import { createInternalApiErrorResponse } from '@/lib/api-utils'
import { getWorkspaceIdFromHeaders, resolveWorkspacePayload } from '@/lib/server-app-data'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const workspaceId = getWorkspaceIdFromHeaders(request.headers.get('x-workspace-id') ?? undefined)
    const payload = await resolveWorkspacePayload(workspaceId)

    return NextResponse.json({
      success: true,
      data: payload,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    return createInternalApiErrorResponse(error, 'Failed to load workspace context')
  }
}
