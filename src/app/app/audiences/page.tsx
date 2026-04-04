"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import PageShell from "../_ui/PageShell";
import KpiStrip from "../_ui/KpiStrip";
import { Section, Card, Divider, ActionToast } from "../_ui/Primitives";

interface Audience {
  id: string;
  name: string;
  description: string;
  status: string;
  size: number;
  performance: {
    impressions: number;
    clicks: number;
    conversions: number;
    spend: number;
    ctr: number;
    cpc: number;
    cpa: number;
    roas: number;
  };
  targetingRules: any[];
  createdAt: string;
  updatedAt: string;
}

interface AudiencesResponse {
  mode: string;
  audiences: Audience[];
  kpis: {
    totalAudiences: number;
    activeAudiences: number;
    pausedAudiences: number;
    totalSize: number;
    avgSize: number;
    totalSpend: number;
    totalConversions: number;
    avgCpa: number;
    avgRoas: number;
  };
}

export default function AudiencesPage() {
  const workspaceId = useAppStore((state) => state.workspace);
  const [showModal, setShowModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | undefined>();
  const [audiences, setAudiences] = useState<Audience[]>([]);
  const [kpis, setKpis] = useState<AudiencesResponse['kpis'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAudiences();
  }, [workspaceId]);

  async function fetchAudiences() {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/audiences', {
        headers: workspaceId ? { 'x-workspace-id': workspaceId } : undefined,
      });

      if (!response.ok) {
        throw new Error('Failed to fetch audiences');
      }

      const result = await response.json();
      
      if (result.success) {
        setAudiences(result.data.audiences);
        setKpis(result.data.kpis);
      } else {
        throw new Error(result.error || 'Failed to fetch audiences');
      }
    } catch (err) {
      console.error('Error fetching audiences:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  function handleNewAudience() {
    setShowModal(true);
  }

  async function handleCreateAudience(formData: FormData) {
    try {
      const name = formData.get('name') as string;
      const description = formData.get('description') as string;
      const status = formData.get('status') as string;
      const size = parseInt(formData.get('size') as string) || 0;

      const response = await fetch('/api/audiences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(workspaceId ? { 'x-workspace-id': workspaceId } : {}),
        },
        body: JSON.stringify({
          name,
          description,
          status,
          size,
          targetingRules: []
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create audience');
      }

      const result = await response.json();
      
      if (result.success) {
        setToastMessage('Audience created successfully');
        setShowModal(false);
        fetchAudiences(); // Refresh the list
      } else {
        throw new Error(result.error || 'Failed to create audience');
      }
    } catch (err) {
      console.error('Error creating audience:', err);
      setToastMessage(err instanceof Error ? err.message : 'Failed to create audience');
    }
  }

  function formatNumber(num: number): string {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  }

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }

  function formatPercent(value: number): string {
    return `${value.toFixed(2)}%`;
  }

  const kpiData = kpis ? [
    { label: "Total Audiences", value: kpis.totalAudiences.toString(), delta: `${kpis.activeAudiences} active` },
    { label: "Total Size", value: formatNumber(kpis.totalSize), delta: `Avg ${formatNumber(kpis.avgSize)}` },
    { label: "Total Spend", value: formatCurrency(kpis.totalSpend), delta: `${kpis.totalConversions} conversions` },
    { label: "Avg CPA", value: formatCurrency(kpis.avgCpa), delta: `Avg ROAS ${kpis.avgRoas.toFixed(1)}x` },
  ] : [];

  if (loading) {
    return (
      <PageShell title="Audiences" subtitle="Manage your audience segments">
        <div>Loading audiences...</div>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell title="Audiences" subtitle="Manage your audience segments">
        <div style={{ color: 'red' }}>Error: {error}</div>
      </PageShell>
    );
  }

  return (
    <>
      <PageShell 
        title="Audiences" 
        subtitle="Manage your audience segments"
        actions={
          <button
            onClick={handleNewAudience}
            style={{
              padding: '12px 24px',
              border: 'none',
              borderRadius: '8px',
              background: 'var(--accent-0)',
              color: 'white',
              cursor: 'pointer',
              fontSize: '16px',
              minHeight: '44px',
              transition: 'all 0.2s ease'
            }}
          >
            Create Audience
          </button>
        }
      >
        {kpis && <KpiStrip items={kpiData} />}

        <Section title="Audience Segments">
          <div className="grid-1">
            {audiences.map((audience) => (
              <Card key={audience.id} title={audience.name}>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', color: 'rgba(232,238,252,.6)', marginBottom: '4px' }}>
                    {audience.description || 'No description'}
                  </div>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '14px' }}>
                    <span style={{ 
                      padding: '4px 8px', 
                      borderRadius: '4px',
                      background: audience.status === 'active' ? 'rgba(39,189,124,.1)' : 'rgba(245,158,11,.1)',
                      color: audience.status === 'active' ? 'rgba(178,255,213,.94)' : 'rgba(252,211,77,.94)'
                    }}>
                      {audience.status}
                    </span>
                    <span style={{ color: 'rgba(232,238,252,.8)' }}>
                      Size: {formatNumber(audience.size)}
                    </span>
                  </div>
                </div>

                <Divider />

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', fontSize: '13px' }}>
                  <div>
                    <div style={{ color: 'rgba(232,238,252,.6)', marginBottom: '4px' }}>Impressions</div>
                    <div style={{ fontWeight: '600' }}>{formatNumber(audience.performance.impressions)}</div>
                  </div>
                  <div>
                    <div style={{ color: 'rgba(232,238,252,.6)', marginBottom: '4px' }}>CTR</div>
                    <div style={{ fontWeight: '600' }}>{formatPercent(audience.performance.ctr)}</div>
                  </div>
                  <div>
                    <div style={{ color: 'rgba(232,238,252,.6)', marginBottom: '4px' }}>CPA</div>
                    <div style={{ fontWeight: '600' }}>{formatCurrency(audience.performance.cpa)}</div>
                  </div>
                  <div>
                    <div style={{ color: 'rgba(232,238,252,.6)', marginBottom: '4px' }}>ROAS</div>
                    <div style={{ fontWeight: '600' }}>{audience.performance.roas.toFixed(1)}x</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </Section>
      </PageShell>

      {/* Create Audience Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'var(--bg-1)',
            border: '1px solid var(--border-0)',
            borderRadius: '12px',
            padding: '24px',
            width: '100%',
            maxWidth: '480px',
            margin: '16px',
            maxHeight: 'calc(100vh - 32px)',
            overflowY: 'auto'
          }}>
            <h3 style={{ margin: '0 0 16px 0' }}>Create New Audience</h3>
            <form action={handleCreateAudience}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>Name *</label>
                <input
                  type="text"
                  name="name"
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--border-0)',
                    borderRadius: '6px',
                    background: 'var(--bg-0)',
                    color: 'var(--text-0)'
                  }}
                />
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>Description</label>
                <textarea
                  name="description"
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--border-0)',
                    borderRadius: '6px',
                    background: 'var(--bg-0)',
                    color: 'var(--text-0)',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>Status</label>
                <select
                  name="status"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--border-0)',
                    borderRadius: '6px',
                    background: 'var(--bg-0)',
                    color: 'var(--text-0)'
                  }}
                >
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>Estimated Size</label>
                <input
                  type="number"
                  name="size"
                  placeholder="0"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid var(--border-0)',
                    borderRadius: '8px',
                    background: 'var(--bg-0)',
                    color: 'var(--text-0)',
                    fontSize: '16px',
                    minHeight: '44px'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    padding: '12px 24px',
                    border: '1px solid var(--border-0)',
                    borderRadius: '8px',
                    background: 'var(--bg-1)',
                    color: 'var(--text-0)',
                    cursor: 'pointer',
                    fontSize: '16px',
                    minHeight: '44px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '12px 24px',
                    border: '1px solid var(--accent-0)',
                    borderRadius: '8px',
                    background: 'var(--accent-0)',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '16px',
                    minHeight: '44px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Create Audience
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ActionToast message={toastMessage} onDismiss={() => setToastMessage(undefined)} />
    </>
  );
}
