'use client'

import { create } from 'zustand'

interface AppState {
  // Global state
  workspace: string
  dateRange: string
  searchQuery: string
  dataFreshness: Date
  
  // UI state
  rightRailVisible: boolean
  selectedItems: string[]
  
  // Actions
  setWorkspace: (workspace: string) => void
  setDateRange: (range: string) => void
  setSearchQuery: (query: string) => void
  updateDataFreshness: () => void
  setRightRailVisible: (visible: boolean) => void
  setSelectedItems: (items: string[]) => void
}

export const useAppStore = create<AppState>((set) => ({
  // Initial state
  workspace: '',
  dateRange: '30d',
  searchQuery: '',
  dataFreshness: new Date(),
  rightRailVisible: false,
  selectedItems: [],
  
  // Actions
  setWorkspace: (workspace) => set({ workspace }),
  setDateRange: (dateRange) => set({ dateRange }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  updateDataFreshness: () => set({ dataFreshness: new Date() }),
  setRightRailVisible: (rightRailVisible) => set({ rightRailVisible }),
  setSelectedItems: (selectedItems) => set({ selectedItems }),
}))
