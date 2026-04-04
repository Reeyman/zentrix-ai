import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getAuthenticatedUserFromHeaders } from '@/lib/auth-session'
import { resolveWorkspacePayload } from '@/lib/server-app-data';

export async function requireWorkspace(workspaceId?: string) {
  const authenticatedUser = getAuthenticatedUserFromHeaders(headers())

  if (!authenticatedUser?.id) {
    redirect('/login')
  }

  const payload = await resolveWorkspacePayload(workspaceId)

  return {
    user: payload.currentUser,
    workspace: payload.currentWorkspace,
    role: payload.currentUser.role,
  }
}
