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

// GET /api/audiences - List audiences with KPIs
export async function GET(request: NextRequest) {
  try {
    const workspaceId = getWorkspaceIdFromHeaders(request.headers.get('x-workspace-id') ?? undefined)
    const supabase = createAdminClient()

    // Try to resolve workspace, but fall back to demo mode if authentication fails
    let workspace;
    try {
      workspace = await resolveWorkspacePayload(workspaceId)
    } catch (error) {
      // If authentication fails, fall back to demo mode
      if (error instanceof Error && error.message.includes('Authentication required')) {
        workspace = { mode: 'demo' } as any
      } else {
        throw error
      }
    }

    if (!supabase || workspace.mode !== 'connected') {
      return NextResponse.json({
        success: true,
        data: {
          mode: 'demo',
          audiences: [
          {
            id: 'demo-audience-1',
            name: 'High-Value Customers',
            description: 'Customers with lifetime value > $1000',
            status: 'active',
            size: 12500,
            performance: {
              impressions: 245000,
              clicks: 8900,
              conversions: 234,
              spend: 4567.89,
              ctr: 3.63,
              cpc: 0.51,
              cpa: 19.52,
              roas: 5.12
            },
            createdAt: new Date('2024-01-15'),
            updatedAt: new Date('2024-03-10')
          },
          {
            id: 'demo-audience-2',
            name: 'Recent Purchasers',
            description: 'Customers who purchased in last 30 days',
            status: 'active',
            size: 8300,
            performance: {
              impressions: 156000,
              clicks: 7200,
              conversions: 189,
              spend: 3234.56,
              ctr: 4.62,
              cpc: 0.45,
              cpa: 17.10,
              roas: 5.84
            },
            createdAt: new Date('2024-02-01'),
            updatedAt: new Date('2024-03-12')
          },
          {
            id: 'demo-audience-3',
            name: 'Cart Abandoners',
            description: 'Users who added items but didn\'t complete purchase',
            status: 'paused',
            size: 5600,
            performance: {
              impressions: 98000,
              clicks: 3200,
              conversions: 87,
              spend: 1876.43,
              ctr: 3.27,
              cpc: 0.59,
              cpa: 21.57,
              roas: 4.63
            },
            createdAt: new Date('2024-01-20'),
            updatedAt: new Date('2024-03-05')
          }
        ],
        kpis: {
          totalAudiences: 3,
          activeAudiences: 2,
          pausedAudiences: 1,
          totalSize: 25000,
          avgSize: 8333,
          totalSpend: 9678.88,
          totalConversions: 510,
          avgCpa: 18.97,
          avgRoas: 5.20,
        }
        }
      });
    }

    // Fetch audiences with performance data
    const { data: audiences, error: audiencesError } = await supabase
      .from('audiences')
      .select(`
        *,
        audience_targeting_rules(*),
        audience_performance(
          *,
          date,
          impressions,
          clicks,
          conversions,
          spend,
          ctr,
          cpc,
          cpa,
          roas
        )
      `)
      .eq('organization_id', workspace.currentWorkspace.id)
      .order('created_at', { ascending: false })

    if (audiencesError) {
      // If table doesn't exist, fall back to demo mode
      if (audiencesError.message?.includes('does not exist') || 
          audiencesError.message?.includes('Could not find the table') ||
          audiencesError.message?.includes('schema cache')) {
        return NextResponse.json({
          success: true,
          data: {
            mode: 'demo',
            audiences: [
            {
              id: 'demo-audience-1',
              name: 'High-Value Customers',
              description: 'Customers with lifetime value > $1000',
              status: 'active',
              size: 12500,
              performance: {
                impressions: 245000,
                clicks: 8900,
                conversions: 234,
                spend: 4567.89,
                ctr: 3.63,
                cpc: 0.51,
                cpa: 19.52,
                roas: 5.12
              },
              createdAt: new Date('2024-01-15'),
              updatedAt: new Date('2024-03-10')
            },
            {
              id: 'demo-audience-2',
              name: 'Recent Purchasers',
              description: 'Customers who bought in the last 30 days',
              status: 'active',
              size: 6900,
              performance: {
                impressions: 156000,
                clicks: 5400,
                conversions: 189,
                spend: 3234.56,
                ctr: 4.62,
                cpc: 0.45,
                cpa: 17.10,
                roas: 5.84
              },
              createdAt: new Date('2024-02-01'),
              updatedAt: new Date('2024-03-12')
            },
            {
              id: 'demo-audience-3',
              name: 'Cart Abandoners',
              description: 'Users who added items but didn\'t complete purchase',
              status: 'paused',
              size: 5600,
              performance: {
                impressions: 98000,
                clicks: 3200,
                conversions: 87,
                spend: 1876.43,
                ctr: 3.27,
                cpc: 0.59,
                cpa: 21.57,
                roas: 4.63
              },
              createdAt: new Date('2024-01-20'),
              updatedAt: new Date('2024-03-05')
            }
          ],
          kpis: {
            totalAudiences: 3,
            activeAudiences: 2,
            pausedAudiences: 1,
            totalSize: 25000,
            avgSize: 8333,
            totalSpend: 9678.88,
            totalConversions: 510,
            avgCpa: 18.97,
            avgRoas: 5.20,
          }
        }
      });
    }
      
      throw new Error(`Failed to fetch audiences: ${audiencesError.message}`);
    }

    // Calculate performance metrics for each audience
    const audiencesWithMetrics = (audiences || []).map(audience => {
      const performance = audience.audience_performance || []
      const latestPerformance = performance[performance.length - 1] || {
        impressions: 0,
        clicks: 0,
        conversions: 0,
        spend: 0
      }

      const metrics = {
        impressions: latestPerformance.impressions,
        clicks: latestPerformance.clicks,
        conversions: latestPerformance.conversions,
        spend: parseFloat(latestPerformance.spend || 0),
        ctr: latestPerformance.impressions > 0 ? (latestPerformance.clicks / latestPerformance.impressions * 100) : 0,
        cpc: latestPerformance.clicks > 0 ? (latestPerformance.spend / latestPerformance.clicks) : 0,
        cpa: latestPerformance.conversions > 0 ? (latestPerformance.spend / latestPerformance.conversions) : 0,
        roas: latestPerformance.spend > 0 ? (latestPerformance.conversions * 100 / latestPerformance.spend) : 0
      }

      return {
        id: audience.id,
        name: audience.name,
        description: audience.description,
        status: audience.status,
        size: audience.size,
        performance: metrics,
        targetingRules: audience.audience_targeting_rules || [],
        createdAt: audience.created_at,
        updatedAt: audience.updated_at
      }
    })

    // Calculate KPIs
    const totalAudiences = audiencesWithMetrics.length
    const activeAudiences = audiencesWithMetrics.filter(a => a.status === 'active').length
    const pausedAudiences = audiencesWithMetrics.filter(a => a.status === 'paused').length
    const totalSize = audiencesWithMetrics.reduce((sum, a) => sum + a.size, 0)
    const avgSize = totalAudiences > 0 ? Math.round(totalSize / totalAudiences) : 0
    const totalSpend = audiencesWithMetrics.reduce((sum, a) => sum + a.performance.spend, 0)
    const totalConversions = audiencesWithMetrics.reduce((sum, a) => sum + a.performance.conversions, 0)
    const avgCpa = totalConversions > 0 ? totalSpend / totalConversions : 0
    const avgRoas = totalSpend > 0 ? (totalConversions * 100 / totalSpend) : 0

    const kpis = {
      totalAudiences,
      activeAudiences,
      pausedAudiences,
      totalSize,
      avgSize,
      totalSpend: Math.round(totalSpend * 100) / 100,
      totalConversions,
      avgCpa: Math.round(avgCpa * 100) / 100,
      avgRoas: Math.round(avgRoas * 100) / 100
    }

    return NextResponse.json({
      success: true,
      data: {
        mode: 'connected',
        audiences: audiencesWithMetrics,
        kpis
      }
    })
  } catch (error) {
    console.error('Error in audiences GET:', error)
    return createInternalApiErrorResponse('Internal server error')
  }
}

// POST /api/audiences - Create new audience
export async function POST(request: NextRequest) {
  try {
    const workspaceId = getWorkspaceIdFromHeaders(request.headers.get('x-workspace-id') ?? undefined)
    const workspace = await resolveWorkspacePayload(workspaceId)
    const supabase = createAdminClient()
    const body = await request.json()

    const { name, description, status = 'active', size = 0, targetingRules = [] } = body

    if (!name) {
      return createInternalApiErrorResponse('Name is required')
    }

    if (workspace.mode !== 'connected') {
      return createInternalApiErrorResponse('Audience creation requires connected mode')
    }

    // Create audience
    const { data: audience, error: audienceError } = await supabase
      .from('audiences')
      .insert({
        organization_id: workspace.currentWorkspace.id,
        name,
        description,
        status,
        size,
        created_by: workspace.currentUser.id
      })
      .select()
      .single()

    if (audienceError) {
      console.error('Error creating audience:', audienceError)
      return createInternalApiErrorResponse('Failed to create audience')
    }

    // Create targeting rules if provided
    if (targetingRules.length > 0) {
      const rulesToInsert = targetingRules.map(rule => ({
        audience_id: audience.id,
        rule_type: rule.ruleType,
        rule_name: rule.ruleName,
        rule_config: rule.ruleConfig || {}
      }))

      const { error: rulesError } = await supabase
        .from('audience_targeting_rules')
        .insert(rulesToInsert)

      if (rulesError) {
        console.error('Error creating targeting rules:', rulesError)
        // Don't fail the whole operation if rules fail
      }
    }

    // Log activity
    await supabase
      .from('settings_activity')
      .insert({
        organization_id: workspace.currentWorkspace.id,
        user_id: workspace.currentUser.id,
        action: 'create',
        resource_type: 'audience',
        resource_id: audience.id,
        resource_name: name,
        details: { status, size, targetingRulesCount: targetingRules.length }
      })

    return NextResponse.json({
      success: true,
      data: {
        id: audience.id,
        name: audience.name,
        description: audience.description,
        status: audience.status,
        size: audience.size,
        createdAt: audience.created_at,
        updatedAt: audience.updated_at
      }
    })
  } catch (error) {
    console.error('Error in audiences POST:', error)
    return createInternalApiErrorResponse('Internal server error')
  }
}


