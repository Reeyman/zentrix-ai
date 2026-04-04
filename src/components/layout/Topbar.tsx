'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { AppMode, AppUser, AppWorkspace } from '@/types/app-models';
import {
  Search,
  Bell,
  HelpCircle,
  Plus,
  Clock,
  CheckCircle2,
  ShieldCheck,
  LogOut,
  LayoutGrid,
  Target,
  UsersRound,
  Layers,
  ChartColumn,
  FileText,
  Cpu,
  Settings2,
  UserSquare,
  Cable,
  FileClock,
  Receipt,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

type TopbarCommand = {
  id: string;
  group: 'Quick actions' | 'Navigate' | 'Governance';
  label: string;
  description: string;
  href: string;
  icon: any;
  meta: string;
  keywords: string[];
  badge?: string;
};

const COMMAND_GROUP_ORDER: Array<TopbarCommand['group']> = ['Quick actions', 'Navigate', 'Governance'];

const COMMAND_ITEMS: TopbarCommand[] = [
  {
    id: 'create-campaign',
    group: 'Quick actions',
    label: 'Create campaign',
    description: 'Jump into campaigns and start a new activation workflow.',
    href: '/app/campaigns?create=1',
    icon: Plus,
    meta: 'Action',
    keywords: ['new campaign', 'launch', 'activate'],
  },
  {
    id: 'review-approvals',
    group: 'Quick actions',
    label: 'Review approvals',
    description: 'Open the governance queue for pending access and policy reviews.',
    href: '/app/settings/roles',
    icon: CheckCircle2,
    meta: 'Action',
    keywords: ['approvals', 'roles', 'pending', 'access'],
  },
  {
    id: 'open-audit-trail',
    group: 'Quick actions',
    label: 'Open audit trail',
    description: 'Inspect recent security, billing, and configuration events.',
    href: '/app/settings/audit',
    icon: FileClock,
    meta: 'Action',
    keywords: ['audit', 'events', 'security', 'logs'],
  },
  {
    id: 'review-ai-recommendations',
    group: 'Quick actions',
    label: 'Review AI recommendations',
    description: 'Open explainable recommendations and governed AI actions.',
    href: '/app/ai-center',
    icon: Cpu,
    meta: 'Action',
    keywords: ['ai', 'recommendations', 'models', 'insights'],
    badge: 'Beta',
  },
  {
    id: 'overview',
    group: 'Navigate',
    label: 'Overview',
    description: 'Executive summary, KPIs, and enterprise activity snapshot.',
    href: '/app/overview',
    icon: LayoutGrid,
    meta: 'Page',
    keywords: ['dashboard', 'home', 'summary'],
  },
  {
    id: 'campaigns',
    group: 'Navigate',
    label: 'Campaigns',
    description: 'Manage campaign performance, pacing, and detail drawers.',
    href: '/app/campaigns',
    icon: Target,
    meta: 'Page',
    keywords: ['media', 'performance', 'launch'],
  },
  {
    id: 'audiences',
    group: 'Navigate',
    label: 'Audiences',
    description: 'Inspect segments, reach, and new audience opportunities.',
    href: '/app/audiences',
    icon: UsersRound,
    meta: 'Page',
    keywords: ['segments', 'targeting', 'reach'],
    badge: 'New',
  },
  {
    id: 'creatives',
    group: 'Navigate',
    label: 'Creatives',
    description: 'Review asset performance, CTA tests, and creative rotation.',
    href: '/app/creatives',
    icon: Layers,
    meta: 'Page',
    keywords: ['assets', 'cta', 'design', 'ads'],
  },
  {
    id: 'analytics',
    group: 'Navigate',
    label: 'Analytics',
    description: 'Explore deeper performance analysis and cross-channel trends.',
    href: '/app/analytics',
    icon: ChartColumn,
    meta: 'Page',
    keywords: ['analysis', 'charts', 'trends'],
  },
  {
    id: 'reports',
    group: 'Navigate',
    label: 'Reports',
    description: 'Open reusable reporting workflows and exports.',
    href: '/app/reports',
    icon: FileText,
    meta: 'Page',
    keywords: ['exports', 'reporting', 'scheduled'],
  },
  {
    id: 'ai-center',
    group: 'Navigate',
    label: 'AI Center',
    description: 'View explainable recommendations, models, and control states.',
    href: '/app/ai-center',
    icon: Cpu,
    meta: 'Page',
    keywords: ['ai', 'models', 'recommendations'],
    badge: 'Beta',
  },
  {
    id: 'settings',
    group: 'Governance',
    label: 'Settings',
    description: 'Open workspace controls, recent changes, and admin overview.',
    href: '/app/settings',
    icon: Settings2,
    meta: 'Admin',
    keywords: ['workspace', 'config', 'admin'],
  },
  {
    id: 'users',
    group: 'Governance',
    label: 'Users',
    description: 'Manage user access, assignments, and enterprise controls.',
    href: '/app/settings/users',
    icon: UserSquare,
    meta: 'Admin',
    keywords: ['members', 'access', 'accounts'],
  },
  {
    id: 'roles',
    group: 'Governance',
    label: 'Roles & Permissions',
    description: 'Review permission matrix, roles, and approval workflows.',
    href: '/app/settings/roles',
    icon: ShieldCheck,
    meta: 'Admin',
    keywords: ['permissions', 'roles', 'approval', 'governance'],
  },
  {
    id: 'integrations',
    group: 'Governance',
    label: 'Integrations',
    description: 'Inspect connected services, tokens, and system health.',
    href: '/app/settings/integrations',
    icon: Cable,
    meta: 'Admin',
    keywords: ['connections', 'tokens', 'services'],
  },
  {
    id: 'audit-log',
    group: 'Governance',
    label: 'Audit Log',
    description: 'Trace enterprise events with detailed before and after states.',
    href: '/app/settings/audit',
    icon: FileClock,
    meta: 'Admin',
    keywords: ['audit', 'log', 'security', 'events'],
  },
  {
    id: 'billing',
    group: 'Governance',
    label: 'Billing',
    description: 'Review invoices, payment health, and finance controls.',
    href: '/app/settings/billing',
    icon: Receipt,
    meta: 'Admin',
    keywords: ['billing', 'invoices', 'finance', 'payments'],
  },
];

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName;
  return tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT' || target.isContentEditable;
}

function getInitials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.split('@')[0] || 'Admin User';
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return parts.slice(0, 2).map((part) => part.charAt(0)).join('').toUpperCase();
}

type TopbarProps = {
  currentWorkspace: AppWorkspace | null;
  workspaces: AppWorkspace[];
  currentUser: AppUser | null;
  mode: AppMode | null;
  switchWorkspace: (workspaceId: string) => void;
};

export function Topbar({ currentWorkspace, workspaces, currentUser, mode, switchWorkspace }: TopbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState('');
  const [commandOpen, setCommandOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(() => (typeof window !== 'undefined' ? window.matchMedia('(max-width: 768px)').matches : false));
  const [mobileControlsOpen, setMobileControlsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [notifications] = useState(3);
  const [pendingApprovals] = useState(3);
  const commandInputRef = useRef<HTMLInputElement | null>(null);
  const workspaceEnvironment = currentWorkspace?.environment ?? (mode === 'connected' ? 'Production' : 'Demo');
  const userName = currentUser?.name ?? 'Admin User';
  const userEmail = currentUser?.email ?? 'admin@adai.com';
  const userRoleLabel = currentUser?.role ? `${currentUser.role.charAt(0).toUpperCase()}${currentUser.role.slice(1)}` : 'Owner';
  const avatarInitials = getInitials(userName, userEmail);
  const workspaceName = currentWorkspace?.name ?? 'Workspace';

  const openCommandPalette = useCallback((initialQuery = '') => {
    setSearchQuery(initialQuery);
    setCommandOpen(true);
  }, []);

  const closeCommandPalette = useCallback(() => {
    setCommandOpen(false);
    setSearchQuery('');
  }, []);

  const groupedCommands = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const filtered = COMMAND_ITEMS.filter((command) => {
      if (!normalizedQuery) {
        return true;
      }

      const haystack = [
        command.label,
        command.description,
        command.href,
        command.meta,
        ...command.keywords,
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });

    return COMMAND_GROUP_ORDER.map((group) => ({
      group,
      items: filtered.filter((command) => command.group === group),
    })).filter((entry) => entry.items.length > 0);
  }, [searchQuery]);

  const firstCommand = groupedCommands.flatMap((entry) => entry.items)[0] ?? null;

  const runCommand = useCallback((command: TopbarCommand) => {
    router.push(command.href);
    closeCommandPalette();
  }, [closeCommandPalette, router]);

  const handleSignOut = useCallback(async () => {
    try {
      setIsSigningOut(true);
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
      });
    } finally {
      router.replace('/login');
      router.refresh();
      setIsSigningOut(false);
    }
  }, [router]);

  useEffect(() => {
    if (!commandOpen) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      commandInputRef.current?.focus();
      commandInputRef.current?.select();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [commandOpen]);

  useEffect(() => {
    if (!commandOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [commandOpen]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const mediaQuery = window.matchMedia('(max-width: 768px)');
    const syncViewport = (matches: boolean) => {
      setIsMobileViewport(matches);
      if (!matches) {
        setMobileControlsOpen(false);
      }
    };
    const handleChange = (event: MediaQueryListEvent) => {
      syncViewport(event.matches);
    };

    syncViewport(mediaQuery.matches);

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  useEffect(() => {
    function handleWindowKeyDown(event: KeyboardEvent) {
      if (
        event.key === '/' &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !isEditableTarget(event.target)
      ) {
        event.preventDefault();
        openCommandPalette();
      }

      if (event.key === 'Escape' && commandOpen) {
        event.preventDefault();
        closeCommandPalette();
      }
    }

    window.addEventListener('keydown', handleWindowKeyDown);
    return () => window.removeEventListener('keydown', handleWindowKeyDown);
  }, [closeCommandPalette, commandOpen, openCommandPalette]);

  return (
    <>
      <div className="topbar">
        {isMobileViewport ? (
          <div className="topbar-mobile-summary">
            <div className="topbar-mobile-summary-copy">
              <div className="topbar-mobile-summary-eyebrow">{workspaceEnvironment}</div>
              <div className="topbar-mobile-summary-title">{workspaceName}</div>
            </div>

            <button
              className={`topbar-mobile-summary-button ${mobileControlsOpen ? 'active' : ''}`.trim()}
              type="button"
              aria-expanded={mobileControlsOpen}
              aria-label={mobileControlsOpen ? 'Hide workspace controls' : 'Show workspace controls'}
              onClick={() => setMobileControlsOpen((current) => !current)}
            >
              <SlidersHorizontal className="h-4 w-4" strokeWidth={1.8} />
              {mobileControlsOpen ? 'Hide controls' : 'Workspace'}
            </button>
          </div>
        ) : null}

        <div className={`topbar-row topbar-row-primary ${isMobileViewport && !mobileControlsOpen ? 'topbar-row-primary-compact' : ''}`.trim()}>
          {/* Left side - Workspace & Date Range */}
          <div className={`topbar-left ${isMobileViewport && !mobileControlsOpen ? 'topbar-left-collapsed' : ''}`.trim()}>
            <div className="topbar-context-card">
              <div className="topbar-context-copy">
                <div className="topbar-context-label">Workspace</div>
                <div className="topbar-context-row">
                  <select
                    className="input topbar-select topbar-control topbar-control-account topbar-context-select"
                    value={currentWorkspace?.id ?? ''}
                    onChange={(event) => switchWorkspace(event.target.value)}
                  >
                    {workspaces.map((workspace) => (
                      <option key={workspace.id} value={workspace.id}>{workspace.name}</option>
                    ))}
                  </select>
                </div>
                <div className="topbar-context-meta">{workspaceEnvironment}</div>
              </div>
            </div>

            <div className="topbar-filter-card">
              <div className="topbar-context-label">Reporting window</div>
              <div className="topbar-filter-row">
                <div className="topbar-filter-select-shell">
                  <select className="input topbar-select topbar-control topbar-control-range topbar-filter-select">
                    <option>Last 7 days</option>
                    <option>Last 30 days</option>
                    <option>Last 90 days</option>
                    <option>Custom</option>
                  </select>
                </div>
              </div>
              <div className="topbar-context-meta">Compared with prior period</div>
            </div>
          </div>

          <div className="topbar-right">
            <Button asChild size="lg" className="topbar-primary-action h-11 text-sm font-semibold focus-visible:ring-0 focus-visible:ring-offset-0">
              <Link href="/app/campaigns?create=1">
                <Plus className="h-4 w-4" strokeWidth={1.8} />
                Create Campaign
              </Link>
            </Button>

            <div className="topbar-utility-group">
              {/* Notifications */}
              <button className="btn btn-ghost topbar-icon-button topbar-icon-button-notification" type="button" aria-label="Notifications" onClick={() => router.push('/app/settings/audit')}>
                <Bell className="h-4 w-4" strokeWidth={1.8} />
                {notifications > 0 && (
                  <span className="topbar-notification-count">
                    {notifications}
                  </span>
                )}
              </button>

              {/* Help */}
              <button className="btn btn-ghost topbar-icon-button" type="button" aria-label="Help" onClick={() => openCommandPalette()}>
                <HelpCircle className="h-4 w-4" strokeWidth={1.8} />
              </button>
            </div>

            <div className="topbar-account-group" style={{ gap: '16px' }}>
              {/* User Menu */}
              <div className="topbar-user" title={userEmail}>
                <div className="topbar-user-avatar">
                  {avatarInitials}
                </div>
                <div className="topbar-user-copy">
                  <div className="topbar-user-name">{userName}</div>
                  <div className="topbar-user-email">{userRoleLabel}</div>
                </div>
              </div>

              <button className="btn btn-ghost topbar-icon-button" type="button" aria-label="Sign out" title={isSigningOut ? 'Signing out…' : 'Sign out'} onClick={handleSignOut} disabled={isSigningOut}>
                <LogOut className="h-4 w-4" strokeWidth={1.8} />
              </button>
            </div>
          </div>
        </div>

        <div className="topbar-row topbar-row-search">
          <div className="topbar-search">
            <button className="topbar-search-trigger" type="button" onClick={() => openCommandPalette(searchQuery)} aria-label="Open command palette">
              <span className="topbar-search-leading">
                <span className="topbar-search-icon-shell">
                  <Search
                    className="topbar-search-icon h-4 w-4"
                    strokeWidth={1.8}
                  />
                </span>
                <span className="topbar-search-placeholder">Search workspace, campaigns, analytics, or settings</span>
              </span>
            </button>
          </div>

          <div className="topbar-status-strip">
            <button className="topbar-status-chip" type="button" onClick={() => router.push('/app/settings/roles')}>
              <CheckCircle2 className="h-4 w-4" strokeWidth={1.8} />
              <span className="topbar-status-copy">
                <span className="topbar-status-title">Approvals</span>
                <span className="topbar-status-meta">{pendingApprovals} pending</span>
              </span>
            </button>

            <div className="topbar-status-inline">
              <span className="topbar-status-inline-item">
                <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.8} />
                {mode === 'connected' ? 'Connected' : 'Demo mode'}
              </span>

              <span className="topbar-status-inline-item">
                <Clock className="h-3.5 w-3.5" strokeWidth={1.8} />
                {mode === 'connected' ? 'Updated 2m ago' : 'Local preview'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {commandOpen ? (
        <>
          <div className="topbar-command-backdrop" onClick={closeCommandPalette} />
          <div className="topbar-command-shell" role="dialog" aria-modal="true" aria-label="Command palette">
            <div className="topbar-command-header">
              <Search className="topbar-command-search-icon h-4 w-4" strokeWidth={1.8} />
              <input
                ref={commandInputRef}
                className="topbar-command-input"
                placeholder="Search campaigns, analytics, AI, or settings"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && firstCommand) {
                    event.preventDefault();
                    runCommand(firstCommand);
                  }
                }}
              />
              <button className="topbar-command-close" type="button" onClick={closeCommandPalette} aria-label="Close command palette">
                <X className="h-4 w-4" strokeWidth={1.8} />
              </button>
            </div>

            <div className="topbar-command-body">
              {groupedCommands.length ? (
                groupedCommands.map((entry) => (
                  <div key={entry.group} className="topbar-command-group">
                    <div className="topbar-command-group-title">{entry.group}</div>
                    <div className="topbar-command-list">
                      {entry.items.map((command) => {
                        const Icon = command.icon;
                        const commandPath = command.href.split('?')[0];
                        const isCurrent = pathname === commandPath;
                        const isTopResult = firstCommand?.id === command.id;

                        return (
                          <button
                            key={command.id}
                            className={`topbar-command-item ${isTopResult ? 'topbar-command-item-primary' : ''} ${isCurrent ? 'topbar-command-item-current' : ''}`.trim()}
                            type="button"
                            onClick={() => runCommand(command)}
                          >
                            <span className="topbar-command-item-icon">
                              <Icon className="h-4 w-4" strokeWidth={1.8} />
                            </span>
                            <span className="topbar-command-item-copy">
                              <span className="topbar-command-item-title-row">
                                <span className="topbar-command-item-title">{command.label}</span>
                                {command.badge ? <span className="topbar-command-item-badge">{command.badge}</span> : null}
                              </span>
                              <span className="topbar-command-item-subtitle">{command.description}</span>
                            </span>
                            <span className="topbar-command-item-meta">{isCurrent ? 'Current' : command.meta}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              ) : (
                <div className="topbar-command-empty">
                  <div className="topbar-command-empty-title">No matches found</div>
                  <div className="topbar-command-empty-copy">Try searching for campaigns, analytics, AI, approvals, or settings.</div>
                </div>
              )}
            </div>

            <div className="topbar-command-footer">
              <span>Press <kbd>Enter</kbd> to open the top result</span>
              <span>Press <kbd>Esc</kbd> to close</span>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
