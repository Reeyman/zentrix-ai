"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import PageShell from "../_ui/PageShell";
import KpiStrip from "../_ui/KpiStrip";
import EnterpriseDataTable from "../_ui/EnterpriseDataTable";
import { ActionToast, Section, Card, Divider, InsightList, StatusBadge } from "../_ui/Primitives";
import { useAppStore } from "@/lib/store";
import type { AppMode, AppWorkspaceReport, WorkspaceReportsPayload } from "@/types/app-models";

type ReportMutationPayload = {
  success: boolean;
  data: WorkspaceReportsPayload;
  message?: string;
  mode?: AppMode;
  workspace?: {
    name?: string;
  };
};

type ReportExportPayload = ReportMutationPayload & {
  content: string;
  contentType: string;
  filename: string;
};

function formatDateTime(value: string) {
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
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

function buildKpis(
  reports: AppWorkspaceReport[],
  usersCount: number,
  campaignsCount: number,
  eventsCount: number,
  mode: AppMode | null,
) {
  const warningCount = reports.filter((report) => report.status === "Warning").length;
  const onScheduleCount = reports.filter((report) => report.status === "On schedule").length;
  const dailyCount = reports.filter((report) => report.cadence === "Daily").length;
  const onTimeRate = reports.length ? Math.round((onScheduleCount / reports.length) * 100) : 0;

  return [
    { label: "Report packs", value: String(reports.length), delta: `${dailyCount} daily deliveries` },
    { label: "Stakeholders", value: String(usersCount), delta: `${campaignsCount} campaigns covered` },
    { label: "On-time", value: `${onTimeRate}%`, delta: `${onScheduleCount} on schedule` },
    { label: "Attention", value: String(warningCount), delta: warningCount ? "requires follow-up" : "stable" },
    { label: "Audit events", value: String(eventsCount), delta: eventsCount ? "flowing into governance" : "no review activity" },
    { label: "Mode", value: mode === "connected" ? "Live" : mode === "demo" ? "Demo" : "—", delta: mode === "connected" ? "connected workspace" : "local fallback" },
  ];
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

export default function ReportsPage() {
  const workspaceId = useAppStore((state) => state.workspace);
  const [reports, setReports] = useState<AppWorkspaceReport[]>([]);
  const [usersCount, setUsersCount] = useState(0);
  const [campaignsCount, setCampaignsCount] = useState(0);
  const [eventsCount, setEventsCount] = useState(0);
  const [mode, setMode] = useState<AppMode | null>(null);
  const [workspaceName, setWorkspaceName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isExportingBundle, setIsExportingBundle] = useState(false);
  const [isRunningNextReport, setIsRunningNextReport] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | undefined>();

  const applyReportsPayload = useCallback((data: WorkspaceReportsPayload, nextMode?: AppMode | null, nextWorkspaceName?: string) => {
    setReports((data.reports ?? []).slice());
    setUsersCount(data.users?.length ?? 0);
    setCampaignsCount(data.campaigns?.length ?? 0);
    setEventsCount(data.events?.length ?? 0);
    setMode(nextMode ?? data.mode ?? null);
    setWorkspaceName(nextWorkspaceName ?? data.currentWorkspace?.name ?? "");
  }, []);

  const loadReports = useCallback(async (showSuccessToast = false) => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const response = await fetch("/api/reports", {
        headers: workspaceId ? { "x-workspace-id": workspaceId } : undefined,
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Failed to load reports");
      }

      const data = payload.data as WorkspaceReportsPayload;
      applyReportsPayload(
        data,
        (payload.mode as AppMode | undefined) ?? data.mode ?? null,
        typeof payload.workspace?.name === "string" ? payload.workspace.name : data.currentWorkspace?.name ?? "",
      );

      if (showSuccessToast) {
        setToastMessage(`Reports refreshed${payload.workspace?.name ? ` for ${payload.workspace.name}` : ""}.`);
      }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Failed to load reports");
      setReports([]);
      setUsersCount(0);
      setCampaignsCount(0);
      setEventsCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [applyReportsPayload, workspaceId]);

  const requestReportMutation = useCallback(async (reportId: string, action: "run" | "review") => {
    const response = await fetch(`/api/reports/${reportId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(workspaceId ? { "x-workspace-id": workspaceId } : {}),
      },
      body: JSON.stringify({ action }),
    });
    const payload = (await response.json()) as ReportMutationPayload & { error?: string };

    if (!response.ok || !payload.success) {
      throw new Error(payload.error || "Failed to update report");
    }

    applyReportsPayload(
      payload.data,
      payload.mode ?? payload.data.mode ?? null,
      typeof payload.workspace?.name === "string" ? payload.workspace.name : payload.data.currentWorkspace?.name ?? "",
    );

    return payload.message ?? "Report updated successfully.";
  }, [applyReportsPayload, workspaceId]);

  const requestReportExport = useCallback(async (reportId?: string) => {
    const query = reportId ? `?reportId=${encodeURIComponent(reportId)}` : "";
    const response = await fetch(`/api/reports/export${query}`, {
      headers: workspaceId ? { "x-workspace-id": workspaceId } : undefined,
    });
    const payload = (await response.json()) as ReportExportPayload & { error?: string };

    if (!response.ok || !payload.success) {
      throw new Error(payload.error || "Failed to export reports");
    }

    applyReportsPayload(
      payload.data,
      payload.mode ?? payload.data.mode ?? null,
      typeof payload.workspace?.name === "string" ? payload.workspace.name : payload.data.currentWorkspace?.name ?? "",
    );
    downloadTextFile(payload.content, payload.filename, payload.contentType);

    return payload.message ?? "Report export started successfully.";
  }, [applyReportsPayload, workspaceId]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const kpis = useMemo(() => buildKpis(reports, usersCount, campaignsCount, eventsCount, mode), [reports, usersCount, campaignsCount, eventsCount, mode]);
  const warningCount = useMemo(() => reports.filter((report) => report.status === "Warning").length, [reports]);
  const scheduledCount = useMemo(() => reports.filter((report) => report.status === "Scheduled").length, [reports]);
  const earliestNextRun = useMemo(() => [...reports].sort((left, right) => left.nextRunAt.localeCompare(right.nextRunAt))[0] ?? null, [reports]);
  const formatOptions = useMemo(() => Array.from(new Set(reports.map((report) => report.format))).sort(), [reports]);
  const cadenceOptions = useMemo(() => Array.from(new Set(reports.map((report) => report.cadence))).sort(), [reports]);
  const statusOptions = useMemo(() => Array.from(new Set(reports.map((report) => report.status))).sort(), [reports]);

  async function handleExportBundle() {
    try {
      setIsExportingBundle(true);
      const message = await requestReportExport();
      setToastMessage(message);
    } catch (error) {
      setToastMessage(error instanceof Error ? error.message : "Failed to export reports");
    } finally {
      setIsExportingBundle(false);
    }
  }

  async function handleRunNextReport() {
    if (!earliestNextRun) {
      setToastMessage("No report is currently available to run.");
      return;
    }

    try {
      setIsRunningNextReport(true);
      const message = await requestReportMutation(earliestNextRun.id, "run");
      setToastMessage(message);
    } catch (error) {
      setToastMessage(error instanceof Error ? error.message : "Failed to run report");
    } finally {
      setIsRunningNextReport(false);
    }
  }

  return (
    <>
      <PageShell
        title="Reports"
        subtitle={mode === "connected" ? `Automated reporting and delivery status for ${workspaceName || "the selected workspace"}` : `Demo-backed reporting and delivery status for ${workspaceName || "the selected workspace"}`}
        actions={
          <>
            <button className="btn" onClick={() => void handleExportBundle()} disabled={isExportingBundle || !reports.length}>{isExportingBundle ? "Exporting..." : "Export reports"}</button>
            <button className="btn" onClick={() => void handleRunNextReport()} disabled={isRunningNextReport || !earliestNextRun}>{isRunningNextReport ? "Running..." : "Run next report"}</button>
          </>
        }
        toolbar={(
          <>
            <div className="page-toolbar-group">
              <span className="toolbar-pill">{reports.length} recurring reports</span>
              <span className="toolbar-pill">{usersCount} stakeholders mapped</span>
            </div>
            <div className="page-toolbar-meta">
              <span className="toolbar-pill">{mode === "connected" ? "Connected workspace" : "Demo workspace"}</span>
              <span className="toolbar-pill">{warningCount} delivery warnings</span>
              <span className="toolbar-pill">{earliestNextRun ? `Next: ${formatDateTime(earliestNextRun.nextRunAt)}` : "No pending runs"}</span>
            </div>
          </>
        )}
      >
        {loadError ? (
          <Section>
            <Card title="Reports data notice">
              <div>{loadError}</div>
            </Card>
          </Section>
        ) : null}

        <Section>
          <KpiStrip items={kpis} />
        </Section>

        <Divider />

        <Section title="Overview">
          <div className="grid-2">
            <Card title="Delivery health">
              <InsightList
                items={[
                  reports.length ? `${reports.length} report packs are currently tracked in the delivery calendar.` : "No report packs are currently configured.",
                  warningCount ? `${warningCount} report packs require follow-up before the next scheduled delivery.` : "No report packs are currently showing warning status.",
                  scheduledCount ? `${scheduledCount} report packs are scheduled and waiting for their first complete delivery window.` : "All tracked report packs have recent delivery activity.",
                ]}
              />
            </Card>
            <Card title="Freshness and governance">
              <InsightList
                items={[
                  earliestNextRun ? `${earliestNextRun.name} is the next scheduled delivery at ${formatDateTime(earliestNextRun.nextRunAt)}.` : "No upcoming report runs are currently scheduled.",
                  eventsCount ? `${eventsCount} audit events are available for governance coverage in the reporting pack.` : "No audit activity is currently feeding governance review.",
                  campaignsCount ? `${campaignsCount} campaigns are currently included in reporting coverage.` : "No campaigns are currently feeding report coverage.",
                ]}
              />
            </Card>
          </div>
        </Section>

        <Section title="Scheduled reports">
          <EnterpriseDataTable
            data={reports}
            loading={isLoading}
            pageSize={6}
            searchPlaceholder="Search reports, owners, formats, or cadence"
            searchFields={[(row) => row.name, (row) => row.owner, (row) => row.format, (row) => row.cadence, (row) => row.status]}
            defaultSort={{ columnId: "nextRunAt", direction: "asc" }}
            views={[
              { id: "all", label: "All reports" },
              { id: "executive", label: "Executive view", predicate: (row) => row.cadence === "Monthly" || row.format === "PDF" },
              { id: "operational", label: "Operational view", predicate: (row) => row.cadence !== "Monthly" },
              { id: "attention", label: "Needs attention", predicate: (row) => row.status === "Warning" || row.status === "Scheduled" },
            ]}
            filters={[
              {
                id: "status",
                label: "Status",
                options: statusOptions.map((status) => ({ label: status, value: status })),
                getValue: (row) => row.status,
              },
              {
                id: "cadence",
                label: "Cadence",
                options: cadenceOptions.map((cadence) => ({ label: cadence, value: cadence })),
                getValue: (row) => row.cadence,
              },
              {
                id: "format",
                label: "Format",
                options: formatOptions.map((format) => ({ label: format, value: format })),
                getValue: (row) => row.format,
              },
            ]}
            emptyTitle="No reports found"
            emptyMessage={mode === "connected" ? "No reports were derived from the connected workspace." : "No reports were derived from the current demo workspace."}
            columns={[
              { id: "name", header: "Report", cell: (row) => row.name, sortValue: (row) => row.name },
              { id: "owner", header: "Owner", cell: (row) => row.owner, sortValue: (row) => row.owner },
              { id: "cadence", header: "Cadence", cell: (row) => row.cadence, sortValue: (row) => row.cadence },
              { id: "format", header: "Format", cell: (row) => row.format, sortValue: (row) => row.format },
              { id: "stakeholders", header: "Stakeholders", cell: (row) => String(row.stakeholders), sortValue: (row) => row.stakeholders, align: "right" },
              { id: "nextRunAt", header: "Next run", cell: (row) => formatDateTime(row.nextRunAt), sortValue: (row) => row.nextRunAt },
              { id: "status", header: "Status", cell: (row) => <StatusBadge status={row.status} />, sortValue: (row) => row.status },
            ]}
            detailTitle={(row) => row.name}
            detailSubtitle={(row) => `${row.owner} · ${row.cadence} cadence · ${row.format}`}
            renderDetail={(row) => (
              <div className="detail-grid">
                <div className="detail-block">
                  <div className="detail-block-title">Delivery snapshot</div>
                  <div className="detail-kv"><span className="detail-kv-label">Owner</span><span className="detail-kv-value">{row.owner}</span></div>
                  <div className="detail-kv"><span className="detail-kv-label">Cadence</span><span className="detail-kv-value">{row.cadence}</span></div>
                  <div className="detail-kv"><span className="detail-kv-label">Format</span><span className="detail-kv-value">{row.format}</span></div>
                  <div className="detail-kv"><span className="detail-kv-label">Last run</span><span className="detail-kv-value">{formatDateTime(row.lastRunAt)}</span></div>
                  <div className="detail-kv"><span className="detail-kv-label">Next run</span><span className="detail-kv-value">{formatDateTime(row.nextRunAt)}</span></div>
                  <div className="detail-kv"><span className="detail-kv-label">Status</span><span className="detail-kv-value"><StatusBadge status={row.status} /></span></div>
                </div>
                <div className="detail-block">
                  <div className="detail-block-title">Delivery guidance</div>
                  <InsightList
                    items={[
                      row.summary,
                      `${row.stakeholders} stakeholders are currently attached to this report pack.`,
                      row.status === "Warning" ? "Resolve the warning before the next delivery window to keep executive trust high." : "No escalation is required unless source freshness changes before the next run.",
                    ]}
                  />
                </div>
              </div>
            )}
            rowActions={[
              {
                label: "Run now",
                tone: "primary",
                pendingLabel: "Running...",
                onClick: async (row) => requestReportMutation(row.id, "run"),
              },
              {
                label: "Export now",
                pendingLabel: "Exporting...",
                onClick: async (row) => requestReportExport(row.id),
              },
              {
                label: "Send to review",
                pendingLabel: "Sending...",
                closeOnClick: true,
                onClick: async (row) => requestReportMutation(row.id, "review"),
              },
            ]}
          />
        </Section>
      </PageShell>

      <ActionToast message={toastMessage} onDismiss={() => setToastMessage(undefined)} />
    </>
  );
}
