import { NextRequest, NextResponse } from "next/server"
import { exportWorkspaceAnalytics, getWorkspaceIdFromHeaders } from '@/lib/server-app-data'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type AnalyticsScope = 'channel' | 'campaign'

function isAnalyticsScope(value: string): value is AnalyticsScope {
  return value === 'channel' || value === 'campaign'
}

export async function GET(request: NextRequest) {
  try {
    const workspaceId = getWorkspaceIdFromHeaders(request.headers.get('x-workspace-id') ?? undefined)
    const scopeParam = request.nextUrl.searchParams.get('scope')
    const entityId = request.nextUrl.searchParams.get('entityId') ?? undefined

    if (scopeParam && !isAnalyticsScope(scopeParam)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid analytics scope',
          timestamp: new Date().toISOString(),
        },
        { status: 400 },
      )
    }

    const scope: AnalyticsScope | undefined = scopeParam && isAnalyticsScope(scopeParam) ? scopeParam : undefined
    const result = await exportWorkspaceAnalytics(workspaceId, scope, entityId)
    const { content, contentType, filename, message, ...data } = result

    return NextResponse.json({
      success: true,
      data,
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

export async function POST(request: NextRequest) {
  try {
    const workspaceId = getWorkspaceIdFromHeaders(request.headers.get('x-workspace-id') ?? undefined)
    const body = await request.json().catch(() => ({})) as { scope?: string; entityId?: string }
    
    const scopeParam = body.scope
    const entityId = body.entityId ?? undefined

    if (scopeParam && !isAnalyticsScope(scopeParam)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid analytics scope',
          timestamp: new Date().toISOString(),
        },
        { status: 400 },
      )
    }

    const scope: AnalyticsScope | undefined = scopeParam && isAnalyticsScope(scopeParam) ? scopeParam : undefined
    const result = await exportWorkspaceAnalytics(workspaceId, scope, entityId)
    const { content, contentType, filename, message, ...data } = result

    return NextResponse.json({
      success: true,
      data,
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
