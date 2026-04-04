"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import PageShell from "../_ui/PageShell";
import KpiStrip from "../_ui/KpiStrip";
import EnterpriseDataTable from "../_ui/EnterpriseDataTable";
import { ActionToast, Section, Card, Divider, InsightList, StatusBadge } from "../_ui/Primitives";
import { useAppStore } from "@/lib/store";
import type { AppAnalyticsCampaign, AppAnalyticsChannel, AppAuditEvent, AppMode, WorkspaceAnalyticsPayload } from "@/types/app-models";

type AnalyticsScope = "channel" | "campaign";

type AnalyticsMutationPayload = {
  success: boolean;
  data: WorkspaceAnalyticsPayload;
  message?: string;
  mode?: AppMode;
  workspace?: {
    name?: string;
  };
};

type AnalyticsExportPayload = AnalyticsMutationPayload & {
  content: string;
  contentType: string;
  filename: string;
};

function formatCurrency(value: number) {
  return `$${Math.round(value).toLocaleString()}`;
}

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

function getOpenAnalyticsReviewIds(events: AppAuditEvent[]) {
  return new Set(
    events
      .filter(
        (event) =>
          Boolean(event.entityId) &&
          event.module.trim().toLowerCase() === "analytics" &&
          event.result.trim().toLowerCase() === "open",
      )
      .map((event) => event.entityId as string),
  );
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

function buildKpis(channels: AppAnalyticsChannel[], campaigns: AppAnalyticsCampaign[], mode: AppMode | null, openReviewCount: number) {
  const totalSpend = channels.reduce((sum, channel) => sum + channel.spend, 0);
  const totalBudget = channels.reduce((sum, channel) => sum + channel.budget, 0);
  const totalRevenue = channels.reduce((sum, channel) => sum + channel.revenue, 0);
  const activeCampaigns = campaigns.filter((campaign) => campaign.status === "active").length;
  const blendedRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
  const budgetUtilization = totalBudget > 0 ? (totalSpend / totalBudget) * 100 : 0;
  const topChannel = channels[0];

  return [
    { label: "Revenue", value: formatCurrency(totalRevenue), delta: totalSpend ? `${blendedRoas.toFixed(1)}x blended ROAS` : "awaiting spend" },
    { label: "Spend", value: formatCurrency(totalSpend), delta: totalBudget ? `${formatPercent(budgetUtilization)} of budget used` : "no budget set" },
    { label: "Budget", value: formatCurrency(totalBudget), delta: activeCampaigns ? `${activeCampaigns} active campaigns` : "pipeline idle" },
    { label: "Channels", value: String(channels.length), delta: topChannel ? `${topChannel.channel} leads efficiency` : "no mix available" },
    { label: "Tracked", value: String(campaigns.length), delta: openReviewCount ? `${openReviewCount} in review` : campaigns.length ? "campaign portfolio monitored" : "nothing tracked" },
    { label: "Mode", value: mode === "connected" ? "Live" : mode === "demo" ? "Demo" : "—", delta: mode === "connected" ? "connected workspace" : "local fallback" },
  ];
}

export default function AnalyticsPage() {
  const workspaceId = useAppStore((state) => state.workspace);
  const [channelPerformance, setChannelPerformance] = useState<AppAnalyticsChannel[]>([
    {
      id: "channel-search",
      channel: "Search",
      campaigns: 1,
      activeCampaigns: 1,
      spend: 12450,
      budget: 15000,
      revenue: 52290,
      roas: 4.2,
    },
    {
      id: "channel-display",
      channel: "Display",
      campaigns: 1,
      activeCampaigns: 1,
      spend: 8230,
      budget: 10000,
      revenue: 23044,
      roas: 2.8,
    }
  ]);
  const [campaignPerformance, setCampaignPerformance] = useState<AppAnalyticsCampaign[]>([
    {
      id: "camp-main-1",
      campaignId: "camp-main-1",
      name: "Summer Sale 2024",
      channel: "Search",
      status: "active",
      spend: 12450,
      budget: 15000,
      revenue: 52290,
      roas: 4.2,
      budgetUtilization: 83,
    },
    {
      id: "camp-main-2",
      campaignId: "camp-main-2",
      name: "Brand Awareness Q3",
      channel: "Display",
      status: "active",
      spend: 8230,
      budget: 10000,
      revenue: 23044,
      roas: 2.8,
      budgetUtilization: 82,
    }
  ]);
  const [events, setEvents] = useState<AppAuditEvent[]>([]);
  const [mode, setMode] = useState<AppMode | null>("demo");
  const [workspaceName, setWorkspaceName] = useState("Main Account");
  const [isLoading, setIsLoading] = useState(false);
  const [isExportingBundle, setIsExportingBundle] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | undefined>();
  const [reviewingIds, setReviewingIds] = useState<Set<string>>(new Set());

  const applyAnalyticsPayload = useCallback((data: WorkspaceAnalyticsPayload, nextMode?: AppMode | null, nextWorkspaceName?: string) => {
    setChannelPerformance((data.channelPerformance ?? []).slice());
    setCampaignPerformance((data.campaignPerformance ?? []).slice());
    setEvents((data.events ?? []).slice());
    setMode(nextMode ?? data.mode ?? null);
    setWorkspaceName(nextWorkspaceName ?? data.currentWorkspace?.name ?? "");
  }, []);

  const loadAnalytics = useCallback(async (showSuccessToast = false) => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const response = await fetch("/api/analytics", {
        headers: workspaceId ? { "x-workspace-id": workspaceId } : undefined,
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Failed to load analytics");
      }

      const data = payload.data as WorkspaceAnalyticsPayload;
      applyAnalyticsPayload(
        data,
        (payload.mode as AppMode | undefined) ?? data.mode ?? null,
        typeof payload.workspace?.name === "string" ? payload.workspace.name : data.currentWorkspace?.name ?? "",
      );

      if (showSuccessToast) {
        setToastMessage(`Analytics refreshed${payload.workspace?.name ? ` for ${payload.workspace.name}` : ""}.`);
      }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Failed to load analytics");
      setChannelPerformance([]);
      setCampaignPerformance([]);
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, [applyAnalyticsPayload, workspaceId]);

  const requestAnalyticsMutation = useCallback(async (scope: AnalyticsScope, entityId: string) => {
    const response = await fetch(`/api/analytics/${scope}/${entityId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(workspaceId ? { "x-workspace-id": workspaceId } : {}),
      },
      body: JSON.stringify({ action: "review" }),
    });
    const payload = (await response.json()) as AnalyticsMutationPayload & { error?: string };

    if (!response.ok || !payload.success) {
      throw new Error(payload.error || "Failed to update analytics review");
    }

    applyAnalyticsPayload(
      payload.data,
      payload.mode ?? payload.data.mode ?? null,
      typeof payload.workspace?.name === "string" ? payload.workspace.name : payload.data.currentWorkspace?.name ?? "",
    );

    return payload.message ?? "Analytics item updated successfully.";
  }, [applyAnalyticsPayload, workspaceId]);

  const requestAnalyticsExport = useCallback(async (scope?: AnalyticsScope, entityId?: string) => {
    const query = new URLSearchParams();

    if (scope) {
      query.set("scope", scope);
    }

    if (entityId) {
      query.set("entityId", entityId);
    }

    const response = await fetch(`/api/analytics/export${query.toString() ? `?${query.toString()}` : ""}`, {
      headers: workspaceId ? { "x-workspace-id": workspaceId } : undefined,
    });
    const payload = (await response.json()) as AnalyticsExportPayload & { error?: string };

    if (!response.ok || !payload.success) {
      throw new Error(payload.error || "Failed to export analytics");
    }

    applyAnalyticsPayload(
      payload.data,
      payload.mode ?? payload.data.mode ?? null,
      typeof payload.workspace?.name === "string" ? payload.workspace.name : payload.data.currentWorkspace?.name ?? "",
    );
    downloadTextFile(payload.content, payload.filename, payload.contentType);

    return payload.message ?? "Analytics export started successfully.";
  }, [applyAnalyticsPayload, workspaceId]);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  const openReviewIds = useMemo(() => getOpenAnalyticsReviewIds(events), [events]);
  const openReviewCount = openReviewIds.size;
  const kpis = useMemo(() => buildKpis(channelPerformance, campaignPerformance, mode, openReviewCount), [channelPerformance, campaignPerformance, mode, openReviewCount]);
  const totalSpend = useMemo(() => channelPerformance.reduce((sum, channel) => sum + channel.spend, 0), [channelPerformance]);
  const totalBudget = useMemo(() => channelPerformance.reduce((sum, channel) => sum + channel.budget, 0), [channelPerformance]);
  const budgetPressureCount = useMemo(() => campaignPerformance.filter((campaign) => campaign.budgetUtilization >= 80).length, [campaignPerformance]);
  const underperformingChannels = useMemo(() => channelPerformance.filter((channel) => channel.spend > 0 && channel.roas < 2).length, [channelPerformance]);
  const topChannel = channelPerformance[0] ?? null;
  const topCampaign = campaignPerformance[0] ?? null;
  const channelOptions = useMemo(() => channelPerformance.map((channel) => ({ label: channel.channel, value: channel.channel })), [channelPerformance]);
  const statusOptions = useMemo(() => Array.from(new Set(campaignPerformance.map((campaign) => campaign.status))).sort(), [campaignPerformance]);
  const hasAnalyticsData = channelPerformance.length > 0 || campaignPerformance.length > 0;
  const reviewQueueLabel = openReviewCount === 1 ? "1 item in review" : `${openReviewCount} items in review`;

  async function handleExportAnalytics() {
    try {
      setIsExportingBundle(true);
      const message = await requestAnalyticsExport();
      setToastMessage(message);
    } catch (error) {
      setToastMessage(error instanceof Error ? error.message : "Failed to export analytics");
    } finally {
      setIsExportingBundle(false);
    }
  }

  async function handleReviewAction(scope: AnalyticsScope, entityId: string, label: string) {
    try {
      setReviewingIds(prev => new Set(prev).add(entityId));
      const message = await requestAnalyticsMutation(scope, entityId);
      setReviewingIds(prev => {
        const next = new Set(prev);
        next.delete(entityId);
        return next;
      });
      setToastMessage(message || `${label} was sent to the performance review queue.`);
    } catch (error) {
      setToastMessage(error instanceof Error ? error.message : "Failed to send to review");
      setReviewingIds(prev => {
        const next = new Set(prev);
        next.delete(entityId);
        return next;
      });
    }
  }

  return (
    <>
      <PageShell
        title="Analytics"
        subtitle={mode === "connected" ? `Analyze live campaign performance for ${workspaceName || "the selected workspace"}` : `Analyze demo-backed campaign performance for ${workspaceName || "the selected workspace"}`}
        actions={
          <>
            <button className="btn" onClick={() => void handleExportAnalytics()} disabled={isExportingBundle || !hasAnalyticsData}>{isExportingBundle ? "Exporting..." : "Export analytics"}</button>
            <button className="btn" onClick={() => void loadAnalytics(true)}>Refresh analytics</button>
          </>
        }
        toolbar={(
          <>
            <div className="page-toolbar-group">
              <span className="toolbar-pill">{channelPerformance.length} channels tracked</span>
              <span className="toolbar-pill">{campaignPerformance.length} campaigns in analysis</span>
            </div>
            <div className="page-toolbar-meta">
              <span className="toolbar-pill">{mode === "connected" ? "Connected workspace" : "Demo workspace"}</span>
              <span className="toolbar-pill">{budgetPressureCount} near budget limit</span>
              <span className="toolbar-pill">{reviewQueueLabel}</span>
            </div>
          </>
        )}
      >
        {loadError ? (
          <Section>
            <Card title="Analytics data notice">
              <div>{loadError}</div>
            </Card>
          </Section>
        ) : null}

        <Section>
          <KpiStrip items={kpis} />
        </Section>

        <Divider />

        <Section title="Portfolio signals">
          <div className="grid-2">
            <Card title="Performance posture">
              <InsightList
                items={[
                  topCampaign ? `${topCampaign.name} is currently leading with ${topCampaign.roas.toFixed(1)}x ROAS on ${formatCurrency(topCampaign.spend)} spend.` : "No campaign performance signals are available yet.",
                  totalBudget ? `${formatPercent((totalSpend / totalBudget) * 100)} of approved budget has been deployed across the workspace.` : "No budget has been approved for the current portfolio.",
                  budgetPressureCount ? `${budgetPressureCount} campaigns are approaching budget pressure and may need pacing review.` : "No campaigns are currently close to budget saturation.",
                ]}
              />
            </Card>
            <Card title="Channel efficiency">
              <InsightList
                items={[
                  topChannel ? `${topChannel.channel} leads the mix with ${topChannel.roas.toFixed(1)}x ROAS across ${topChannel.campaigns} campaigns.` : "Channel mix insights will appear once campaigns are active.",
                  underperformingChannels ? `${underperformingChannels} channels are currently below the 2.0x efficiency threshold.` : "No tracked channels are currently below the efficiency threshold.",
                  channelPerformance.length ? `${channelPerformance.length} channels are contributing to the monitored revenue portfolio.` : "No channels are contributing data yet.",
                ]}
              />
            </Card>
          </div>
        </Section>

        <Section title="Channel performance">
          <EnterpriseDataTable
            data={channelPerformance}
            loading={isLoading}
            pageSize={5}
            searchPlaceholder="Search channel performance"
            searchFields={[(row) => row.channel]}
            defaultSort={{ columnId: "revenue", direction: "desc" }}
            views={[
              { id: "all", label: "All channels" },
              { id: "active", label: "Active channels", predicate: (row) => row.activeCampaigns > 0 },
              { id: "efficient", label: "High efficiency", predicate: (row) => row.roas >= 3 },
              { id: "budget-pressure", label: "Budget pressure", predicate: (row) => row.budget > 0 && (row.spend / row.budget) * 100 >= 80 },
            ]}
            filters={[
              {
                id: "channel",
                label: "Channel",
                options: channelOptions,
                getValue: (row) => row.channel,
              },
            ]}
            emptyTitle="No analytics channels found"
            emptyMessage={mode === "connected" ? "No channel performance was returned from the connected workspace." : "No channel performance exists in the current demo workspace."}
            columns={[
              { id: "channel", header: "Channel", cell: (row) => row.channel, sortValue: (row) => row.channel },
              { id: "campaigns", header: "Campaigns", cell: (row) => String(row.campaigns), sortValue: (row) => row.campaigns },
              { id: "activeCampaigns", header: "Active", cell: (row) => String(row.activeCampaigns), sortValue: (row) => row.activeCampaigns },
              { id: "review", header: "Review", cell: (row) => <StatusBadge status={openReviewIds.has(row.id) ? "Open" : "Tracked"} />, sortValue: (row) => openReviewIds.has(row.id) ? 1 : 0 },
              { id: "spend", header: "Spend", cell: (row) => formatCurrency(row.spend), sortValue: (row) => row.spend },
              { id: "revenue", header: "Revenue", cell: (row) => formatCurrency(row.revenue), sortValue: (row) => row.revenue },
              { id: "roas", header: "ROAS", cell: (row) => `${row.roas.toFixed(1)}x`, sortValue: (row) => row.roas },
            ]}
            detailTitle={(row) => row.channel}
            detailSubtitle={(row) => `${row.campaigns} campaigns · ${formatCurrency(row.spend)} spend · ${openReviewIds.has(row.id) ? "review open" : "review clear"}`}
            renderDetail={(row) => (
              <div className="detail-grid">
                <div className="detail-block">
                  <div className="detail-block-title">Channel snapshot</div>
                  <div className="detail-kv"><span className="detail-kv-label">Campaigns</span><span className="detail-kv-value">{row.campaigns}</span></div>
                  <div className="detail-kv"><span className="detail-kv-label">Active</span><span className="detail-kv-value">{row.activeCampaigns}</span></div>
                  <div className="detail-kv"><span className="detail-kv-label">Review</span><span className="detail-kv-value"><StatusBadge status={openReviewIds.has(row.id) ? "Open" : "Tracked"} /></span></div>
                  <div className="detail-kv"><span className="detail-kv-label">Spend</span><span className="detail-kv-value">{formatCurrency(row.spend)}</span></div>
                  <div className="detail-kv"><span className="detail-kv-label">Revenue</span><span className="detail-kv-value">{formatCurrency(row.revenue)}</span></div>
                </div>
                <div className="detail-block">
                  <div className="detail-block-title">Execution guidance</div>
                  <InsightList
                    items={[
                      `${row.channel} is running at ${row.roas.toFixed(1)}x ROAS across the current portfolio.`,
                      openReviewIds.has(row.id) ? `${row.channel} is currently in the analytics review queue.` : `${row.channel} currently has no open analytics review.`,
                      row.budget ? `${formatPercent((row.spend / row.budget) * 100)} of approved channel budget has been used.` : "No budget has been assigned to this channel.",
                      row.activeCampaigns ? `${row.activeCampaigns} active campaigns are contributing live signal.` : "No active campaigns are currently contributing live signal.",
                    ]}
                  />
                </div>
              </div>
            )}
            rowActions={[
              {
                label: "Export channel",
                pendingLabel: "Exporting...",
                onClick: async (row) => requestAnalyticsExport("channel", row.id),
              },
              {
                label: "Send to review",
                tone: "primary",
                pendingLabel: "Sending...",
                closeOnClick: true,
                onClick: async (row) => handleReviewAction("channel", row.id, row.channel),
              },
            ]}
          />
        </Section>

        <Section title="Campaign performance">
          <EnterpriseDataTable
            data={campaignPerformance}
            loading={isLoading}
            pageSize={6}
            searchPlaceholder="Search campaigns, channels, or status"
            searchFields={[(row) => row.name, (row) => row.channel, (row) => row.status]}
            defaultSort={{ columnId: "revenue", direction: "desc" }}
            views={[
              { id: "all", label: "All campaigns" },
              { id: "active", label: "Active campaigns", predicate: (row) => row.status === "active" },
              { id: "efficient", label: "Efficiency leaders", predicate: (row) => row.roas >= 3 },
              { id: "attention", label: "Needs attention", predicate: (row) => row.status === "paused" || row.status === "draft" || row.budgetUtilization >= 80 },
            ]}
            filters={[
              {
                id: "status",
                label: "Status",
                options: statusOptions.map((status) => ({ label: status, value: status })),
                getValue: (row) => row.status,
              },
              {
                id: "channel",
                label: "Channel",
                options: channelOptions,
                getValue: (row) => row.channel,
              },
            ]}
            emptyTitle="No campaign analytics found"
            emptyMessage={mode === "connected" ? "No campaign analytics were returned from the connected workspace." : "No campaign analytics exist in the current demo workspace."}
            columns={[
              { id: "name", header: "Campaign", cell: (row) => row.name, sortValue: (row) => row.name },
              { id: "channel", header: "Channel", cell: (row) => row.channel, sortValue: (row) => row.channel },
              { id: "status", header: "Status", cell: (row) => <StatusBadge status={row.status} />, sortValue: (row) => row.status },
              { id: "review", header: "Review", cell: (row) => <StatusBadge status={openReviewIds.has(row.id) ? "Open" : "Tracked"} />, sortValue: (row) => openReviewIds.has(row.id) ? 1 : 0 },
              { id: "spend", header: "Spend", cell: (row) => formatCurrency(row.spend), sortValue: (row) => row.spend },
              { id: "revenue", header: "Revenue", cell: (row) => formatCurrency(row.revenue), sortValue: (row) => row.revenue },
              { id: "roas", header: "ROAS", cell: (row) => `${row.roas.toFixed(1)}x`, sortValue: (row) => row.roas },
              { id: "budgetUtilization", header: "Budget use", cell: (row) => formatPercent(row.budgetUtilization), sortValue: (row) => row.budgetUtilization },
            ]}
            detailTitle={(row) => row.name}
            detailSubtitle={(row) => `${row.channel} · ${row.status} · ${openReviewIds.has(row.id) ? "review open" : "review clear"}`}
            renderDetail={(row) => (
              <div className="detail-grid">
                <div className="detail-block">
                  <div className="detail-block-title">Campaign metrics</div>
                  <div className="detail-kv"><span className="detail-kv-label">Channel</span><span className="detail-kv-value">{row.channel}</span></div>
                  <div className="detail-kv"><span className="detail-kv-label">Status</span><span className="detail-kv-value"><StatusBadge status={row.status} /></span></div>
                  <div className="detail-kv"><span className="detail-kv-label">Review</span><span className="detail-kv-value"><StatusBadge status={openReviewIds.has(row.id) ? "Open" : "Tracked"} /></span></div>
                  <div className="detail-kv"><span className="detail-kv-label">Spend</span><span className="detail-kv-value">{formatCurrency(row.spend)}</span></div>
                  <div className="detail-kv"><span className="detail-kv-label">Budget</span><span className="detail-kv-value">{formatCurrency(row.budget)}</span></div>
                  <div className="detail-kv"><span className="detail-kv-label">Revenue</span><span className="detail-kv-value">{formatCurrency(row.revenue)}</span></div>
                </div>
                <div className="detail-block">
                  <div className="detail-block-title">Optimization guidance</div>
                  <InsightList
                    items={[
                      `${row.name} is delivering ${row.roas.toFixed(1)}x ROAS in ${row.channel}.`,
                      openReviewIds.has(row.id) ? `${row.name} is currently in the analytics review queue.` : `${row.name} currently has no open analytics review.`,
                      row.budget ? `${formatPercent(row.budgetUtilization)} of budget has been consumed.` : "No campaign budget has been assigned yet.",
                      row.status === "active" ? "Keep pacing and creative checks within the regular performance rhythm." : "Review activation readiness before the next reporting cycle.",
                    ]}
                  />
                </div>
              </div>
            )}
            rowActions={[
              {
                label: "Export summary",
                pendingLabel: "Exporting...",
                onClick: async (row) => requestAnalyticsExport("campaign", row.id),
              },
              {
                label: "Send to review",
                tone: "primary",
                pendingLabel: "Sending...",
                closeOnClick: true,
                onClick: async (row) => handleReviewAction("campaign", row.id, row.name),
              },
            ]}
          />
        </Section>
      </PageShell>

      <ActionToast message={toastMessage} onDismiss={() => setToastMessage(undefined)} />
    </>
  );
}
