import { NextRequest, NextResponse } from 'next/server';
import monitoring, { logApiError, recordApiResponseTime } from '@/lib/monitoring';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'overview';
    const limit = parseInt(searchParams.get('limit') || '100');
    const since = searchParams.get('since') ? new Date(searchParams.get('since')!) : undefined;

    switch (type) {
      case 'errors':
        const errors = monitoring.getErrors({ limit, since });
        return NextResponse.json({
          success: true,
          data: errors,
          stats: monitoring.getErrorStats(),
        });

      case 'metrics':
        const metrics = monitoring.getMetrics({ limit, since });
        return NextResponse.json({
          success: true,
          data: metrics,
          stats: monitoring.getPerformanceStats(),
        });

      case 'health':
        const healthChecks = monitoring.getHealthChecks({ limit, since });
        return NextResponse.json({
          success: true,
          data: healthChecks,
        });

      case 'overview':
      default:
        return NextResponse.json({
          success: true,
          data: {
            errors: monitoring.getErrors({ limit: 50 }),
            metrics: monitoring.getMetrics({ limit: 100 }),
            health: monitoring.getHealthChecks({ limit: 10 }),
            stats: {
              errors: monitoring.getErrorStats(),
              performance: monitoring.getPerformanceStats(),
            },
          },
        });
    }
  } catch (error) {
    logApiError(error instanceof Error ? error : new Error('Monitoring endpoint failed'), {
      url: request.url,
    });
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve monitoring data',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  } finally {
    const duration = Date.now() - startTime;
    recordApiResponseTime(duration, { endpoint: 'monitoring', method: 'GET' });
  }
}

export async function DELETE(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    switch (type) {
      case 'errors':
        // Keep only recent errors (last hour)
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recentErrors = monitoring.getErrors({ since: oneHourAgo });
        monitoring.clear();
        recentErrors.forEach(error => monitoring.logError(error.error, error));
        break;

      case 'metrics':
        // Keep only recent metrics (last hour)
        const oneHourAgoMetrics = new Date(Date.now() - 60 * 60 * 1000);
        const recentMetrics = monitoring.getMetrics({ since: oneHourAgoMetrics });
        monitoring.clear();
        recentMetrics.forEach(metric => monitoring.recordMetric(metric.metric, metric.value, metric.unit, metric.tags));
        break;

      case 'all':
      default:
        monitoring.clear();
        break;
    }

    return NextResponse.json({
      success: true,
      message: `Cleared ${type || 'all'} monitoring data`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logApiError(error instanceof Error ? error : new Error('Monitoring cleanup failed'), {
      url: request.url,
    });
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to clear monitoring data',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  } finally {
    const duration = Date.now() - startTime;
    recordApiResponseTime(duration, { endpoint: 'monitoring', method: 'DELETE' });
  }
}
