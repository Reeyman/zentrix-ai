import WorkflowPanel, { type WorkflowStep } from "./WorkflowPanel";

type CampaignCreationWorkflowProps = {
  createOpen: boolean;
  activeCount: number;
  draftCount: number;
  budgetUtilization: number;
  formState: {
    name: string;
    description: string;
    budget: string;
    startDate: string;
    endDate: string;
  };
};

function buildStepStates(flags: boolean[]): WorkflowStep["state"][] {
  const firstIncompleteIndex = flags.findIndex((flag) => !flag);

  if (firstIncompleteIndex === -1) {
    return flags.map(() => "completed");
  }

  return flags.map((flag, index) => {
    if (flag && index < firstIncompleteIndex) {
      return "completed";
    }

    if (index === firstIncompleteIndex) {
      return "current";
    }

    return "upcoming";
  });
}

export default function CampaignCreationWorkflow({
  createOpen,
  activeCount,
  draftCount,
  budgetUtilization,
  formState,
}: CampaignCreationWorkflowProps) {
  const completionFlags = [
    Boolean(formState.name.trim()) || draftCount > 0 || activeCount > 0,
    Boolean(formState.description.trim()) || draftCount > 0 || activeCount > 0,
    Boolean(formState.budget.trim()) || draftCount > 0 || activeCount > 0,
    Boolean(formState.startDate) || Boolean(formState.endDate) || activeCount > 0,
  ];
  const states = buildStepStates(completionFlags);

  return (
    <WorkflowPanel
      eyebrow="Campaign creation"
      title="Guide new launches through the quick-create lane"
      summary="Keep campaign setup structured from brief definition through budget and schedule readiness."
      status={activeCount > 0 ? "Active" : createOpen || draftCount > 0 ? "Draft" : "Scheduled"}
      tone="violet"
      metrics={[
        { label: "Create panel", value: createOpen ? "Open" : "Closed", helper: createOpen ? "Editing now" : "Ready when needed" },
        { label: "Drafts ready", value: String(draftCount), helper: draftCount ? "Pipeline active" : "No drafts waiting" },
        { label: "Budget use", value: `${budgetUtilization}%`, helper: "Current workspace pacing" },
      ]}
      steps={[
        {
          id: "name",
          title: "Set the campaign brief",
          description: "Name the campaign and anchor the launch objective before it enters the pipeline.",
          state: states[0],
          meta: formState.name.trim() ? `Current brief: ${formState.name.trim()}` : "No campaign brief drafted yet",
        },
        {
          id: "description",
          title: "Capture launch context",
          description: "Add the short description that gives ops and reviewers the activation context.",
          state: states[1],
          meta: formState.description.trim() ? "Launch context is filled in" : "Add the delivery context next",
        },
        {
          id: "budget",
          title: "Confirm budget guardrails",
          description: "Set the budget and keep the campaign inside the approved pacing corridor.",
          state: states[2],
          meta: formState.budget.trim() ? `Budget set to ${formState.budget.trim()}` : "Budget is still missing",
        },
        {
          id: "dates",
          title: "Lock the delivery window",
          description: "Choose dates so the campaign can move into review and launch without ambiguity.",
          state: states[3],
          meta: formState.startDate || formState.endDate ? `Window: ${formState.startDate || "TBD"} to ${formState.endDate || "TBD"}` : "Date window still needs to be confirmed",
        },
      ]}
      footer={draftCount > 0 ? "Use the draft queue and the campaign table together to move launches from creation into review." : "Open New Campaign to start this workflow from the page toolbar."}
    />
  );
}
