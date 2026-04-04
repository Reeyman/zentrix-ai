import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getSupabaseAdminConfig } from '@/lib/runtime-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/health - Health check endpoint
export async function GET() {
  const startTime = Date.now()
  const services: Record<string, string> = {
    api: 'healthy',
    database: 'checking...',
  }
  let message = 'All systems operational'

  // Check database connectivity
  const supabaseConfig = getSupabaseAdminConfig()

  if (!supabaseConfig) {
    services.database = 'misconfigured'
    message = 'Running in demo mode - valid Supabase credentials are required for connected persistence'
  } else {
    try {
      const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceRoleKey)
      const requiredTables = ['organizations', 'user_organizations', 'campaigns', 'audit_log']

      for (const tableName of requiredTables) {
        const { error } = await supabase.from(tableName).select('*', { head: true, count: 'exact' })
        if (error) {
          services.database = 'unhealthy'
          message = 'Database schema is incomplete or inaccessible'
          throw error
        }
      }

      services.database = 'healthy'
      message = 'All systems operational'
    } catch (error: any) {
      console.error('Database health check failed:', error)

      if (error.message?.includes('fetch failed') || error.message?.includes('ENOTFOUND')) {
        services.database = 'misconfigured'
        message = 'Running in demo mode - Supabase host could not be resolved'
      } else if (message === 'Database schema is incomplete or inaccessible') {
        services.database = 'unhealthy'
      } else {
        services.database = 'unhealthy'
        message = 'Database connection failed'
      }
    }
  }

  const endTime = Date.now()
  const responseTime = endTime - startTime

  const healthData = {
    status: services.database === 'healthy' ? 'healthy' : 
             services.database === 'misconfigured' ? 'degraded' : 'unhealthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime: process.uptime(),
    responseTime: `${responseTime}ms`,
    services,
    environment: process.env.NODE_ENV || 'development',
    mode: services.database === 'misconfigured' ? 'demo' : 'connected',
    message,
  }

  const statusCode = healthData.status === 'healthy' ? 200 : 
                    healthData.status === 'degraded' ? 200 : 503

  return NextResponse.json(healthData, { status: statusCode })
}
