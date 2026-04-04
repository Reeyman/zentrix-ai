import type { WorkflowMetric, WorkflowPanelProps, WorkflowStep } from "./WorkflowPanel";

function formatCount(value: number, singular: string, plural = `${singular}s`) {
  return `${value} ${value === 1 ? singular : plural}`;
}

function buildSequentialSteps(
  steps: Array<Omit<WorkflowStep, "state">>,
  currentIndex: number,
  allComplete = false,
): WorkflowStep[] {
  return steps.map((step, index) => ({
    ...step,
    state: allComplete ? "completed" : index < currentIndex ? "completed" : index === currentIndex ? "current" : "upcoming",
  }));
}

export function buildCampaignLifecycleWorkflow({
  draftCount,
  activeCount,
  budgetUtilization,
}: {
  draftCount: number;
  activeCount: number;
  budgetUtilization: number;
}): WorkflowPanelProps {
  const status = activeCount > 0 ? "Active" : draftCount > 0 ? "Draft" : "Scheduled";
  const currentIndex = activeCount > 0 ? 3 : draftCount > 0 ? 2 : 0;
  const steps = buildSequentialSteps(
    [
      {
        id: "brief",
        title: "Set the campaign brief",
        description: "Define the objective, owner, and activation scope before budget is unlocked.",
        meta: draftCount > 0 ? `${formatCount(draftCount, "draft")} already staged` : "No draft staged yet",
      },
      {
        id: "governance",
        title: "Confirm budget guardrails",
        description: "Align pacing, date windows, and channel mix with the workspace approval path.",
        meta: `${budgetUtilization}% of current workspace budget is already committed`,
      },
      {
        id: "launch",
        title: "Route through launch review",
        description: "Send the campaign through the performance queue before it moves into active delivery.",
        meta: activeCount > 0 ? `${formatCount(activeCount, "campaign")} already live` : "Waiting for launch approval",
      },
      {
        id: "monitor",
        title: "Monitor pacing after activation",
        description: "Keep the campaign in the budget and ROAS corridor once delivery starts.",
        meta: activeCount > 0 ? "Live pacing is available now" : "Monitoring starts after activation",
      },
    ],
    currentIndex,
    activeCount > 0 && draftCount === 0,
  );

  const metrics: WorkflowMetric[] = [
    { label: "Draft queue", value: String(draftCount), helper: draftCount ? "Ready for review" : "Clear" },
    { label: "Live campaigns", value: String(activeCount), helper: activeCount ? "Already pacing" : "None active" },
    { label: "Budget use", value: `${budgetUtilization}%`, helper: "Current workspace pacing" },
  ];

  return {
    eyebrow: "Campaign lifecycle",
    title: "Govern campaign delivery from brief to pacing",
    summary: "Keep campaign creation, approval, and post-launch monitoring in one governed motion.",
    status,
    tone: "violet",
    steps,
    metrics,
    footer: draftCount > 0 ? "Drafts can move directly into review from the quick-create panel." : "Open a quick create session to start the next campaign workflow.",
  };
}

export function buildUserRoleManagementWorkflow({
  rolesCount,
  policyChanges,
  reviewsDue,
}: {
  rolesCount: number;
  policyChanges: number;
  reviewsDue: number;
}): WorkflowPanelProps {
  const hasRoles = rolesCount > 0;
  const hasPolicyQueue = policyChanges > 0;
  const hasReviewsDue = reviewsDue > 0;
  const currentIndex = !hasRoles ? 0 : hasPolicyQueue ? 2 : hasReviewsDue ? 3 : 1;

  return {
    eyebrow: "User role management",
    title: "Keep permissions scoped, approved, and reviewable",
    summary: "Move from role template design into recurring governance without breaking the approval trail.",
    status: hasPolicyQueue ? "Pending" : hasReviewsDue ? "Scheduled" : hasRoles ? "Active" : "Draft",
    tone: "amber",
    metrics: [
      { label: "Roles", value: String(rolesCount), helper: hasRoles ? "Templates active" : "No templates" },
      { label: "Policy queue", value: String(policyChanges), helper: hasPolicyQueue ? "Needs approval" : "No changes waiting" },
      { label: "Reviews due", value: String(reviewsDue), helper: hasReviewsDue ? "Needs scheduling" : "Review cadence clear" },
    ],
    steps: buildSequentialSteps([
      {
        id: "template",
        title: "Define the role template",
        description: "Create the permission baseline that maps to campaigns, billing, reporting, or global administration.",
        meta: hasRoles ? `${formatCount(rolesCount, "role")} already defined` : "Start with a role template",
      },
      {
        id: "scope",
        title: "Scope module access",
        description: "Confirm which modules each role can view, edit, approve, or administer.",
        meta: hasRoles ? "Permission matrix is available" : "Scope after the first template exists",
      },
      {
        id: "approvals",
        title: "Assign approvers and queue changes",
        description: "Route sensitive permission edits through governance before rollout.",
        meta: hasPolicyQueue ? `${formatCount(policyChanges, "change")} in queue` : "No queued policy edits",
      },
      {
        id: "review",
        title: "Schedule recurring access reviews",
        description: "Keep elevated permissions inside the expected review window.",
        meta: hasReviewsDue ? `${formatCount(reviewsDue, "review")} due` : "Review cadence is clear",
      },
    ], currentIndex),
    footer: "Use the approval queue and role review actions together so every permission change leaves an audit trail.",
  };
}

export function buildBillingCycleWorkflow({
  currentPlan,
  openInvoices,
  pendingReviews,
  nextBillingDate,
}: {
  currentPlan: string;
  openInvoices: number;
  pendingReviews: number;
  nextBillingDate: string;
}): WorkflowPanelProps {
  const hasInvoices = openInvoices > 0 || pendingReviews > 0;
  const currentIndex = !hasInvoices ? 0 : pendingReviews > 0 ? 2 : openInvoices > 0 ? 3 : 1;

  return {
    eyebrow: "Billing cycle",
    title: "Move from usage metering to closed finance review",
    summary: "Track how usage becomes invoices, how finance reviews exceptions, and when the cycle is safe to close.",
    status: pendingReviews > 0 ? "Pending" : openInvoices > 0 ? "Scheduled" : hasInvoices ? "Active" : "Draft",
    tone: "emerald",
    metrics: [
      { label: "Current plan", value: currentPlan, helper: "Billing summary source" },
      { label: "Open invoices", value: String(openInvoices), helper: openInvoices ? "Cycle still open" : "No open invoices" },
      { label: "Finance reviews", value: String(pendingReviews), helper: pendingReviews ? "Escalated now" : "No escalations" },
    ],
    steps: buildSequentialSteps([
      {
        id: "usage",
        title: "Meter workspace usage",
        description: "Collect spend, seats, and AI usage before the next invoice pack is issued.",
        meta: `Next billing checkpoint: ${nextBillingDate}`,
      },
      {
        id: "invoice",
        title: "Generate the invoice pack",
        description: "Prepare finance-ready invoice records for the active billing cycle.",
        meta: hasInvoices ? "Invoice data is available" : "Awaiting the next invoice run",
      },
      {
        id: "review",
        title: "Queue finance review when needed",
        description: "Route exceptions through the finance lane before payment collection proceeds.",
        meta: pendingReviews ? `${formatCount(pendingReviews, "review")} active` : "No finance review blockers",
      },
      {
        id: "close",
        title: "Collect payment and close the cycle",
        description: "Move the invoice from open monitoring into the closed cycle archive.",
        meta: openInvoices ? `${formatCount(openInvoices, "invoice")} still open` : "Cycle ready to close",
      },
    ], currentIndex),
    footer: "The invoice table actions already support PDF export and finance review routing from the same cycle.",
  };
}

export function buildAIRecommendationWorkflow({
  itemCount,
  averageConfidence,
  usingRealAI,
  modelLabel,
  workspaceName,
}: {
  itemCount: number;
  averageConfidence: number;
  usingRealAI: boolean;
  modelLabel: string;
  workspaceName: string;
}): WorkflowPanelProps {
  const hasRecommendations = itemCount > 0;
  const currentIndex = !hasRecommendations ? 0 : 2;

  return {
    eyebrow: "AI recommendation flow",
    title: "Turn model analysis into governed activation",
    summary: "Resolve workspace context, generate recommendations, and send only the right actions into review or activation.",
    status: hasRecommendations ? "Open" : "Scheduled",
    tone: usingRealAI ? "violet" : "blue",
    metrics: [
      { label: "Recommendations", value: String(itemCount), helper: hasRecommendations ? "Ready to review" : "Run analysis first" },
      { label: "Confidence", value: `${averageConfidence}%`, helper: usingRealAI ? "Live model available" : "Fallback still stable" },
      { label: "Model", value: modelLabel, helper: workspaceName || "Workspace pending" },
    ],
    steps: buildSequentialSteps([
      {
        id: "context",
        title: "Gather workspace context",
        description: "Pull the current workspace, campaign, analytics, billing, and control posture into the analysis request.",
        meta: workspaceName || "Workspace context is waiting for the next run",
      },
      {
        id: "generate",
        title: "Generate explainable recommendations",
        description: "Create model-backed or fallback recommendations with rationale and confidence scoring.",
        meta: usingRealAI ? "Live AI path is available" : "Fallback path is active",
      },
      {
        id: "review",
        title: "Route changes through review lanes",
        description: "Send finance, security, or ops-sensitive changes to the right stakeholder queue.",
        meta: hasRecommendations ? `${formatCount(itemCount, "recommendation")} queued` : "No queue yet",
      },
      {
        id: "activate",
        title: "Apply or dismiss with traceability",
        description: "Move approved actions into activation or clear them from the queue without losing the decision trail.",
        meta: hasRecommendations ? "Activation controls available now" : "Controls unlock after analysis",
      },
    ], currentIndex),
    footer: "The recommendation cards already support apply, review, export, and dismiss actions from the same queue.",
  };
}
