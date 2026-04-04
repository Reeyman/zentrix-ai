"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import PageShell from "../_ui/PageShell";
import KpiStrip from "../_ui/KpiStrip";
import EnterpriseDataTable from "../_ui/EnterpriseDataTable";
import { Section, Card, Divider, InsightList, StatusBadge, ActionToast } from "../_ui/Primitives";

interface SettingsChange {
  id: string;
  action: string;
  resourceType: string;
  resourceName: string;
  details: any;
  user: {
    name: string;
    email: string;
  };
  createdAt: string;
  module: string;
  status: string;
  time: string;
  actor: string;
}

interface SettingsResponse {
  mode: string;
  recentChanges: SettingsChange[];
  kpis: {
    totalChanges: number;
    changesToday: number;
    changesThisWeek: number;
    activeAdmins: number;
    totalIntegrations: number;
    connectedIntegrations: number;
    pendingApprovals: number;
  };
}

function downloadTextFile(content: string, filename: string, contentType: string) {
  const blob = new Blob([content], { type: contentType || "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function toCsv(rows: string[][]) {
  return rows
    .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

export default function SettingsPage() {
  const { workspace } = useAppStore();
  const [recentChanges, setRecentChanges] = useState<SettingsChange[]>([]);
  const [kpis, setKpis] = useState<SettingsResponse['kpis'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | undefined>();

  useEffect(() => {
    fetchSettings();
  }, [workspace]);

  async function fetchSettings() {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch("/api/settings", {
        headers: {
          "x-workspace-id": workspace || "",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch settings");
      }

      const result = await response.json();
      
      if (result.success) {
        setRecentChanges(result.data.recentChanges);
        setKpis(result.data.kpis);
      } else {
        throw new Error(result.error || "Failed to fetch settings");
      }
    } catch (err) {
      console.error("Error fetching settings:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  function handleExportChange(change: SettingsChange) {
    const csv = toCsv([
      ["id", "action", "resourceType", "resourceName", "user", "email", "createdAt", "details"],
      [
        change.id,
        change.action,
        change.resourceType,
        change.resourceName,
        change.user.name,
        change.user.email,
        change.createdAt,
        JSON.stringify(change.details)
      ]
    ]);
    
    const filename = `settings-change-${change.id}.csv`;
    downloadTextFile(csv, filename, "text/csv");
    setToastMessage(`Exported ${change.resourceName} change`);
  }

  function handleExportAll() {
    const csv = toCsv([
      ["id", "action", "resourceType", "resourceName", "user", "email", "createdAt", "details"],
      ...recentChanges.map(change => [
        change.id,
        change.action,
        change.resourceType,
        change.resourceName,
        change.user.name,
        change.user.email,
        change.createdAt,
        JSON.stringify(change.details)
      ])
    ]);
    
    const filename = `settings-changes-${new Date().toISOString().split('T')[0]}.csv`;
    downloadTextFile(csv, filename, "text/csv");
    setToastMessage(`Exported all ${recentChanges.length} changes`);
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  }

  const kpiData = kpis ? [
    { label: "Total Changes", value: kpis.totalChanges.toString(), delta: `${kpis.changesToday} today` },
    { label: "Active Admins", value: kpis.activeAdmins.toString(), delta: `${kpis.changesThisWeek} this week` },
    { label: "Integrations", value: `${kpis.connectedIntegrations}/${kpis.totalIntegrations}`, delta: `${kpis.pendingApprovals} pending` },
  ] : [];

  function handleOpenReview(changeId: string) {
    let actionName = "Change";

    setRecentChanges((current) => current.map((change) => {
      if (change.id !== changeId) {
        return change;
      }

      actionName = change.action;
      return {
        ...change,
        status: "Open",
        time: "Just now",
      };
    }));

    return `${actionName} moved into admin review.`;
  }

  const tableColumns = [
    { id: "type", header: "Type", cell: (row: SettingsChange) => <StatusBadge status={row.resourceType} />, sortValue: (row: SettingsChange) => row.resourceType },
    { id: "resource", header: "Resource", cell: (row: SettingsChange) => row.resourceName, sortValue: (row: SettingsChange) => row.resourceName },
    { id: "action", header: "Action", cell: (row: SettingsChange) => row.action, sortValue: (row: SettingsChange) => row.action },
    {
      id: "user",
      header: "User",
      cell: (row: SettingsChange) => (
        <div>
          <div style={{ fontWeight: "500" }}>{row.user.name}</div>
          <div style={{ fontSize: "12px", color: "rgba(232,238,252,.6)" }}>{row.user.email}</div>
        </div>
      ),
      sortValue: (row: SettingsChange) => row.user.name,
    },
    { id: "status", header: "Status", cell: (row: SettingsChange) => <StatusBadge status={row.status} />, sortValue: (row: SettingsChange) => row.status },
    { id: "time", header: "Time", cell: (row: SettingsChange) => formatDate(row.createdAt), sortValue: (row: SettingsChange) => row.createdAt },
  ];

  if (loading) {
    return (
      <PageShell title="Settings" subtitle="System configuration and activity">
        <div>Loading settings...</div>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell title="Settings" subtitle="System configuration and activity">
        <div style={{ color: "red" }}>Error: {error}</div>
      </PageShell>
    );
  }

  return (
    <>
      <PageShell 
        title="Settings" 
        subtitle="System configuration and activity"
        actions={<button className="btn" onClick={handleExportAll}>Export All</button>}
      >
        {kpis && <KpiStrip items={kpiData} />}

        <Section title="Recent Changes">
          <EnterpriseDataTable
            data={recentChanges}
            columns={tableColumns}
            loading={loading}
            searchPlaceholder="Search settings changes"
            searchFields={[
              (row) => row.resourceType,
              (row) => row.resourceName,
              (row) => row.action,
              (row) => row.user.name,
              (row) => row.user.email,
            ]}
            views={[
              { id: "all", label: "All changes" },
              { id: "users", label: "Users", predicate: (row) => row.resourceType === "user" },
              { id: "integrations", label: "Integrations", predicate: (row) => row.resourceType === "integration" },
            ]}
            filters={[
              {
                id: "resourceType",
                label: "Type",
                options: [
                  { label: "User", value: "user" },
                  { label: "Integration", value: "integration" },
                  { label: "Role", value: "role" },
                ],
                getValue: (row) => row.resourceType,
              },
            ]}
            defaultSort={{ columnId: "time", direction: "desc" }}
            detailTitle={(row) => row.resourceName}
            detailSubtitle={(row) => `${row.action} · ${row.user.name}`}
            renderDetail={(row) => (
              <div className="detail-grid">
                <div className="detail-block">
                  <div className="detail-block-title">Change summary</div>
                  <div className="detail-kv"><span className="detail-kv-label">Type</span><span className="detail-kv-value">{row.resourceType}</span></div>
                  <div className="detail-kv"><span className="detail-kv-label">Action</span><span className="detail-kv-value">{row.action}</span></div>
                  <div className="detail-kv"><span className="detail-kv-label">Actor</span><span className="detail-kv-value">{row.user.name}</span></div>
                  <div className="detail-kv"><span className="detail-kv-label">Time</span><span className="detail-kv-value">{formatDate(row.createdAt)}</span></div>
                </div>
                <div className="detail-block">
                  <div className="detail-block-title">Governance notes</div>
                  <InsightList
                    items={[
                      `${row.user.name} changed ${row.resourceName}`,
                      "This change remains available for export in the audit trail",
                      "Escalation is only required if a dependent approval is missing",
                    ]}
                  />
                </div>
              </div>
            )}
            rowActions={[
              {
                label: "Export event",
                onClick: (row) => {
                  handleExportChange(row)
                  return `Exported ${row.resourceName} change.`
                },
              },
              {
                label: "Open review",
                tone: "primary",
                closeOnClick: true,
                onClick: (row) => handleOpenReview(row.id),
              },
            ]}
            emptyMessage="No recent changes found"
          />
        </Section>

        <Section title="System Overview">
          <div className="grid-2">
            <Card title="Change Activity">
              <InsightList
                items={[
                  kpis?.changesToday ? `${kpis.changesToday} changes made today` : "No changes today",
                  kpis?.changesThisWeek ? `${kpis.changesThisWeek} changes this week` : "No changes this week",
                  `${kpis?.totalChanges || 0} total changes tracked`,
                  "All changes are logged with full audit trail"
                ]}
              />
            </Card>
            <Card title="System Health">
              <InsightList
                items={[
                  `${kpis?.activeAdmins || 0} active administrators`,
                  `${kpis?.connectedIntegrations || 0} of ${kpis?.totalIntegrations || 0} integrations connected`,
                  `${kpis?.pendingApprovals || 0} pending approvals`,
                  "All systems operational"
                ]}
              />
            </Card>
          </div>
        </Section>
      </PageShell>

      <ActionToast message={toastMessage} onDismiss={() => setToastMessage(undefined)} />
    </>
  );
}
