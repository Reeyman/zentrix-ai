"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PageShell from "./_ui/PageShell";
import KpiStrip from "./_ui/KpiStrip";
import { ActionToast, Section, Card, Divider } from "./_ui/Primitives";
import { useAppStore } from "@/lib/store";
import type { WorkspaceOverviewPayload } from "@/types/app-models";

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

export default function OverviewPage() {
  const router = useRouter();
  const workspaceId = useAppStore((state) => state.workspace);
  const [toastMessage, setToastMessage] = useState<string | undefined>();
  const [isExporting, setIsExporting] = useState(false);

  async function handleExportOverview() {
    try {
      setIsExporting(true);
      const response = await fetch("/api/overview", {
        headers: workspaceId ? { "x-workspace-id": workspaceId } : undefined,
      });
      const payload = await response.json() as {
        success?: boolean;
        error?: string;
        data?: WorkspaceOverviewPayload;
      };

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error || "Failed to export overview");
      }

      const campaigns = payload.data.campaigns ?? [];
      const users = payload.data.users ?? [];
      const totalSpend = campaigns.reduce((sum, campaign) => sum + campaign.spend, 0);
      const totalBudget = campaigns.reduce((sum, campaign) => sum + campaign.budget, 0);
      const avgRoas = campaigns.length ? campaigns.reduce((sum, campaign) => sum + campaign.roas, 0) / campaigns.length : 0;
      const csv = toCsv([
        ["metric", "value"],
        ["workspace", payload.data.currentWorkspace.name],
        ["campaigns", String(campaigns.length)],
        ["users", String(users.length)],
        ["active_campaigns", String(campaigns.filter((campaign) => campaign.status === "active").length)],
        ["total_spend", String(totalSpend)],
        ["total_budget", String(totalBudget)],
        ["avg_roas", avgRoas.toFixed(2)],
      ]);

      downloadTextFile(csv, `${payload.data.currentWorkspace.name.toLowerCase().replace(/\s+/g, "-")}-overview.csv`, "text/csv; charset=utf-8");
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
      subtitle="Mission Control · Last 7 days"
      actions={
        <>
          <button className="btn" onClick={() => void handleExportOverview()} disabled={isExporting}>{isExporting ? "Exporting..." : "Export"}</button>
          <button className="btn" onClick={() => router.push("/app/reports")}>Report</button>
        </>
      }
    >
      <Section>
        <KpiStrip
          items={[
            { label: "Spend", value: "$45,231", delta: "+20.1% vs last period" },
            { label: "Impressions", value: "2.3M", delta: "+15.3%" },
            { label: "Clicks", value: "45.2K", delta: "+8.7%" },
            { label: "CTR", value: "1.96%", delta: "-5.4%" },
            { label: "Conversions", value: "1,245", delta: "+12.3%" },
            { label: "ROAS", value: "3.24x", delta: "+0.8%" },
          ]}
        />
      </Section>

      <Divider />

      <div className="overview-grid" style={{ display: "grid", gridTemplateColumns: "1fr", gap: "20px", width: "100%", minWidth: 0 }}>
        <div className="overview-card card" style={{ width: "100%", minWidth: 0 }}>
          <h3 className="section-title">Spend Trend</h3>
          <div className="card-body">
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {[
                "Daily spend increased 15% this week",
                "Weekend spend 30% higher than weekdays",
                "Top performing day: Friday",
                "Budget utilization: 87% on track",
              ].map((text, i) => (
                <li key={i} style={{ 
                  position: "relative", 
                  paddingLeft: "16px", 
                  lineHeight: "1.4", 
                  margin: "10px 0",
                  fontSize: "14px",
                  fontWeight: "400",
                  color: "rgba(232,238,252,.78)",
                  opacity: 0.9
                }}>
                  <span style={{ position: "absolute", left: 0, opacity: 0.7 }}>•</span>
                  {text}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <aside className="overview-card insights-card" style={{ width: "100%", minWidth: 0 }}>
          <h3 className="section-title">Key Insights</h3>
          <ul>
            {[
              "Spend up 20% vs last period",
              "ROAS improved by 0.8x",
              "CPA decreased by 5%",
              "Top campaign: Summer Sale 2024",
              "Audience CTR above industry avg",
            ].map((text, i) => (
              <li key={i}>{text}</li>
            ))}
          </ul>
        </aside>

        <div className="overview-card card" style={{ width: "100%", minWidth: 0 }}>
          <h3 className="section-title">ROAS/CPA Trend</h3>
          <div className="card-body">
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {[
                "ROAS peaked on Tuesday at 4.2x",
                "CPA decreased by 12% this week",
                "Mobile ROAS 25% higher than desktop",
                "Best performing hour: 8-9 PM",
              ].map((text, i) => (
                <li key={i} style={{ 
                  position: "relative", 
                  paddingLeft: "16px", 
                  lineHeight: "1.4", 
                  margin: "10px 0",
                  fontSize: "14px",
                  fontWeight: "400",
                  color: "rgba(232,238,252,.78)",
                  opacity: 0.9
                }}>
                  <span style={{ position: "absolute", left: 0, opacity: 0.7 }}>•</span>
                  {text}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="overview-card card" style={{ width: "100%", minWidth: 0 }}>
          <h3 className="section-title">CTR & Conversion Rate</h3>
          <div className="card-body">
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {[
                "CTR improved 8% after creative refresh",
                "Conversion rate highest on weekends",
                "Landing page optimization: +15% CVR",
                "Form completion rate: 73%",
              ].map((text, i) => (
                <li key={i} style={{ 
                  position: "relative", 
                  paddingLeft: "16px", 
                  lineHeight: "1.4", 
                  margin: "10px 0",
                  fontSize: "14px",
                  fontWeight: "400",
                  color: "rgba(232,238,252,.78)",
                  opacity: 0.9
                }}>
                  <span style={{ position: "absolute", left: 0, opacity: 0.7 }}>•</span>
                  {text}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </PageShell>
    <ActionToast message={toastMessage} onDismiss={() => setToastMessage(undefined)} />
    </>
  );
}
