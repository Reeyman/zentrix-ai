import { NextRequest, NextResponse } from 'next/server'
import { createWorkspaceUserReminderPackage, getWorkspaceIdFromHeaders, queueWorkspaceUserAccessReview } from '@/lib/server-app-data'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const body = await request.json().catch(() => ({})) as { action?: string }

    if (body.action && body.action !== 'remind' && body.action !== 'review') {
      return NextResponse.json(
        {
          success: false,
          error: 'Unsupported user action',
          timestamp: new Date().toISOString(),
        },
        { status: 400 },
      )
    }

    const workspaceId = getWorkspaceIdFromHeaders(request.headers.get('x-workspace-id') ?? undefined)

    if (body.action === 'remind') {
      const result = await createWorkspaceUserReminderPackage(params.id, workspaceId)
      return NextResponse.json({
        success: true,
        data: {
          content: result.content,
          contentType: result.contentType,
          filename: result.filename,
          user: result.user,
        },
        event: result.event,
        message: result.message,
        workspace: result.currentWorkspace,
        workspaces: result.workspaces,
        currentUser: result.currentUser,
        mode: result.mode,
        timestamp: new Date().toISOString(),
      })
    }

    const result = await queueWorkspaceUserAccessReview(params.id, workspaceId)
    const { user, event, message, ...data } = result

    return NextResponse.json({
      success: true,
      data,
      user,
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
