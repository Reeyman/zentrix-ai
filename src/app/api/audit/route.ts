import { NextRequest, NextResponse } from "next/server"
import { getWorkspaceIdFromHeaders, listAuditEvents } from '@/lib/server-app-data'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const workspaceId = getWorkspaceIdFromHeaders(request.headers.get('x-workspace-id') ?? undefined)
    const payload = await listAuditEvents(workspaceId)

    return NextResponse.json({
      success: true,
      data: payload.events,
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
