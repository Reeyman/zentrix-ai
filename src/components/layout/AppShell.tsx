'use client';

import SidebarNav from './SidebarNav';
import MobileBottomNav from './MobileBottomNav';
import { Topbar } from './Topbar';
import { useWorkspace } from '@/hooks/use-workspace';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { currentWorkspace, workspaces, currentUser, mode, isLoading, switchWorkspace } = useWorkspace();

  if (isLoading) {
    return <AppShellSkeleton />;
  }

  // Check if we're on mobile
  const isMobile = typeof window !== 'undefined' ? window.innerWidth <= 768 : false;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-0)", color: "var(--text-0)", width: "100%" }}>
      {/* Only render sidebar on desktop */}
      {!isMobile && <SidebarNav />}

      <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, width: "100%" }}>
        <Topbar currentWorkspace={currentWorkspace} workspaces={workspaces} currentUser={currentUser} mode={mode} switchWorkspace={switchWorkspace} />
        <main style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, padding: 0, margin: 0, width: "100%", maxWidth: "none" }}>{children}</main>
      </div>

      {/* Mobile Bottom Navigation - Only visible on mobile */}
      <MobileBottomNav />
    </div>
  );
}

function AppShellSkeleton() {
  return (
    <div className="flex h-screen bg-background">
      <div className="w-64 bg-card border-r border-border animate-pulse">
        <div className="p-4 space-y-4">
          <div className="h-8 bg-muted rounded w-3/4"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
        </div>
      </div>
      <div className="flex flex-1 flex-col">
        <div className="h-16 bg-card border-b border-border animate-pulse"></div>
        <main className="flex-1 p-6">
          <div className="space-y-4">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="grid grid-cols-6 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-24 bg-muted rounded animate-pulse"></div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
