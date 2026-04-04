import { NextRequest, NextResponse } from 'next/server'
import { createInternalApiErrorResponse } from '@/lib/api-utils'
import { getWorkspaceIdFromHeaders, resolveWorkspacePayload } from '@/lib/server-app-data'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseAdminConfig } from '@/lib/runtime-config'

function createAdminClient() {
  const supabaseConfig = getSupabaseAdminConfig()
  if (!supabaseConfig) return null
  return createClient(supabaseConfig.url, supabaseConfig.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/settings - List settings with activity and KPIs
export async function GET(request: NextRequest) {
  try {
    const workspaceId = getWorkspaceIdFromHeaders(request.headers.get('x-workspace-id') ?? undefined)
    const workspace = await resolveWorkspacePayload(workspaceId)
    const supabase = createAdminClient()

    if (!supabase || workspace.mode !== 'connected') {
      return NextResponse.json({
        success: true,
        data: {
          mode: 'demo',
          recentChanges: [
            {
              id: 'demo-change-1',
              action: 'update',
              resourceType: 'user',
              resourceName: 'John Doe',
              details: { field: 'role', oldValue: 'member', newValue: 'admin' },
              user: { name: 'Admin User', email: 'admin@example.com' },
              createdAt: new Date('2024-03-12T10:30:00Z')
            },
            {
              id: 'demo-change-2',
              action: 'create',
              resourceType: 'role',
              resourceName: 'Campaign Manager',
              details: { permissions: ['campaigns.read', 'campaigns.write'] },
              user: { name: 'Admin User', email: 'admin@example.com' },
              createdAt: new Date('2024-03-11T14:22:00Z')
            },
            {
              id: 'demo-change-3',
              action: 'configure',
              resourceType: 'integration',
              resourceName: 'Google Analytics',
              details: { status: 'connected', accountId: 'ga-12345' },
              user: { name: 'Sarah Smith', email: 'sarah@example.com' },
              createdAt: new Date('2024-03-10T09:15:00Z')
            }
          ],
          kpis: {
            totalChanges: 3,
            changesToday: 1,
            changesThisWeek: 3,
            activeAdmins: 2,
            totalIntegrations: 5,
            connectedIntegrations: 4,
            pendingApprovals: 2
          }
        }
      })
    }

    // Fetch recent settings activity
    const { data: activity, error: activityError } = await supabase
      .from('settings_activity')
      .select(`
        *,
        auth_users(name, email)
      `)
      .eq('organization_id', workspace.currentWorkspace.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (activityError) {
      console.error('Error fetching settings activity:', activityError)
      return createInternalApiErrorResponse('Failed to fetch settings activity')
    }

    // Fetch integration status
    const { data: integrations, error: integrationsError } = await supabase
      .from('integration_status')
      .select('*')
      .eq('organization_id', workspace.currentWorkspace.id)

    if (integrationsError) {
      console.error('Error fetching integrations:', integrationsError)
      return createInternalApiErrorResponse('Failed to fetch integrations')
    }

    // Fetch system settings KPIs
    const { data: settings, error: settingsError } = await supabase
      .from('system_settings')
      .select('category')
      .eq('organization_id', workspace.currentWorkspace.id)

    if (settingsError) {
      console.error('Error fetching settings:', settingsError)
      return createInternalApiErrorResponse('Failed to fetch settings')
    }

    // Calculate KPIs
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const recentChanges = (activity || []).map(item => ({
      id: item.id,
      action: item.action,
      resourceType: item.resource_type,
      resourceName: item.resource_name,
      details: item.details,
      user: {
        name: item.auth_users?.name || 'Unknown',
        email: item.auth_users?.email || 'unknown@example.com'
      },
      createdAt: item.created_at
    }))

    const changesToday = recentChanges.filter(change => 
      new Date(change.createdAt) >= today
    ).length

    const changesThisWeek = recentChanges.filter(change => 
      new Date(change.createdAt) >= weekAgo
    ).length

    const totalIntegrations = integrations?.length || 0
    const connectedIntegrations = integrations?.filter(i => i.status === 'connected').length || 0

    const kpis = {
      totalChanges: recentChanges.length,
      changesToday,
      changesThisWeek,
      activeAdmins: workspace.workspaces.filter(w => w.role === 'owner').length,
      totalIntegrations,
      connectedIntegrations,
      pendingApprovals: 2 // This would come from roles/approvals in a real implementation
    }

    return NextResponse.json({
      success: true,
      data: {
        mode: 'connected',
        recentChanges,
        kpis
      }
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
