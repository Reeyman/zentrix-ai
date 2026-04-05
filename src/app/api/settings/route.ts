import { NextRequest, NextResponse } from 'next/server'
import { createInternalApiErrorResponse } from '@/lib/api-utils'
import {
  getWorkspaceIdFromHeaders,
  listSettingsActivity,
  listWorkspaceIntegrations,
  listWorkspaceRoles,
  resolveWorkspacePayload,
} from '@/lib/server-app-data'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseAdminConfig } from '@/lib/runtime-config'

function createAdminClient() {
  const supabaseConfig = getSupabaseAdminConfig()
  if (!supabaseConfig) return null
  return createClient(supabaseConfig.url, supabaseConfig.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function buildSettingsKpis(
  recentChanges: Array<{ createdAt: string | Date }>,
  activeAdmins: number,
  integrations: Array<{ status: string }>,
  approvals: Array<{ status: string }>,
) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const changesToday = recentChanges.filter((change) =>
    new Date(change.createdAt) >= today,
  ).length

  const changesThisWeek = recentChanges.filter((change) =>
    new Date(change.createdAt) >= weekAgo,
  ).length

  const totalIntegrations = integrations.length
  const connectedIntegrations = integrations.filter((integration) => {
    const status = integration.status.toLowerCase()
    return status === 'healthy' || status === 'connected' || status === 'active'
  }).length

  const pendingApprovals = approvals.filter((approval) => {
    const status = approval.status.toLowerCase()
    return status === 'pending' || status === 'open'
  }).length

  return {
    totalChanges: recentChanges.length,
    changesToday,
    changesThisWeek,
    activeAdmins,
    totalIntegrations,
    connectedIntegrations,
    pendingApprovals,
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/settings - List settings with activity and KPIs
export async function GET(request: NextRequest) {
  try {
    const workspaceId = getWorkspaceIdFromHeaders(request.headers.get('x-workspace-id') ?? undefined)
    const workspace = await resolveWorkspacePayload(workspaceId)

    const activityPayload = await listSettingsActivity(workspaceId)

    let integrations: Array<{ status: string }> = []

    try {
      const integrationsPayload = await listWorkspaceIntegrations(workspaceId)
      integrations = integrationsPayload.integrations
    } catch (error) {
      console.error('Error fetching integrations:', error)
    }

    let approvals: Array<{ status: string }> = []

    try {
      const rolesPayload = await listWorkspaceRoles(workspaceId)
      approvals = rolesPayload.approvals
    } catch (error) {
      console.error('Error fetching settings:', error)
    }

    const recentChanges = activityPayload.recentChanges.map((change) => ({
      ...change,
      status: 'Applied',
      module: change.resourceType,
      time: String(change.createdAt),
      actor: change.user.name,
    }))
    const kpis = buildSettingsKpis(
      recentChanges,
      workspace.workspaces.filter((item) => item.role === 'owner').length,
      integrations,
      approvals,
    )

    return NextResponse.json({
      success: true,
      data: {
        mode: workspace.mode,
        recentChanges,
        kpis,
      },
    })
  } catch (error) {
    console.error('Error in settings GET:', error)
    return createInternalApiErrorResponse('Internal server error')
  }
}

// POST /api/settings - Update settings or log activity
export async function POST(request: NextRequest) {
  try {
    const workspaceId = getWorkspaceIdFromHeaders(request.headers.get('x-workspace-id') ?? undefined)
    const workspace = await resolveWorkspacePayload(workspaceId)
    const supabase = createAdminClient()
    const body = await request.json()

    const { action, resourceType, resourceName, details } = body

    if (!action || !resourceType) {
      return createInternalApiErrorResponse('Action and resourceType are required')
    }

    if (workspace.mode !== 'connected') {
      return createInternalApiErrorResponse('Settings updates require connected mode')
    }

    // Log the activity
    const { data: activity, error: activityError } = await supabase
      .from('settings_activity')
      .insert({
        organization_id: workspace.currentWorkspace.id,
        user_id: workspace.currentUser.id,
        action,
        resource_type: resourceType,
        resource_name: resourceName,
        details: details || {}
      })
      .select()
      .single()

    if (activityError) {
      console.error('Error logging settings activity:', activityError)
      return createInternalApiErrorResponse('Failed to log activity')
    }

    return NextResponse.json({
      success: true,
      data: {
        id: activity.id,
        action: activity.action,
        resourceType: activity.resource_type,
        resourceName: activity.resource_name,
        details: activity.details,
        createdAt: activity.created_at
      }
    })
  } catch (error) {
    console.error('Error in settings POST:', error)
    return createInternalApiErrorResponse('Internal server error')
  }
}
