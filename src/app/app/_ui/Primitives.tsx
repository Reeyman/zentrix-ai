import React from "react";

 function getStatusTone(status: string) {
   const normalized = status.trim().toLowerCase();

   if (["active", "paid", "applied", "healthy", "on schedule", "enabled"].includes(normalized)) {
     return "positive";
   }

   if (["pending", "scheduled", "warning", "open"].includes(normalized) || normalized.includes("due")) {
     return "warning";
   }

   if (["paused", "draft", "archived", "disabled"].includes(normalized)) {
     return "muted";
   }

   return "neutral";
 }

 function formatStatusLabel(status: string) {
   if (status === status.toLowerCase()) {
     return status
       .split(" ")
       .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
       .join(" ");
   }

   return status;
 }

export function Section({ title, actions, children }: { title?: string; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="section">
      {title ? (
        <div className="section-head">
          <div className="section-title">{title}</div>
          {actions ? <div className="section-actions">{actions}</div> : null}
        </div>
      ) : null}
      <div>{children}</div>
    </section>
  );
}

export function Card({ title, children, className }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`card ${className ?? ""}`.trim()}>
      {title ? <div className="section-title">{title}</div> : null}
      <div className="card-body">{children}</div>
    </div>
  );
}

export function InsightList({ items }: { items: string[] }) {
  return (
    <ul className="insights-list">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

 export function StatusBadge({ status }: { status: string }) {
   const tone = getStatusTone(status);

   return <span className={`status-badge status-badge-${tone}`}>{formatStatusLabel(status)}</span>;
 }

export function ActionToast({ message, onDismiss }: { message?: string; onDismiss?: () => void }) {
  if (!message) {
    return null;
  }

  return (
    <div className="action-toast" role="status" aria-live="polite">
      <span>{message}</span>
      {onDismiss ? (
        <button className="action-toast-close" onClick={onDismiss}>
          Dismiss
        </button>
      ) : null}
    </div>
  );
}

export function Divider() {
  return <div className="section-divider" />;
}
