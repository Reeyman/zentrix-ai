'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import type { AppMode, AppUser, AppWorkspace, WorkspacePayload } from '@/types/app-models';

interface UseWorkspaceReturn {
  currentWorkspace: AppWorkspace | null;
  workspaces: AppWorkspace[];
  currentUser: AppUser | null;
  mode: AppMode | null;
  isLoading: boolean;
  error: string | null;
  switchWorkspace: (workspaceId: string) => void;
  refreshWorkspace: () => Promise<void>;
}

export function useWorkspace(): UseWorkspaceReturn {
  const router = useRouter();
  const selectedWorkspaceId = useAppStore((state) => state.workspace);
  const setWorkspace = useAppStore((state) => state.setWorkspace);
  const [currentWorkspace, setCurrentWorkspace] = useState<AppWorkspace | null>(null);
  const [workspaces, setWorkspaces] = useState<AppWorkspace[]>([]);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [mode, setMode] = useState<AppMode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const applyWorkspacePayload = useCallback((payload: WorkspacePayload) => {
    const persistedWorkspaceId = typeof window !== 'undefined' ? window.localStorage.getItem('selectedWorkspaceId') : null;
    const preferredWorkspaceId = persistedWorkspaceId || selectedWorkspaceId;
    const nextWorkspace = payload.workspaces.find((workspace) => workspace.id === preferredWorkspaceId) ?? payload.currentWorkspace;

    setWorkspaces(payload.workspaces);
    setCurrentWorkspace(nextWorkspace);
    setCurrentUser(payload.currentUser);
    setMode(payload.mode);
    setWorkspace(nextWorkspace.id);

    if (typeof window !== 'undefined') {
      window.localStorage.setItem('selectedWorkspaceId', nextWorkspace.id);
    }
  }, [selectedWorkspaceId, setWorkspace]);

  const refreshWorkspace = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/workspace', {
        headers: selectedWorkspaceId ? { 'x-workspace-id': selectedWorkspaceId } : undefined,
      });

      const payload = await response.json();
      if (response.status === 401) {
        const redirectTarget = typeof window !== 'undefined'
          ? `${window.location.pathname}${window.location.search}`
          : '/app/overview';
        router.replace(`/login?redirectTo=${encodeURIComponent(redirectTarget)}`);
        return;
      }

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to load workspace');
      }

      applyWorkspacePayload(payload.data as WorkspacePayload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workspace');
    } finally {
      setIsLoading(false);
    }
  }, [applyWorkspacePayload, router, selectedWorkspaceId]);

  useEffect(() => {
    // Simulate workspace loading
    const loadWorkspace = async () => {
      await refreshWorkspace();
    };

    loadWorkspace();
  }, [refreshWorkspace]);

  const switchWorkspace = (workspaceId: string) => {
    // Implementation for workspace switching
    const nextWorkspace = workspaces.find((workspace) => workspace.id === workspaceId);
    if (!nextWorkspace) {
      return;
    }

    setCurrentWorkspace(nextWorkspace);
    setWorkspace(nextWorkspace.id);

    if (typeof window !== 'undefined') {
      window.localStorage.setItem('selectedWorkspaceId', nextWorkspace.id);
    }
  };

  return {
    currentWorkspace,
    workspaces,
    currentUser,
    mode,
    isLoading,
    error,
    switchWorkspace,
    refreshWorkspace,
  };
}
