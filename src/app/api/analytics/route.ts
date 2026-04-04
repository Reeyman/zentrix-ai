import { NextRequest, NextResponse } from "next/server"
import { getAnalyticsSnapshot, getWorkspaceIdFromHeaders } from '@/lib/server-app-data'
import type { WorkspaceAnalyticsPayload } from '@/types/app-models'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const workspaceId = getWorkspaceIdFromHeaders(request.headers.get('x-workspace-id') ?? undefined)
    const payload: WorkspaceAnalyticsPayload = await getAnalyticsSnapshot(workspaceId)

    return NextResponse.json({
      success: true,
      data: payload,
      workspace: payload.currentWorkspace,
      workspaces: payload.workspaces,
      currentUser: payload.currentUser,
      mode: payload.mode,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
