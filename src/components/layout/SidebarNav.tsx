'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BrandMark } from '@/components/brand/BrandMark';
import {
  LayoutGrid,
  Target,
  UsersRound,
  Layers,
  ChartColumn,
  FileText,
  Cpu,
  Settings2,
  UserSquare,
  ShieldCheck,
  Cable,
  FileClock,
  Receipt,
  Settings,
  HelpCircle,
  ChevronRight,
} from 'lucide-react';

type NavItem = {
  label: string;
  href: string;
  icon?: any;
  badge?: "New" | "Beta";
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const APP_DISPLAY_NAME = 'Zentrix AI';

const NAV: NavSection[] = [
  {
    title: "Main",
    items: [
      { label: "Overview", href: "/app/overview", icon: LayoutGrid },
      { label: "Campaigns", href: "/app/campaigns", icon: Target },
      { label: "Audiences", href: "/app/audiences", badge: "New", icon: UsersRound },
      { label: "Creatives", href: "/app/creatives", icon: Layers },
      { label: "Analytics", href: "/app/analytics", icon: ChartColumn },
      { label: "Reports", href: "/app/reports", icon: FileText },
      { label: "AI Center", href: "/app/ai-center", badge: "Beta", icon: Cpu },
    ],
  },
  {
    title: "Admin",
    items: [
      { label: "Settings", href: "/app/settings", icon: Settings2 },
      { label: "Users", href: "/app/settings/users", icon: UserSquare },
      { label: "Roles & Permissions", href: "/app/settings/roles", icon: ShieldCheck },
      { label: "Integrations", href: "/app/settings/integrations", icon: Cable },
      { label: "Audit Log", href: "/app/settings/audit", icon: FileClock },
      { label: "Billing", href: "/app/settings/billing", icon: Receipt },
    ],
  },
];

function Badge({ v }: { v: "New" | "Beta" }) {
  return (
    <span className="nav-badge">
      {v}
    </span>
  );
}

function isNavItemActive(pathname: string, href: string) {
  if (href === "/app/overview") {
    return pathname === "/app" || pathname === href;
  }

  if (href === "/app/settings") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function SidebarNav() {
  const [expanded, setExpanded] = useState(typeof window !== 'undefined' ? window.innerWidth > 768 : false);
  const pathname = usePathname();

  return (
    <div className={`sidebar-shell ${expanded ? 'expanded' : ''} mobile-hidden`} style={{ 
      width: expanded ? "240px" : "64px", 
      display: "flex",
      flexDirection: "column",
      transition: "width 0.2s ease"
    }}>
      {/* Logo */}
      <div style={{ 
        padding: "20px 16px", 
        borderBottom: "1px solid rgba(140,170,255,.1)",
        display: "flex",
        alignItems: "center",
        gap: "12px"
      }}>
        <BrandMark alt="Zentrix AI brand mark" size={32} />
        {expanded && (
          <div style={{ fontSize: "16px", fontWeight: "600", color: "rgba(240,245,255,.95)" }}>
            {APP_DISPLAY_NAME}
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: "16px 8px" }}>
        {NAV.map((section) => (
          <div key={section.title} style={{ marginBottom: "8px" }}>
            {expanded && (
              <div className="sidebar-section-title">
                {section.title}
              </div>
            )}
            {section.items.map((item) => {
              const isActive = isNavItemActive(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sidebar-link ${isActive ? "sidebar-link-active" : ""}`.trim()}
                >
                  {item.icon && <item.icon size={18} />}
                  {expanded && <span className="sidebar-link-label">{item.label}</span>}
                  {expanded && item.badge ? <Badge v={item.badge} /> : null}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom Section */}
      <div style={{ padding: "16px 8px", borderTop: "1px solid rgba(140,170,255,.1)" }}>
        <div style={{ marginBottom: "8px" }}>
          <Link
            href="/app/settings"
            className={`sidebar-link ${pathname === "/app/settings" ? "sidebar-link-active" : ""}`.trim()}
          >
            <Settings size={18} />
            {expanded && <span className="sidebar-link-label">Settings</span>}
          </Link>
        </div>

        <div style={{ marginBottom: "8px" }}>
          <a
            href="#"
            className="sidebar-link"
          >
            <HelpCircle size={18} />
            {expanded && <span className="sidebar-link-label">Help</span>}
          </a>
        </div>
      </div>

      {/* Toggle Button */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="sidebar-toggle"
      >
        {expanded ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
      </button>
    </div>
  );
}

function ChevronLeft({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}
