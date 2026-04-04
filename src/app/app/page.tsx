"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PageShell from "./_ui/PageShell";
import KpiStrip from "./_ui/KpiStrip";
import { ActionToast, Section, Card, Divider, InsightList, StatusBadge } from "./_ui/Primitives";
import { useAppStore } from "@/lib/store";
import type { AppCampaignRecord, AppMode, AppWorkspaceUser, WorkspaceOverviewPayload } from "@/types/app-models";

type OverviewResponse = {
  success?: boolean;
  error?: string;
  data?: WorkspaceOverviewPayload;
  mode?: AppMode;
  workspace?: {
    name?: string;
    environment?: string;
  };
};

function formatCurrency(value: number) {
  return `$${Math.round(value).toLocaleString()}`;
}

function formatDateLabel(value: string) {
  if (!value) {
    return "—";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
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

function buildKpis(campaigns: AppCampaignRecord[], users: AppWorkspaceUser[], mode: AppMode | null) {
  const totalSpend = campaigns.reduce((sum, campaign) => sum + campaign.spend, 0);
  const totalBudget = campaigns.reduce((sum, campaign) => sum + campaign.budget, 0);
  const activeCampaigns = campaigns.filter((campaign) => campaign.status === "active").length;
  const averageRoas = campaigns.length ? campaigns.reduce((sum, campaign) => sum + campaign.roas, 0) / campaigns.length : 0;
  const activeUsers = users.filter((user) => user.status === "active").length;
  const budgetUtilization = totalBudget > 0 ? Math.round((totalSpend / totalBudget) * 100) : 0;

  return [
    { label: "Spend", value: formatCurrency(totalSpend), delta: totalBudget ? `${budgetUtilization}% of budget used` : "no budget set" },
    { label: "Budget", value: formatCurrency(totalBudget), delta: activeCampaigns ? `${activeCampaigns} active campaigns` : "pipeline empty" },
    { label: "Active campaigns", value: String(activeCampaigns), delta: campaigns.length ? `${campaigns.length} tracked campaigns` : "none in scope" },
    { label: "Avg ROAS", value: `${averageRoas.toFixed(1)}x`, delta: totalSpend ? "blended across tracked campaigns" : "awaiting spend" },
    { label: "Active users", value: String(activeUsers), delta: users.length ? `${users.length} identities in scope` : "no members loaded" },
    { label: "Mode", value: mode === "connected" ? "Live" : mode === "demo" ? "Demo" : "—", delta: mode === "connected" ? "connected workspace" : "local fallback" },
  ];
}

export default function OverviewPage() {
  const router = useRouter();
  const workspaceId = useAppStore((state) => state.workspace);
  const [campaigns, setCampaigns] = useState<AppCampaignRecord[]>([]);
  const [users, setUsers] = useState<AppWorkspaceUser[]>([]);
  const [mode, setMode] = useState<AppMode | null>(null);
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceEnvironment, setWorkspaceEnvironment] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | undefined>();

  const applyOverviewPayload = useCallback((data: WorkspaceOverviewPayload, nextMode?: AppMode | null, nextWorkspaceName?: string, nextEnvironment?: string) => {
    setCampaigns((data.campaigns ?? []).slice());
    setUsers((data.users ?? []).slice());
    setMode(nextMode ?? data.mode ?? null);
    setWorkspaceName(nextWorkspaceName ?? data.currentWorkspace?.name ?? "");
    setWorkspaceEnvironment(nextEnvironment ?? data.currentWorkspace?.environment ?? "");
  }, []);

  const loadOverview = useCallback(async (showSuccessToast = false) => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const response = await fetch("/api/overview", {
        headers: workspaceId ? { "x-workspace-id": workspaceId } : undefined,
      });
      const payload = await response.json() as OverviewResponse;

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error || "Failed to load overview");
      }

      applyOverviewPayload(
        payload.data,
        payload.mode ?? payload.data.mode ?? null,
        typeof payload.workspace?.name === "string" ? payload.workspace.name : payload.data.currentWorkspace?.name ?? "",
        typeof payload.workspace?.environment === "string" ? payload.workspace.environment : payload.data.currentWorkspace?.environment ?? "",
      );

      if (showSuccessToast) {
        setToastMessage(`Overview refreshed${payload.workspace?.name ? ` for ${payload.workspace.name}` : ""}.`);
      }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Failed to load overview");
      setCampaigns([]);
      setUsers([]);
      setMode(null);
      setWorkspaceName("");
      setWorkspaceEnvironment("");
    } finally {
      setIsLoading(false);
    }
  }, [applyOverviewPayload, workspaceId]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const totalSpend = useMemo(() => campaigns.reduce((sum, campaign) => sum + campaign.spend, 0), [campaigns]);
  const totalBudget = useMemo(() => campaigns.reduce((sum, campaign) => sum + campaign.budget, 0), [campaigns]);
  const activeCampaignCount = useMemo(() => campaigns.filter((campaign) => campaign.status === "active").length, [campaigns]);
  const activeUsers = useMemo(() => users.filter((user) => user.status === "active"), [users]);
  const elevatedUsers = useMemo(() => users.filter((user) => user.role === "owner" || user.role === "admin"), [users]);
  const topCampaign = useMemo(() => {
    return campaigns.reduce<AppCampaignRecord | null>((current, campaign) => {
      if (!current || campaign.roas > current.roas) {
        return campaign;
      }

      return current;
    }, null);
  }, [campaigns]);
  const kpis = useMemo(() => buildKpis(campaigns, users, mode), [campaigns, users, mode]);
  const hasOverviewData = campaigns.length > 0 || users.length > 0;

  async function handleExportOverview() {
    try {
      if (!hasOverviewData) {
        setToastMessage("No overview data is available to export yet.");
        return;
      }

      setIsExporting(true);
      const csv = toCsv([
        ["metric", "value"],
        ["workspace", workspaceName || "Selected workspace"],
        ["mode", mode ?? "unknown"],
        ["environment", workspaceEnvironment || "—"],
        ["campaigns", String(campaigns.length)],
        ["active_campaigns", String(activeCampaignCount)],
        ["users", String(users.length)],
        ["active_users", String(activeUsers.length)],
        ["elevated_users", String(elevatedUsers.length)],
        ["total_spend", String(totalSpend)],
        ["total_budget", String(totalBudget)],
        ["top_campaign", topCampaign?.name ?? "—"],
      ]);

      downloadTextFile(csv, `${(workspaceName || "workspace").toLowerCase().replace(/\s+/g, "-")}-overview.csv`, "text/csv; charset=utf-8");
      setToastMessage("Overview export downloaded.");
    } catch (error) {
      setToastMessage(error instanceof Error ? error.message : "Failed to export overview");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <>
      <PageShell
        title="Overview"
        subtitle={mode === "connected" ? `Mission Control · Live workspace view for ${workspaceName || "the selected workspace"}` : `Mission Control · Demo-backed workspace view for ${workspaceName || "the selected workspace"}`}
        actions={
          <>
            <button className="btn" onClick={() => void handleExportOverview()} disabled={isExporting || !hasOverviewData}>{isExporting ? "Exporting..." : "Export overview"}</button>
            <button className="btn" onClick={() => void loadOverview(true)} disabled={isLoading}>{isLoading ? "Refreshing..." : "Refresh overview"}</button>
          </>
        }
        toolbar={(
          <>
            <div className="page-toolbar-group">
              <span className="toolbar-pill">{campaigns.length} monitored campaigns</span>
              <span className="toolbar-pill">{users.length} identities in scope</span>
            </div>
            <div className="page-toolbar-meta">
              <span className="toolbar-pill">{mode === "connected" ? "Connected workspace" : "Demo workspace"}</span>
              <span className="toolbar-pill">{workspaceEnvironment || "Environment pending"}</span>
              <span className="toolbar-pill">{activeCampaignCount} active campaigns</span>
            </div>
          </>
        )}
      >
        {loadError ? (
          <Section>
            <Card title="Overview data notice">
              <div>{loadError}</div>
            </Card>
          </Section>
        ) : null}

        <Section>
          <KpiStrip items={kpis} />
        </Section>

        <Divider />

        <Section title="Executive view">
          <div className="grid-2">
            <Card title="Portfolio health">
              <InsightList
                items={[
                  campaigns.length ? `${campaigns.length} campaigns are currently visible in ${workspaceName || "the selected workspace"}.` : "No campaigns are available for the selected workspace yet.",
                  totalBudget ? `${formatCurrency(totalBudget)} has been allocated with ${formatCurrency(totalSpend)} currently deployed.` : "No approved budget has been set for the current portfolio.",
                  topCampaign ? `${topCampaign.name} leads the current portfolio at ${topCampaign.roas.toFixed(1)}x ROAS.` : "No active campaign has produced live ROAS yet.",
                ]}
              />
            </Card>
            <Card title="Workspace operations">
              <InsightList
                items={[
                  workspaceName ? `${workspaceName} is operating in ${workspaceEnvironment || "the selected"} environment.` : "Workspace context is not yet available.",
                  activeUsers.length ? `${activeUsers.length} active users and ${elevatedUsers.length} elevated-access identities are currently assigned.` : "No active users are currently assigned to the workspace.",
                  mode === "connected" ? "The overview is reading from the connected workspace source." : "The overview is currently using the local fallback workspace.",
                ]}
              />
            </Card>
          </div>
        </Section>

        <Section title="Recent campaigns">
          {campaigns.length ? (
            <div className="grid-2">
              {campaigns.slice(0, 4).map((campaign) => (
                <Card key={campaign.id} title={campaign.name}>
                  <div className="detail-grid">
                    <div className="detail-block">
                      <div className="detail-kv"><span className="detail-kv-label">Status</span><span className="detail-kv-value"><StatusBadge status={campaign.status} /></span></div>
                      <div className="detail-kv"><span className="detail-kv-label">Channel</span><span className="detail-kv-value">{campaign.channel}</span></div>
                      <div className="detail-kv"><span className="detail-kv-label">Spend</span><span className="detail-kv-value">{formatCurrency(campaign.spend)}</span></div>
                      <div className="detail-kv"><span className="detail-kv-label">Budget</span><span className="detail-kv-value">{formatCurrency(campaign.budget)}</span></div>
                      <div className="detail-kv"><span className="detail-kv-label">ROAS</span><span className="detail-kv-value">{campaign.roas.toFixed(1)}x</span></div>
                    </div>
                    <div className="detail-block">
                      <div className="detail-block-title">Timing</div>
                      <InsightList
                        items={[
                          campaign.description || "No campaign description has been provided yet.",
                          `Window: ${formatDateLabel(campaign.startDate)} to ${formatDateLabel(campaign.endDate)}.`,
                          campaign.status === "active" ? "This campaign is currently contributing live signal." : "This campaign is not currently contributing active delivery.",
                        ]}
                      />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card title="Campaign pipeline">
              <InsightList
                items={[
                  mode === "connected" ? "No campaigns are available for the connected workspace yet." : "No campaigns are available in the current demo workspace yet.",
                  "Create a campaign to populate the executive overview.",
                  "Once campaigns exist, live spend, budget, and ROAS signals will appear here.",
                ]}
              />
            </Card>
          )}
        </Section>

        <Section title="Team coverage">
          {users.length ? (
            <div className="grid-2">
              {users.slice(0, 4).map((user) => (
                <Card key={user.id} title={user.name}>
                  <div className="detail-grid">
                    <div className="detail-block">
                      <div className="detail-kv"><span className="detail-kv-label">Role</span><span className="detail-kv-value">{user.role}</span></div>
                      <div className="detail-kv"><span className="detail-kv-label">Status</span><span className="detail-kv-value"><StatusBadge status={user.status} /></span></div>
                      <div className="detail-kv"><span className="detail-kv-label">Provider</span><span className="detail-kv-value">{user.authProvider}</span></div>
                      <div className="detail-kv"><span className="detail-kv-label">MFA</span><span className="detail-kv-value">{user.mfaEnabled ? "Enabled" : "Not enabled"}</span></div>
                    </div>
                    <div className="detail-block">
                      <div className="detail-block-title">Access posture</div>
                      <InsightList
                        items={[
                          user.email,
                          user.lastActiveAt ? `Last active ${formatDateLabel(user.lastActiveAt)}.` : "No recent sign-in timestamp is available yet.",
                          user.role === "owner" || user.role === "admin" ? "This identity has elevated workspace access." : "This identity has standard scoped access.",
                        ]}
                      />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card title="Workspace context">
              <InsightList
                items={[
                  "Workspace context is not yet available.",
                  "User and access coverage will appear here after membership data is loaded.",
                  mode === "connected" ? "The connected workspace is currently returning no members." : "The demo workspace is currently returning no members.",
                ]}
              />
            </Card>
          )}
        </Section>

        <Section title="Next actions">
          <div className="grid-2">
            <Card title="Campaign execution">
              <InsightList
                items={[
                  activeCampaignCount ? `${activeCampaignCount} campaigns are currently active and ready for optimization review.` : "No active campaigns are currently running.",
                  totalBudget ? "Review pacing and budget utilization before the next reporting window." : "Set an initial budget to activate pacing and spend controls.",
                  "Use Campaigns to create, update, and monitor portfolio changes.",
                ]}
              />
              <div style={{ marginTop: 16 }}>
                <button className="btn" onClick={() => router.push("/app/campaigns")}>Open campaigns</button>
              </div>
            </Card>
            <Card title="Reporting and governance">
              <InsightList
                items={[
                  users.length ? `${users.length} identities are available for reporting and approval routing.` : "No identities are currently available for reporting workflows.",
                  mode === "connected" ? "The workspace is ready for connected reporting and audit flows." : "The workspace is still relying on demo-backed reporting flows.",
                  "Use Reports to review scheduled output and exports.",
                ]}
              />
              <div style={{ marginTop: 16 }}>
                <button className="btn" onClick={() => router.push("/app/reports")}>Open reports</button>
              </div>
            </Card>
          </div>
        </Section>
      </PageShell>
      <ActionToast message={toastMessage} onDismiss={() => setToastMessage(undefined)} />
    </>
  );
}
