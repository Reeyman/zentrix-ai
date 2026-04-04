import { NextRequest, NextResponse } from 'next/server'
import { flagWorkspaceAuditEventForReview, getWorkspaceIdFromHeaders } from '@/lib/server-app-data'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const body = await request.json().catch(() => ({})) as { action?: string }

    if (body.action && body.action !== 'review') {
      return NextResponse.json(
        {
          success: false,
          error: 'Unsupported audit action',
          timestamp: new Date().toISOString(),
        },
        { status: 400 },
      )
    }

    const workspaceId = getWorkspaceIdFromHeaders(request.headers.get('x-workspace-id') ?? undefined)
    const result = await flagWorkspaceAuditEventForReview(params.id, workspaceId)
    const { event, message, ...data } = result

    return NextResponse.json({
      success: true,
      data,
      event,
      message,
      workspace: data.currentWorkspace,
      workspaces: data.workspaces,
      currentUser: data.currentUser,
      mode: data.mode,
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
