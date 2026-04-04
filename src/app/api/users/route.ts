import { NextRequest, NextResponse } from "next/server"
import { createInternalApiErrorResponse } from '@/lib/api-utils'
import { getWorkspaceIdFromHeaders, listWorkspaceUsers } from '@/lib/server-app-data'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const workspaceId = getWorkspaceIdFromHeaders(request.headers.get('x-workspace-id') ?? undefined)
    const payload = await listWorkspaceUsers(workspaceId)

    return NextResponse.json({
      success: true,
      data: payload.users,
      workspace: payload.currentWorkspace,
      workspaces: payload.workspaces,
      currentUser: payload.currentUser,
      mode: payload.mode,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    return createInternalApiErrorResponse(error, 'Failed to load users')
  }
}
