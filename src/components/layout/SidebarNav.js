'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
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
} from 'lucide-react'

export { default } from './SidebarNav.tsx'
export { default as SidebarNav } from './SidebarNav.tsx'

const navigation = [
  {
    group: 'Main',
    items: [
      { href: '/app/overview', label: 'Overview', icon: LayoutGrid, badge: null },
      { href: '/app/campaigns', label: 'Campaigns', icon: Target, badge: null },
      { href: '/app/audiences', label: 'Audiences', icon: UsersRound, badge: 'New' },
      { href: '/app/creatives', label: 'Creatives', icon: Layers, badge: null },
      { href: '/app/analytics', label: 'Analytics', icon: ChartColumn, badge: null },
      { href: '/app/reports', label: 'Reports', icon: FileText, badge: null },
      { href: '/app/ai-center', label: 'AI Center', icon: Cpu, badge: 'Beta' },
    ],
  },
  {
    group: 'Admin',
    items: [
      { href: '/app/settings', label: 'Settings', icon: Settings2, badge: null },
      { href: '/app/users', label: 'Users', icon: UserSquare, badge: null },
      { href: '/app/roles', label: 'Roles & Permissions', icon: ShieldCheck, badge: null },
      { href: '/app/integrations', label: 'Integrations', icon: Cable, badge: null },
      { href: '/app/audit-log', label: 'Audit Log', icon: FileClock, badge: null },
      { href: '/app/billing', label: 'Billing', icon: Receipt, badge: null },
    ],
  },
]

export function LegacySidebarNav() {
  const pathname = usePathname()
  const [collapsedGroups, setCollapsedGroups] = useState([])

  const toggleGroup = (group) => {
    setCollapsedGroups(prev => 
      prev.includes(group) 
        ? prev.filter(g => g !== group)
        : [...prev, group]
    )
  }

  return (
    <div className="w-64 bg-card border-r border-border p-4">
      <div className="mb-8">
        <h2 className="text-xl font-bold text-foreground">AI Enterprise</h2>
        <p className="text-sm text-muted-foreground">Advertising Platform</p>
      </div>

      <nav className="space-y-6">
        {navigation.map((navGroup) => (
          <div key={navGroup.group}>
            <button
              onClick={() => toggleGroup(navGroup.group)}
              className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {navGroup.group}
              <span className="text-muted-foreground">
                {collapsedGroups.includes(navGroup.group) ? '▶' : '▼'}
              </span>
            </button>
            
            {!collapsedGroups.includes(navGroup.group) && (
              <div className="mt-2 space-y-1">
                {navGroup.items.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors ${
                        isActive 
                          ? "bg-primary text-primary-foreground" 
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {item.icon ? <item.icon className="h-4 w-4" strokeWidth={1.8} /> : null}
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* status footer removed for cleaner look */}
    </div>
  )
}
