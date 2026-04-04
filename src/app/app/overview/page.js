"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PageShell from "../_ui/PageShell";
import KpiStrip from "../_ui/KpiStrip";
import { ActionToast, Section, Card, Divider, InsightList, StatusBadge } from "../_ui/Primitives";
import { useAppStore } from "@/lib/store";

const EMPTY_CAMPAIGNS = [];
const EMPTY_USERS = [];

function formatCurrency(value) {
  return `$${Math.round(value).toLocaleString()}`;
}

function formatPercent(value) {
  return `${value.toFixed(1)}%`;
}

function formatRelativeTime(value) {
  if (!value) {
    return "Not available";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Not available";
  }

  const diffInMinutes = Math.max(0, Math.floor((Date.now() - parsed.getTime()) / 60000));

  if (diffInMinutes < 1) {
    return "Just now";
  }

  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }

  return `${Math.floor(diffInHours / 24)}d ago`;
}

function buildKpis(campaigns, users, mode) {
  const totalSpend = campaigns.reduce((sum, campaign) => sum + campaign.spend, 0);
  const totalBudget = campaigns.reduce((sum, campaign) => sum + campaign.budget, 0);
  const budgetUtilization = totalBudget > 0 ? (totalSpend / totalBudget) * 100 : 0;
  const activeCampaigns = campaigns.filter((campaign) => campaign.status === "active");
  const avgRoas = activeCampaigns.length
    ? activeCampaigns.reduce((sum, campaign) => sum + campaign.roas, 0) / activeCampaigns.length
    : 0;
  const activeUsers = users.filter((user) => user.status === "active").length;
  const protectedUsers = users.filter((user) => user.mfaEnabled || user.authProvider === "sso").length;

  return [
    { label: "Spend", value: formatCurrency(totalSpend), delta: `${campaigns.length} tracked campaigns` },
    { label: "Budget", value: formatCurrency(totalBudget), delta: totalBudget ? `${Math.round(budgetUtilization)}% utilized` : "not set" },
    { label: "Active campaigns", value: String(activeCampaigns.length), delta: campaigns.length ? "portfolio in motion" : "pipeline empty" },
    { label: "Avg ROAS", value: `${avgRoas.toFixed(1)}x`, delta: activeCampaigns.length ? "live performance" : "awaiting spend" },
    { label: "Active users", value: String(activeUsers), delta: `${users.length} identities in scope` },
    { label: "Mode", value: mode === "connected" ? "Live" : mode === "demo" ? "Demo" : "—", delta: mode === "connected" ? "workspace connected" : "local fallback" },
  ];
}

export default function OverviewPage() {
  const router = useRouter();
  const workspaceId = useAppStore((state) => state.workspace);
  const [overview, setOverview] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [toastMessage, setToastMessage] = useState(undefined);

  const loadOverview = useCallback(async (showSuccessToast = false) => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const response = await fetch("/api/overview", {
        headers: workspaceId ? { "x-workspace-id": workspaceId } : undefined,
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Failed to load overview");
      }

      setOverview(payload.data);

      if (showSuccessToast) {
        setToastMessage(`Overview refreshed${payload.workspace?.name ? ` for ${payload.workspace.name}` : ""}.`);
      }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Failed to load overview");
      setOverview(null);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const campaigns = overview?.campaigns ?? EMPTY_CAMPAIGNS;
  const users = overview?.users ?? EMPTY_USERS;
  const workspace = overview?.currentWorkspace ?? null;
  const currentUser = overview?.currentUser ?? null;
  const mode = overview?.mode ?? null;

  const totalSpend = useMemo(() => campaigns.reduce((sum, campaign) => sum + campaign.spend, 0), [campaigns]);
  const totalBudget = useMemo(() => campaigns.reduce((sum, campaign) => sum + campaign.budget, 0), [campaigns]);
  const budgetUtilization = totalBudget > 0 ? Math.round((totalSpend / totalBudget) * 100) : 0;
  const activeCampaigns = useMemo(() => campaigns.filter((campaign) => campaign.status === "active"), [campaigns]);
  const pausedCampaigns = useMemo(() => campaigns.filter((campaign) => campaign.status === "paused"), [campaigns]);
  const draftCampaigns = useMemo(() => campaigns.filter((campaign) => campaign.status === "draft"), [campaigns]);
  const activeUsers = useMemo(() => users.filter((user) => user.status === "active"), [users]);
  const pendingUsers = useMemo(() => users.filter((user) => user.status === "pending"), [users]);
  const disabledUsers = useMemo(() => users.filter((user) => user.status === "disabled"), [users]);
  const protectedUsers = useMemo(() => users.filter((user) => user.mfaEnabled || user.authProvider === "sso"), [users]);
  const adminUsers = useMemo(() => users.filter((user) => user.role === "owner" || user.role === "admin"), [users]);
  const highestRoasCampaign = useMemo(() => {
    return activeCampaigns.reduce((current, campaign) => {
      if (!current || campaign.roas > current.roas) {
        return campaign;
      }

      return current;
    }, null);
  }, [activeCampaigns]);
  const highestSpendCampaign = useMemo(() => {
    return campaigns.reduce((current, campaign) => {
      if (!current || campaign.spend > current.spend) {
        return campaign;
      }

      return current;
    }, null);
  }, [campaigns]);
  const recentCampaigns = useMemo(() => {
    return [...campaigns]
      .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
      .slice(0, 3);
  }, [campaigns]);
  const latestUserActivity = useMemo(() => {
    return users.reduce((current, user) => {
      if (!user.lastActiveAt) {
        return current;
      }

      if (!current) {
        return user.lastActiveAt;
      }

      return new Date(user.lastActiveAt).getTime() > new Date(current).getTime() ? user.lastActiveAt : current;
    }, "");
  }, [users]);
  const avgRoas = activeCampaigns.length
    ? activeCampaigns.reduce((sum, campaign) => sum + campaign.roas, 0) / activeCampaigns.length
    : 0;
  const avgSpendPerCampaign = campaigns.length ? totalSpend / campaigns.length : 0;
  const kpis = useMemo(() => buildKpis(campaigns, users, mode), [campaigns, users, mode]);

  return (
    <>
      <PageShell
        title="Overview"
        subtitle={mode === "connected" ? `Mission Control · ${workspace?.name ?? "Connected workspace"}` : `Mission Control · ${workspace?.name ?? "Demo workspace"}`}
        actions={
          <>
            <button className="btn" onClick={() => router.push("/app/campaigns")}>Open campaigns</button>
            <button className="btn" onClick={() => void loadOverview(true)}>Refresh overview</button>
          </>
        }
        toolbar={(
          <>
            <div className="page-toolbar-group">
              <select className="input topbar-select topbar-control-range">
                <option>Executive view</option>
                <option>Performance view</option>
                <option>Operations view</option>
              </select>
              <span className="toolbar-pill">{campaigns.length} monitored campaigns</span>
            </div>
            <div className="page-toolbar-meta">
              <span className="toolbar-pill">{users.length} identities in scope</span>
              <span className="toolbar-pill">{mode === "connected" ? "Connected workspace" : "Demo workspace"}</span>
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

        <Section title="Executive summary">
          <div className="grid-2">
            <Card title="Portfolio health">
              <InsightList
                items={[
                  campaigns.length ? `${activeCampaigns.length} active, ${pausedCampaigns.length} paused, and ${draftCampaigns.length} draft campaigns are currently in scope` : "No campaigns are available for the selected workspace yet",
                  totalBudget ? `${formatCurrency(totalSpend)} spend against ${formatCurrency(totalBudget)} approved budget keeps utilization at ${budgetUtilization}%` : "No approved budget has been set for the current portfolio",
                  highestRoasCampaign ? `Top live performer is ${highestRoasCampaign.name} at ${highestRoasCampaign.roas.toFixed(1)}x ROAS` : "No active campaign has produced live ROAS yet",
                ]}
              />
            </Card>
            <Card title="Workspace operations">
              <InsightList
                items={[
                  currentUser ? `${currentUser.name} is operating as ${currentUser.role} in ${workspace?.name ?? "the selected workspace"}` : `Workspace context is ${workspace?.name ?? "not yet available"}`,
                  `${activeUsers.length} active users and ${adminUsers.length} elevated-access identities are currently assigned`,
                  latestUserActivity ? `Latest directory activity was observed ${formatRelativeTime(latestUserActivity)}` : "No recent user sign-in activity is available yet",
                ]}
              />
            </Card>
          </div>
        </Section>

        <Section title="Focus areas">
          <div className="grid-2">
            <Card title="Recent campaigns">
              {recentCampaigns.length ? (
                <div style={{ display: "grid", gap: "12px" }}>
                  {recentCampaigns.map((campaign) => (
                    <div key={campaign.id} style={{ display: "grid", gap: "6px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                        <div className="section-title" style={{ fontSize: "12px" }}>{campaign.name}</div>
                        <StatusBadge status={campaign.status} />
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", fontSize: "11px", color: "rgba(232,238,252,.64)" }}>
                        <span>{campaign.channel}</span>
                        <span>{formatCurrency(campaign.spend)} spend</span>
                        <span>{formatRelativeTime(campaign.updatedAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <InsightList items={["Create a campaign to populate the executive overview."]} />
              )}
            </Card>
            <Card title="Governance watchlist">
              <InsightList
                items={[
                  pendingUsers.length ? `${pendingUsers.length} pending identities should be reviewed this cycle` : "No pending directory reviews are currently open",
                  disabledUsers.length ? `${disabledUsers.length} disabled identities remain visible in the workspace directory` : "No disabled identities require follow-up",
                  pausedCampaigns.length ? `${pausedCampaigns.length} paused campaigns are waiting on a restart or archive decision` : "No paused campaigns require intervention",
                  protectedUsers.length ? `${protectedUsers.length} identities are protected by SSO or MFA-backed controls` : "No protected identities are flagged in the current snapshot",
                ]}
              />
            </Card>
          </div>
        </Section>

        <Section title="Performance signals">
          <div className="grid-2">
            <Card title="Efficiency">
              <InsightList
                items={[
                  activeCampaigns.length ? `Average ROAS across active campaigns is ${avgRoas.toFixed(1)}x` : "ROAS will appear once active campaigns accumulate spend",
                  campaigns.length ? `Average spend per campaign is ${formatCurrency(avgSpendPerCampaign)}` : "Average spend will appear after campaign creation",
                  highestSpendCampaign ? `${highestSpendCampaign.name} is currently the highest-spend campaign at ${formatCurrency(highestSpendCampaign.spend)}` : "No spend leader is available yet",
                ]}
              />
            </Card>
            <Card title="Coverage">
              <InsightList
                items={[
                  users.length ? `${formatPercent((activeUsers.length / Math.max(users.length, 1)) * 100)} of identities are active in the current workspace` : "No workspace identities are available yet",
                  users.length ? `${formatPercent((protectedUsers.length / Math.max(users.length, 1)) * 100)} of identities are protected by stronger controls` : "Protected coverage will appear after identities are provisioned",
                  campaigns.length ? `${formatPercent((activeCampaigns.length / Math.max(campaigns.length, 1)) * 100)} of campaigns are actively running` : "Campaign coverage will appear after portfolio creation",
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
