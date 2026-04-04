import { NextRequest, NextResponse } from "next/server"
import { getWorkspaceIdFromHeaders, sendAnalyticsEntityToReview } from '@/lib/server-app-data'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type AnalyticsScope = 'channel' | 'campaign'

function isAnalyticsScope(value: string): value is AnalyticsScope {
  return value === 'channel' || value === 'campaign'
}

export async function POST(
  request: NextRequest,
  { params }: { params: { scope: string; id: string } },
) {
  try {
    if (!isAnalyticsScope(params.scope)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid analytics scope',
          timestamp: new Date().toISOString(),
        },
        { status: 400 },
      )
    }

    const workspaceId = getWorkspaceIdFromHeaders(request.headers.get('x-workspace-id') ?? undefined)
    const body = await request.json().catch(() => ({})) as { action?: string }

    if (body.action && body.action !== 'review') {
      return NextResponse.json(
        {
          success: false,
          error: 'Unsupported analytics action',
          timestamp: new Date().toISOString(),
        },
        { status: 400 },
      )
    }

    const result = await sendAnalyticsEntityToReview(params.scope, params.id, workspaceId)
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
