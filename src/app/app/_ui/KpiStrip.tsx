import React from "react";

type Kpi = {
  label: string;
  value: string;
  delta?: string;
};

function getDeltaTone(delta?: string) {
  if (!delta) {
    return "neutral";
  }

  const normalized = delta.trim().toLowerCase();

  if (!normalized || ["stable", "unchanged", "policy", "reviewed"].includes(normalized)) {
    return "neutral";
  }

  if (normalized.startsWith("+") || normalized.includes("improved") || normalized.includes("available")) {
    return "positive";
  }

  if (normalized.includes("due") || normalized.includes("warning") || normalized.includes("open") || normalized.includes("expiring")) {
    return "warning";
  }

  if (normalized.startsWith("-") || normalized.includes("down") || normalized.includes("decrease") || normalized.includes("failed")) {
    return "negative";
  }

  return "neutral";
}

export default function KpiStrip({ items }: { items: Kpi[] }) {
  return (
    <div className="kpi-strip">
      <div className="kpi-grid" style={{ ["--kpi-columns" as string]: String(items.length) }}>
        {items.map((k, i) => (
          <div key={i} className="kpi-item">
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value">{k.value}</div>
            {k.delta ? <div className={`kpi-delta kpi-delta-${getDeltaTone(k.delta)}`}>{k.delta}</div> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
