import type { AppAuditEvent } from "@/types/app-models";
import WorkflowPanel from "./WorkflowPanel";

type AuditWorkflowProps = {
  events: AppAuditEvent[];
  openReviews: number;
  securityEvents: number;
  financeEvents: number;
};

export default function AuditWorkflow({ events, openReviews, securityEvents, financeEvents }: AuditWorkflowProps) {
  const currentIndex = events.length === 0 ? 0 : openReviews > 0 ? 2 : securityEvents + financeEvents > 0 ? 3 : 1;

  return (
    <WorkflowPanel
      eyebrow="Audit workflow"
      title="Trace activity from capture to reviewed closure"
      summary="Keep event capture, classification, escalation, and export inside a single compliance-ready path."
      status={openReviews > 0 ? "Open" : events.length > 0 ? "Active" : "Scheduled"}
      tone="emerald"
      metrics={[
        { label: "Logged events", value: String(events.length), helper: events.length ? "Searchable now" : "No events yet" },
        { label: "Security scope", value: String(securityEvents), helper: securityEvents ? "Access-sensitive activity" : "Quiet" },
        { label: "Finance scope", value: String(financeEvents), helper: financeEvents ? "Billing trail available" : "No finance events" },
      ]}
      steps={[
        {
          id: "capture",
          title: "Capture the event",
          description: "Store the action, actor, result, and source metadata in the audit log.",
          state: currentIndex > 0 ? "completed" : "current",
          meta: events.length ? `${events.length} audit events available` : "Waiting for the next audited action",
        },
        {
          id: "classify",
          title: "Classify module impact",
          description: "Identify whether the event belongs to access, integrations, billing, or another governed area.",
          state: currentIndex > 1 ? "completed" : currentIndex === 1 ? "current" : "upcoming",
          meta: securityEvents + financeEvents ? `${securityEvents + financeEvents} high-value events classified` : "Module classification begins with the next event",
        },
        {
          id: "review",
          title: "Escalate open reviews",
          description: "Flag events that need a second look before the trail is considered complete.",
          state: currentIndex > 2 ? "completed" : currentIndex === 2 ? "current" : "upcoming",
          meta: openReviews ? `${openReviews} audit reviews still open` : "No review blockers in queue",
        },
        {
          id: "export",
          title: "Export and close",
          description: "Move reviewed events into the exportable compliance pack once the trail is resolved.",
          state: currentIndex === 3 ? "current" : "upcoming",
          meta: events.length ? "Export controls are available from the table" : "Export unlocks after the first event",
        },
      ]}
      footer="Flagging an event for review and exporting it now share the same audit closure path."
    />
  );
}
