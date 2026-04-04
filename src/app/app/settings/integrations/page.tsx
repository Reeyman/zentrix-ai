"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import PageShell from "../../_ui/PageShell";
import KpiStrip from "../../_ui/KpiStrip";
import EnterpriseDataTable from "../../_ui/EnterpriseDataTable";
import { ActionToast, Section, Card, Divider, InsightList, StatusBadge } from "../../_ui/Primitives";
import { useAppStore } from "@/lib/store";
import type { AppIntegrationRecord, AppMode, WorkspaceIntegrationsPayload } from "@/types/app-models";

function buildKpis(integrations: AppIntegrationRecord[]) {
  const healthy = integrations.filter((integration) => integration.status === "Healthy").length;
  const watchlist = integrations.filter((integration) => integration.status !== "Healthy").length;
  const expiring = integrations.filter((integration) => integration.status === "Warning").length;
  const connectorTypes = new Set(integrations.map((integration) => integration.type)).size;

  return [
    { label: "Connected apps", value: String(integrations.length), delta: connectorTypes ? `${connectorTypes} connector types` : "no integrations" },
    { label: "Healthy", value: String(healthy), delta: healthy ? "within policy" : "attention needed" },
    { label: "Watchlist", value: String(watchlist), delta: watchlist ? "review queued" : "clear" },
    { label: "Tokens expiring", value: String(expiring), delta: expiring ? "rotate soon" : "stable" },
    { label: "Coverage", value: String(connectorTypes), delta: connectorTypes ? "systems connected" : "awaiting setup" },
  ];
}

export default function IntegrationsPage() {
  const workspaceId = useAppStore((state) => state.workspace);
  const [showModal, setShowModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | undefined>();
  const [integrations, setIntegrations] = useState<AppIntegrationRecord[]>([]);
  const [mode, setMode] = useState<AppMode | null>(null);
  const [workspaceName, setWorkspaceName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const applyIntegrationsPayload = useCallback((payload: WorkspaceIntegrationsPayload, nextMode?: AppMode | null, nextWorkspaceName?: string) => {
    setIntegrations((payload.integrations ?? []).slice());
    setMode(nextMode ?? payload.mode ?? null);
    setWorkspaceName(nextWorkspaceName ?? payload.currentWorkspace?.name ?? "");
  }, []);

  const loadIntegrations = useCallback(async (showSuccessToast = false) => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const response = await fetch("/api/integrations", {
        headers: workspaceId ? { "x-workspace-id": workspaceId } : undefined,
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Failed to load integrations");
      }

      const data = payload.data as WorkspaceIntegrationsPayload;
      applyIntegrationsPayload(
        data,
        (payload.mode as AppMode | undefined) ?? data.mode ?? null,
        typeof payload.workspace?.name === "string" ? payload.workspace.name : data.currentWorkspace?.name ?? "",
      );

      if (showSuccessToast) {
        setToastMessage(`Integrations refreshed${payload.workspace?.name ? ` for ${payload.workspace.name}` : ""}.`);
      }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Failed to load integrations");
      applyIntegrationsPayload({ integrations: [] } as WorkspaceIntegrationsPayload, null, "");
    } finally {
      setIsLoading(false);
    }
  }, [applyIntegrationsPayload, workspaceId]);

  useEffect(() => {
    void loadIntegrations();
  }, [loadIntegrations]);

  const kpis = useMemo(() => buildKpis(integrations), [integrations]);

  async function handleRotateToken(id: string) {
    const response = await fetch(`/api/integrations/${id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(workspaceId ? { "x-workspace-id": workspaceId } : {}),
      },
      body: JSON.stringify({ action: "rotate" }),
    });
    const payload = await response.json();

    if (!response.ok || !payload.success) {
      throw new Error(payload.error || "Failed to rotate token");
    }

    const data = payload.data as WorkspaceIntegrationsPayload;
    applyIntegrationsPayload(
      data,
      (payload.mode as AppMode | undefined) ?? data.mode ?? null,
      typeof payload.workspace?.name === "string" ? payload.workspace.name : data.currentWorkspace?.name ?? "",
    );

    return payload.message || "Token rotation completed successfully.";
  }

  async function handleOpenConnectorReview(id: string) {
    const response = await fetch(`/api/integrations/${id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(workspaceId ? { "x-workspace-id": workspaceId } : {}),
      },
      body: JSON.stringify({ action: "review" }),
    });
    const payload = await response.json();

    if (!response.ok || !payload.success) {
      throw new Error(payload.error || "Failed to open connector review");
    }

    const data = payload.data as WorkspaceIntegrationsPayload;
    applyIntegrationsPayload(
      data,
      (payload.mode as AppMode | undefined) ?? data.mode ?? null,
      typeof payload.workspace?.name === "string" ? payload.workspace.name : data.currentWorkspace?.name ?? "",
    );

    return payload.message || "Connector review opened successfully.";
  }

  async function handleCreateIntegration(formData: FormData) {
    const name = String(formData.get("name") ?? "").trim();
    const type = String(formData.get("type") ?? "").trim();
    const status = String(formData.get("status") ?? "Healthy").trim();

    if (!name || !type) {
      setToastMessage("Integration name and type are required.");
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch("/api/integrations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(workspaceId ? { "x-workspace-id": workspaceId } : {}),
        },
        body: JSON.stringify({ name, type, status }),
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Failed to create integration");
      }

      const data = payload.data as WorkspaceIntegrationsPayload;
      applyIntegrationsPayload(
        data,
        (payload.mode as AppMode | undefined) ?? data.mode ?? null,
        typeof payload.workspace?.name === "string" ? payload.workspace.name : data.currentWorkspace?.name ?? "",
      );
      setShowModal(false);
      setToastMessage(payload.message || `${name} integration created successfully.`);
    } catch (error) {
      setToastMessage(error instanceof Error ? error.message : "Failed to create integration");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <PageShell
        title="Integrations"
        subtitle={mode === "connected" ? `Monitor live connectors for ${workspaceName || "the selected workspace"}` : `Monitor demo-backed connectors for ${workspaceName || "the selected workspace"}`}
        actions={<button className="btn" onClick={() => setShowModal(true)}>Add integration</button>}
        toolbar={(
          <>
            <div className="page-toolbar-group">
              <select className="input topbar-select topbar-control-range">
                <option>Connector view</option>
                <option>Reliability view</option>
                <option>Security view</option>
              </select>
              <span className="toolbar-pill">{integrations.length} connected services</span>
            </div>
            <div className="page-toolbar-meta">
              <span className="toolbar-pill">{mode === "connected" ? "Connected workspace" : "Demo workspace"}</span>
              <span className="toolbar-pill">{integrations.filter((integration) => integration.status === "Warning").length} renewals due</span>
            </div>
          </>
        )}
      >
        {loadError ? (
          <Section>
            <Card title="Integration data notice">
              <div>{loadError}</div>
            </Card>
          </Section>
        ) : null}

        <Section>
          <KpiStrip items={kpis} />
        </Section>

        <Divider />

        <Section title="Connection health">
          <div className="grid-2">
            <Card title="API connectivity">
              <InsightList
                items={[
                  "Primary ad platform APIs remain within SLA",
                  "OAuth credentials rotate automatically every 24 hours",
                  "One warehouse connector is trending slower than baseline",
                  "Webhook retries recover in under 3 minutes",
                ]}
              />
            </Card>
            <Card title="Credential monitoring">
              <InsightList
                items={[
                  "2 tokens require renewal before the end of the week",
                  "The finance webhook secret was updated yesterday",
                  "CRM scopes remain aligned with the approved policy set",
                  "No unauthorized connector changes were detected",
                ]}
              />
            </Card>
          </div>
        </Section>

        <Section title="Connected services">
          <EnterpriseDataTable
            data={integrations}
            loading={isLoading}
            searchPlaceholder="Search connectors, types, or sync status"
            searchFields={[(row) => row.name, (row) => row.type, (row) => row.status, (row) => row.sync]}
            defaultSort={{ columnId: "name", direction: "asc" }}
            views={[
              { id: "all", label: "All integrations" },
              { id: "healthy", label: "Healthy only", predicate: (row) => row.status === "Healthy" },
              { id: "watchlist", label: "Watchlist", predicate: (row) => row.status !== "Healthy" },
            ]}
            filters={[
              {
                id: "type",
                label: "Type",
                options: [
                  { label: "Ad Platform", value: "Ad Platform" },
                  { label: "CRM", value: "CRM" },
                  { label: "Warehouse", value: "Warehouse" },
                  { label: "Analytics", value: "Analytics" },
                ],
                getValue: (row) => row.type,
              },
              {
                id: "status",
                label: "Status",
                options: [
                  { label: "Healthy", value: "Healthy" },
                  { label: "Warning", value: "Warning" },
                ],
                getValue: (row) => row.status,
              },
            ]}
            columns={[
              { id: "name", header: "Integration", cell: (row) => row.name, sortValue: (row) => row.name },
              { id: "type", header: "Type", cell: (row) => row.type, sortValue: (row) => row.type },
              { id: "status", header: "Status", cell: (row) => <StatusBadge status={row.status} />, sortValue: (row) => row.status },
              { id: "sync", header: "Last sync", cell: (row) => row.sync, sortValue: (row) => row.sync },
            ]}
            detailTitle={(row) => row.name}
            detailSubtitle={(row) => `${row.type} connector · last sync ${row.sync}`}
            renderDetail={(row) => (
              <div className="detail-grid">
                <div className="detail-block">
                  <div className="detail-block-title">Connector health</div>
                  <div className="detail-kv"><span className="detail-kv-label">Type</span><span className="detail-kv-value">{row.type}</span></div>
                  <div className="detail-kv"><span className="detail-kv-label">Status</span><span className="detail-kv-value"><StatusBadge status={row.status} /></span></div>
                  <div className="detail-kv"><span className="detail-kv-label">Last sync</span><span className="detail-kv-value">{row.sync}</span></div>
                  <div className="detail-kv"><span className="detail-kv-label">Credential policy</span><span className="detail-kv-value">Rotated automatically</span></div>
                </div>
                <div className="detail-block">
                  <div className="detail-block-title">Operator guidance</div>
                  <InsightList
                    items={[
                      `${row.name} should remain under active sync monitoring`,
                      row.status === "Warning" ? "Schedule a connector review before the next warehouse refresh" : "No immediate escalation is required for this connector",
                      "Export the credential review package if security needs an audit trail",
                    ]}
                  />
                </div>
              </div>
            )}
            rowActions={[
              {
                label: "Rotate token",
                onClick: (row) => handleRotateToken(row.id),
              },
              {
                label: "Open connector review",
                tone: "primary",
                closeOnClick: true,
                onClick: (row) => handleOpenConnectorReview(row.id),
              },
            ]}
          />
        </Section>
      </PageShell>

      {showModal ? (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.7)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
        }}>
          <div style={{
            background: "var(--bg-1)",
            border: "1px solid var(--border-0)",
            borderRadius: "16px",
            padding: "24px",
            width: "min(500px, 90vw)",
          }}>
            <h2 style={{ margin: "0 0 16px 0", color: "var(--text-0)" }}>Add Integration</h2>
            <form onSubmit={(event) => {
              event.preventDefault();
              void handleCreateIntegration(new FormData(event.currentTarget));
            }}>
              <div style={{ display: "grid", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "6px", color: "var(--text-1)" }}>Integration name</label>
                  <input className="input" name="name" placeholder="e.g. Salesforce" required />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "6px", color: "var(--text-1)" }}>Type</label>
                  <select className="input topbar-select" name="type" required>
                    <option value="">Select type...</option>
                    <option value="Ad Platform">Ad Platform</option>
                    <option value="CRM">CRM</option>
                    <option value="Warehouse">Warehouse</option>
                    <option value="Analytics">Analytics</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "6px", color: "var(--text-1)" }}>Initial status</label>
                  <select className="input topbar-select" name="status" defaultValue="Healthy">
                    <option value="Healthy">Healthy</option>
                    <option value="Warning">Warning</option>
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "20px" }}>
                <button type="button" className="btn" disabled={isSubmitting} onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>{isSubmitting ? "Creating..." : "Create integration"}</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <ActionToast message={toastMessage} onDismiss={() => setToastMessage(undefined)} />
    </>
  );
}
