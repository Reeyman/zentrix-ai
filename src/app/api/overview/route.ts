import { NextRequest, NextResponse } from "next/server"
import { createInternalApiErrorResponse } from '@/lib/api-utils'
import { getWorkspaceIdFromHeaders, listCampaigns, listWorkspaceUsers } from '@/lib/server-app-data'
import type { WorkspaceOverviewPayload } from '@/types/app-models'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const workspaceId = getWorkspaceIdFromHeaders(request.headers.get('x-workspace-id') ?? undefined)
    const [campaignPayload, userPayload] = await Promise.all([
      listCampaigns(workspaceId),
      listWorkspaceUsers(workspaceId),
    ])

    const payload: WorkspaceOverviewPayload = {
      mode: campaignPayload.mode,
      currentWorkspace: campaignPayload.currentWorkspace,
      workspaces: campaignPayload.workspaces,
      currentUser: campaignPayload.currentUser,
      campaigns: campaignPayload.campaigns,
      users: userPayload.users,
    }

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
    return createInternalApiErrorResponse(error, 'Failed to load overview data')
  }
}
