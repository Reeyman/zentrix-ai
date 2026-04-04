'use client'

import { useState } from 'react'
import { Search, Bell, HelpCircle, Plus, Clock } from 'lucide-react'

export { Topbar } from './Topbar.tsx'

export function LegacyTopbar() {
  const [searchQuery, setSearchQuery] = useState('')
  const [notifications] = useState(3)

  return (
    <header className="h-16 bg-card border-b border-border">
      <div className="h-full px-6 flex items-center justify-between">
        {/* Left side - Workspace & Date Range */}
        <div className="flex items-center gap-4">
          {/* Workspace Selector */}
          <select className="w-48 px-3 py-2 bg-background border border-border rounded-md text-sm topbar-select" style={{ colorScheme: 'dark' }}>
            <option value="main">Main Account</option>
            <option value="brand1">Brand Alpha</option>
            <option value="brand2">Brand Beta</option>
            <option value="brand3">Brand Gamma</option>
          </select>

          {/* Date Range Selector */}
          <select className="w-32 px-3 py-2 bg-background border border-border rounded-md text-sm topbar-select" style={{ colorScheme: 'dark' }}>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        {/* Center - Search */}
        <div className="flex items-center gap-4 flex-1 max-w-md mx-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.8} />
            <input
              type="text"
              placeholder="Search campaigns, audiences, creatives..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 bg-background border border-border rounded-md text-sm placeholder-muted-foreground"
            />
          </div>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-3">
          {/* Create Campaign CTA */}
          <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 text-sm font-medium flex items-center gap-2">
            <Plus className="h-4 w-4" strokeWidth={1.8} />
            Create Campaign
          </button>

          {/* Notifications */}
          <button className="relative p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md">
            <Bell className="h-4 w-4" strokeWidth={1.8} />
            {notifications > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-xs">
                {notifications}
              </span>
            )}
          </button>

          {/* Help */}
          <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md">
            <HelpCircle className="h-4 w-4" strokeWidth={1.8} />
          </button>

          {/* User Menu */}
          <div className="flex items-center gap-2 pl-3 border-l border-border">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-medium">
              U
            </div>
            <div className="text-sm">
              <div className="font-medium text-foreground">Admin User</div>
              <div className="text-muted-foreground">admin@adai.com</div>
            </div>
          </div>

          {/* Data Freshness */}
          <span className="px-2 py-1 bg-secondary text-secondary-foreground rounded text-xs flex items-center gap-1">
            <Clock className="h-3 w-3" strokeWidth={1.8} />
            Updated 2 min ago
          </span>
        </div>
      </div>
    </header>
  )
}
