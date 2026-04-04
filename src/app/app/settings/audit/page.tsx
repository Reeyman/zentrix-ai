"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import PageShell from "../../_ui/PageShell";
import KpiStrip from "../../_ui/KpiStrip";
import EnterpriseDataTable from "../../_ui/EnterpriseDataTable";
import { ActionToast, Section, Card, Divider, InsightList, StatusBadge } from "../../_ui/Primitives";
import AuditWorkflow from "@/components/workflows/AuditWorkflow";
import { useAppStore } from "@/lib/store";
import type { AppAuditEvent, AppMode } from "@/types/app-models";

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

function formatRelativeTime(value: string) {
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

function buildKpis(events: AppAuditEvent[], mode: AppMode | null) {
  const openReviews = events.filter((event) => event.result.toLowerCase() === "open").length;
  const securityEvents = events.filter((event) => ["Users", "Roles", "Integrations"].includes(event.module)).length;
  const financeEvents = events.filter((event) => event.module === "Billing").length;
  const reviewedEvents = events.filter((event) => ["applied", "reviewed"].includes(event.result.toLowerCase())).length;
  const latestEvent = events[0];

  return [
    { label: "Logged events", value: String(events.length), delta: latestEvent ? `latest ${formatRelativeTime(latestEvent.createdAt)}` : "no events" },
    { label: "Open reviews", value: String(openReviews), delta: openReviews ? "requires attention" : "clear" },
    { label: "Reviewed", value: String(reviewedEvents), delta: reviewedEvents ? "policy trail" : "awaiting activity" },
    { label: "Security events", value: String(securityEvents), delta: securityEvents ? "access and connector changes" : "quiet" },
    { label: "Finance events", value: String(financeEvents), delta: financeEvents ? "billing trail available" : "none logged" },
    { label: "Mode", value: mode === "connected" ? "Live" : mode === "demo" ? "Demo" : "—", delta: mode === "connected" ? "workspace connected" : "local fallback" },
  ];
}

export default function AuditPage() {
  const workspaceId = useAppStore((state) => state.workspace);
  const [events, setEvents] = useState<AppAuditEvent[]>([]);
  const [mode, setMode] = useState<AppMode | null>(null);
  const [workspaceName, setWorkspaceName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | undefined>();

  const applyAuditPayload = useCallback((nextEvents: AppAuditEvent[], nextMode?: AppMode | null, nextWorkspaceName?: string) => {
    setEvents(nextEvents.slice().sort((left, right) => right.createdAt.localeCompare(left.createdAt)));
    setMode(nextMode ?? null);
    setWorkspaceName(nextWorkspaceName ?? "");
  }, []);

  const loadAudit = useCallback(async (showSuccessToast = false) => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const response = await fetch("/api/audit", {
        headers: workspaceId ? { "x-workspace-id": workspaceId } : undefined,
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Failed to load audit log");
      }

      const nextEvents = ((payload.data as AppAuditEvent[]) ?? []).slice().sort((left, right) => right.createdAt.localeCompare(left.createdAt));
      applyAuditPayload(
        nextEvents,
        (payload.mode as AppMode | undefined) ?? null,
        typeof payload.workspace?.name === "string" ? payload.workspace.name : "",
      );

      if (showSuccessToast) {
        setToastMessage(`Audit log refreshed${payload.workspace?.name ? ` for ${payload.workspace.name}` : ""}.`);
      }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Failed to load audit log");
      applyAuditPayload([], null, "");
    } finally {
      setIsLoading(false);
    }
  }, [applyAuditPayload, workspaceId]);

  useEffect(() => {
    void loadAudit();
  }, [loadAudit]);

  const kpis = useMemo(() => buildKpis(events, mode), [events, mode]);
  const openReviews = useMemo(() => events.filter((event) => event.result.toLowerCase() === "open").length, [events]);
  const securityEvents = useMemo(() => events.filter((event) => ["Users", "Roles", "Integrations"].includes(event.module)).length, [events]);
  const financeEvents = useMemo(() => events.filter((event) => event.module === "Billing").length, [events]);
  const latestEvent = events[0] ?? null;
  const moduleOptions = useMemo(() => Array.from(new Set(events.map((event) => event.module))).sort(), [events]);
  const resultOptions = useMemo(() => Array.from(new Set(events.map((event) => event.result))).sort(), [events]);

  function handleExportLog() {
    if (!events.length) {
      setToastMessage("No audit events are available to export.");
      return;
    }

    const csv = toCsv([
      ["action", "actor", "module", "status", "source_ip", "before", "after", "created_at"],
      ...events.map((event) => [
        event.action,
        event.actorName,
        event.module,
        event.result,
        event.sourceIp,
        event.before,
        event.after,
        event.createdAt,
      ]),
    ]);

    downloadTextFile(csv, `${(workspaceName || "workspace").toLowerCase().replace(/\s+/g, "-")}-audit-log.csv`, "text/csv; charset=utf-8");
    setToastMessage(`Audit log exported${workspaceName ? ` for ${workspaceName}` : ""}.`);
  }

  function handleExportEvent(event: AppAuditEvent) {
    const csv = toCsv([
      ["id", "action", "actor", "module", "status", "source_ip", "before", "after", "created_at"],
      [event.id, event.action, event.actorName, event.module, event.result, event.sourceIp, event.before, event.after, event.createdAt],
    ]);

    downloadTextFile(csv, `${event.id.toLowerCase()}-audit-event.csv`, "text/csv; charset=utf-8");
    return `${event.action} exported successfully.`;
  }

  async function handleFlagForReview(eventId: string) {
    const response = await fetch(`/api/audit/${eventId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(workspaceId ? { "x-workspace-id": workspaceId } : {}),
      },
      body: JSON.stringify({ action: "review" }),
    });
    const payload = await response.json();

    if (!response.ok || !payload.success) {
      throw new Error(payload.error || "Failed to flag audit event for review");
    }

    const data = payload.data as {
      events: AppAuditEvent[];
      currentWorkspace?: { name?: string };
      mode?: AppMode | null;
    };
    applyAuditPayload(
      data.events ?? [],
      (payload.mode as AppMode | undefined) ?? data.mode ?? null,
      typeof payload.workspace?.name === "string" ? payload.workspace.name : data.currentWorkspace?.name ?? "",
    );

    return payload.message || "Audit event flagged for review.";
  }

  return (
    <>
      <PageShell
        title="Audit Log"
        subtitle={mode === "connected" ? `Trace live workspace activity for ${workspaceName || "the selected workspace"}` : `Trace demo-backed activity for ${workspaceName || "the selected workspace"}`}
        actions={
          <>
            <button className="btn" onClick={handleExportLog}>Export log</button>
            <button className="btn" onClick={() => void loadAudit(true)}>Refresh log</button>
          </>
        }
        toolbar={(
          <>
            <div className="page-toolbar-group">
              <select className="input topbar-select topbar-control-range">
                <option>Security view</option>
                <option>Compliance view</option>
                <option>Finance view</option>
              </select>
              <span className="toolbar-pill">{events.length} logged events</span>
            </div>
            <div className="page-toolbar-meta">
              <span className="toolbar-pill">{securityEvents} security events</span>
              <span className="toolbar-pill">{openReviews} open reviews</span>
            </div>
          </>
        )}
      >
        {loadError ? (
          <Section>
            <Card title="Audit data notice">
              <div>{loadError}</div>
            </Card>
          </Section>
        ) : null}

        <Section>
          <KpiStrip items={kpis} />
        </Section>

        <Divider />

        <Section title="Workflow guidance">
          <AuditWorkflow
            events={events}
            openReviews={openReviews}
            securityEvents={securityEvents}
            financeEvents={financeEvents}
          />
        </Section>

        <Divider />

        <Section title="Monitoring overview">
          <div className="grid-2">
            <Card title="Security activity">
              <InsightList
                items={[
                  securityEvents ? `${securityEvents} security-sensitive events were logged for this workspace` : "No security-sensitive events have been logged yet",
                  latestEvent ? `${latestEvent.action} is the latest recorded event and was seen ${formatRelativeTime(latestEvent.createdAt)}` : "No recent audit activity is available yet",
                  openReviews ? `${openReviews} events are still open for review or escalation` : "No open review items are currently blocking governance workflows",
                ]}
              />
            </Card>
            <Card title="Compliance readiness">
              <InsightList
                items={[
                  financeEvents ? `${financeEvents} finance-related events are available for attribution and export` : "No finance events are currently in scope",
                  `${events.length} total events are searchable by actor, module, status, and source IP`,
                  mode === "connected" ? "The audit view is reading from the connected workspace source when available" : "The audit view is using the local demo trail fallback",
                ]}
              />
            </Card>
          </div>
        </Section>

        <Section title="Recent events">
          <EnterpriseDataTable
            data={events}
            loading={isLoading}
            searchPlaceholder="Search audit events, actors, modules, or IPs"
            searchFields={[(row) => row.action, (row) => row.actorName, (row) => row.module, (row) => row.sourceIp, (row) => row.result, (row) => row.before, (row) => row.after]}
            defaultSort={{ columnId: "createdAt", direction: "desc" }}
            views={[
              { id: "all", label: "All events" },
              { id: "security", label: "Security events", predicate: (row) => row.module === "Roles" || row.module === "Users" || row.module === "Integrations" },
              { id: "finance", label: "Finance events", predicate: (row) => row.module === "Billing" },
              { id: "open", label: "Open reviews", predicate: (row) => row.result.toLowerCase() === "open" },
            ]}
            filters={[
              {
                id: "module",
                label: "Module",
                options: moduleOptions.map((module) => ({ label: module, value: module })),
                getValue: (row) => row.module,
              },
              {
                id: "result",
                label: "Status",
                options: resultOptions.map((result) => ({ label: result, value: result })),
                getValue: (row) => row.result,
              },
            ]}
            emptyTitle="No audit events found"
            emptyMessage={mode === "connected" ? "No audit events were returned from the connected workspace." : "No audit events exist in the current demo workspace."}
            columns={[
              { id: "action", header: "Action", cell: (row) => row.action, sortValue: (row) => row.action },
              { id: "actorName", header: "Actor", cell: (row) => row.actorName, sortValue: (row) => row.actorName },
              { id: "module", header: "Module", cell: (row) => row.module, sortValue: (row) => row.module },
              { id: "createdAt", header: "Time", cell: (row) => formatRelativeTime(row.createdAt), sortValue: (row) => row.createdAt },
              { id: "result", header: "Status", cell: (row) => <StatusBadge status={row.result} />, sortValue: (row) => row.result },
            ]}
            detailTitle={(row) => row.action}
            detailSubtitle={(row) => `${row.actorName} · ${row.module} · ${formatRelativeTime(row.createdAt)}`}
            renderDetail={(row) => (
              <div className="detail-grid">
                <div className="detail-block">
                  <div className="detail-block-title">Event details</div>
                  <div className="detail-kv"><span className="detail-kv-label">Actor</span><span className="detail-kv-value">{row.actorName}</span></div>
                  <div className="detail-kv"><span className="detail-kv-label">Module</span><span className="detail-kv-value">{row.module}</span></div>
                  <div className="detail-kv"><span className="detail-kv-label">Source IP</span><span className="detail-kv-value">{row.sourceIp}</span></div>
                  <div className="detail-kv"><span className="detail-kv-label">Status</span><span className="detail-kv-value"><StatusBadge status={row.result} /></span></div>
                  <div className="detail-kv"><span className="detail-kv-label">Client</span><span className="detail-kv-value">{row.userAgent}</span></div>
                </div>
                <div className="detail-block">
                  <div className="detail-block-title">Before / after</div>
                  <div className="detail-kv"><span className="detail-kv-label">Before</span><span className="detail-kv-value">{row.before}</span></div>
                  <div className="detail-kv"><span className="detail-kv-label">After</span><span className="detail-kv-value">{row.after}</span></div>
                  <div className="detail-kv"><span className="detail-kv-label">Observed</span><span className="detail-kv-value">{formatRelativeTime(row.createdAt)}</span></div>
                </div>
              </div>
            )}
            rowActions={[
              {
                label: "Export event",
                onClick: (row) => handleExportEvent(row),
              },
              {
                label: "Flag for review",
                tone: "primary",
                closeOnClick: true,
                onClick: (row) => handleFlagForReview(row.id),
              },
            ]}
          />
        </Section>
      </PageShell>

      <ActionToast message={toastMessage} onDismiss={() => setToastMessage(undefined)} />
    </>
  );
}
