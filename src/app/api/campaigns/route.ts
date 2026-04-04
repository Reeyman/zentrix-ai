import { NextRequest, NextResponse } from "next/server"
import { createInternalApiErrorResponse } from '@/lib/api-utils'
import { createCampaign, getWorkspaceIdFromHeaders, listCampaigns } from '@/lib/server-app-data'
import { logApiError, recordApiResponseTime, recordApiError } from '@/lib/monitoring'
import type { CampaignChannel, CampaignStatus } from '@/types/app-models'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isCampaignStatus(value: unknown): value is CampaignStatus {
  return value === 'draft' || value === 'active' || value === 'paused' || value === 'completed' || value === 'cancelled'
}

function isCampaignChannel(value: unknown): value is CampaignChannel {
  return value === 'Search' || value === 'Display' || value === 'Social' || value === 'Video' || value === 'Programmatic'
}

// GET /api/campaigns - List campaigns
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const workspaceId = getWorkspaceIdFromHeaders(request.headers.get('x-workspace-id') ?? undefined)
    const payload = await listCampaigns(workspaceId)

    recordApiResponseTime(Date.now() - startTime, { endpoint: 'campaigns', method: 'GET' });

    return NextResponse.json({
      success: true,
      data: payload.campaigns,
      workspace: payload.currentWorkspace,
      workspaces: payload.workspaces,
      currentUser: payload.currentUser,
      mode: payload.mode,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    recordApiError({ endpoint: 'campaigns', method: 'GET' });
    logApiError(error, { url: request.url, workspaceId: request.headers.get('x-workspace-id') ?? undefined });
    return createInternalApiErrorResponse(error, 'Failed to load campaigns')
  }
}

// POST /api/campaigns - Create campaign
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json({
        success: false,
        error: "Campaign name is required",
        timestamp: new Date().toISOString()
      }, { status: 400 })
    }

    const budget = body.budget === undefined || body.budget === '' ? 0 : Number(body.budget)
    if (!Number.isFinite(budget) || budget < 0) {
      return NextResponse.json({
        success: false,
        error: 'Campaign budget must be a positive number',
        timestamp: new Date().toISOString()
      }, { status: 400 })
    }

    if (body.status !== undefined && !isCampaignStatus(body.status)) {
      return NextResponse.json({
        success: false,
        error: 'Campaign status is invalid',
        timestamp: new Date().toISOString()
      }, { status: 400 })
    }

    if (body.channel !== undefined && !isCampaignChannel(body.channel)) {
      return NextResponse.json({
        success: false,
        error: 'Campaign channel is invalid',
        timestamp: new Date().toISOString()
      }, { status: 400 })
    }

    if (body.startDate && body.endDate && new Date(body.endDate) < new Date(body.startDate)) {
      return NextResponse.json({
        success: false,
        error: 'End date must be after start date',
        timestamp: new Date().toISOString()
      }, { status: 400 })
    }

    const workspaceId = getWorkspaceIdFromHeaders(request.headers.get('x-workspace-id') ?? undefined)
    const payload = await createCampaign({
      name: body.name,
      description: typeof body.description === 'string' ? body.description : undefined,
      budget,
      status: body.status,
      channel: body.channel,
      startDate: typeof body.startDate === 'string' ? body.startDate : undefined,
      endDate: typeof body.endDate === 'string' ? body.endDate : undefined,
    }, workspaceId)

    return NextResponse.json({
      success: true,
      data: payload.campaign,
      workspace: payload.currentWorkspace,
      mode: payload.mode,
      message: "Campaign created successfully",
      timestamp: new Date().toISOString()
    }, { status: 201 })
  } catch (error: any) {
    return createInternalApiErrorResponse(error, 'Failed to create campaign')
  }
}
