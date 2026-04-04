"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import PageShell from "../../_ui/PageShell";
import KpiStrip from "../../_ui/KpiStrip";
import EnterpriseDataTable from "../../_ui/EnterpriseDataTable";
import { ActionToast, Section, Card, Divider, InsightList, StatusBadge } from "../../_ui/Primitives";
import UserOnboardingWorkflow from "@/components/workflows/UserOnboardingWorkflow";
import { useAppStore } from "@/lib/store";
import type { AppMode, AppWorkspaceUser, WorkspaceRole } from "@/types/app-models";

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

function formatRoleLabel(role: WorkspaceRole) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function formatAuthProvider(provider: AppWorkspaceUser["authProvider"]) {
  return provider === "sso" ? "SSO" : "Email";
}

function formatRelativeTime(value: string) {
  if (!value) {
    return "No recent sign-in";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Unavailable";
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

  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d ago`;
}

function buildKpis(users: AppWorkspaceUser[], mode: AppMode | null) {
  const activeUsers = users.filter((user) => user.status === "active").length;
  const pendingUsers = users.filter((user) => user.status === "pending").length;
  const disabledUsers = users.filter((user) => user.status === "disabled").length;
  const adminUsers = users.filter((user) => user.role === "owner" || user.role === "admin").length;
  const protectedUsers = users.filter((user) => user.mfaEnabled || user.authProvider === "sso").length;
  const ssoUsers = users.filter((user) => user.authProvider === "sso").length;

  return [
    { label: "Active users", value: String(activeUsers), delta: `${users.length} identities in scope` },
    { label: "Pending invites", value: String(pendingUsers), delta: pendingUsers ? "needs review" : "clear" },
    { label: "Admins", value: String(adminUsers), delta: adminUsers ? "elevated access" : "none assigned" },
    { label: "Protected", value: String(protectedUsers), delta: `${ssoUsers} SSO-backed accounts` },
    { label: "Disabled", value: String(disabledUsers), delta: disabledUsers ? "requires review" : "stable" },
    { label: "Directory", value: mode === "connected" ? "Live" : mode === "demo" ? "Demo" : "—", delta: mode === "connected" ? "workspace membership" : "local fallback" },
  ];
}

export default function UsersPage() {
  const workspaceId = useAppStore((state) => state.workspace);
  const [users, setUsers] = useState<AppWorkspaceUser[]>([]);
  const [mode, setMode] = useState<AppMode | null>(null);
  const [workspaceName, setWorkspaceName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | undefined>();

  const applyUsersPayload = useCallback((nextUsers: AppWorkspaceUser[], nextMode?: AppMode | null, nextWorkspaceName?: string) => {
    setUsers(nextUsers);
    setMode(nextMode ?? null);
    setWorkspaceName(nextWorkspaceName ?? "");
  }, []);

  const loadUsers = useCallback(async (showSuccessToast = false) => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const response = await fetch("/api/users", {
        headers: workspaceId ? { "x-workspace-id": workspaceId } : undefined,
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Failed to load users");
      }

      const nextUsers = (payload.data as AppWorkspaceUser[]) ?? [];
      applyUsersPayload(
        nextUsers,
        (payload.mode as AppMode | undefined) ?? null,
        typeof payload.workspace?.name === "string" ? payload.workspace.name : "",
      );

      if (showSuccessToast) {
        setToastMessage(`Directory refreshed${payload.workspace?.name ? ` for ${payload.workspace.name}` : ""}.`);
      }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Failed to load users");
      applyUsersPayload([], null, "");
    } finally {
      setIsLoading(false);
    }
  }, [applyUsersPayload, workspaceId]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const kpis = useMemo(() => buildKpis(users, mode), [mode, users]);
  const activeUsers = useMemo(() => users.filter((user) => user.status === "active").length, [users]);
  const protectedUsers = useMemo(() => users.filter((user) => user.mfaEnabled || user.authProvider === "sso").length, [users]);
  const pendingUsers = useMemo(() => users.filter((user) => user.status === "pending").length, [users]);
  const latestActivity = useMemo(() => {
    return users.reduce<string>((current, user) => {
      if (!user.lastActiveAt) {
        return current;
      }

      if (!current) {
        return user.lastActiveAt;
      }

      return new Date(user.lastActiveAt).getTime() > new Date(current).getTime() ? user.lastActiveAt : current;
    }, "");
  }, [users]);

  async function handleSendReminder(user: AppWorkspaceUser) {
    const response = await fetch(`/api/users/${user.id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(workspaceId ? { "x-workspace-id": workspaceId } : {}),
      },
      body: JSON.stringify({ action: "remind" }),
    });
    const payload = await response.json();

    if (!response.ok || !payload.success) {
      throw new Error(payload.error || "Failed to prepare reminder package");
    }

    const data = payload.data as { content: string; contentType: string; filename: string };
    downloadTextFile(data.content, data.filename, data.contentType);
    return payload.message || `Reminder package prepared for ${user.email}.`;
  }

  async function handleQueueAccessReview(userId: string) {
    const response = await fetch(`/api/users/${userId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(workspaceId ? { "x-workspace-id": workspaceId } : {}),
      },
      body: JSON.stringify({ action: "review" }),
    });
    const payload = await response.json();

    if (!response.ok || !payload.success) {
      throw new Error(payload.error || "Failed to queue access review");
    }

    const data = payload.data as {
      users: AppWorkspaceUser[];
      currentWorkspace?: { name?: string };
      mode?: AppMode | null;
    };
    applyUsersPayload(
      (data.users ?? []).slice(),
      (payload.mode as AppMode | undefined) ?? data.mode ?? null,
      typeof payload.workspace?.name === "string" ? payload.workspace.name : data.currentWorkspace?.name ?? "",
    );

    return payload.message || "Access review queued successfully.";
  }

  return (
    <>
      <PageShell
        title="Users"
        subtitle={mode === "connected" ? "Manage live workspace identities and access posture" : "Manage workspace identities with demo-backed directory data"}
        actions={<button className="btn" onClick={() => void loadUsers(true)}>Refresh directory</button>}
        toolbar={(
          <>
            <div className="page-toolbar-group">
              <select className="input topbar-select topbar-control-range">
                <option>Directory view</option>
                <option>Security view</option>
                <option>Access review view</option>
              </select>
              <span className="toolbar-pill">{activeUsers} active identities</span>
            </div>
            <div className="page-toolbar-meta">
              <span className="toolbar-pill">{protectedUsers} protected accounts</span>
              <span className="toolbar-pill">{mode === "connected" ? "Connected workspace" : "Demo workspace"}</span>
            </div>
          </>
        )}
      >
        {loadError ? (
          <Section>
            <Card title="Directory data notice">
              <div>{loadError}</div>
            </Card>
          </Section>
        ) : null}

        <Section>
          <KpiStrip items={kpis} />
        </Section>

        <Divider />

        <Section title="Workflow guidance">
          <UserOnboardingWorkflow
            usersCount={users.length}
            activeUsers={activeUsers}
            pendingUsers={pendingUsers}
            protectedUsers={protectedUsers}
            workspaceName={workspaceName}
          />
        </Section>

        <Divider />

        <Section title="Directory sync">
          <div className="grid-2">
            <Card title="Identity source">
              <InsightList
                items={[
                  mode === "connected" ? `Workspace members are loaded live from ${workspaceName || "the selected workspace"}` : `Workspace members are loaded from the local demo directory for ${workspaceName || "the selected workspace"}`,
                  `${users.filter((user) => user.authProvider === "sso").length} SSO identities and ${users.filter((user) => user.authProvider === "email").length} email identities are currently mapped`,
                  latestActivity ? `Latest observed sign-in activity: ${formatRelativeTime(latestActivity)}` : "No recent sign-in activity has been recorded yet",
                ]}
              />
            </Card>
            <Card title="Access posture">
              <InsightList
                items={[
                  `${users.filter((user) => user.role === "owner" || user.role === "admin").length} elevated-access accounts are assigned to this workspace`,
                  pendingUsers ? `${pendingUsers} pending identities should be accepted or revoked within the current review window` : "No pending invites require immediate action",
                  protectedUsers ? `${protectedUsers} accounts are protected by SSO or MFA-backed controls` : "No protected accounts detected in the current directory snapshot",
                ]}
              />
            </Card>
          </div>
        </Section>

        <Section title="All users">
          <EnterpriseDataTable
            data={users}
            loading={isLoading}
            searchPlaceholder="Search users, emails, or roles"
            searchFields={[(row) => row.name, (row) => row.email, (row) => row.role, (row) => row.status, (row) => row.authProvider]}
            defaultSort={{ columnId: "name", direction: "asc" }}
            views={[
              { id: "all", label: "All users" },
              { id: "admins", label: "Admins only", predicate: (row) => row.role === "owner" || row.role === "admin" },
              { id: "access-review", label: "Access review", predicate: (row) => row.status !== "active" },
            ]}
            filters={[
              {
                id: "role",
                label: "Role",
                options: [
                  { label: "Owner", value: "owner" },
                  { label: "Admin", value: "admin" },
                  { label: "Member", value: "member" },
                  { label: "Viewer", value: "viewer" },
                ],
                getValue: (row) => row.role,
              },
              {
                id: "status",
                label: "Status",
                options: [
                  { label: "Active", value: "active" },
                  { label: "Pending", value: "pending" },
                  { label: "Disabled", value: "disabled" },
                ],
                getValue: (row) => row.status,
              },
            ]}
            emptyTitle="No users available"
            emptyMessage={mode === "connected" ? "No workspace members were returned from the connected directory." : "No workspace members exist in the current demo workspace."}
            columns={[
              {
                id: "name",
                header: "Name",
                cell: (row) => row.name,
                sortValue: (row) => row.name,
              },
              {
                id: "role",
                header: "Role",
                cell: (row) => formatRoleLabel(row.role),
                sortValue: (row) => row.role,
              },
              {
                id: "status",
                header: "Status",
                cell: (row) => <StatusBadge status={row.status} />,
                sortValue: (row) => row.status,
              },
              {
                id: "email",
                header: "Email",
                cell: (row) => row.email,
                sortValue: (row) => row.email,
              },
              {
                id: "authProvider",
                header: "Auth",
                cell: (row) => formatAuthProvider(row.authProvider),
                sortValue: (row) => row.authProvider,
              },
              {
                id: "lastActiveAt",
                header: "Last active",
                cell: (row) => formatRelativeTime(row.lastActiveAt),
                sortValue: (row) => row.lastActiveAt || "",
              },
            ]}
            detailTitle={(row) => row.name}
            detailSubtitle={(row) => `${formatRoleLabel(row.role)} · ${row.email}`}
            renderDetail={(row) => (
              <div className="detail-grid">
                <div className="detail-block">
                  <div className="detail-block-title">Identity profile</div>
                  <div className="detail-kv"><span className="detail-kv-label">Email</span><span className="detail-kv-value">{row.email}</span></div>
                  <div className="detail-kv"><span className="detail-kv-label">Role</span><span className="detail-kv-value">{formatRoleLabel(row.role)}</span></div>
                  <div className="detail-kv"><span className="detail-kv-label">Status</span><span className="detail-kv-value"><StatusBadge status={row.status} /></span></div>
                  <div className="detail-kv"><span className="detail-kv-label">Authentication</span><span className="detail-kv-value">{formatAuthProvider(row.authProvider)}</span></div>
                  <div className="detail-kv"><span className="detail-kv-label">Last active</span><span className="detail-kv-value">{formatRelativeTime(row.lastActiveAt)}</span></div>
                </div>
                <div className="detail-block">
                  <div className="detail-block-title">Access review notes</div>
                  <InsightList
                    items={[
                      `${row.name} is aligned to the ${formatRoleLabel(row.role)} access template`,
                      row.status === "pending" ? "Pending membership should be accepted or revoked within the review SLA" : row.status === "disabled" ? "Disabled identities should be checked before the next access review cycle" : "Recent sign-in health is within the expected access policy threshold",
                      row.authProvider === "sso" ? "This identity is covered by SSO-backed controls" : row.mfaEnabled ? "This identity has MFA enabled on top of email authentication" : "Escalate only if this identity needs stronger controls or privilege changes",
                    ]}
                  />
                </div>
              </div>
            )}
            rowActions={[
              {
                label: "Send reminder",
                onClick: (row) => handleSendReminder(row),
              },
              {
                label: "Queue access review",
                tone: "primary",
                closeOnClick: true,
                onClick: (row) => handleQueueAccessReview(row.id),
              },
            ]}
          />
        </Section>
      </PageShell>

      <ActionToast message={toastMessage} onDismiss={() => setToastMessage(undefined)} />
    </>
  );
}
