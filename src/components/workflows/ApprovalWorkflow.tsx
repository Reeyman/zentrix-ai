import type { AppRoleApproval } from "@/types/app-models";
import WorkflowPanel from "./WorkflowPanel";

type ApprovalWorkflowProps = {
  approvals: AppRoleApproval[];
  reviewsDue: number;
};

export default function ApprovalWorkflow({ approvals, reviewsDue }: ApprovalWorkflowProps) {
  const pendingCount = approvals.filter((approval) => approval.status === "Pending" || approval.status === "Open").length;
  const scheduledCount = approvals.filter((approval) => approval.status === "Scheduled").length;
  const currentIndex = approvals.length === 0 ? 0 : pendingCount > 0 ? 1 : scheduledCount > 0 ? 2 : 3;

  return (
    <WorkflowPanel
      eyebrow="Approval workflow"
      title="Move policy changes through a governed approval queue"
      summary="Keep sensitive access or policy changes visible from request capture to audit-ready completion."
      status={pendingCount > 0 ? "Pending" : scheduledCount > 0 ? "Scheduled" : approvals.length > 0 ? "Active" : "Draft"}
      tone="amber"
      metrics={[
        { label: "Queued approvals", value: String(approvals.length), helper: approvals.length ? "Workflow active" : "No changes queued" },
        { label: "Pending now", value: String(pendingCount), helper: pendingCount ? "Needs reviewer time" : "No immediate blockers" },
        { label: "Reviews due", value: String(reviewsDue), helper: reviewsDue ? "Recurring review needed" : "Review cadence clear" },
      ]}
      steps={[
        {
          id: "request",
          title: "Capture the request",
          description: "Log the requested policy or role change with the requester and approver path.",
          state: currentIndex > 0 ? "completed" : "current",
          meta: approvals.length ? `${approvals.length} requests currently in flow` : "No approval requests are queued",
        },
        {
          id: "triage",
          title: "Triage the impact",
          description: "Confirm whether the change affects billing, security, campaigns, or global administration.",
          state: currentIndex > 1 ? "completed" : currentIndex === 1 ? "current" : "upcoming",
          meta: pendingCount ? `${pendingCount} requests need triage or approver attention` : "Triage queue is clear",
        },
        {
          id: "signoff",
          title: "Advance approver sign-off",
          description: "Move the request into the formal sign-off lane before rollout.",
          state: currentIndex > 2 ? "completed" : currentIndex === 2 ? "current" : "upcoming",
          meta: scheduledCount ? `${scheduledCount} requests are already scheduled` : "No scheduled sign-offs yet",
        },
        {
          id: "audit",
          title: "Close into the audit trail",
          description: "Record the final decision so the permission change is reviewable later.",
          state: currentIndex === 3 ? "current" : "upcoming",
          meta: reviewsDue ? `${reviewsDue} role reviews are still due` : "No open audit closure items",
        },
      ]}
      footer="Use Advance workflow together with the approval export so every policy change remains portable and reviewable."
    />
  );
}
