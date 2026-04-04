"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import PageShell from "../../_ui/PageShell";
import KpiStrip from "../../_ui/KpiStrip";
import EnterpriseDataTable from "../../_ui/EnterpriseDataTable";
import { ActionToast, Section, Card, Divider, InsightList, StatusBadge } from "../../_ui/Primitives";
import WorkflowPanel from "@/components/workflows/WorkflowPanel";
import { buildBillingCycleWorkflow } from "@/components/workflows/workflow-presets";
import { useAppStore } from "@/lib/store";
import type { AppBillingSummary, AppInvoiceRecord, AppMode, WorkspaceBillingPayload } from "@/types/app-models";

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

function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function buildSimplePdf(lines: string[]) {
  const stream = `BT\n/F1 12 Tf\n50 760 Td\n18 TL\n${lines.map((line) => `(${escapePdfText(line)}) Tj T*`).join("\n")}\nET`;
  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj",
    "2 0 obj\n<< /Type /Pages /Count 1 /Kids [3 0 R] >>\nendobj",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj",
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj",
    `5 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object) => {
    offsets.push(pdf.length);
    pdf += `${object}\n`;
  });

  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;

  for (let index = 1; index <= objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return pdf;
}

function parseCurrency(value: string) {
  const parsed = Number(value.replace(/[$,]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildKpis(invoices: AppInvoiceRecord[]) {
  const monthlySpend = invoices.reduce((sum, invoice) => sum + parseCurrency(invoice.amount), 0);
  const openInvoices = invoices.filter((invoice) => invoice.status !== "Paid").length;
  const paidInvoices = invoices.filter((invoice) => invoice.status === "Paid").length;
  const pendingReviews = invoices.filter((invoice) => invoice.status === "Pending").length;

  return [
    { label: "Monthly spend", value: `$${monthlySpend.toLocaleString()}`, delta: invoices.length ? "portfolio total" : "awaiting invoices" },
    { label: "Open invoices", value: String(openInvoices), delta: openInvoices ? "due this cycle" : "clear" },
    { label: "Payment success", value: invoices.length ? `${Math.round((paidInvoices / invoices.length) * 100)}%` : "0%", delta: paidInvoices ? "closed items included" : "no paid invoices" },
    { label: "Pending review", value: String(pendingReviews), delta: pendingReviews ? "finance queue active" : "no escalations" },
    { label: "Billing contacts", value: "3", delta: "stable" },
  ];
}

const emptyBillingSummary: AppBillingSummary = {
  currentPlan: "Starter",
  billingInterval: "Monthly",
  nextBillingDate: "Pending subscription sync",
  trialEndDate: "No active trial",
  paymentMethod: "Pending provider sync",
  usageThisCycle: "Usage metering pending",
  upgradeMessage: "Need more limits? Upgrade your plan for more users, workspaces, and AI features.",
};

export default function BillingPage() {
  const workspaceId = useAppStore((state) => state.workspace);
  const [toastMessage, setToastMessage] = useState<string | undefined>();
  const [invoiceRows, setInvoiceRows] = useState<AppInvoiceRecord[]>([]);
  const [billingSummary, setBillingSummary] = useState<AppBillingSummary>(emptyBillingSummary);
  const [mode, setMode] = useState<AppMode | null>(null);
  const [workspaceName, setWorkspaceName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const applyBillingPayload = useCallback((payload: WorkspaceBillingPayload, nextMode?: AppMode | null, nextWorkspaceName?: string) => {
    setInvoiceRows((payload.invoices ?? []).slice());
    setBillingSummary(payload.summary ?? emptyBillingSummary);
    setMode(nextMode ?? payload.mode ?? null);
    setWorkspaceName(nextWorkspaceName ?? payload.currentWorkspace?.name ?? "");
  }, []);

  const loadBilling = useCallback(async (showSuccessToast = false) => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const response = await fetch("/api/billing", {
        headers: workspaceId ? { "x-workspace-id": workspaceId } : undefined,
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Failed to load billing");
      }

      const data = payload.data as WorkspaceBillingPayload;
      applyBillingPayload(
        data,
        (payload.mode as AppMode | undefined) ?? data.mode ?? null,
        typeof payload.workspace?.name === "string" ? payload.workspace.name : data.currentWorkspace?.name ?? "",
      );

      if (showSuccessToast) {
        setToastMessage(`Billing refreshed${payload.workspace?.name ? ` for ${payload.workspace.name}` : ""}.`);
      }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Failed to load billing");
      applyBillingPayload({ invoices: [], summary: emptyBillingSummary } as WorkspaceBillingPayload, null, "");
    } finally {
      setIsLoading(false);
    }
  }, [applyBillingPayload, workspaceId]);

  useEffect(() => {
    void loadBilling();
  }, [loadBilling]);

  const kpis = useMemo(() => buildKpis(invoiceRows), [invoiceRows]);
  const openInvoices = useMemo(() => invoiceRows.filter((invoice) => invoice.status !== "Paid").length, [invoiceRows]);
  const pendingReviews = useMemo(() => invoiceRows.filter((invoice) => invoice.status === "Pending").length, [invoiceRows]);

  function handleDownloadInvoices() {
    const csv = toCsv([
      ["invoice_id", "amount", "status", "due"],
      ...invoiceRows.map((invoice) => [invoice.id, invoice.amount, invoice.status, invoice.due]),
    ]);

    downloadTextFile(csv, "billing-invoices.csv", "text/csv; charset=utf-8");
    setToastMessage("Invoice export downloaded.");
  }

  function handleDownloadInvoicePdf(invoice: AppInvoiceRecord) {
    const pdf = buildSimplePdf([
      `Invoice ${invoice.id}`,
      `Amount: ${invoice.amount}`,
      `Status: ${invoice.status}`,
      `Due: ${invoice.due}`,
      "Prepared from the Zentrix AI billing workspace.",
    ]);

    downloadTextFile(pdf, `${invoice.id.toLowerCase()}.pdf`, "application/pdf");
    return `${invoice.id} PDF downloaded.`;
  }

  async function handleQueueFinanceReview(invoiceId: string) {
    const response = await fetch(`/api/billing/${invoiceId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(workspaceId ? { "x-workspace-id": workspaceId } : {}),
      },
      body: JSON.stringify({ action: "review" }),
    });
    const payload = await response.json();

    if (!response.ok || !payload.success) {
      throw new Error(payload.error || "Failed to queue finance review");
    }

    const data = payload.data as WorkspaceBillingPayload;
    applyBillingPayload(
      data,
      (payload.mode as AppMode | undefined) ?? data.mode ?? null,
      typeof payload.workspace?.name === "string" ? payload.workspace.name : data.currentWorkspace?.name ?? "",
    );

    return payload.message || "Finance review queued successfully.";
  }

  return (
    <>
    <PageShell
      title="Billing"
      subtitle={mode === "connected" ? `Monitor live billing for ${workspaceName || "the selected workspace"}` : `Monitor demo-backed billing for ${workspaceName || "the selected workspace"}`}
      actions={<button className="btn" onClick={handleDownloadInvoices}>Download invoice</button>}
      toolbar={(
        <>
          <div className="page-toolbar-group">
            <select className="input topbar-select topbar-control-range">
              <option>Finance view</option>
              <option>Cash flow view</option>
              <option>Collections view</option>
            </select>
            <span className="toolbar-pill">{kpis[0]?.value ?? "$0"} monthly spend</span>
          </div>
          <div className="page-toolbar-meta">
            <span className="toolbar-pill">{invoiceRows.filter((invoice) => invoice.status !== "Paid").length} invoices due</span>
            <span className="toolbar-pill">{mode === "connected" ? "Connected workspace" : "Demo workspace"}</span>
          </div>
        </>
      )}
    >
      {loadError ? (
        <Section>
          <Card title="Billing data notice">
            <div>{loadError}</div>
          </Card>
        </Section>
      ) : null}

      <Section>
        <KpiStrip items={kpis} />
      </Section>

      <Divider />

      <Section title="Workflow guidance">
        <WorkflowPanel
          {...buildBillingCycleWorkflow({
            currentPlan: billingSummary.currentPlan,
            openInvoices,
            pendingReviews,
            nextBillingDate: billingSummary.nextBillingDate,
          })}
        />
      </Section>

      <Section title="Current billing">
        <div className="grid-2">
          <Card title={billingSummary.currentPlan}>
            <InsightList
              items={[
                `Billing interval: ${billingSummary.billingInterval}`,
                `Next billing date: ${billingSummary.nextBillingDate}`,
                `Trial end date: ${billingSummary.trialEndDate}`,
              ]}
            />
          </Card>
          <Card title="Usage and billing status">
            <InsightList
              items={[
                `Payment method: ${billingSummary.paymentMethod}`,
                `Usage this cycle: ${billingSummary.usageThisCycle}`,
                billingSummary.upgradeMessage,
              ]}
            />
          </Card>
        </div>
      </Section>

      <Divider />

      <Section title="Billing overview">
        <div className="grid-2">
          <Card title="Payment health">
            <InsightList
              items={[
                "Primary payment method validated successfully",
                "Two invoices require review before their due dates",
                "Spend pacing remains inside approved thresholds",
                "No failed charges were recorded this quarter",
              ]}
            />
          </Card>
          <Card title="Controls">
            <InsightList
              items={[
                "Finance and ops both receive invoice alerts",
                "Available credit can offset the next billing cycle",
                "Tax settings are reviewed monthly by finance",
                "Budget overrun notifications trigger at 85% pacing",
              ]}
            />
          </Card>
        </div>
      </Section>

      <Section title="Invoices">
        <EnterpriseDataTable
          data={invoiceRows}
          loading={isLoading}
          searchPlaceholder="Search invoices or payment status"
          searchFields={[(row) => row.id, (row) => row.amount, (row) => row.status, (row) => row.due]}
          defaultSort={{ columnId: "due", direction: "asc" }}
          views={[
            { id: "all", label: "All invoices" },
            { id: "open", label: "Open items", predicate: (row) => row.status !== "Paid" },
            { id: "paid", label: "Paid only", predicate: (row) => row.status === "Paid" },
          ]}
          filters={[
            {
              id: "status",
              label: "Status",
              options: [
                { label: "Scheduled", value: "Scheduled" },
                { label: "Pending", value: "Pending" },
                { label: "Paid", value: "Paid" },
              ],
              getValue: (row) => row.status,
            },
          ]}
          columns={[
            { id: "invoice", header: "Invoice", cell: (row) => row.id, sortValue: (row) => row.id },
            { id: "amount", header: "Amount", cell: (row) => row.amount, sortValue: (row) => Number(row.amount.replace(/[$,]/g, "")), align: "right" },
            { id: "status", header: "Status", cell: (row) => <StatusBadge status={row.status} />, sortValue: (row) => row.status },
            { id: "due", header: "Due date", cell: (row) => row.due, sortValue: (row) => row.due },
          ]}
          detailTitle={(row) => row.id}
          detailSubtitle={(row) => `${row.amount} · due ${row.due}`}
          renderDetail={(row) => (
            <div className="detail-grid">
              <div className="detail-block">
                <div className="detail-block-title">Invoice status</div>
                <div className="detail-kv"><span className="detail-kv-label">Amount</span><span className="detail-kv-value">{row.amount}</span></div>
                <div className="detail-kv"><span className="detail-kv-label">Due date</span><span className="detail-kv-value">{row.due}</span></div>
                <div className="detail-kv"><span className="detail-kv-label">Status</span><span className="detail-kv-value"><StatusBadge status={row.status} /></span></div>
                <div className="detail-kv"><span className="detail-kv-label">Collection path</span><span className="detail-kv-value">Finance monitored</span></div>
              </div>
              <div className="detail-block">
                <div className="detail-block-title">Recommended next step</div>
                <InsightList
                  items={[
                    row.status === "Paid" ? "Archive the invoice in the closed cycle pack" : "Keep the invoice in the active finance review lane",
                    "Share a payment-ready summary with finance leadership if requested",
                    "Escalate only if the due date approaches without status movement",
                  ]}
                />
              </div>
            </div>
          )}
          rowActions={[
            {
              label: "Download PDF",
              onClick: (row) => handleDownloadInvoicePdf(row),
            },
            {
              label: "Queue finance review",
              tone: "primary",
              closeOnClick: true,
              onClick: (row) => handleQueueFinanceReview(row.id),
            },
          ]}
        />
      </Section>
    </PageShell>
    <ActionToast message={toastMessage} onDismiss={() => setToastMessage(undefined)} />
    </>
  );
}
