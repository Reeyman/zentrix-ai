'use client';

import { useState, useEffect } from 'react';
import PageShell from '../_ui/PageShell';
import { Section, Card, Divider, StatusBadge } from '../_ui/Primitives';
import { ActionToast } from '../_ui/Primitives';

interface MonitoringData {
  errors: any[];
  metrics: any[];
  health: any[];
  stats: {
    errors: {
      total: number;
      bySeverity: Record<string, number>;
      byCategory: Record<string, number>;
      recentHour: number;
      recentDay: number;
    };
    performance: {
      avgResponseTime: number;
      p95ResponseTime: number;
      totalRequests: number;
      errorRate: number;
    };
  };
}

export default function MonitoringPage() {
  const [data, setData] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | undefined>();

  const loadMonitoringData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/monitoring?type=overview');
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to load monitoring data');
      }
      
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const clearMonitoringData = async (type: 'errors' | 'metrics' | 'all') => {
    try {
      const response = await fetch(`/api/monitoring?type=${type}`, { method: 'DELETE' });
      const result = await response.json();
      
      if (result.success) {
        setToastMessage(result.message);
        await loadMonitoringData();
      } else {
        throw new Error(result.error || 'Failed to clear data');
      }
    } catch (err) {
      setToastMessage(err instanceof Error ? err.message : 'Failed to clear data');
    }
  };

  useEffect(() => {
    loadMonitoringData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadMonitoringData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <PageShell title="Monitoring" subtitle="Loading monitoring data...">
        <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
          Loading monitoring dashboard...
        </div>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell title="Monitoring" subtitle="Error loading monitoring data">
        <Section>
          <Card title="Monitoring Error">
            <div style={{ color: '#ef4444' }}>{error}</div>
            <button 
              className="btn btn-primary" 
              onClick={loadMonitoringData}
              style={{ marginTop: '16px' }}
            >
              Retry
            </button>
          </Card>
        </Section>
      </PageShell>
    );
  }

  if (!data) return null;

  const { stats } = data;

  return (
    <>
      <PageShell
        title="System Monitoring"
        subtitle="Real-time application health and performance metrics"
        actions={
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn" onClick={() => loadMonitoringData()}>
              Refresh
            </button>
            <button 
              className="btn" 
              onClick={() => clearMonitoringData('errors')}
            >
              Clear Errors
            </button>
            <button 
              className="btn" 
              onClick={() => clearMonitoringData('metrics')}
            >
              Clear Metrics
            </button>
            <button 
              className="btn" 
              onClick={() => clearMonitoringData('all')}
              style={{ background: '#ef4444', color: 'white' }}
            >
              Clear All
            </button>
          </div>
        }
      >
        <Section title="System Health">
          <div className="grid-2">
            <Card title="Error Statistics">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#e8eefc' }}>
                    {stats.errors.total}
                  </div>
                  <div style={{ fontSize: '12px', color: '#b6c5ec' }}>Total Errors</div>
                </div>
                
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#e8eefc' }}>
                    {stats.errors.recentHour}
                  </div>
                  <div style={{ fontSize: '12px', color: '#b6c5ec' }}>Last Hour</div>
                </div>
                
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#e8eefc' }}>
                    {stats.errors.recentDay}
                  </div>
                  <div style={{ fontSize: '12px', color: '#b6c5ec' }}>Last 24 Hours</div>
                </div>
              </div>
            </Card>

            <Card title="Performance Metrics">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#e8eefc' }}>
                    {stats.performance.avgResponseTime}ms
                  </div>
                  <div style={{ fontSize: '12px', color: '#b6c5ec' }}>Avg Response Time</div>
                </div>
                
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#e8eefc' }}>
                    {stats.performance.p95ResponseTime}ms
                  </div>
                  <div style={{ fontSize: '12px', color: '#b6c5ec' }}>95th Percentile</div>
                </div>
                
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#e8eefc' }}>
                    {stats.performance.errorRate}%
                  </div>
                  <div style={{ fontSize: '12px', color: '#b6c5ec' }}>Error Rate</div>
                </div>
              </div>
            </Card>
          </div>
        </Section>

        <Divider />

        <Section title="Error Breakdown">
          <div className="grid-2">
            <Card title="By Severity">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {Object.entries(stats.errors.bySeverity).map(([severity, count]) => (
                  <div key={severity} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ textTransform: 'capitalize', color: '#b6c5ec' }}>{severity}</span>
                    <span style={{ fontWeight: 'bold', color: '#e8eefc' }}>{count}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="By Category">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {Object.entries(stats.errors.byCategory).map(([category, count]) => (
                  <div key={category} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ textTransform: 'capitalize', color: '#b6c5ec' }}>{category}</span>
                    <span style={{ fontWeight: 'bold', color: '#e8eefc' }}>{count}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </Section>

        <Divider />

        <Section title="Recent Errors">
          <Card title={data.errors.length > 0 ? `Last ${Math.min(data.errors.length, 10)} errors` : 'No recent errors'}>
            {data.errors.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {data.errors.slice(0, 10).map((error, index) => (
                  <div 
                    key={index} 
                    style={{ 
                      padding: '12px', 
                      border: '1px solid rgba(140,170,255,.1)', 
                      borderRadius: '8px',
                      background: 'rgba(255,255,255,.02)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <StatusBadge status={error.severity} />
                      <span style={{ fontSize: '11px', color: '#b6c5ec' }}>
                        {new Date(error.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div style={{ color: '#e8eefc', marginBottom: '4px' }}>{error.error}</div>
                    <div style={{ fontSize: '11px', color: '#b6c5ec' }}>
                      {error.category} • {error.url}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#6b7280', padding: '20px' }}>
                No errors recorded
              </div>
            )}
          </Card>
        </Section>
      </PageShell>

      <ActionToast message={toastMessage} onDismiss={() => setToastMessage(undefined)} />
    </>
  );
}
