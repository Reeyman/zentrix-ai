interface ErrorLog {
  timestamp: string;
  error: string;
  stack?: string;
  url: string;
  userAgent?: string;
  userId?: string;
  workspaceId?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'api' | 'auth' | 'database' | 'ui' | 'system';
}

interface PerformanceMetric {
  timestamp: string;
  metric: string;
  value: number;
  unit: string;
  tags?: Record<string, string>;
}

interface HealthCheck {
  timestamp: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Record<string, {
    status: 'pass' | 'fail' | 'warn';
    duration: number;
    message?: string;
  }>;
  duration: number;
}

class MonitoringService {
  private errors: ErrorLog[] = [];
  private metrics: PerformanceMetric[] = [];
  private healthChecks: HealthCheck[] = [];
  private readonly maxErrors = 1000;
  private readonly maxMetrics = 5000;
  private readonly maxHealthChecks = 100;

  logError(error: Error | string, context: Partial<ErrorLog> = {}): void {
    const errorLog: ErrorLog = {
      timestamp: new Date().toISOString(),
      error: typeof error === 'string' ? error : error.message,
      stack: typeof error === 'string' ? undefined : error.stack,
      url: context.url || 'unknown',
      userAgent: context.userAgent,
      userId: context.userId,
      workspaceId: context.workspaceId,
      severity: context.severity || 'medium',
      category: context.category || 'system',
    };

    this.errors.unshift(errorLog);
    
    // Keep only recent errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(0, this.maxErrors);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error(`[${errorLog.severity.toUpperCase()}] ${errorLog.category}:`, errorLog.error, errorLog);
    }
  }

  recordMetric(metric: string, value: number, unit: string = 'ms', tags?: Record<string, string>): void {
    const metricEntry: PerformanceMetric = {
      timestamp: new Date().toISOString(),
      metric,
      value,
      unit,
      tags,
    };

    this.metrics.unshift(metricEntry);
    
    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(0, this.maxMetrics);
    }
  }

  recordHealthCheck(healthCheck: Omit<HealthCheck, 'timestamp'>): void {
    const check: HealthCheck = {
      timestamp: new Date().toISOString(),
      ...healthCheck,
    };

    this.healthChecks.unshift(check);
    
    // Keep only recent health checks
    if (this.healthChecks.length > this.maxHealthChecks) {
      this.healthChecks = this.healthChecks.slice(0, this.maxHealthChecks);
    }
  }

  getErrors(options: {
    severity?: string;
    category?: string;
    limit?: number;
    since?: Date;
  } = {}): ErrorLog[] {
    let filtered = this.errors;

    if (options.severity) {
      filtered = filtered.filter(error => error.severity === options.severity);
    }

    if (options.category) {
      filtered = filtered.filter(error => error.category === options.category);
    }

    if (options.since) {
      filtered = filtered.filter(error => new Date(error.timestamp) >= options.since);
    }

    if (options.limit) {
      filtered = filtered.slice(0, options.limit);
    }

    return filtered;
  }

  getMetrics(options: {
    metric?: string;
    since?: Date;
    limit?: number;
  } = {}): PerformanceMetric[] {
    let filtered = this.metrics;

    if (options.metric) {
      filtered = filtered.filter(metric => metric.metric === options.metric);
    }

    if (options.since) {
      filtered = filtered.filter(metric => new Date(metric.timestamp) >= options.since);
    }

    if (options.limit) {
      filtered = filtered.slice(0, options.limit);
    }

    return filtered;
  }

  getHealthChecks(options: {
    limit?: number;
    since?: Date;
  } = {}): HealthCheck[] {
    let filtered = this.healthChecks;

    if (options.since) {
      filtered = filtered.filter(check => new Date(check.timestamp) >= options.since);
    }

    if (options.limit) {
      filtered = filtered.slice(0, options.limit);
    }

    return filtered;
  }

  getErrorStats(): {
    total: number;
    bySeverity: Record<string, number>;
    byCategory: Record<string, number>;
    recentHour: number;
    recentDay: number;
  } {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const bySeverity: Record<string, number> = {};
    const byCategory: Record<string, number> = {};

    this.errors.forEach(error => {
      bySeverity[error.severity] = (bySeverity[error.severity] || 0) + 1;
      byCategory[error.category] = (byCategory[error.category] || 0) + 1;
    });

    return {
      total: this.errors.length,
      bySeverity,
      byCategory,
      recentHour: this.errors.filter(error => new Date(error.timestamp) >= oneHourAgo).length,
      recentDay: this.errors.filter(error => new Date(error.timestamp) >= oneDayAgo).length,
    };
  }

  getPerformanceStats(): {
    avgResponseTime: number;
    p95ResponseTime: number;
    totalRequests: number;
    errorRate: number;
  } {
    const responseTimeMetrics = this.metrics.filter(m => m.metric === 'response_time');
    const totalRequests = this.metrics.filter(m => m.metric === 'request_count').reduce((sum, m) => sum + m.value, 0);
    const errorCount = this.metrics.filter(m => m.metric === 'error_count').reduce((sum, m) => sum + m.value, 0);

    if (responseTimeMetrics.length === 0) {
      return {
        avgResponseTime: 0,
        p95ResponseTime: 0,
        totalRequests: totalRequests,
        errorRate: totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0,
      };
    }

    const sortedTimes = responseTimeMetrics.map(m => m.value).sort((a, b) => a - b);
    const avgResponseTime = sortedTimes.reduce((sum, time) => sum + time, 0) / sortedTimes.length;
    const p95Index = Math.floor(sortedTimes.length * 0.95);
    const p95ResponseTime = sortedTimes[p95Index] || 0;

    return {
      avgResponseTime: Math.round(avgResponseTime * 100) / 100,
      p95ResponseTime: Math.round(p95ResponseTime * 100) / 100,
      totalRequests,
      errorRate: totalRequests > 0 ? Math.round((errorCount / totalRequests) * 10000) / 100 : 0,
    };
  }

  clear(): void {
    this.errors = [];
    this.metrics = [];
    this.healthChecks = [];
  }
}

// Create singleton instance
export const monitoring = new MonitoringService();

// Helper functions for common monitoring tasks
export function logApiError(error: Error | string, context: { url: string; userId?: string; workspaceId?: string }) {
  monitoring.logError(error, {
    ...context,
    category: 'api',
    severity: 'high',
  });
}

export function logAuthError(error: Error | string, context: { url: string; userId?: string }) {
  monitoring.logError(error, {
    ...context,
    category: 'auth',
    severity: 'critical',
  });
}

export function recordApiResponseTime(duration: number, tags?: Record<string, string>) {
  monitoring.recordMetric('response_time', duration, 'ms', tags);
  monitoring.recordMetric('request_count', 1, 'count', tags);
}

export function recordApiError(tags?: Record<string, string>) {
  monitoring.recordMetric('error_count', 1, 'count', tags);
}

export function recordHealthStatus(status: 'healthy' | 'degraded' | 'unhealthy', checks: Record<string, any>, duration: number) {
  monitoring.recordHealthCheck({
    status,
    checks,
    duration,
  });
}

export default monitoring;
