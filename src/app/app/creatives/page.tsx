"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import PageShell from "../_ui/PageShell";
import KpiStrip from "../_ui/KpiStrip";
import EnterpriseDataTable from "../_ui/EnterpriseDataTable";
import { Section, Card, Divider, InsightList, StatusBadge } from "../_ui/Primitives";
import { useAppStore } from "@/lib/store";
import type { AppCreativeRecord, AppMode, WorkspaceCreativesPayload } from "@/types/app-models";

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

function parseMetricValue(value: string, suffix: string) {
  const normalized = value.replace(suffix, "").replace(/,/g, "").trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildKpis(creatives: AppCreativeRecord[]) {
  const activeCreatives = creatives.filter((creative) => creative.status === "Active").length;
  const averageCtr = creatives.length
    ? creatives.reduce((sum, creative) => sum + parseMetricValue(creative.ctr, "%"), 0) / creatives.length
    : 0;
  const averageRoas = creatives.length
    ? creatives.reduce((sum, creative) => sum + parseMetricValue(creative.roas, "x"), 0) / creatives.length
    : 0;
  const totalConversions = creatives.reduce((sum, creative) => sum + parseMetricValue(creative.conversions, ""), 0);
  const openReviews = creatives.filter((creative) => creative.status === "Open").length;
  const uniqueFormats = new Set(creatives.map((creative) => creative.format)).size;

  return [
    { label: "Active creatives", value: String(activeCreatives), delta: `${creatives.length} creatives in scope` },
    { label: "Avg CTR", value: `${averageCtr.toFixed(2)}%`, delta: openReviews ? `${openReviews} in review` : "stable" },
    { label: "Avg ROAS", value: `${averageRoas.toFixed(1)}x`, delta: uniqueFormats ? `${uniqueFormats} formats live` : "awaiting data" },
    { label: "Conversions", value: totalConversions.toLocaleString(), delta: creatives.length ? "portfolio total" : "no results yet" },
    { label: "Watchlist", value: String(openReviews), delta: openReviews ? "requires review" : "clear" },
    { label: "Formats", value: String(uniqueFormats), delta: uniqueFormats ? "active in rotation" : "no assets" },
  ];
}

export default function CreativesPage() {
  const workspaceId = useAppStore((state) => state.workspace);
  const [showModal, setShowModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | undefined>();
  const [creatives, setCreatives] = useState<AppCreativeRecord[]>([]);
  const [mode, setMode] = useState<AppMode | null>(null);
  const [workspaceName, setWorkspaceName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const applyCreativesPayload = useCallback((payload: WorkspaceCreativesPayload, nextMode?: AppMode | null, nextWorkspaceName?: string) => {
    setCreatives((payload.creatives ?? []).slice());
    setMode(nextMode ?? payload.mode ?? null);
    setWorkspaceName(nextWorkspaceName ?? payload.currentWorkspace?.name ?? "");
  }, []);

  const loadCreatives = useCallback(async (showSuccessToast = false) => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const response = await fetch("/api/creatives", {
        headers: workspaceId ? { "x-workspace-id": workspaceId } : undefined,
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Failed to load creatives");
      }

      const data = payload.data as WorkspaceCreativesPayload;
      applyCreativesPayload(
        data,
        (payload.mode as AppMode | undefined) ?? data.mode ?? null,
        typeof payload.workspace?.name === "string" ? payload.workspace.name : data.currentWorkspace?.name ?? "",
      );

      if (showSuccessToast) {
        setToastMessage(`Creatives refreshed${payload.workspace?.name ? ` for ${payload.workspace.name}` : ""}.`);
      }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Failed to load creatives");
      setCreatives([]);
    } finally {
      setIsLoading(false);
    }
  }, [applyCreativesPayload, workspaceId]);

  useEffect(() => {
    void loadCreatives();
  }, [loadCreatives]);

  const kpis = useMemo(() => buildKpis(creatives), [creatives]);
  const activeCreatives = useMemo(() => creatives.filter((creative) => creative.status === "Active").length, [creatives]);

  function handleNewCreative() {
    setShowModal(true);
  }

  async function handleCreateCreative(formData: FormData) {
    const name = String(formData.get("name") ?? "").trim();
    const format = String(formData.get("format") ?? "").trim();
    const status = String(formData.get("status") ?? "").trim();

    try {
      setIsSubmitting(true);
      const response = await fetch("/api/creatives", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(workspaceId ? { "x-workspace-id": workspaceId } : {}),
        },
        body: JSON.stringify({ name, format, status }),
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Failed to create creative");
      }

      const data = payload.data as WorkspaceCreativesPayload;
      applyCreativesPayload(
        data,
        (payload.mode as AppMode | undefined) ?? data.mode ?? null,
        typeof payload.workspace?.name === "string" ? payload.workspace.name : data.currentWorkspace?.name ?? "",
      );
      setShowModal(false);
      setToastMessage(payload.message || `${name} created successfully.`);
    } catch (error) {
      setToastMessage(error instanceof Error ? error.message : "Failed to create creative");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleExportCreativeBrief(row: AppCreativeRecord) {
    const brief = [
      `Creative: ${row.name}`,
      `Format: ${row.format}`,
      `Status: ${row.status}`,
      `Impressions: ${row.impressions}`,
      `CTR: ${row.ctr}`,
      `Conversions: ${row.conversions}`,
      `ROAS: ${row.roas}`,
      "Next step: validate messaging, CTA strength, and fatigue before the next launch wave.",
    ].join("\n");

    downloadTextFile(brief, `${row.name.toLowerCase().replace(/\s+/g, "-")}-creative-brief.txt`, "text/plain;charset=utf-8");
    return `Creative brief exported for ${row.name}.`;
  }

  async function handleQueueCreativeReview(creativeId: string) {
    const response = await fetch(`/api/creatives/${creativeId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(workspaceId ? { "x-workspace-id": workspaceId } : {}),
      },
      body: JSON.stringify({ action: "review" }),
    });
    const payload = await response.json();

    if (!response.ok || !payload.success) {
      throw new Error(payload.error || "Failed to queue creative review");
    }

    const data = payload.data as WorkspaceCreativesPayload;
    applyCreativesPayload(
      data,
      (payload.mode as AppMode | undefined) ?? data.mode ?? null,
      typeof payload.workspace?.name === "string" ? payload.workspace.name : data.currentWorkspace?.name ?? "",
    );

    return payload.message || "Creative review queued successfully.";
  }

  return (
    <>
      <PageShell
        title="Creatives"
        subtitle={mode === "connected" ? `Track live creative performance for ${workspaceName || "the selected workspace"}` : `Track demo-backed creative performance for ${workspaceName || "the selected workspace"}`}
        actions={<button className="btn" onClick={handleNewCreative}>New Creative</button>}
      toolbar={(
        <>
          <div className="page-toolbar-group">
            <select className="input topbar-select topbar-control-range">
              <option>Creative ops view</option>
              <option>Testing view</option>
              <option>Executive view</option>
            </select>
            <span className="toolbar-pill">{activeCreatives} active creatives</span>
          </div>
          <div className="page-toolbar-meta">
            <span className="toolbar-pill">{mode === "connected" ? "Connected workspace" : "Demo workspace"}</span>
            <span className="toolbar-pill">{creatives.length} total assets</span>
          </div>
        </>
      )}
    >
      {loadError ? (
        <Section>
          <Card title="Creative data notice">
            <div>{loadError}</div>
          </Card>
        </Section>
      ) : null}

      <Section>
        <KpiStrip items={kpis} />
      </Section>

      <Divider />

      <Section title="Performance">
        <div className="grid-2">
          <Card title="Format Performance">
            <InsightList
              items={[
                "Video creatives remain the top performer at 4.5x ROAS",
                "Carousel units are holding at 4.1x ROAS",
                "Static images trail at 2.8x and need refresh planning",
                "Stories remain a viable mid-tier format at 3.2x",
              ]}
            />
          </Card>
          <Card title="CTA Tests">
            <InsightList
              items={[
                "Shop Now is the strongest CTA at 2.91% CTR",
                "Learn More continues to deliver stable engagement",
                "Get Started underperforms relative to top variants",
                "Sign Up should be deprioritized for the next iteration",
              ]}
            />
          </Card>
        </div>
      </Section>

      <Section title="Top performers">
        <EnterpriseDataTable
          data={creatives}
          loading={isLoading}
          searchPlaceholder="Search creatives, formats, or performance"
          searchFields={[(row) => row.name, (row) => row.format, (row) => row.status]}
          defaultSort={{ columnId: "roas", direction: "desc" }}
          views={[
            { id: "all", label: "All creatives" },
            { id: "active", label: "Active only", predicate: (row) => row.status === "Active" },
            { id: "video", label: "Video & carousel", predicate: (row) => row.format === "Video" || row.format === "Carousel" },
          ]}
          filters={[
            {
              id: "format",
              label: "Format",
              options: [
                { label: "Video", value: "Video" },
                { label: "Carousel", value: "Carousel" },
                { label: "Static", value: "Static" },
              ],
              getValue: (row) => row.format,
            },
            {
              id: "status",
              label: "Status",
              options: [
                { label: "Active", value: "Active" },
                { label: "Paused", value: "Paused" },
                { label: "Open", value: "Open" },
              ],
              getValue: (row) => row.status,
            },
          ]}
          columns={[
            { id: "name", header: "Creative", cell: (row) => row.name, sortValue: (row) => row.name },
            { id: "format", header: "Format", cell: (row) => row.format, sortValue: (row) => row.format },
            { id: "impressions", header: "Impressions", cell: (row) => row.impressions, sortValue: (row) => row.impressions, align: "right" },
            { id: "ctr", header: "CTR", cell: (row) => row.ctr, sortValue: (row) => row.ctr, align: "right" },
            { id: "conversions", header: "Conversions", cell: (row) => row.conversions, sortValue: (row) => row.conversions, align: "right" },
            { id: "roas", header: "ROAS", cell: (row) => row.roas, sortValue: (row) => Number(row.roas.replace("x", "")), align: "right" },
            { id: "status", header: "Status", cell: (row) => <StatusBadge status={row.status} />, sortValue: (row) => row.status },
          ]}
          detailTitle={(row) => row.name}
          detailSubtitle={(row) => `${row.format} creative · ${row.roas} ROAS`}
          renderDetail={(row) => (
            <div className="detail-grid">
              <div className="detail-block">
                <div className="detail-block-title">Creative snapshot</div>
                <div className="detail-kv"><span className="detail-kv-label">Format</span><span className="detail-kv-value">{row.format}</span></div>
                <div className="detail-kv"><span className="detail-kv-label">Impressions</span><span className="detail-kv-value">{row.impressions}</span></div>
                <div className="detail-kv"><span className="detail-kv-label">CTR</span><span className="detail-kv-value">{row.ctr}</span></div>
                <div className="detail-kv"><span className="detail-kv-label">Conversions</span><span className="detail-kv-value">{row.conversions}</span></div>
              </div>
              <div className="detail-block">
                <div className="detail-block-title">Optimization notes</div>
                <InsightList
                  items={[
                    `${row.name} should remain in the high-priority creative rotation`,
                    row.status === "Paused" ? "Review the latest test outcome before reactivating this asset" : "Protect delivery efficiency by monitoring frequency and fatigue weekly",
                    "Export a performance rationale if leadership asks why this asset is favored",
                  ]}
                />
              </div>
            </div>
          )}
          rowActions={[
            {
              label: "Export creative brief",
              onClick: (row) => handleExportCreativeBrief(row),
            },
            {
              label: "Queue creative review",
              tone: "primary",
              closeOnClick: true,
              onClick: (row) => handleQueueCreativeReview(row.id),
            },
          ]}
        />
      </Section>
      </PageShell>

      {/* New Creative Modal */}
      {showModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.7)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000
        }}>
          <div style={{
            background: "var(--bg-1)",
            border: "1px solid var(--border-0)",
            borderRadius: "16px",
            padding: "24px",
            width: "min(500px, 90vw)",
            maxHeight: "80vh",
            overflow: "auto"
          }}>
            <h2 style={{ margin: "0 0 16px 0", color: "var(--text-0)" }}>Create New Creative</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              void handleCreateCreative(new FormData(e.currentTarget));
            }}>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", marginBottom: "4px", color: "var(--text-1)" }}>Creative Name</label>
                <input 
                  type="text" 
                  name="name" 
                  required 
                  style={{
                    width: "100%",
                    padding: "8px",
                    background: "var(--bg-2)",
                    border: "1px solid var(--border-0)",
                    borderRadius: "4px",
                    color: "var(--text-0)"
                  }}
                  placeholder="e.g., Summer Sale Banner"
                />
              </div>
              
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", marginBottom: "4px", color: "var(--text-1)" }}>Format</label>
                <select 
                  name="format" 
                  required
                  style={{
                    width: "100%",
                    padding: "8px",
                    background: "var(--bg-2)",
                    border: "1px solid var(--border-0)",
                    borderRadius: "4px",
                    color: "var(--text-0)"
                  }}
                >
                  <option value="">Select format...</option>
                  <option value="Video">Video</option>
                  <option value="Carousel">Carousel</option>
                  <option value="Static">Static</option>
                  <option value="Story">Story</option>
                  <option value="Banner">Banner</option>
                </select>
              </div>
              
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", marginBottom: "4px", color: "var(--text-1)" }}>Status</label>
                <select 
                  name="status" 
                  required
                  style={{
                    width: "100%",
                    padding: "8px",
                    background: "var(--bg-2)",
                    border: "1px solid var(--border-0)",
                    borderRadius: "4px",
                    color: "var(--text-0)"
                  }}
                >
                  <option value="">Select status...</option>
                  <option value="Active">Active</option>
                  <option value="Paused">Paused</option>
                  <option value="Draft">Draft</option>
                </select>
              </div>
              
              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={isSubmitting}
                  style={{
                    padding: "8px 16px",
                    background: "var(--bg-2)",
                    border: "1px solid var(--border-0)",
                    borderRadius: "4px",
                    color: "var(--text-1)",
                    cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    padding: "8px 16px",
                    background: "#3b82f6",
                    border: "none",
                    borderRadius: "4px",
                    color: "white",
                    cursor: "pointer"
                  }}
                >
                  {isSubmitting ? "Creating..." : "Create Creative"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Message */}
      {toastMessage && (
        <div style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          background: "var(--bg-1)",
          border: "1px solid var(--border-0)",
          borderRadius: "8px",
          padding: "12px 16px",
          color: "var(--text-0)",
          zIndex: 1001,
          maxWidth: "300px"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>{toastMessage}</span>
            <button 
              onClick={() => setToastMessage(undefined)}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-1)",
                cursor: "pointer",
                padding: "0 0 0 8px"
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </>
  );
}
