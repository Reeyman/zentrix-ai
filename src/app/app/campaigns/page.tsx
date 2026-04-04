"use client";

import { Suspense, type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PageShell from "../_ui/PageShell";
import KpiStrip from "../_ui/KpiStrip";
import EnterpriseDataTable from "../_ui/EnterpriseDataTable";
import { ActionToast, Section, Card, Divider, InsightList, StatusBadge } from "../_ui/Primitives";
import CampaignCreationWorkflow from "@/components/workflows/CampaignCreationWorkflow";
import WorkflowPanel from "@/components/workflows/WorkflowPanel";
import { buildCampaignLifecycleWorkflow } from "@/components/workflows/workflow-presets";
import { useAppStore } from "@/lib/store";
import type { AppCampaignRecord, AppMode, CampaignChannel, CampaignStatus } from "@/types/app-models";

type CampaignFormState = {
  name: string;
  description: string;
  budget: string;
  status: CampaignStatus;
  channel: CampaignChannel;
  startDate: string;
  endDate: string;
};

const INITIAL_FORM_STATE: CampaignFormState = {
  name: "",
  description: "",
  budget: "",
  status: "draft",
  channel: "Search",
  startDate: "",
  endDate: "",
};

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

function formatCurrency(value: number) {
  return `$${Math.round(value).toLocaleString()}`;
}

function buildKpis(campaigns: AppCampaignRecord[]) {
  const activeCount = campaigns.filter((campaign) => campaign.status === "active").length;
  const pausedCount = campaigns.filter((campaign) => campaign.status === "paused").length;
  const draftCount = campaigns.filter((campaign) => campaign.status === "draft").length;
  const totalSpend = campaigns.reduce((sum, campaign) => sum + campaign.spend, 0);
  const totalBudget = campaigns.reduce((sum, campaign) => sum + campaign.budget, 0);
  const activeCampaigns = campaigns.filter((campaign) => campaign.status === "active");
  const avgRoas = activeCampaigns.length
    ? activeCampaigns.reduce((sum, campaign) => sum + campaign.roas, 0) / activeCampaigns.length
    : 0;
  const budgetUtilization = totalBudget > 0 ? Math.round((totalSpend / totalBudget) * 100) : 0;

  return [
    { label: "Active", value: String(activeCount), delta: `${campaigns.length} tracked campaigns` },
    { label: "Paused", value: String(pausedCount), delta: pausedCount ? "requires review" : "stable" },
    { label: "Draft", value: String(draftCount), delta: draftCount ? "ready for launch" : "pipeline clear" },
    { label: "Avg ROAS", value: `${avgRoas.toFixed(1)}x`, delta: activeCampaigns.length ? "active portfolio" : "awaiting spend" },
    { label: "Total Spend", value: formatCurrency(totalSpend), delta: `${budgetUtilization}% of budget used` },
    { label: "Budget", value: formatCurrency(totalBudget), delta: totalBudget ? "approved" : "not set" },
  ];
}

function CampaignsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const workspaceId = useAppStore((state) => state.workspace);
  const [campaigns, setCampaigns] = useState<AppCampaignRecord[]>([]);
  const [mode, setMode] = useState<AppMode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formState, setFormState] = useState<CampaignFormState>(INITIAL_FORM_STATE);
  const [toastMessage, setToastMessage] = useState<string | undefined>();
  const createOpen = searchParams.get("create") === "1";

  const kpis = useMemo(() => buildKpis(campaigns), [campaigns]);
  const totalSpend = useMemo(() => campaigns.reduce((sum, campaign) => sum + campaign.spend, 0), [campaigns]);
  const totalBudget = useMemo(() => campaigns.reduce((sum, campaign) => sum + campaign.budget, 0), [campaigns]);
  const budgetUtilization = totalBudget > 0 ? Math.round((totalSpend / totalBudget) * 100) : 0;
  const draftCount = useMemo(() => campaigns.filter((campaign) => campaign.status === "draft").length, [campaigns]);
  const activeCount = useMemo(() => campaigns.filter((campaign) => campaign.status === "active").length, [campaigns]);
  const highestRoasCampaign = useMemo(() => {
    return campaigns.reduce<AppCampaignRecord | null>((current, campaign) => {
      if (!current || campaign.roas > current.roas) {
        return campaign;
      }

      return current;
    }, null);
  }, [campaigns]);

  const loadCampaigns = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const response = await fetch('/api/campaigns', {
        headers: workspaceId ? { 'x-workspace-id': workspaceId } : undefined,
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to load campaigns');
      }

      setCampaigns(payload.data as AppCampaignRecord[]);
      setMode((payload.mode as AppMode | undefined) ?? null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Failed to load campaigns');
      setCampaigns([]);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  useEffect(() => {
    if (!createOpen) {
      setFormState(INITIAL_FORM_STATE);
    }
  }, [createOpen]);

  async function handleCreateCampaign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setIsSubmitting(true);
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(workspaceId ? { 'x-workspace-id': workspaceId } : {}),
        },
        body: JSON.stringify({
          name: formState.name,
          description: formState.description,
          budget: formState.budget ? Number(formState.budget) : 0,
          status: formState.status,
          channel: formState.channel,
          startDate: formState.startDate,
          endDate: formState.endDate,
        }),
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to create campaign');
      }

      const nextCampaign = payload.data as AppCampaignRecord;
      setCampaigns((current) => [nextCampaign, ...current.filter((campaign) => campaign.id !== nextCampaign.id)]);
      setMode((payload.mode as AppMode | undefined) ?? mode);
      setToastMessage(`${nextCampaign.name} created successfully.`);
      setFormState(INITIAL_FORM_STATE);
      router.replace('/app/campaigns');
    } catch (error) {
      setToastMessage(error instanceof Error ? error.message : 'Failed to create campaign');
    } finally {
      setIsSubmitting(false);
    }
  }

  function openCreatePanel() {
    router.push('/app/campaigns?create=1');
  }

  function closeCreatePanel() {
    router.replace('/app/campaigns');
  }

  function handleExportCampaign(row: AppCampaignRecord) {
    const csv = toCsv([
      ["id", "name", "status", "channel", "budget", "spend", "roas", "start_date", "end_date"],
      [row.id, row.name, row.status, row.channel, String(row.budget), String(row.spend), String(row.roas), row.startDate, row.endDate || ""],
    ]);

    downloadTextFile(csv, `${row.name.toLowerCase().replace(/\s+/g, "-")}-campaign-summary.csv`, "text/csv; charset=utf-8");
    return `${row.name} summary exported.`;
  }

  async function handleQueueReview(row: AppCampaignRecord) {
    const nextStatus: CampaignStatus = row.status === "completed" || row.status === "cancelled" ? row.status : "paused";

    const response = await fetch(`/api/campaigns/${row.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(workspaceId ? { "x-workspace-id": workspaceId } : {}),
      },
      body: JSON.stringify({ status: nextStatus }),
    });
    const payload = await response.json();

    if (!response.ok || !payload.success) {
      throw new Error(payload.error || "Failed to queue campaign review");
    }

    const nextCampaign = payload.data as AppCampaignRecord;
    setCampaigns((current) => current.map((campaign) => (campaign.id === nextCampaign.id ? nextCampaign : campaign)));
    setMode((payload.mode as AppMode | undefined) ?? mode);

    return `${row.name} was sent to the performance review queue.`;
  }

  return (
    <PageShell
      title="Campaigns"
      subtitle={mode === 'connected' ? 'Manage live campaigns from your connected workspace' : 'Manage campaigns with local demo persistence'}
      actions={<button className="btn" onClick={createOpen ? closeCreatePanel : openCreatePanel}>{createOpen ? 'Close' : 'New Campaign'}</button>}
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
            <span className="toolbar-pill">{mode === 'connected' ? 'Connected workspace' : 'Demo workspace'}</span>
            <span className="toolbar-pill">{budgetUtilization}% budget utilized</span>
          </div>
        </>
      )}
    >
      {loadError ? (
        <Section>
          <Card title="Campaign data notice">
            <div>{loadError}</div>
          </Card>
        </Section>
      ) : null}

      <Section>
        <KpiStrip items={kpis} />
      </Section>

      <Divider />

      <Section title="Workflow guidance">
        <div className="grid-2">
          <CampaignCreationWorkflow
            createOpen={createOpen}
            activeCount={activeCount}
            draftCount={draftCount}
            budgetUtilization={budgetUtilization}
            formState={{
              name: formState.name,
              description: formState.description,
              budget: formState.budget,
              startDate: formState.startDate,
              endDate: formState.endDate,
            }}
          />
          <WorkflowPanel
            {...buildCampaignLifecycleWorkflow({
              draftCount,
              activeCount,
              budgetUtilization,
            })}
          />
        </div>
      </Section>

      <Divider />

      {createOpen ? (
        <>
          <Section title="Quick create">
            <Card title="Launch a new campaign">
              <form onSubmit={handleCreateCampaign}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                  <input className="input" value={formState.name} onChange={(event) => setFormState((current) => ({ ...current, name: event.target.value }))} placeholder="Campaign name" />
                  <select className="input topbar-select" value={formState.channel} onChange={(event) => setFormState((current) => ({ ...current, channel: event.target.value as CampaignChannel }))}>
                    <option value="Search">Search</option>
                    <option value="Display">Display</option>
                    <option value="Social">Social</option>
                    <option value="Video">Video</option>
                    <option value="Programmatic">Programmatic</option>
                  </select>
                  <textarea className="input" value={formState.description} onChange={(event) => setFormState((current) => ({ ...current, description: event.target.value }))} placeholder="Description" style={{ minHeight: 96, paddingTop: 12, gridColumn: '1 / -1' }} />
                  <input className="input" type="number" min="0" value={formState.budget} onChange={(event) => setFormState((current) => ({ ...current, budget: event.target.value }))} placeholder="Budget" />
                  <select className="input topbar-select" value={formState.status} onChange={(event) => setFormState((current) => ({ ...current, status: event.target.value as CampaignStatus }))}>
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <input className="input" type="date" value={formState.startDate} onChange={(event) => setFormState((current) => ({ ...current, startDate: event.target.value }))} />
                  <input className="input" type="date" value={formState.endDate} onChange={(event) => setFormState((current) => ({ ...current, endDate: event.target.value }))} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
                  <button type="button" className="btn" onClick={closeCreatePanel}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={isSubmitting || !formState.name.trim()}>{isSubmitting ? 'Creating...' : 'Create campaign'}</button>
                </div>
              </form>
            </Card>
          </Section>

          <Divider />
        </>
      ) : null}

      <Section title="Performance">
        <div className="grid-2">
          <Card title="Budget vs Spend">
            <InsightList
              items={[
                `Budget utilization is ${budgetUtilization}% across the selected workspace`,
                `${campaigns.filter((campaign) => campaign.status === 'active').length} campaigns are currently active`,
                highestRoasCampaign ? `${highestRoasCampaign.name} leads at ${highestRoasCampaign.roas.toFixed(1)}x ROAS` : 'Create a campaign to start budget pacing analysis',
                `Remaining budget capacity: ${formatCurrency(Math.max(totalBudget - totalSpend, 0))}`,
              ]}
            />
          </Card>
          <Card title="ROAS Trend">
            <InsightList
              items={[
                campaigns.length ? `Average ROAS is ${(campaigns.reduce((sum, campaign) => sum + campaign.roas, 0) / Math.max(campaigns.length, 1)).toFixed(1)}x across tracked campaigns` : 'Average ROAS will appear after the first campaign is created',
                highestRoasCampaign ? `${highestRoasCampaign.channel} is the top performing channel right now` : 'No top performing channel yet',
                campaigns.some((campaign) => campaign.status === 'paused') ? 'Paused campaigns should be reviewed before the next budget cycle' : 'No paused campaigns require intervention',
                mode === 'connected' ? 'Metrics are coming from the connected workspace' : 'Metrics are currently powered by the local demo layer',
              ]}
            />
          </Card>
        </div>
      </Section>

      <Divider />

      <Section title="All campaigns">
        <EnterpriseDataTable
          data={campaigns}
          loading={isLoading}
          searchPlaceholder="Search campaigns, descriptions, or channels"
          searchFields={[(row) => row.name, (row) => row.description, (row) => row.channel, (row) => row.status]}
          defaultSort={{ columnId: "spend", direction: "desc" }}
          views={[
            { id: "all", label: "All campaigns" },
            { id: "executive", label: "Executive view", predicate: (row) => row.status !== "cancelled" },
            { id: "active", label: "Active only", predicate: (row) => row.status === "active" },
          ]}
          filters={[
            {
              id: "status",
              label: "Status",
              options: [
                { label: "Active", value: "active" },
                { label: "Paused", value: "paused" },
                { label: "Draft", value: "draft" },
                { label: "Completed", value: "completed" },
                { label: "Cancelled", value: "cancelled" },
              ],
              getValue: (row) => row.status,
            },
            {
              id: "channel",
              label: "Channel",
              options: [
                { label: "Search", value: "Search" },
                { label: "Display", value: "Display" },
                { label: "Social", value: "Social" },
                { label: "Video", value: "Video" },
                { label: "Programmatic", value: "Programmatic" },
              ],
              getValue: (row) => row.channel,
            },
          ]}
          emptyTitle="No campaigns available"
          emptyMessage={mode === 'connected' ? 'Create your first campaign in the connected workspace.' : 'Create a campaign to populate the local demo workspace.'}
          columns={[
            {
              id: "name",
              header: "Name",
              cell: (row) => row.name,
              sortValue: (row) => row.name,
            },
            {
              id: "status",
              header: "Status",
              cell: (row) => <StatusBadge status={row.status} />,
              sortValue: (row) => row.status,
            },
            {
              id: "channel",
              header: "Channel",
              cell: (row) => row.channel,
              sortValue: (row) => row.channel,
            },
            {
              id: "budget",
              header: "Budget",
              cell: (row) => formatCurrency(row.budget),
              sortValue: (row) => row.budget,
              align: "right",
            },
            {
              id: "spend",
              header: "Spend",
              cell: (row) => formatCurrency(row.spend),
              sortValue: (row) => row.spend,
              align: "right",
            },
            {
              id: "roas",
              header: "ROAS",
              cell: (row) => `${row.roas}x`,
              sortValue: (row) => row.roas,
              align: "right",
            },
            {
              id: "startDate",
              header: "Start Date",
              cell: (row) => row.startDate,
              sortValue: (row) => row.startDate,
            },
            {
              id: "endDate",
              header: "End Date",
              cell: (row) => row.endDate || "—",
              sortValue: (row) => row.endDate || "",
            },
          ]}
          detailTitle={(row) => row.name}
          detailSubtitle={(row) => `${row.channel} campaign · ${row.startDate || 'TBD'} to ${row.endDate || 'TBD'}`}
          renderDetail={(row) => (
            <div className="detail-grid">
              <div className="detail-block">
                <div className="detail-block-title">Campaign snapshot</div>
                <div className="detail-kv"><span className="detail-kv-label">Status</span><span className="detail-kv-value"><StatusBadge status={row.status} /></span></div>
                <div className="detail-kv"><span className="detail-kv-label">Channel</span><span className="detail-kv-value">{row.channel}</span></div>
                <div className="detail-kv"><span className="detail-kv-label">Budget</span><span className="detail-kv-value">{formatCurrency(row.budget)}</span></div>
                <div className="detail-kv"><span className="detail-kv-label">Spend</span><span className="detail-kv-value">{formatCurrency(row.spend)}</span></div>
                <div className="detail-kv"><span className="detail-kv-label">ROAS</span><span className="detail-kv-value">{row.roas}x</span></div>
                <div className="detail-kv"><span className="detail-kv-label">Description</span><span className="detail-kv-value">{row.description || 'No description provided'}</span></div>
              </div>
              <div className="detail-block">
                <div className="detail-block-title">Recommended actions</div>
                <InsightList
                  items={[
                    `${row.name} should keep pacing within the approved budget corridor`,
                    row.status === "active" ? "Review creative fatigue and audience overlap this week" : "Confirm next activation date before budget unlock",
                    `Date window: ${row.startDate || 'TBD'} to ${row.endDate || 'TBD'}`,
                  ]}
                />
              </div>
            </div>
          )}
          rowActions={[
            {
              label: "Export summary",
              onClick: (row) => handleExportCampaign(row),
            },
            {
              label: "Queue review",
              tone: "primary",
              closeOnClick: true,
              onClick: (row) => handleQueueReview(row),
            },
          ]}
        />
      </Section>
      <ActionToast message={toastMessage} onDismiss={() => setToastMessage(undefined)} />
    </PageShell>
  );
}

function CampaignsPageFallback() {
  return (
    <PageShell
      title="Campaigns"
      subtitle="Loading campaign workspace"
      actions={<button className="btn" disabled>New Campaign</button>}
    >
      <Section>
        <Card title="Loading campaigns">
          <div>Preparing campaign data...</div>
        </Card>
      </Section>
    </PageShell>
  );
}

export default function CampaignsPage() {
  return (
    <Suspense fallback={<CampaignsPageFallback />}>
      <CampaignsPageContent />
    </Suspense>
  );
}
