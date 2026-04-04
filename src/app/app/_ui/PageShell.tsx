"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

const PATH_LABELS: Record<string, string> = {
  overview: "Overview",
  campaigns: "Campaigns",
  audiences: "Audiences",
  creatives: "Creatives",
  analytics: "Analytics",
  reports: "Reports",
  ai: "AI Center",
  "ai-center": "AI Center",
  settings: "Settings",
  users: "Users",
  roles: "Roles & Permissions",
  integrations: "Integrations",
  audit: "Audit Log",
  billing: "Billing",
};

function formatPathLabel(segment: string) {
  if (PATH_LABELS[segment]) {
    return PATH_LABELS[segment];
  }

  return segment
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildBreadcrumbs(pathname: string, fallbackTitle: string) {
  const segments = pathname.split("/").filter(Boolean).slice(1);

  if (!segments.length) {
    return [{ href: pathname, label: fallbackTitle }];
  }

  let href = "/app";

  return segments.map((segment) => {
    href += `/${segment}`;

    return {
      href,
      label: formatPathLabel(segment),
    };
  });
}

type Props = {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  toolbar?: React.ReactNode;
  children: React.ReactNode;
};

export default function PageShell({ title, subtitle, actions, toolbar, children }: Props) {
  const pathname = usePathname();
  const breadcrumbs = buildBreadcrumbs(pathname, title);

  return (
    <div className="page-shell">
      <div className="page-shell-inner">
        <nav className="page-breadcrumbs" aria-label="Breadcrumb">
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;

            return isLast ? (
              <span key={crumb.href} className="page-breadcrumb-current">
                {crumb.label}
              </span>
            ) : (
              <React.Fragment key={crumb.href}>
                <Link href={crumb.href} className="page-breadcrumb-link">
                  {crumb.label}
                </Link>
                <span className="page-breadcrumb-separator">/</span>
              </React.Fragment>
            );
          })}
        </nav>

        <header className="page-header">
          <div className="page-header-main">
            <h1 className="page-title">{title}</h1>
            {subtitle ? <div className="page-subtitle">{subtitle}</div> : null}
          </div>

          {actions ? <div className="header-actions">{actions}</div> : null}
        </header>

        {toolbar ? <div className="page-toolbar">{toolbar}</div> : null}

        <div className="page-body">{children}</div>
      </div>
    </div>
  );
}
