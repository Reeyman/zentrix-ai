import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import monitoring, { logApiError, recordApiResponseTime, recordApiError } from '@/lib/monitoring';

describe('Monitoring Service', () => {
  beforeEach(() => {
    // Clear monitoring data before each test
    monitoring.clear();
  });

  describe('Error Logging', () => {
    it('should log error with default context', () => {
      const error = new Error('Test error');
      monitoring.logError(error);

      const errors = monitoring.getErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatchObject({
        error: 'Test error',
        severity: 'medium',
        category: 'system',
        url: 'unknown',
      });
      expect(errors[0].timestamp).toBeDefined();
      expect(errors[0].stack).toBeDefined();
    });

    it('should log error with custom context', () => {
      const error = 'String error';
      monitoring.logError(error, {
        url: '/test',
        userId: 'user-123',
        severity: 'high',
        category: 'api',
      });

      const errors = monitoring.getErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatchObject({
        error: 'String error',
        url: '/test',
        userId: 'user-123',
        severity: 'high',
        category: 'api',
      });
      expect(errors[0].stack).toBeUndefined();
    });

    it('should limit error storage', () => {
      // Add more errors than the limit
      for (let i = 0; i < 1500; i++) {
        monitoring.logError(`Error ${i}`);
      }

      const errors = monitoring.getErrors();
      expect(errors.length).toBeLessThanOrEqual(1000);
      expect(errors[0].error).toBe('Error 1499'); // Most recent error
    });
  });

  describe('Performance Metrics', () => {
    it('should record metric', () => {
      monitoring.recordMetric('response_time', 150, 'ms', { endpoint: 'test' });

      const metrics = monitoring.getMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0]).toMatchObject({
        metric: 'response_time',
        value: 150,
        unit: 'ms',
        tags: { endpoint: 'test' },
      });
      expect(metrics[0].timestamp).toBeDefined();
    });

    it('should limit metrics storage', () => {
      // Add more metrics than the limit
      for (let i = 0; i < 6000; i++) {
        monitoring.recordMetric('test_metric', i);
      }

      const metrics = monitoring.getMetrics();
      expect(metrics.length).toBeLessThanOrEqual(5000);
      expect(metrics[0].value).toBe(5999); // Most recent metric
    });
  });

  describe('Health Checks', () => {
    it('should record health check', () => {
      const checks = {
        database: { status: 'pass' as const, duration: 50 },
        api: { status: 'pass' as const, duration: 20 },
      };

      monitoring.recordHealthCheck({
        status: 'healthy',
        checks,
        duration: 100
      });

      const healthChecks = monitoring.getHealthChecks();
      expect(healthChecks).toHaveLength(1);
      expect(healthChecks[0]).toMatchObject({
        status: 'healthy',
        checks,
        duration: 100,
      });
      expect(healthChecks[0].timestamp).toBeDefined();
    });

    it('should limit health check storage', () => {
      for (let i = 0; i < 150; i++) {
        monitoring.recordHealthCheck({
        status: 'healthy',
        checks: {},
        duration: 100
      });
      }

      const healthChecks = monitoring.getHealthChecks();
      expect(healthChecks.length).toBeLessThanOrEqual(100);
    });
  });

  describe('Statistics', () => {
    it('should calculate error statistics', () => {
      // Add errors with different severities and categories
      monitoring.logError('Error 1', { severity: 'low', category: 'api' });
      monitoring.logError('Error 2', { severity: 'high', category: 'api' });
      monitoring.logError('Error 3', { severity: 'high', category: 'system' });

      const stats = monitoring.getErrorStats();
      expect(stats).toMatchObject({
        total: 3,
        bySeverity: { low: 1, high: 2 },
        byCategory: { api: 2, system: 1 },
        recentHour: expect.any(Number),
        recentDay: expect.any(Number),
      });
    });

    it('should calculate performance statistics', () => {
      // Add response time metrics
      monitoring.recordMetric('response_time', 100, 'ms');
      monitoring.recordMetric('response_time', 200, 'ms');
      monitoring.recordMetric('response_time', 300, 'ms');
      monitoring.recordMetric('request_count', 3, 'count');
      monitoring.recordMetric('error_count', 1, 'count');

      const stats = monitoring.getPerformanceStats();
      expect(stats).toMatchObject({
        avgResponseTime: 200,
        p95ResponseTime: 300,
        totalRequests: 3,
        errorRate: 33.33,
      });
    });

    it('should handle empty performance stats', () => {
      const stats = monitoring.getPerformanceStats();
      expect(stats).toMatchObject({
        avgResponseTime: 0,
        p95ResponseTime: 0,
        totalRequests: 0,
        errorRate: 0,
      });
    });
  });

  describe('Filtering', () => {
    beforeEach(() => {
      // Add test data
      monitoring.logError('API Error', { category: 'api', severity: 'high' });
      monitoring.logError('System Error', { category: 'system', severity: 'low' });
      monitoring.recordMetric('response_time', 100, 'ms', { endpoint: 'api' });
      monitoring.recordMetric('response_time', 200, 'ms', { endpoint: 'db' });
    });

    it('should filter errors by severity', () => {
      const highSeverityErrors = monitoring.getErrors({ severity: 'high' });
      expect(highSeverityErrors).toHaveLength(1);
      expect(highSeverityErrors[0].error).toBe('API Error');
    });

    it('should filter errors by category', () => {
      const apiErrors = monitoring.getErrors({ category: 'api' });
      expect(apiErrors).toHaveLength(1);
      expect(apiErrors[0].error).toBe('API Error');
    });

    it('should filter metrics by name', () => {
      const responseTimeMetrics = monitoring.getMetrics({ metric: 'response_time' });
      expect(responseTimeMetrics).toHaveLength(2);
    });

    it('should limit results', () => {
      const limitedErrors = monitoring.getErrors({ limit: 1 });
      expect(limitedErrors).toHaveLength(1);
    });
  });
});

describe('Helper Functions', () => {
  beforeEach(() => {
    monitoring.clear();
  });

  it('should log API error with helper', () => {
    logApiError('API Error', { url: '/test', workspaceId: 'ws-123' });

    const errors = monitoring.getErrors();
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({
      error: 'API Error',
      url: '/test',
      workspaceId: 'ws-123',
      category: 'api',
      severity: 'high',
    });
  });

  it('should record API response time with helper', () => {
    recordApiResponseTime(150, { endpoint: 'campaigns', method: 'GET' });

    const metrics = monitoring.getMetrics();
    expect(metrics).toHaveLength(2); // response_time and request_count
    
    // Find the response_time metric
    const responseTimeMetric = metrics.find(m => m.metric === 'response_time');
    expect(responseTimeMetric).toMatchObject({
      metric: 'response_time',
      value: 150,
      tags: { endpoint: 'campaigns', method: 'GET' },
    });
    // Find the request_count metric
    const requestCountMetric = metrics.find(m => m.metric === 'request_count');
    expect(requestCountMetric).toMatchObject({
      metric: 'request_count',
      value: 1,
      tags: { endpoint: 'campaigns', method: 'GET' },
    });
  });

  it('should record API error with helper', () => {
    recordApiError({ endpoint: 'campaigns', method: 'POST' });

    const metrics = monitoring.getMetrics();
    expect(metrics).toHaveLength(1);
    expect(metrics[0]).toMatchObject({
      metric: 'error_count',
      value: 1,
      tags: { endpoint: 'campaigns', method: 'POST' },
    });
  });
});
