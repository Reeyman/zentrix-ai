"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import PageShell from "../../_ui/PageShell";
import KpiStrip from "../../_ui/KpiStrip";
import EnterpriseDataTable from "../../_ui/EnterpriseDataTable";
import { Section, Card, Divider, InsightList, StatusBadge, ActionToast } from "../../_ui/Primitives";
import ApprovalWorkflow from "@/components/workflows/ApprovalWorkflow";
import WorkflowPanel from "@/components/workflows/WorkflowPanel";
import { buildUserRoleManagementWorkflow } from "@/components/workflows/workflow-presets";
import { useAppStore } from "@/lib/store";
import type { AppMode, AppRoleApproval, AppRoleRecord, WorkspaceRolesPayload } from "@/types/app-models";

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

const permissionMatrix = [
  { module: "Campaigns", view: "All", edit: "Scoped", approve: "Yes", admin: "No" },
  { module: "Billing", view: "Scoped", edit: "Restricted", approve: "Yes", admin: "No" },
  { module: "Integrations", view: "All", edit: "Restricted", approve: "No", admin: "No" },
  { module: "Audit Log", view: "All", edit: "No", approve: "No", admin: "No" },
  { module: "Roles", view: "All", edit: "Restricted", approve: "Yes", admin: "Yes" },
];

function buildKpis(roles: AppRoleRecord[], approvals: AppRoleApproval[]) {
  const activeRoles = roles.filter((role) => role.status === "Active").length;
  const customRoles = Math.max(0, roles.length - 2);
  const adminSeats = roles
    .filter((role) => role.scope === "Global" || role.name.toLowerCase().includes("admin"))
    .reduce((sum, role) => sum + Number(role.users || 0), 0);
  const reviewsDue = roles.filter((role) => role.reviewDue === "Pending" || role.reviewDue === "Today").length;
  const policyChanges = approvals.length;

  return [
    { label: "Active roles", value: String(roles.length), delta: `${activeRoles} currently active` },
    { label: "Custom roles", value: String(customRoles), delta: policyChanges ? `${policyChanges} changes in queue` : "stable" },
    { label: "Admins", value: String(adminSeats), delta: adminSeats ? "elevated assignments" : "none assigned" },
    { label: "Review due", value: String(reviewsDue), delta: reviewsDue ? "scheduled from actions" : "clear" },
    { label: "Policy changes", value: String(policyChanges), delta: policyChanges ? "awaiting governance" : "none queued" },
  ];
}

export default function RolesPage() {
  const workspaceId = useAppStore((state) => state.workspace);
  const [showModal, setShowModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | undefined>();
  const [roles, setRoles] = useState<AppRoleRecord[]>([]);
  const [approvalQueue, setApprovalQueue] = useState<AppRoleApproval[]>([]);
  const [mode, setMode] = useState<AppMode | null>(null);
  const [workspaceName, setWorkspaceName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const applyRolesPayload = useCallback((payload: WorkspaceRolesPayload, nextMode?: AppMode | null, nextWorkspaceName?: string) => {
    setRoles((payload.roles ?? []).slice());
    setApprovalQueue((payload.approvals ?? []).slice());
    setMode(nextMode ?? payload.mode ?? null);
    setWorkspaceName(nextWorkspaceName ?? payload.currentWorkspace?.name ?? "");
  }, []);

  const loadRoles = useCallback(async (showSuccessToast = false) => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const response = await fetch("/api/roles", {
        headers: workspaceId ? { "x-workspace-id": workspaceId } : undefined,
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Failed to load roles");
      }

      const data = payload.data as WorkspaceRolesPayload;
      applyRolesPayload(
        data,
        (payload.mode as AppMode | undefined) ?? data.mode ?? null,
        typeof payload.workspace?.name === "string" ? payload.workspace.name : data.currentWorkspace?.name ?? "",
      );

      if (showSuccessToast) {
        setToastMessage(`Roles refreshed${payload.workspace?.name ? ` for ${payload.workspace.name}` : ""}.`);
      }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Failed to load roles");
      applyRolesPayload({ roles: [], approvals: [] } as WorkspaceRolesPayload, null, "");
    } finally {
      setIsLoading(false);
    }
  }, [applyRolesPayload, workspaceId]);

  useEffect(() => {
    void loadRoles();
  }, [loadRoles]);

  const kpis = useMemo(() => buildKpis(roles, approvalQueue), [approvalQueue, roles]);

  async function handleCreateRole(formData: FormData) {
    const name = String(formData.get("name") ?? "").trim();
    const scope = String(formData.get("scope") ?? "").trim();
    const approver = String(formData.get("approver") ?? "").trim();

    if (!name || !scope || !approver) {
      setToastMessage("Role name, scope, and approver are required.");
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch("/api/roles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(workspaceId ? { "x-workspace-id": workspaceId } : {}),
        },
        body: JSON.stringify({ name, scope, approver }),
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Failed to create role");
      }

      const data = payload.data as WorkspaceRolesPayload;
      applyRolesPayload(
        data,
        (payload.mode as AppMode | undefined) ?? data.mode ?? null,
        typeof payload.workspace?.name === "string" ? payload.workspace.name : data.currentWorkspace?.name ?? "",
      );
      setShowModal(false);
      setToastMessage(payload.message || `${name} role created successfully.`);
    } catch (error) {
      setToastMessage(error instanceof Error ? error.message : "Failed to create role");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleExportApproval(change: AppRoleApproval) {
    const csv = toCsv([
      ["id", "change", "requester", "approvers", "due", "status"],
      [change.id, change.change, change.requester, change.approvers, change.due, change.status],
    ]);

    downloadTextFile(csv, `${change.id.toLowerCase()}-approval.csv`, "text/csv; charset=utf-8");
    return `${change.change} exported successfully.`;
  }

  async function handleAdvanceWorkflow(changeId: string) {
    const response = await fetch(`/api/roles/approvals/${changeId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(workspaceId ? { "x-workspace-id": workspaceId } : {}),
      },
      body: JSON.stringify({ action: "advance" }),
    });
    const payload = await response.json();

    if (!response.ok || !payload.success) {
      throw new Error(payload.error || "Failed to advance workflow");
    }

    const data = payload.data as WorkspaceRolesPayload;
    applyRolesPayload(
      data,
      (payload.mode as AppMode | undefined) ?? data.mode ?? null,
      typeof payload.workspace?.name === "string" ? payload.workspace.name : data.currentWorkspace?.name ?? "",
    );

    return payload.message || "Approval workflow advanced successfully.";
  }

  function handleExportRole(role: AppRoleRecord) {
    const csv = toCsv([
      ["id", "name", "users", "scope", "status", "review_due", "approver"],
      [role.id, role.name, role.users, role.scope, role.status, role.reviewDue, role.approver],
    ]);

    downloadTextFile(csv, `${role.name.toLowerCase().replace(/\s+/g, "-")}-role.csv`, "text/csv; charset=utf-8");
    return `${role.name} definition exported.`;
  }

  async function handleScheduleReview(roleId: string) {
    const response = await fetch(`/api/roles/${roleId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(workspaceId ? { "x-workspace-id": workspaceId } : {}),
      },
      body: JSON.stringify({ action: "review" }),
    });
    const payload = await response.json();

    if (!response.ok || !payload.success) {
      throw new Error(payload.error || "Failed to schedule role review");
    }

    const data = payload.data as WorkspaceRolesPayload;
    applyRolesPayload(
      data,
      (payload.mode as AppMode | undefined) ?? data.mode ?? null,
      typeof payload.workspace?.name === "string" ? payload.workspace.name : data.currentWorkspace?.name ?? "",
    );

    return payload.message || "Role review scheduled successfully.";
  }

  const dueReviewCount = useMemo(() => roles.filter((role) => role.reviewDue === "Pending" || role.reviewDue === "Today").length, [roles]);

  return (
    <>
      <PageShell
        title="Roles & Permissions"
        subtitle={mode === "connected" ? `Control live access policies for ${workspaceName || "the selected workspace"}` : `Control demo-backed access policies for ${workspaceName || "the selected workspace"}`}
        actions={<button className="btn" onClick={() => setShowModal(true)}>Create role</button>}
        toolbar={(
          <>
            <div className="page-toolbar-group">
              <select className="input topbar-select topbar-control-range">
                <option>Access control view</option>
                <option>Approval view</option>
                <option>Governance view</option>
              </select>
              <span className="toolbar-pill">{roles.length} active roles</span>
            </div>
            <div className="page-toolbar-meta">
              <span className="toolbar-pill">{dueReviewCount} reviews due</span>
              <span className="toolbar-pill">{mode === "connected" ? "Connected workspace" : "Demo workspace"}</span>
            </div>
          </>
        )}
      >
        {loadError ? (
          <Section>
            <Card title="Roles data notice">
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
            <ApprovalWorkflow approvals={approvalQueue} reviewsDue={dueReviewCount} />
            <WorkflowPanel
              {...buildUserRoleManagementWorkflow({
                rolesCount: roles.length,
                policyChanges: approvalQueue.length,
                reviewsDue: dueReviewCount,
              })}
            />
          </div>
        </Section>

        <Divider />

        <Section title="Role coverage">
          <div className="grid-2">
            <Card title="Admin roles">
              <InsightList
                items={[
                  "Platform Admin retains full workspace access",
                  "Finance Reviewer can approve billing changes",
                  "Security audits elevated access weekly",
                  "Manager roles remain restricted to owned accounts",
                ]}
              />
            </Card>
            <Card title="Approval flows">
              <InsightList
                items={[
                  "Permission edits require a two-step review flow",
                  "Critical policy changes notify security immediately",
                  "Role templates reduce provisioning time by 35%",
                  "Dormant admin rights are removed after 30 days",
                ]}
              />
            </Card>
          </div>
        </Section>

        <Section title="Approval workflows">
          <EnterpriseDataTable
            data={approvalQueue}
            loading={isLoading}
            searchPlaceholder="Search approval requests"
            searchFields={[(row) => row.change, (row) => row.requester, (row) => row.approvers, (row) => row.status]}
            defaultSort={{ columnId: "due", direction: "asc" }}
            views={[
              { id: "all", label: "All approvals" },
              { id: "pending", label: "Pending now", predicate: (row) => row.status === "Pending" || row.status === "Open" },
              { id: "scheduled", label: "Scheduled", predicate: (row) => row.status === "Scheduled" },
            ]}
            filters={[
              {
                id: "status",
                label: "Status",
                options: [
                  { label: "Pending", value: "Pending" },
                  { label: "Open", value: "Open" },
                  { label: "Scheduled", value: "Scheduled" },
                ],
                getValue: (row) => row.status,
              },
            ]}
            columns={[
              { id: "change", header: "Change", cell: (row) => row.change, sortValue: (row) => row.change },
              { id: "requester", header: "Requester", cell: (row) => row.requester, sortValue: (row) => row.requester },
              { id: "approvers", header: "Approvers", cell: (row) => row.approvers, sortValue: (row) => row.approvers },
              { id: "due", header: "Due", cell: (row) => row.due, sortValue: (row) => row.due },
              { id: "status", header: "Status", cell: (row) => <StatusBadge status={row.status} />, sortValue: (row) => row.status },
            ]}
            detailTitle={(row) => row.change}
            detailSubtitle={(row) => `${row.requester} · ${row.approvers}`}
            renderDetail={(row) => (
              <div className="detail-grid">
                <div className="detail-block">
                  <div className="detail-block-title">Workflow snapshot</div>
                  <div className="detail-kv"><span className="detail-kv-label">Requester</span><span className="detail-kv-value">{row.requester}</span></div>
                  <div className="detail-kv"><span className="detail-kv-label">Approvers</span><span className="detail-kv-value">{row.approvers}</span></div>
                  <div className="detail-kv"><span className="detail-kv-label">Due</span><span className="detail-kv-value">{row.due}</span></div>
                  <div className="detail-kv"><span className="detail-kv-label">Status</span><span className="detail-kv-value"><StatusBadge status={row.status} /></span></div>
                </div>
                <div className="detail-block">
                  <div className="detail-block-title">Approval guidance</div>
                  <InsightList
                    items={[
                      `${row.change} requires confirmation from ${row.approvers}`,
                      "Store the final decision in the audit trail once review is complete",
                      "Escalate if the SLA is at risk or a dependency is unresolved",
                    ]}
                  />
                </div>
              </div>
            )}
            rowActions={[
              {
                label: "Export request",
                onClick: (row) => handleExportApproval(row),
              },
              {
                label: "Advance workflow",
                tone: "primary",
                closeOnClick: true,
                onClick: (row) => handleAdvanceWorkflow(row.id),
              },
            ]}
          />
        </Section>

        <Section title="Permission matrix">
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Module</th>
                  <th>View</th>
                  <th>Edit</th>
                  <th>Approve</th>
                  <th>Admin</th>
                </tr>
              </thead>
              <tbody>
                {permissionMatrix.map((row) => (
                  <tr key={row.module}>
                    <td>{row.module}</td>
                    <td><span className="toolbar-pill">{row.view}</span></td>
                    <td><span className="toolbar-pill">{row.edit}</span></td>
                    <td><span className="toolbar-pill">{row.approve}</span></td>
                    <td><span className="toolbar-pill">{row.admin}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="Active roles">
          <EnterpriseDataTable
            data={roles}
            loading={isLoading}
            searchPlaceholder="Search roles, scopes, or approvers"
            searchFields={[(row) => row.name, (row) => row.scope, (row) => row.approver]}
            defaultSort={{ columnId: "name", direction: "asc" }}
            views={[
              { id: "all", label: "All roles" },
              { id: "global", label: "Global roles", predicate: (row) => row.scope === "Global" },
              { id: "functional", label: "Functional roles", predicate: (row) => row.scope !== "Global" },
            ]}
            filters={[
              {
                id: "scope",
                label: "Scope",
                options: [
                  { label: "Global", value: "Global" },
                  { label: "Billing", value: "Billing" },
                  { label: "Campaigns", value: "Campaigns" },
                  { label: "Reporting", value: "Reporting" },
                ],
                getValue: (row) => row.scope,
              },
            ]}
            columns={[
              { id: "name", header: "Role", cell: (row) => row.name, sortValue: (row) => row.name },
              { id: "users", header: "Users", cell: (row) => row.users, sortValue: (row) => Number(row.users), align: "right" },
              { id: "scope", header: "Scope", cell: (row) => row.scope, sortValue: (row) => row.scope },
              { id: "reviewDue", header: "Review due", cell: (row) => row.reviewDue, sortValue: (row) => row.reviewDue },
              { id: "status", header: "Status", cell: (row) => <StatusBadge status={row.status} />, sortValue: (row) => row.status },
            ]}
            detailTitle={(row) => row.name}
            detailSubtitle={(row) => `${row.scope} scope · review due ${row.reviewDue}`}
            renderDetail={(row) => (
              <div className="detail-grid">
                <div className="detail-block">
                  <div className="detail-block-title">Role assignment</div>
                  <div className="detail-kv"><span className="detail-kv-label">Users</span><span className="detail-kv-value">{row.users}</span></div>
                  <div className="detail-kv"><span className="detail-kv-label">Scope</span><span className="detail-kv-value">{row.scope}</span></div>
                  <div className="detail-kv"><span className="detail-kv-label">Approver</span><span className="detail-kv-value">{row.approver}</span></div>
                  <div className="detail-kv"><span className="detail-kv-label">Review due</span><span className="detail-kv-value">{row.reviewDue}</span></div>
                </div>
                <div className="detail-block">
                  <div className="detail-block-title">Control notes</div>
                  <InsightList
                    items={[
                      `${row.name} remains aligned to the ${row.scope.toLowerCase()} control perimeter`,
                      `Next approval checkpoint is owned by ${row.approver}`,
                      "Escalate if the review date slips or if privileges exceed the template baseline",
                    ]}
                  />
                </div>
              </div>
          )}
          rowActions={[
            {
              label: "Export role",
              onClick: (row) => handleExportRole(row),
            },
            {
              label: "Schedule review",
              tone: "primary",
              closeOnClick: true,
              onClick: (row) => handleScheduleReview(row.id),
            },
          ]}
        />
      </Section>
    </PageShell>

    {showModal ? (
      <div style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}>
        <div style={{
          background: "var(--bg-1)",
          border: "1px solid var(--border-0)",
          borderRadius: "16px",
          padding: "24px",
          width: "min(500px, 90vw)",
        }}>
          <h2 style={{ margin: "0 0 16px 0", color: "var(--text-0)" }}>Create Role</h2>
          <form onSubmit={(event) => {
            event.preventDefault();
            void handleCreateRole(new FormData(event.currentTarget));
          }}>
            <div style={{ display: "grid", gap: "16px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "6px", color: "var(--text-1)" }}>Role name</label>
                <input className="input" name="name" placeholder="e.g. Regional Manager" required />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "6px", color: "var(--text-1)" }}>Scope</label>
                <select className="input topbar-select" name="scope" required>
                  <option value="">Select scope...</option>
                  <option value="Global">Global</option>
                  <option value="Billing">Billing</option>
                  <option value="Campaigns">Campaigns</option>
                  <option value="Reporting">Reporting</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "6px", color: "var(--text-1)" }}>Approver</label>
                <input className="input" name="approver" placeholder="e.g. Security Council" required />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "20px" }}>
              <button type="button" className="btn" disabled={isSubmitting} onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={isSubmitting}>{isSubmitting ? "Creating..." : "Create role"}</button>
            </div>
          </form>
        </div>
      </div>
    ) : null}

    <ActionToast message={toastMessage} onDismiss={() => setToastMessage(undefined)} />
    </>
  );
}
