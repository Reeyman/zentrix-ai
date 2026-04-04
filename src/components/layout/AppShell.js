'use client'

import { SidebarNav } from './SidebarNav'
import { Topbar } from './Topbar'

export { AppShell } from './AppShell.tsx'

export function LegacyAppShell({ children }) {
  return (
    <div className="min-h-screen enterprise-gradient">
      <div className="flex h-screen">
        <SidebarNav />
        <div className="flex flex-1 flex-col">
          <Topbar />
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
