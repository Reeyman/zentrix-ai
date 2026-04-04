import { NextRequest, NextResponse } from "next/server"
import { getWorkspaceIdFromHeaders, runWorkspaceReport, sendWorkspaceReportToReview } from '@/lib/server-app-data'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const workspaceId = getWorkspaceIdFromHeaders(request.headers.get('x-workspace-id') ?? undefined)
    const body = await request.json().catch(() => ({})) as { action?: string }

    const result = body.action === 'review'
      ? await sendWorkspaceReportToReview(params.id, workspaceId)
      : await runWorkspaceReport(params.id, workspaceId)

    const { report, event, message, ...data } = result

    return NextResponse.json({
      success: true,
      data,
      report,
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
