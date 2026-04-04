import { StatusBadge } from "@/app/app/_ui/Primitives";

export type WorkflowStepState = "completed" | "current" | "upcoming";

export type WorkflowTone = "violet" | "blue" | "emerald" | "amber";

export type WorkflowMetric = {
  label: string;
  value: string;
  helper?: string;
};

export type WorkflowStep = {
  id: string;
  title: string;
  description: string;
  state: WorkflowStepState;
  meta?: string;
};

export type WorkflowPanelProps = {
  eyebrow?: string;
  title: string;
  summary: string;
  status: string;
  tone?: WorkflowTone;
  metrics?: WorkflowMetric[];
  steps: WorkflowStep[];
  footer?: string;
};

function getProgressPoints(step: WorkflowStep) {
  if (step.state === "completed") {
    return 1;
  }

  if (step.state === "current") {
    return 0.55;
  }

  return 0;
}

function getStepStateLabel(state: WorkflowStepState) {
  if (state === "completed") {
    return "Complete";
  }

  if (state === "current") {
    return "Current step";
  }

  return "Upcoming";
}

export default function WorkflowPanel({
  eyebrow = "Workflow",
  title,
  summary,
  status,
  tone = "blue",
  metrics = [],
  steps,
  footer,
}: WorkflowPanelProps) {
  const completedCount = steps.filter((step) => step.state === "completed").length;
  const progress = steps.length
    ? Math.round((steps.reduce((sum, step) => sum + getProgressPoints(step), 0) / steps.length) * 100)
    : 0;

  return (
    <div className={`card workflow-panel workflow-panel-${tone}`.trim()}>
      <div className="workflow-panel-head">
        <div className="workflow-panel-head-row">
          <span className="workflow-panel-eyebrow">{eyebrow}</span>
          <StatusBadge status={status} />
        </div>
        <div className="workflow-panel-title">{title}</div>
        <div className="workflow-panel-summary">{summary}</div>
      </div>

      <div className="workflow-progress">
        <div className="workflow-progress-bar" aria-hidden="true">
          <span className="workflow-progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="workflow-progress-meta">
          <span>{completedCount} of {steps.length} steps complete</span>
          <span>{progress}%</span>
        </div>
      </div>

      {metrics.length ? (
        <div className="workflow-metrics">
          {metrics.map((metric) => (
            <div key={metric.label} className="workflow-metric">
              <div className="workflow-metric-label">{metric.label}</div>
              <div className="workflow-metric-value">{metric.value}</div>
              {metric.helper ? <div className="workflow-metric-helper">{metric.helper}</div> : null}
            </div>
          ))}
        </div>
      ) : null}

      <ol className="workflow-step-list">
        {steps.map((step, index) => (
          <li key={step.id} className={`workflow-step workflow-step-${step.state}`.trim()}>
            <span className={`workflow-step-indicator workflow-step-indicator-${step.state}`.trim()}>
              {step.state === "completed" ? "✓" : index + 1}
            </span>
            <div className="workflow-step-copy">
              <div className="workflow-step-title-row">
                <span className="workflow-step-title">{step.title}</span>
                <span className="workflow-step-state">{getStepStateLabel(step.state)}</span>
              </div>
              <div className="workflow-step-description">{step.description}</div>
              {step.meta ? <div className="workflow-step-meta">{step.meta}</div> : null}
            </div>
          </li>
        ))}
      </ol>

      {footer ? <div className="workflow-panel-footer">{footer}</div> : null}
    </div>
  );
}
