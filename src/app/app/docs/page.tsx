'use client';

import { useState, useEffect } from 'react';
import PageShell from '../_ui/PageShell';
import { Section, Card, Divider } from '../_ui/Primitives';
import { ActionToast } from '../_ui/Primitives';

export default function DocsPage() {
  const [apiDoc, setApiDoc] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | undefined>();

  const loadApiDoc = async () => {
    try {
      setLoading(true);
      const response = await fetch('/docs/API.md');
      const text = await response.text();
      setApiDoc(text);
    } catch (error) {
      setToastMessage('Failed to load API documentation');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApiDoc();
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setToastMessage('Copied to clipboard');
  };

  if (loading) {
    return (
      <PageShell title="Documentation" subtitle="Loading API documentation...">
        <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
          Loading documentation...
        </div>
      </PageShell>
    );
  }

  return (
    <>
      <PageShell
        title="API Documentation"
        subtitle="Complete reference for the Zentrix AI platform API"
        actions={
          <button 
            className="btn btn-primary" 
            onClick={() => copyToClipboard(apiDoc)}
          >
            Copy Documentation
          </button>
        }
      >
        <Section>
          <Card title="API Reference">
            <div style={{ 
              background: '#1a1a1a', 
              color: '#e8eefc', 
              padding: '20px', 
              borderRadius: '8px',
              fontFamily: 'monospace',
              fontSize: '13px',
              lineHeight: '1.6',
              overflow: 'auto',
              maxHeight: '70vh'
            }}>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                {apiDoc}
              </pre>
            </div>
          </Card>
        </Section>

        <Divider />

        <Section title="Quick Links">
          <div className="grid-2">
            <Card title="Development Resources">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <a href="/api/health" target="_blank" style={{ color: '#8b5cf6', textDecoration: 'none' }}>
                  → Health Check Endpoint
                </a>
                <a href="/api/monitoring" target="_blank" style={{ color: '#8b5cf6', textDecoration: 'none' }}>
                  → Monitoring Dashboard
                </a>
                <a href="/app/monitoring" target="_blank" style={{ color: '#8b5cf6', textDecoration: 'none' }}>
                  → System Monitoring
                </a>
              </div>
            </Card>

            <Card title="Testing Tools">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ color: '#b6c5ec', fontSize: '12px' }}>
                  Use these endpoints for testing:
                </div>
                <div style={{ background: 'rgba(255,255,255,.05)', padding: '8px', borderRadius: '4px' }}>
                  <code style={{ color: '#e8eefc' }}>GET /api/health</code>
                </div>
                <div style={{ background: 'rgba(255,255,255,.05)', padding: '8px', borderRadius: '4px' }}>
                  <code style={{ color: '#e8eefc' }}>GET /api/monitoring</code>
                </div>
                <div style={{ background: 'rgba(255,255,255,.05)', padding: '8px', borderRadius: '4px' }}>
                  <code style={{ color: '#e8eefc' }}>GET /api/campaigns</code>
                </div>
              </div>
            </Card>
          </div>
        </Section>
      </PageShell>

      <ActionToast message={toastMessage} onDismiss={() => setToastMessage(undefined)} />
    </>
  );
}
