import { NextRequest, NextResponse } from "next/server"
import { exportWorkspaceReports, getWorkspaceIdFromHeaders } from '@/lib/server-app-data'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const workspaceId = getWorkspaceIdFromHeaders(request.headers.get('x-workspace-id') ?? undefined)
    const reportId = request.nextUrl.searchParams.get('reportId') ?? undefined
    const result = await exportWorkspaceReports(workspaceId, reportId)
    const { report, content, contentType, filename, message, ...data } = result

    return NextResponse.json({
      success: true,
      data,
      report,
      content,
      contentType,
      filename,
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
