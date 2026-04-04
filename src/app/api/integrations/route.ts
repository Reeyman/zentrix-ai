import { NextRequest, NextResponse } from 'next/server'
import { createWorkspaceIntegration, getWorkspaceIdFromHeaders, listWorkspaceIntegrations } from '@/lib/server-app-data'
import type { WorkspaceIntegrationsPayload } from '@/types/app-models'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const workspaceId = getWorkspaceIdFromHeaders(request.headers.get('x-workspace-id') ?? undefined)
    const payload: WorkspaceIntegrationsPayload = await listWorkspaceIntegrations(workspaceId)

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Integration name is required',
          timestamp: new Date().toISOString(),
        },
        { status: 400 },
      )
    }

    if (!body.type || typeof body.type !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Integration type is required',
          timestamp: new Date().toISOString(),
        },
        { status: 400 },
      )
    }

    const workspaceId = getWorkspaceIdFromHeaders(request.headers.get('x-workspace-id') ?? undefined)
    const payload = await createWorkspaceIntegration(
      {
        name: body.name,
        type: body.type,
        status: typeof body.status === 'string' ? body.status : 'Healthy',
      },
      workspaceId,
    )

    return NextResponse.json(
      {
        success: true,
        data: payload,
        workspace: payload.currentWorkspace,
        mode: payload.mode,
        message: payload.message,
        timestamp: new Date().toISOString(),
      },
      { status: 201 },
    )
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
