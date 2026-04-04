import { NextRequest, NextResponse } from "next/server"
import { deleteCampaign, getCampaignById, getWorkspaceIdFromHeaders, updateCampaign } from '@/lib/server-app-data'
import type { CampaignChannel, CampaignStatus } from '@/types/app-models'

function isCampaignStatus(value: unknown): value is CampaignStatus {
  return value === 'draft' || value === 'active' || value === 'paused' || value === 'completed' || value === 'cancelled'
}

function isCampaignChannel(value: unknown): value is CampaignChannel {
  return value === 'Search' || value === 'Display' || value === 'Social' || value === 'Video' || value === 'Programmatic'
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const workspaceId = getWorkspaceIdFromHeaders(request.headers.get('x-workspace-id') ?? undefined)
    const payload = await getCampaignById(id, workspaceId)

    if (!payload.campaign) {
      return NextResponse.json({ success: false, error: "Campaign not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: payload.campaign, workspace: payload.currentWorkspace, mode: payload.mode })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    if (body.status !== undefined && !isCampaignStatus(body.status)) {
      return NextResponse.json({ success: false, error: 'Campaign status is invalid' }, { status: 400 })
    }

    if (body.channel !== undefined && !isCampaignChannel(body.channel)) {
      return NextResponse.json({ success: false, error: 'Campaign channel is invalid' }, { status: 400 })
    }

    const workspaceId = getWorkspaceIdFromHeaders(request.headers.get('x-workspace-id') ?? undefined)
    const payload = await updateCampaign(id, {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.budget !== undefined ? { budget: Number(body.budget) } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
      ...(body.channel !== undefined ? { channel: body.channel } : {}),
      ...(body.startDate !== undefined ? { startDate: body.startDate } : {}),
      ...(body.endDate !== undefined ? { endDate: body.endDate } : {}),
      ...(body.spend !== undefined ? { spend: Number(body.spend) } : {}),
      ...(body.roas !== undefined ? { roas: Number(body.roas) } : {}),
    }, workspaceId)

    if (!payload.campaign) {
      return NextResponse.json({ success: false, error: 'Campaign not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: payload.campaign, workspace: payload.currentWorkspace, mode: payload.mode })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const workspaceId = getWorkspaceIdFromHeaders(request.headers.get('x-workspace-id') ?? undefined)
    const payload = await deleteCampaign(id, workspaceId)

    if (!payload.success) {
      return NextResponse.json({ success: false, error: 'Campaign not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, workspace: payload.currentWorkspace, mode: payload.mode })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
