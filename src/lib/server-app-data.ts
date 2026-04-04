import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import { headers } from 'next/headers'
import { getAuthenticatedUserFromHeaders } from '@/lib/auth-session'
import { getPlanByCode } from '@/lib/pricing'
import { getSupabaseAdminConfig } from '@/lib/runtime-config'
import type {
  AppBillingSummary,
  AppAuditEvent,
  AppAnalyticsCampaign,
  AppAnalyticsChannel,
  AppAuthProvider,
  AppCampaignRecord,
  AppCreativeRecord,
  AppIntegrationRecord,
  AppInvoiceRecord,
  AppRoleApproval,
  AppRoleRecord,
  AppUser,
  AppUserStatus,
  AppWorkspace,
  AppWorkspaceReport,
  AppWorkspaceUser,
  CampaignChannel,
  CampaignCreatePayload,
  CampaignStatus,
  CampaignUpdatePayload,
  WorkspaceAuditPayload,
  WorkspaceAnalyticsPayload,
  WorkspaceBillingPayload,
  WorkspaceCreativesPayload,
  WorkspacePayload,
  WorkspaceRolesPayload,
  WorkspaceReportsPayload,
  WorkspaceIntegrationsPayload,
  WorkspaceUsersPayload,
  WorkspaceRole,
} from '@/types/app-models'

type OrganizationRow = {
  id: string
  name: string
  description: string | null
  created_at: string
}

type MembershipRow = {
  organization_id: string
  user_id: string
  role: string
}

type CampaignRow = {
  id: string
  organization_id: string
  created_by: string
  name: string
  description: string | null
  budget: number | null
  start_date: string | null
  end_date: string | null
  status: string
  metrics: Record<string, unknown> | null
  settings: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

type AuditLogRow = {
  id: string
  workspace_id: string
  user_id: string | null
  event_type: string
  entity_type: string
  entity_id: string | null
  details: Record<string, unknown> | null
  ip_address: string
  user_agent: string
  created_at: string
}

type CreativeRow = {
  id: string
  workspace_id: string
  name: string
  format: string
  impressions: number
  ctr: number
  conversions: number
  roas: number
  status: string
  created_at: string
  updated_at: string
}

type RoleRow = {
  id: string
  workspace_id: string
  name: string
  user_count: number
  scope: string
  status: string
  review_due: string
  approver: string
  created_at: string
  updated_at: string
}

type ApprovalRow = {
  id: string
  workspace_id: string
  change_summary: string
  requester: string
  approvers: string
  due: string
  status: string
  created_at: string
  updated_at: string
}

type IntegrationRow = {
  id: string
  workspace_id: string
  name: string
  integration_type: string
  status: string
  sync_label: string
  last_sync_at: string
  created_at: string
  updated_at: string
}

type InvoiceRow = {
  id: string
  workspace_id: string
  amount_cents: number
  amount_label: string
  status: string
  due_label: string
  created_at: string
  updated_at: string
}

type DemoStore = {
  workspaces: AppWorkspace[]
  currentUser: AppUser
  users: AppWorkspaceUser[]
  events: AppAuditEvent[]
  campaigns: AppCampaignRecord[]
  creatives: AppCreativeRecord[]
  roles: AppRoleRecord[]
  approvals: AppRoleApproval[]
  integrations: AppIntegrationRecord[]
  invoices: AppInvoiceRecord[]
}

declare global {
  var __advertisingAiDemoStore: DemoStore | undefined
}

const EMPTY_CONNECTED_WORKSPACE_ID = '00000000-0000-0000-0000-000000000000'
const EMPTY_CONNECTED_USER_ID = '00000000-0000-0000-0000-000000000001'

function createEmptyConnectedWorkspacePayload(currentUser?: AppUser, description?: string): WorkspacePayload {
  const fallbackUser = currentUser ?? {
    id: EMPTY_CONNECTED_USER_ID,
    email: 'setup-required@example.com',
    name: 'Setup Required',
    role: 'owner',
  }

  const currentWorkspace: AppWorkspace = {
    id: EMPTY_CONNECTED_WORKSPACE_ID,
    name: 'Connected Workspace',
    description: description ?? 'Supabase is connected but no organizations or members have been created yet',
    role: fallbackUser.role,
    environment: 'Production',
  }

  return {
    mode: 'connected',
    currentWorkspace,
    workspaces: [currentWorkspace],
    currentUser: fallbackUser,
  }
}

function isEmptyConnectedWorkspacePayload(workspacePayload: WorkspacePayload) {
  return workspacePayload.mode === 'connected'
    && workspacePayload.currentWorkspace.id === EMPTY_CONNECTED_WORKSPACE_ID
    && workspacePayload.currentUser.id === EMPTY_CONNECTED_USER_ID
}

function assertConnectedWorkspaceIsInitialized(workspacePayload: WorkspacePayload) {
  if (isEmptyConnectedWorkspacePayload(workspacePayload)) {
    throw new Error('Supabase is connected, but no real users or workspaces exist yet. Create the first account to initialize connected workspace data.')
  }
}

function toRole(role?: string | null): WorkspaceRole {
  if (role === 'owner' || role === 'admin' || role === 'member' || role === 'viewer') {
    return role
  }

  return 'owner'
}

function toChannel(value: unknown): CampaignChannel {
  if (value === 'Search' || value === 'Display' || value === 'Social' || value === 'Video' || value === 'Programmatic') {
    return value
  }

  return 'Search'
}

function toStatus(value: unknown): CampaignStatus {
  if (value === 'draft' || value === 'active' || value === 'paused' || value === 'completed' || value === 'cancelled') {
    return value
  }

  return 'draft'
}

function toDisplayName(email: string) {
  const [name] = email.split('@')
  return name
    .split(/[._-]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'Admin User'
}

function toUserStatus(user?: User | null): AppUserStatus {
  if (!user) {
    return 'pending'
  }

  return user.email_confirmed_at ? 'active' : 'pending'
}

function toAuthProvider(user?: User | null): AppAuthProvider {
  const identities = Array.isArray(user?.identities) ? user.identities : []
  return identities.some((identity) => identity.provider && identity.provider !== 'email') ? 'sso' : 'email'
}

function mapWorkspaceUser(membership: MembershipRow, user?: User | null): AppWorkspaceUser {
  const email = user?.email ?? `pending-${membership.user_id.slice(0, 8)}@adai.local`

  return {
    id: membership.user_id,
    workspaceId: membership.organization_id,
    email,
    name: toDisplayName(email),
    role: toRole(membership.role),
    status: toUserStatus(user),
    authProvider: toAuthProvider(user),
    mfaEnabled: false,
    lastActiveAt: user?.last_sign_in_at ?? user?.created_at ?? '',
  }
}

const roleOrder: Record<WorkspaceRole, number> = {
  owner: 0,
  admin: 1,
  member: 2,
  viewer: 3,
}

function sortWorkspaceUsers(users: AppWorkspaceUser[]) {
  return [...users].sort((left, right) => {
    const roleDelta = roleOrder[left.role] - roleOrder[right.role]
    if (roleDelta !== 0) {
      return roleDelta
    }

    return left.name.localeCompare(right.name)
  })
}

function toTitleCaseLabel(value?: string | null, fallback = 'Unknown') {
  if (!value) {
    return fallback
  }

  return value
    .split(/[._-]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || fallback
}

function toAuditText(value: unknown, fallback = '—') {
  if (value === null || value === undefined || value === '') {
    return fallback
  }

  if (typeof value === 'string') {
    return value
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  try {
    return JSON.stringify(value)
  } catch {
    return fallback
  }
}

function isUuidLike(value?: string | null) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value ?? '')
}

function toConnectedAuditUserId(value?: string | null) {
  return isUuidLike(value) ? value : null
}

function trimNumericLabel(value: number, maximumFractionDigits = 2) {
  return value
    .toFixed(maximumFractionDigits)
    .replace(/\.0+$/, '')
    .replace(/(\.\d*?)0+$/, '$1')
}

function formatCompactNumber(value: number) {
  if (!Number.isFinite(value)) {
    return '0'
  }

  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: value >= 1000000 ? 1 : 0,
  })
    .format(value)
    .replace(/K$/, 'k')
}

function mapCreativeRow(row: CreativeRow): AppCreativeRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    format: row.format,
    impressions: formatCompactNumber(Number(row.impressions ?? 0)),
    ctr: `${trimNumericLabel(Number(row.ctr ?? 0), 2)}%`,
    conversions: Math.round(Number(row.conversions ?? 0)).toLocaleString('en-US'),
    roas: `${trimNumericLabel(Number(row.roas ?? 0), 1)}x`,
    status: row.status,
  }
}

function mapRoleRow(row: RoleRow): AppRoleRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    users: String(Number(row.user_count ?? 0)),
    scope: row.scope,
    status: row.status,
    reviewDue: row.review_due,
    approver: row.approver,
  }
}

function mapApprovalRow(row: ApprovalRow): AppRoleApproval {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    change: row.change_summary,
    requester: row.requester,
    approvers: row.approvers,
    due: row.due,
    status: row.status,
  }
}

function mapIntegrationRow(row: IntegrationRow): AppIntegrationRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    type: row.integration_type,
    status: row.status,
    sync: row.sync_label || 'Just now',
  }
}

function mapInvoiceRow(row: InvoiceRow): AppInvoiceRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    amount: row.amount_label || formatCurrencyLabel(Number(row.amount_cents ?? 0) / 100),
    status: row.status,
    due: row.due_label,
  }
}

function formatBillingDateLabel(value?: string | null, fallback = 'Pending subscription sync') {
  if (!value) {
    return fallback
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return fallback
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(parsed)
}

function buildBillingSummary(summary?: Partial<AppBillingSummary>): AppBillingSummary {
  return {
    currentPlan: summary?.currentPlan ?? getPlanByCode('starter')?.name ?? 'Starter',
    billingInterval: summary?.billingInterval ?? 'Monthly',
    nextBillingDate: summary?.nextBillingDate ?? 'Pending subscription sync',
    trialEndDate: summary?.trialEndDate ?? 'No active trial',
    paymentMethod: summary?.paymentMethod ?? 'Pending provider sync',
    usageThisCycle: summary?.usageThisCycle ?? 'Usage metering pending',
    upgradeMessage:
      summary?.upgradeMessage ??
      'Need more limits? Upgrade your plan for more users, workspaces, and AI features.',
  }
}

async function resolveConnectedBillingSummary(supabase: SupabaseClient, workspaceId: string) {
  const fallbackSummary = buildBillingSummary()

  try {
    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('plan_id, billing_interval, trial_end_at, current_period_end_at, provider_customer_id')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (subscriptionError) {
      return fallbackSummary
    }

    let currentPlan = fallbackSummary.currentPlan
    if (subscription?.plan_id) {
      const { data: planRow, error: planError } = await supabase
        .from('plans')
        .select('name')
        .eq('id', subscription.plan_id)
        .maybeSingle()

      if (!planError && typeof planRow?.name === 'string' && planRow.name) {
        currentPlan = planRow.name
      }
    }

    const { data: usageRecord } = await supabase
      .from('usage_records')
      .select('metric_key, quantity')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    return buildBillingSummary({
      currentPlan,
      billingInterval:
        subscription?.billing_interval === 'yearly'
          ? 'Yearly'
          : subscription?.billing_interval === 'monthly'
            ? 'Monthly'
            : fallbackSummary.billingInterval,
      nextBillingDate: formatBillingDateLabel(subscription?.current_period_end_at),
      trialEndDate: formatBillingDateLabel(subscription?.trial_end_at, 'No active trial'),
      paymentMethod: subscription?.provider_customer_id ? 'Billing customer on file' : 'Pending provider sync',
      usageThisCycle: usageRecord
        ? `${Number(usageRecord.quantity ?? 0).toLocaleString()} ${String(usageRecord.metric_key ?? 'events').replace(/_/g, ' ')}`
        : fallbackSummary.usageThisCycle,
    })
  } catch {
    return fallbackSummary
  }
}

function resolveDemoBillingSummary() {
  const trialEndAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()

  return buildBillingSummary({
    currentPlan: getPlanByCode('starter')?.name ?? 'Starter',
    billingInterval: 'Monthly',
    nextBillingDate: 'Pending activation',
    trialEndDate: formatBillingDateLabel(trialEndAt),
    paymentMethod: 'Add billing method at checkout',
    usageThisCycle: 'Usage-based API pricing available on eligible plans',
  })
}

function mapAuditLogRow(row: AuditLogRow, actorName: string): AppAuditEvent {
  const details = row.details ?? {}
  const actorId = row.user_id ?? 'system-user'

  return {
    id: row.id,
    workspaceId: row.workspace_id,
    actorId,
    actorName,
    entityId: row.entity_id ?? undefined,
    action: typeof details.action === 'string' ? details.action : toTitleCaseLabel(row.event_type, 'Audit Event'),
    module: typeof details.module === 'string' ? details.module : toTitleCaseLabel(row.entity_type, 'General'),
    result: typeof details.result === 'string' ? details.result : 'Applied',
    sourceIp: row.ip_address || 'Unknown IP',
    before: toAuditText(details.before),
    after: toAuditText(details.after),
    createdAt: row.created_at,
    userAgent: row.user_agent || 'Unknown client',
  }
}

function formatCurrencyLabel(value: number) {
  return `$${Math.round(value).toLocaleString()}`
}

function calculateRevenue(spend: number, roas: number) {
  return Number((spend * roas).toFixed(2))
}

function toBudgetUtilization(spend: number, budget: number) {
  return budget > 0 ? Math.round((spend / budget) * 100) : 0
}

function shiftIsoTimestamp(value: string | undefined, days: number) {
  const parsed = value ? new Date(value) : new Date()
  if (Number.isNaN(parsed.getTime())) {
    const fallback = new Date()
    fallback.setUTCDate(fallback.getUTCDate() + days)
    return fallback.toISOString()
  }

  parsed.setUTCDate(parsed.getUTCDate() + days)
  return parsed.toISOString()
}

function getLatestSignalTimestamp(values: Array<string | undefined>) {
  return values
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => right.localeCompare(left))[0] ?? new Date().toISOString()
}

function selectReportOwner(users: AppWorkspaceUser[], currentUser: AppUser, matcher: (user: AppWorkspaceUser) => boolean) {
  return users.find(matcher)?.name ?? currentUser.name
}

function buildWorkspaceCreativeSeeds(workspaceId: string): AppCreativeRecord[] {
  return [
    { id: 'creative-summer-launch-video', workspaceId, name: 'Summer Launch - Video', format: 'Video', impressions: '1.2M', ctr: '2.34%', conversions: '845', roas: '4.5x', status: 'Active' },
    { id: 'creative-retargeting-carousel', workspaceId, name: 'Retargeting - Carousel', format: 'Carousel', impressions: '860k', ctr: '2.91%', conversions: '623', roas: '4.1x', status: 'Active' },
    { id: 'creative-awareness-static', workspaceId, name: 'Awareness - Static', format: 'Static', impressions: '540k', ctr: '1.45%', conversions: '214', roas: '2.8x', status: 'Paused' },
  ]
}

function buildWorkspaceRoleSeeds(workspaceId: string): AppRoleRecord[] {
  return [
    { id: 'role-1', workspaceId, name: 'Platform Admin', users: '8', scope: 'Global', status: 'Active', reviewDue: 'Mar 12', approver: 'Security Council' },
    { id: 'role-2', workspaceId, name: 'Finance Reviewer', users: '4', scope: 'Billing', status: 'Active', reviewDue: 'Mar 15', approver: 'Finance Lead' },
    { id: 'role-3', workspaceId, name: 'Campaign Manager', users: '19', scope: 'Campaigns', status: 'Active', reviewDue: 'Mar 20', approver: 'Ops Lead' },
    { id: 'role-4', workspaceId, name: 'Read Only Analyst', users: '37', scope: 'Reporting', status: 'Active', reviewDue: 'Apr 01', approver: 'Analytics Director' },
  ]
}

function buildWorkspaceApprovalSeeds(workspaceId: string): AppRoleApproval[] {
  return [
    { id: 'appr-1', workspaceId, change: 'Elevate finance reviewer for invoice disputes', requester: 'Ops Lead', approvers: 'Security + Finance', due: 'Today', status: 'Pending' },
    { id: 'appr-2', workspaceId, change: 'Reduce global admin scope for dormant account', requester: 'Security', approvers: 'Platform Admin', due: '4h', status: 'Open' },
    { id: 'appr-3', workspaceId, change: 'Approve new analyst template for reporting', requester: 'Analytics Director', approvers: 'Security + RevOps', due: 'Tomorrow', status: 'Scheduled' },
  ]
}

function buildWorkspaceIntegrationSeeds(workspaceId: string): AppIntegrationRecord[] {
  return [
    { id: 'integration-google-ads', workspaceId, name: 'Google Ads', type: 'Ad Platform', status: 'Healthy', sync: '2 min ago' },
    { id: 'integration-meta-ads', workspaceId, name: 'Meta Ads', type: 'Ad Platform', status: 'Healthy', sync: '4 min ago' },
    { id: 'integration-hubspot', workspaceId, name: 'HubSpot', type: 'CRM', status: 'Healthy', sync: '9 min ago' },
    { id: 'integration-bigquery', workspaceId, name: 'BigQuery', type: 'Warehouse', status: 'Warning', sync: '17 min ago' },
  ]
}

function buildWorkspaceInvoiceSeeds(workspaceId: string): AppInvoiceRecord[] {
  return [
    { id: 'INV-2026-031', workspaceId, amount: '$12,480', status: 'Scheduled', due: 'Mar 12' },
    { id: 'INV-2026-030', workspaceId, amount: '$11,905', status: 'Pending', due: 'Mar 08' },
    { id: 'INV-2026-029', workspaceId, amount: '$10,740', status: 'Paid', due: 'Feb 28' },
    { id: 'INV-2026-028', workspaceId, amount: '$9,860', status: 'Paid', due: 'Feb 12' },
  ]
}

function ensureWorkspaceEnterpriseData(store: DemoStore, workspaceId: string) {
  // Ensure arrays are initialized before calling .some()
  if (!store.creatives) store.creatives = []
  if (!store.roles) store.roles = []
  if (!store.approvals) store.approvals = []
  if (!store.integrations) store.integrations = []
  if (!store.invoices) store.invoices = []

  if (!store.creatives.some((creative) => creative.workspaceId === workspaceId)) {
    store.creatives.push(...buildWorkspaceCreativeSeeds(workspaceId))
  }

  if (!store.roles.some((role) => role.workspaceId === workspaceId)) {
    store.roles.push(...buildWorkspaceRoleSeeds(workspaceId))
  }

  if (!store.approvals.some((approval) => approval.workspaceId === workspaceId)) {
    store.approvals.push(...buildWorkspaceApprovalSeeds(workspaceId))
  }

  if (!store.integrations.some((integration) => integration.workspaceId === workspaceId)) {
    store.integrations.push(...buildWorkspaceIntegrationSeeds(workspaceId))
  }

  if (!store.invoices.some((invoice) => invoice.workspaceId === workspaceId)) {
    store.invoices.push(...buildWorkspaceInvoiceSeeds(workspaceId))
  }
}

function applyAuditReviewOverlays(events: AppAuditEvent[]) {
  const flaggedEventIds = new Set(
    events
      .filter(
        (event) =>
          Boolean(event.entityId) &&
          event.module.trim().toLowerCase() === 'audit log' &&
          event.result.trim().toLowerCase() === 'open',
      )
      .map((event) => event.entityId as string),
  )

  if (!flaggedEventIds.size) {
    return events
  }

  return events.map((event) => (flaggedEventIds.has(event.id) ? { ...event, result: 'Open' } : event))
}

function applyUserReviewOverlays(users: AppWorkspaceUser[], events: AppAuditEvent[]) {
  const openReviewIds = new Set(
    events
      .filter(
        (event) =>
          Boolean(event.entityId) &&
          event.module.trim().toLowerCase() === 'users' &&
          event.action.trim().toLowerCase().includes('review') &&
          event.result.trim().toLowerCase() === 'open',
      )
      .map((event) => event.entityId as string),
  )

  if (!openReviewIds.size) {
    return users
  }

  return users.map((user): AppWorkspaceUser => (openReviewIds.has(user.id) ? { ...user, status: 'pending' } : user))
}

async function createWorkspaceModuleAuditEvent(
  workspacePayload: WorkspacePayload,
  module: string,
  entityType: string,
  entityId: string | undefined,
  action: string,
  result: string,
  before: string,
  after: string,
) {
  const now = new Date().toISOString()

  if (workspacePayload.mode === 'connected') {
    const supabase = createAdminClient()

    if (!supabase) {
      throw new Error(`Connected ${module.toLowerCase()} actions require a configured Supabase admin client`)
    }

    const eventType = `${module.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_action`
    const { data, error } = await supabase
      .from('audit_log')
      .insert({
        workspace_id: workspacePayload.currentWorkspace.id,
        user_id: toConnectedAuditUserId(workspacePayload.currentUser.id),
        event_type: eventType,
        entity_type: entityType,
        entity_id: entityId ?? null,
        details: {
          action,
          module,
          result,
          before,
          after,
        },
        ip_address: 'API request',
        user_agent: `Next.js ${module.toLowerCase()} action`,
      })
      .select('id, workspace_id, user_id, event_type, entity_type, entity_id, details, ip_address, user_agent, created_at')
      .single()

    if (error || !data) {
      throw new Error(`Failed to record the ${module.toLowerCase()} action in the audit log`)
    }

    return mapAuditLogRow(data as AuditLogRow, workspacePayload.currentUser.name)
  }

  const store = getDemoStore()
  const event: AppAuditEvent = {
    id: `evt-${Math.random().toString(36).slice(2, 10)}`,
    workspaceId: workspacePayload.currentWorkspace.id,
    actorId: workspacePayload.currentUser.id,
    actorName: workspacePayload.currentUser.name,
    entityId,
    action,
    module,
    result,
    sourceIp: 'API request',
    before,
    after,
    createdAt: now,
    userAgent: `Next.js ${module.toLowerCase()} action`,
  }

  store.events.unshift(event)
  return event
}

function buildChannelPerformance(campaigns: AppCampaignRecord[]): AppAnalyticsChannel[] {
  const grouped = new Map<CampaignChannel, {
    channel: CampaignChannel
    campaigns: number
    activeCampaigns: number
    spend: number
    budget: number
    revenue: number
  }>()

  for (const campaign of campaigns) {
    const current = grouped.get(campaign.channel) ?? {
      channel: campaign.channel,
      campaigns: 0,
      activeCampaigns: 0,
      spend: 0,
      budget: 0,
      revenue: 0,
    }

    current.campaigns += 1
    current.activeCampaigns += campaign.status === 'active' ? 1 : 0
    current.spend += campaign.spend
    current.budget += campaign.budget
    current.revenue += calculateRevenue(campaign.spend, campaign.roas)
    grouped.set(campaign.channel, current)
  }

  return Array.from(grouped.values())
    .map((entry) => ({
      id: `channel-${entry.channel.toLowerCase()}`,
      channel: entry.channel,
      campaigns: entry.campaigns,
      activeCampaigns: entry.activeCampaigns,
      spend: entry.spend,
      budget: entry.budget,
      revenue: entry.revenue,
      roas: entry.spend > 0 ? Number((entry.revenue / entry.spend).toFixed(2)) : 0,
    }))
    .sort((left, right) => right.revenue - left.revenue || right.spend - left.spend || left.channel.localeCompare(right.channel))
}

function buildCampaignPerformance(campaigns: AppCampaignRecord[]): AppAnalyticsCampaign[] {
  return [...campaigns]
    .map((campaign) => ({
      id: campaign.id,
      campaignId: campaign.id,
      name: campaign.name,
      channel: campaign.channel,
      status: campaign.status,
      spend: campaign.spend,
      budget: campaign.budget,
      revenue: calculateRevenue(campaign.spend, campaign.roas),
      roas: campaign.roas,
      budgetUtilization: toBudgetUtilization(campaign.spend, campaign.budget),
    }))
    .sort((left, right) => right.revenue - left.revenue || right.spend - left.spend || left.name.localeCompare(right.name))
}

function buildWorkspaceReports(
  campaigns: AppCampaignRecord[],
  users: AppWorkspaceUser[],
  events: AppAuditEvent[],
  currentUser: AppUser,
): AppWorkspaceReport[] {
  const channelPerformance = buildChannelPerformance(campaigns)
  const campaignPerformance = buildCampaignPerformance(campaigns)
  const activeCampaigns = campaigns.filter((campaign) => campaign.status === 'active')
  const activeUsers = users.filter((user) => user.status === 'active')
  const openReviews = events.filter((event) => event.result.trim().toLowerCase() === 'open').length
  const totalSpend = campaigns.reduce((sum, campaign) => sum + campaign.spend, 0)
  const totalRevenue = campaignPerformance.reduce((sum, campaign) => sum + campaign.revenue, 0)
  const portfolioRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0
  const latestCampaignSignal = getLatestSignalTimestamp(campaigns.map((campaign) => campaign.updatedAt))
  const latestAuditSignal = getLatestSignalTimestamp(events.map((event) => event.createdAt))
  const latestUserSignal = getLatestSignalTimestamp(users.map((user) => user.lastActiveAt || undefined))
  const sharedStakeholders = Math.max(activeUsers.length, 1)
  const topChannel = channelPerformance[0]
  const topCampaign = campaignPerformance[0]
  const leadershipOwner = selectReportOwner(users, currentUser, (user) => user.role === 'owner' || user.role === 'admin')
  const operationsOwner = selectReportOwner(users, currentUser, (user) => user.name.toLowerCase().includes('ops') || user.role === 'admin')
  const marketingOwner = selectReportOwner(users, currentUser, (user) => user.role === 'member')
  const securityOwner = selectReportOwner(users, currentUser, (user) => user.role === 'owner' || user.role === 'admin')

  const baseReports: AppWorkspaceReport[] = [
    {
      id: 'report-weekly-performance',
      name: 'Weekly Performance',
      owner: operationsOwner,
      cadence: 'Weekly',
      format: 'Dashboard',
      status: campaigns.length ? 'On schedule' : 'Scheduled',
      stakeholders: sharedStakeholders,
      lastRunAt: latestCampaignSignal,
      nextRunAt: shiftIsoTimestamp(latestCampaignSignal, 7),
      summary: activeCampaigns.length
        ? `${activeCampaigns.length} active campaigns produced ${formatCurrencyLabel(totalRevenue)} estimated revenue this cycle.`
        : 'No active campaigns are currently producing performance output.',
    },
    {
      id: 'report-roas-summary',
      name: 'ROAS Summary',
      owner: leadershipOwner,
      cadence: 'Weekly',
      format: 'CSV',
      status: totalSpend > 0 ? 'On schedule' : 'Scheduled',
      stakeholders: Math.max(1, Math.ceil(sharedStakeholders / 2)),
      lastRunAt: latestCampaignSignal,
      nextRunAt: shiftIsoTimestamp(latestCampaignSignal, 7),
      summary: totalSpend > 0
        ? `Portfolio ROAS is ${portfolioRoas.toFixed(1)}x on ${formatCurrencyLabel(totalSpend)} spend.`
        : 'ROAS reporting will activate once campaigns begin spending.',
    },
    {
      id: 'report-channel-breakdown',
      name: 'Channel Breakdown',
      owner: marketingOwner,
      cadence: 'Daily',
      format: 'Dashboard',
      status: topChannel && topChannel.roas < 2 ? 'Warning' : campaigns.length ? 'On schedule' : 'Scheduled',
      stakeholders: sharedStakeholders,
      lastRunAt: latestCampaignSignal,
      nextRunAt: shiftIsoTimestamp(latestCampaignSignal, 1),
      summary: topChannel
        ? `${topChannel.channel} leads with ${topChannel.roas.toFixed(1)}x ROAS across ${topChannel.campaigns} campaigns.`
        : 'Channel mix will appear once campaigns are available.',
    },
    {
      id: 'report-executive-overview',
      name: 'Executive Overview',
      owner: leadershipOwner,
      cadence: 'Monthly',
      format: 'PDF',
      status: openReviews ? 'Warning' : 'On schedule',
      stakeholders: Math.max(sharedStakeholders, 2),
      lastRunAt: latestUserSignal,
      nextRunAt: shiftIsoTimestamp(latestUserSignal, 30),
      summary: `${campaigns.length} campaigns and ${users.length} workspace users are included in the current executive pack.`,
    },
    {
      id: 'report-governance-review',
      name: 'Governance Review',
      owner: securityOwner,
      cadence: 'Weekly',
      format: 'PDF',
      status: openReviews ? 'Warning' : 'On schedule',
      stakeholders: Math.max(1, Math.min(sharedStakeholders, 3)),
      lastRunAt: latestAuditSignal,
      nextRunAt: shiftIsoTimestamp(latestAuditSignal, 7),
      summary: openReviews
        ? `${openReviews} audit events remain open for governance follow-up.`
        : topCampaign
          ? `${topCampaign.name} currently anchors the governed performance snapshot.`
          : 'No governed performance changes are currently awaiting review.',
    },
  ]

  return baseReports.map((report) => {
    const latestRun = findLatestReportEvent(events, report.id, 'Manual run')
    const latestReview = findLatestReportEvent(events, report.id, 'Sent to review')
    const latestExport = findLatestReportEvent(events, report.id, 'Exported report')
    const hasOpenReview = Boolean(latestReview && (!latestRun || latestReview.createdAt > latestRun.createdAt))
    const lastRunAt = latestRun?.createdAt ?? report.lastRunAt
    const nextRunAt = shiftIsoTimestamp(lastRunAt, getReportCadenceDays(report.cadence))
    const summary = [
      report.summary,
      hasOpenReview ? 'Stakeholder review is currently open.' : '',
      latestExport ? 'Latest export completed successfully.' : '',
    ]
      .filter(Boolean)
      .join(' ')

    return {
      ...report,
      lastRunAt,
      nextRunAt,
      status: hasOpenReview ? 'Warning' : latestRun ? 'On schedule' : report.status,
      summary,
    }
  })
}

function getReportCadenceDays(cadence: AppWorkspaceReport['cadence']) {
  if (cadence === 'Daily') {
    return 1
  }

  if (cadence === 'Monthly') {
    return 30
  }

  return 7
}

function findLatestReportEvent(events: AppAuditEvent[], reportId: string, action: string) {
  const normalizedAction = action.trim().toLowerCase()

  return events
    .filter(
      (event) =>
        event.entityId === reportId &&
        event.module.trim().toLowerCase() === 'reports' &&
        event.action.trim().toLowerCase() === normalizedAction,
    )
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0] ?? null
}

function toDateOnly(value?: string | null) {
  if (!value) {
    return ''
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return ''
  }

  return parsed.toISOString().slice(0, 10)
}

function buildDemoStore(): DemoStore {
  const now = new Date().toISOString()
  const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60000).toISOString()
  const currentUser: AppUser = {
    id: 'demo-user-1',
    email: 'admin@adai.com',
    name: 'Admin User',
    role: 'owner',
  }

  const workspaces: AppWorkspace[] = [
    {
      id: 'workspace-main',
      name: 'Main Account',
      description: 'Primary production workspace',
      role: 'owner',
      environment: 'Demo',
    },
    {
      id: 'workspace-alpha',
      name: 'Brand Alpha',
      description: 'Regional paid media workspace',
      role: 'admin',
      environment: 'Demo',
    },
    {
      id: 'workspace-beta',
      name: 'Brand Beta',
      description: 'Growth experimentation workspace',
      role: 'member',
      environment: 'Demo',
    },
  ]

  const users: AppWorkspaceUser[] = [
    {
      id: currentUser.id,
      workspaceId: 'workspace-main',
      email: currentUser.email,
      name: currentUser.name,
      role: 'owner',
      status: 'active',
      authProvider: 'sso',
      mfaEnabled: true,
      lastActiveAt: now,
    },
    {
      id: 'demo-user-2',
      workspaceId: 'workspace-main',
      email: 'ops.lead@adai.com',
      name: 'Ops Lead',
      role: 'admin',
      status: 'active',
      authProvider: 'email',
      mfaEnabled: true,
      lastActiveAt: now,
    },
    {
      id: 'demo-user-3',
      workspaceId: 'workspace-main',
      email: 'growth.analyst@adai.com',
      name: 'Growth Analyst',
      role: 'member',
      status: 'active',
      authProvider: 'email',
      mfaEnabled: false,
      lastActiveAt: now,
    },
    {
      id: 'demo-user-4',
      workspaceId: 'workspace-alpha',
      email: 'alpha.owner@adai.com',
      name: 'Alpha Owner',
      role: 'admin',
      status: 'active',
      authProvider: 'sso',
      mfaEnabled: true,
      lastActiveAt: now,
    },
    {
      id: 'demo-user-5',
      workspaceId: 'workspace-alpha',
      email: 'alpha.viewer@adai.com',
      name: 'Alpha Viewer',
      role: 'viewer',
      status: 'pending',
      authProvider: 'email',
      mfaEnabled: false,
      lastActiveAt: '',
    },
    {
      id: 'demo-user-6',
      workspaceId: 'workspace-beta',
      email: 'beta.member@adai.com',
      name: 'Beta Member',
      role: 'member',
      status: 'disabled',
      authProvider: 'email',
      mfaEnabled: false,
      lastActiveAt: '',
    },
  ]

  const campaigns: AppCampaignRecord[] = [
    {
      id: 'camp-main-1',
      organizationId: 'workspace-main',
      createdBy: currentUser.id,
      name: 'Summer Sale 2024',
      description: 'Search activation for core seasonal demand.',
      status: 'active',
      budget: 15000,
      spend: 12450,
      roas: 4.2,
      channel: 'Search',
      startDate: '2024-06-01',
      endDate: '2024-08-31',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'camp-main-2',
      organizationId: 'workspace-main',
      createdBy: currentUser.id,
      name: 'Brand Awareness Q3',
      description: 'Display prospecting for upper-funnel awareness.',
      status: 'active',
      budget: 10000,
      spend: 8230,
      roas: 2.8,
      channel: 'Display',
      startDate: '2024-07-01',
      endDate: '2024-09-30',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'camp-alpha-1',
      organizationId: 'workspace-alpha',
      createdBy: currentUser.id,
      name: 'Product Launch Campaign',
      description: 'Social launch support with audience expansion.',
      status: 'paused',
      budget: 8000,
      spend: 6780,
      roas: 5.1,
      channel: 'Social',
      startDate: '2024-05-15',
      endDate: '2024-07-15',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'camp-beta-1',
      organizationId: 'workspace-beta',
      createdBy: currentUser.id,
      name: 'Holiday Special 2024',
      description: 'Seasonal testing flight awaiting budget release.',
      status: 'draft',
      budget: 20000,
      spend: 0,
      roas: 0,
      channel: 'Display',
      startDate: '2024-11-01',
      endDate: '2024-12-31',
      createdAt: now,
      updatedAt: now,
    },
  ]

  const events: AppAuditEvent[] = [
    {
      id: 'evt-main-1',
      workspaceId: 'workspace-main',
      actorId: 'demo-user-2',
      actorName: 'Ops Lead',
      action: 'Created integration token',
      module: 'Integrations',
      result: 'Applied',
      sourceIp: '10.24.6.11',
      before: 'No active token',
      after: 'Scoped token created',
      createdAt: minutesAgo(14),
      userAgent: 'Chrome on Windows',
    },
    {
      id: 'evt-main-2',
      workspaceId: 'workspace-main',
      actorId: currentUser.id,
      actorName: currentUser.name,
      action: 'Changed role permissions',
      module: 'Roles',
      result: 'Reviewed',
      sourceIp: '10.24.4.8',
      before: 'Reviewer template',
      after: 'Reviewer template + approval',
      createdAt: minutesAgo(47),
      userAgent: 'Edge on Windows',
    },
    {
      id: 'evt-main-3',
      workspaceId: 'workspace-main',
      actorId: currentUser.id,
      actorName: currentUser.name,
      action: 'Flagged dormant admin access',
      module: 'Users',
      result: 'Open',
      sourceIp: '10.24.2.19',
      before: 'Dormant admin assigned',
      after: 'Access review queued',
      createdAt: minutesAgo(182),
      userAgent: 'Chrome on macOS',
    },
    {
      id: 'evt-main-4',
      workspaceId: 'workspace-main',
      actorId: 'demo-user-3',
      actorName: 'Growth Analyst',
      action: 'Exported billing audit package',
      module: 'Billing',
      result: 'Applied',
      sourceIp: '10.24.5.7',
      before: 'Report pending',
      after: 'Secure export completed',
      createdAt: minutesAgo(310),
      userAgent: 'Firefox on Windows',
    },
    {
      id: 'evt-alpha-1',
      workspaceId: 'workspace-alpha',
      actorId: 'demo-user-4',
      actorName: 'Alpha Owner',
      action: 'Updated launch campaign budget',
      module: 'Campaigns',
      result: 'Applied',
      sourceIp: '10.42.3.21',
      before: '$6,500 budget',
      after: '$8,000 budget',
      createdAt: minutesAgo(95),
      userAgent: 'Safari on macOS',
    },
    {
      id: 'evt-alpha-2',
      workspaceId: 'workspace-alpha',
      actorId: 'demo-user-5',
      actorName: 'Alpha Viewer',
      action: 'Accepted workspace invite',
      module: 'Users',
      result: 'Applied',
      sourceIp: '10.42.3.28',
      before: 'Pending membership',
      after: 'Viewer access granted',
      createdAt: minutesAgo(260),
      userAgent: 'Chrome on Linux',
    },
    {
      id: 'evt-beta-1',
      workspaceId: 'workspace-beta',
      actorId: 'demo-user-6',
      actorName: 'Beta Member',
      action: 'Disabled dormant workspace access',
      module: 'Users',
      result: 'Applied',
      sourceIp: '10.55.8.14',
      before: 'Member access active',
      after: 'Account disabled',
      createdAt: minutesAgo(1440),
      userAgent: 'Chrome on Windows',
    },
  ]

  const creatives = workspaces.flatMap((workspace) => buildWorkspaceCreativeSeeds(workspace.id))
  const roles = workspaces.flatMap((workspace) => buildWorkspaceRoleSeeds(workspace.id))
  const approvals = workspaces.flatMap((workspace) => buildWorkspaceApprovalSeeds(workspace.id))
  const integrations = workspaces.flatMap((workspace) => buildWorkspaceIntegrationSeeds(workspace.id))
  const invoices = workspaces.flatMap((workspace) => buildWorkspaceInvoiceSeeds(workspace.id))

  return {
    workspaces,
    currentUser,
    users,
    events,
    campaigns,
    creatives,
    roles,
    approvals,
    integrations,
    invoices,
  }
}

function getDemoStore() {
  if (!globalThis.__advertisingAiDemoStore) {
    globalThis.__advertisingAiDemoStore = buildDemoStore()
  }

  return globalThis.__advertisingAiDemoStore
}

function createAdminClient(): SupabaseClient | null {
  const supabaseConfig = getSupabaseAdminConfig()

  if (!supabaseConfig) {
    return null
  }

  return createClient(supabaseConfig.url, supabaseConfig.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

function getRequestedWorkspaceId(headersWorkspaceId?: string) {
  return headersWorkspaceId?.trim() || undefined
}

function mapCampaignRow(row: CampaignRow): AppCampaignRecord {
  const metrics = row.metrics ?? {}
  const settings = row.settings ?? {}

  return {
    id: row.id,
    organizationId: row.organization_id,
    createdBy: row.created_by,
    name: row.name,
    description: row.description ?? '',
    status: toStatus(row.status),
    budget: Number(row.budget ?? 0),
    spend: Number(metrics.spend ?? 0),
    roas: Number(metrics.roas ?? 0),
    channel: toChannel(metrics.channel ?? settings.channel),
    startDate: toDateOnly(row.start_date),
    endDate: toDateOnly(row.end_date),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function resolveDemoWorkspacePayload(requestedWorkspaceId?: string): WorkspacePayload {
  const store = getDemoStore()
  const currentWorkspace = store.workspaces.find((workspace) => workspace.id === requestedWorkspaceId) ?? store.workspaces[0]

  return {
    mode: 'demo',
    currentWorkspace,
    workspaces: store.workspaces,
    currentUser: store.currentUser,
  }
}

async function resolveConnectedWorkspacePayload(
  authenticatedUser: { id: string; email: string | null },
  requestedWorkspaceId?: string,
): Promise<WorkspacePayload | null> {
  const supabase = createAdminClient()
  if (!supabase) {
    return null
  }

  const { data: memberships, error: membershipsError } = await supabase
    .from('user_organizations')
    .select('organization_id, user_id, role')
    .eq('user_id', authenticatedUser.id)

  if (membershipsError) {
    throw new Error('Failed to load workspace memberships')
  }

  const fallbackEmail = authenticatedUser.email ?? `member-${authenticatedUser.id.slice(0, 8)}@adai.local`
  const defaultUser: AppUser = {
    id: authenticatedUser.id,
    email: fallbackEmail,
    name: toDisplayName(fallbackEmail),
    role: toRole((memberships ?? [])[0]?.role),
  }

  if (!memberships?.length) {
    return createEmptyConnectedWorkspacePayload(
      defaultUser,
      'Supabase is connected but this account is not a member of any workspace yet',
    )
  }

  const organizationIds = Array.from(new Set((memberships as MembershipRow[]).map((membership) => membership.organization_id)))
  const { data: organizations, error: organizationsError } = await supabase
    .from('organizations')
    .select('id, name, description, created_at')
    .in('id', organizationIds)
    .order('created_at', { ascending: true })

  if (organizationsError) {
    throw new Error('Failed to load workspaces')
  }

  if (!organizations?.length) {
    return createEmptyConnectedWorkspacePayload(
      defaultUser,
      'Supabase is connected but no workspaces matched this account membership',
    )
  }

  const membershipsByOrganization = new Map<string, MembershipRow[]>()
  for (const membership of (memberships ?? []) as MembershipRow[]) {
    const current = membershipsByOrganization.get(membership.organization_id) ?? []
    current.push(membership)
    membershipsByOrganization.set(membership.organization_id, current)
  }

  const selectedOrganization = organizations.find((organization) => organization.id === requestedWorkspaceId) ?? organizations[0]
  const selectedMembership = membershipsByOrganization.get(selectedOrganization.id)?.find((membership) => membership.user_id === authenticatedUser.id)
    ?? membershipsByOrganization.get(selectedOrganization.id)?.[0]

  let currentUser: AppUser = {
    ...defaultUser,
    role: toRole(selectedMembership?.role),
  }

  try {
    const { data } = await supabase.auth.admin.getUserById(authenticatedUser.id)
    const email = data.user?.email ?? currentUser.email
    currentUser = {
      id: authenticatedUser.id,
      email,
      name: toDisplayName(email),
      role: toRole(selectedMembership?.role),
    }
  } catch {
    currentUser = {
      ...currentUser,
      name: toDisplayName(currentUser.email),
    }
  }

  const workspaces: AppWorkspace[] = (organizations as OrganizationRow[]).map((organization) => {
    const membership = membershipsByOrganization.get(organization.id)?.find((item) => item.user_id === authenticatedUser.id)
      ?? membershipsByOrganization.get(organization.id)?.[0]

    return {
      id: organization.id,
      name: organization.name,
      description: organization.description ?? 'Connected workspace',
      role: toRole(membership?.role),
      environment: 'Production',
    }
  })

  const currentWorkspace = workspaces.find((workspace) => workspace.id === selectedOrganization.id) ?? workspaces[0]

  return {
    mode: 'connected',
    currentWorkspace,
    workspaces,
    currentUser,
  }
}

export async function resolveWorkspacePayload(requestedWorkspaceId?: string) {
  const supabase = createAdminClient()

  if (!supabase) {
    return resolveDemoWorkspacePayload(requestedWorkspaceId)
  }

  const authenticatedUser = getAuthenticatedUserFromHeaders(headers())

  if (!authenticatedUser?.id) {
    throw new Error('Authentication required')
  }

  const connected = await resolveConnectedWorkspacePayload(authenticatedUser, requestedWorkspaceId)

  if (!connected) {
    throw new Error('Connected workspace data is unavailable')
  }

  return connected
}

export async function listWorkspaceUsers(requestedWorkspaceId?: string): Promise<WorkspaceUsersPayload> {
  const workspacePayload = await resolveWorkspacePayload(requestedWorkspaceId)
  const auditPayload = await listAuditEvents(requestedWorkspaceId)

  if (workspacePayload.mode === 'connected') {
    try {
      const supabase = createAdminClient()
      if (supabase) {
        const { data, error } = await supabase
          .from('user_organizations')
          .select('organization_id, user_id, role')
          .eq('organization_id', workspacePayload.currentWorkspace.id)

        if (!error) {
          const users = await Promise.all(
            ((data ?? []) as MembershipRow[]).map(async (membership) => {
              try {
                const { data: authData } = await supabase.auth.admin.getUserById(membership.user_id)
                return mapWorkspaceUser(membership, authData.user ?? null)
              } catch {
                return mapWorkspaceUser(membership, null)
              }
            }),
          )

          return {
            ...workspacePayload,
            users: sortWorkspaceUsers(applyUserReviewOverlays(users, auditPayload.events)),
          }
        }
      }
    } catch {
    }
  }

  if (workspacePayload.mode === 'connected') {
    throw new Error('Failed to load connected workspace users')
  }

  const demoPayload = resolveDemoWorkspacePayload(requestedWorkspaceId)
  const store = getDemoStore()

  return {
    ...demoPayload,
    users: sortWorkspaceUsers(
      applyUserReviewOverlays(
        store.users.filter((user) => user.workspaceId === demoPayload.currentWorkspace.id),
        auditPayload.events,
      ),
    ),
  }
}

export async function listAuditEvents(requestedWorkspaceId?: string): Promise<WorkspaceAuditPayload> {
  const workspacePayload = await resolveWorkspacePayload(requestedWorkspaceId)

  if (workspacePayload.mode === 'connected') {
    try {
      const supabase = createAdminClient()
      if (supabase) {
        const { data, error } = await supabase
          .from('audit_log')
          .select('id, workspace_id, user_id, event_type, entity_type, entity_id, details, ip_address, user_agent, created_at')
          .eq('workspace_id', workspacePayload.currentWorkspace.id)
          .order('created_at', { ascending: false })
          .limit(200)

        if (!error) {
          const rows = (data ?? []) as AuditLogRow[]
          const actorIds = Array.from(new Set(rows.map((row) => row.user_id).filter((actorId): actorId is string => Boolean(actorId))))
          const actorNames = new Map<string, string>([[workspacePayload.currentUser.id, workspacePayload.currentUser.name]])

          await Promise.all(
            actorIds.map(async (actorId) => {
              if (actorNames.has(actorId)) {
                return
              }

              try {
                const { data: authData } = await supabase.auth.admin.getUserById(actorId)
                const email = authData.user?.email
                actorNames.set(actorId, email ? toDisplayName(email) : `User ${actorId.slice(0, 8)}`)
              } catch {
                actorNames.set(actorId, `User ${actorId.slice(0, 8)}`)
              }
            }),
          )

          return {
            ...workspacePayload,
            events: applyAuditReviewOverlays(
              rows.map((row) => {
                const actorId = row.user_id ?? 'system-user'
                return mapAuditLogRow(row, actorNames.get(actorId) ?? (row.user_id ? `User ${row.user_id.slice(0, 8)}` : 'System'))
              }),
            ),
          }
        }
      }
    } catch {
    }
  }

  if (workspacePayload.mode === 'connected') {
    throw new Error('Failed to load connected workspace audit events')
  }

  const demoPayload = resolveDemoWorkspacePayload(requestedWorkspaceId)
  const store = getDemoStore()

  return {
    ...demoPayload,
    events: applyAuditReviewOverlays(
      store.events
        .filter((event) => event.workspaceId === demoPayload.currentWorkspace.id)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    ),
  }
}

export async function listCampaigns(requestedWorkspaceId?: string) {
  const workspacePayload = await resolveWorkspacePayload(requestedWorkspaceId)

  if (workspacePayload.mode === 'connected') {
    try {
      const supabase = createAdminClient()
      if (supabase) {
        const { data, error } = await supabase
          .from('campaigns')
          .select('id, organization_id, created_by, name, description, budget, start_date, end_date, status, metrics, settings, created_at, updated_at')
          .eq('organization_id', workspacePayload.currentWorkspace.id)
          .order('created_at', { ascending: false })

        if (!error) {
          return {
            ...workspacePayload,
            campaigns: ((data ?? []) as CampaignRow[]).map(mapCampaignRow),
          }
        }
      }
    } catch {
    }
  }

  if (workspacePayload.mode === 'connected') {
    throw new Error('Failed to load connected workspace campaigns')
  }

  const demoPayload = resolveDemoWorkspacePayload(requestedWorkspaceId)
  const store = getDemoStore()

  return {
    ...demoPayload,
    campaigns: store.campaigns
      .filter((campaign) => campaign.organizationId === demoPayload.currentWorkspace.id)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
  }
}

export async function listWorkspaceCreatives(requestedWorkspaceId?: string): Promise<WorkspaceCreativesPayload> {
  const workspacePayload = await resolveWorkspacePayload(requestedWorkspaceId)

  if (workspacePayload.mode === 'connected') {
    try {
      const supabase = createAdminClient()
      if (supabase) {
        const { data, error } = await supabase
          .from('workspace_creatives')
          .select('id, workspace_id, name, format, impressions, ctr, conversions, roas, status, created_at, updated_at')
          .eq('workspace_id', workspacePayload.currentWorkspace.id)
          .order('created_at', { ascending: false })

        if (!error) {
          return {
            ...workspacePayload,
            creatives: ((data ?? []) as CreativeRow[])
              .map(mapCreativeRow)
              .sort((left, right) => left.name.localeCompare(right.name)),
          }
        }
      }
    } catch {
    }
  }

  if (workspacePayload.mode === 'connected') {
    throw new Error('Failed to load connected workspace creatives')
  }

  const demoPayload = resolveDemoWorkspacePayload(requestedWorkspaceId)
  const store = getDemoStore()
  ensureWorkspaceEnterpriseData(store, demoPayload.currentWorkspace.id)

  return {
    ...demoPayload,
    creatives: store.creatives
      .filter((creative) => creative.workspaceId === demoPayload.currentWorkspace.id)
      .sort((left, right) => left.name.localeCompare(right.name)),
  }
}

export async function createWorkspaceCreative(
  payload: { name: string; format: string; status: string },
  requestedWorkspaceId?: string,
) {
  const workspacePayload = await resolveWorkspacePayload(requestedWorkspaceId)
  assertConnectedWorkspaceIsInitialized(workspacePayload)
  const store = getDemoStore()
  ensureWorkspaceEnterpriseData(store, workspacePayload.currentWorkspace.id)

  const name = payload.name.trim()
  const format = payload.format.trim()
  const status = payload.status.trim()

  if (!name || !format || !status) {
    throw new Error('Creative name, format, and status are required')
  }

  if (workspacePayload.mode === 'connected') {
    try {
      const supabase = createAdminClient()
      if (supabase) {
        const creativeId = `creative-${sanitizeFileNamePart(name)}-${Math.random().toString(36).slice(2, 6)}`
        const { data, error } = await supabase
          .from('workspace_creatives')
          .insert({
            id: creativeId,
            workspace_id: workspacePayload.currentWorkspace.id,
            name,
            format,
            impressions: 0,
            ctr: 0,
            conversions: 0,
            roas: 0,
            status,
          })
          .select('id, workspace_id, name, format, impressions, ctr, conversions, roas, status, created_at, updated_at')
          .single()

        if (!error && data) {
          const creative = mapCreativeRow(data as CreativeRow)
          const event = await createWorkspaceModuleAuditEvent(
            workspacePayload,
            'Creatives',
            'creative',
            creative.id,
            'Created creative',
            'Applied',
            'No creative record',
            `${creative.name} creative created`,
          )
          const refreshed = await listWorkspaceCreatives(requestedWorkspaceId)

          return {
            ...refreshed,
            creative,
            event,
            message: `${creative.name} created successfully.`,
          }
        }
      }
    } catch {
    }
  }

  if (workspacePayload.mode === 'connected') {
    throw new Error('Failed to create creative in the connected workspace')
  }

  const demoPayload = resolveDemoWorkspacePayload(requestedWorkspaceId)
  const creative: AppCreativeRecord = {
    id: `creative-${sanitizeFileNamePart(name)}-${Math.random().toString(36).slice(2, 6)}`,
    workspaceId: demoPayload.currentWorkspace.id,
    name,
    format,
    impressions: '0',
    ctr: '0%',
    conversions: '0',
    roas: '0x',
    status,
  }

  store.creatives.unshift(creative)

  const event = await createWorkspaceModuleAuditEvent(
    demoPayload,
    'Creatives',
    'creative',
    creative.id,
    'Created creative',
    'Applied',
    'No creative record',
    `${creative.name} creative created`,
  )

  const refreshed = await listWorkspaceCreatives(requestedWorkspaceId)

  return {
    ...refreshed,
    creative,
    event,
    message: `${creative.name} created successfully.`,
  }
}

export async function sendCreativeToReview(creativeId: string, requestedWorkspaceId?: string) {
  const payload = await listWorkspaceCreatives(requestedWorkspaceId)
  const creative = payload.creatives.find((item) => item.id === creativeId)

  if (!creative) {
    throw new Error('Creative not found')
  }

  if (payload.mode === 'connected') {
    try {
      const supabase = createAdminClient()
      if (supabase) {
        const { data, error } = await supabase
          .from('workspace_creatives')
          .update({ status: 'Open' })
          .eq('workspace_id', payload.currentWorkspace.id)
          .eq('id', creativeId)
          .select('id, workspace_id, name, format, impressions, ctr, conversions, roas, status, created_at, updated_at')
          .single()

        if (!error && data) {
          const updatedCreative = mapCreativeRow(data as CreativeRow)
          const event = await createWorkspaceModuleAuditEvent(
            payload,
            'Creatives',
            'creative',
            creative.id,
            'Queued creative review',
            'Open',
            `Status ${creative.status}`,
            `${creative.name} was added to the creative review queue`,
          )
          const refreshed = await listWorkspaceCreatives(requestedWorkspaceId)

          return {
            ...refreshed,
            creative: refreshed.creatives.find((item) => item.id === creativeId) ?? updatedCreative,
            event,
            message: `${creative.name} was added to the creative review queue.`,
          }
        }
      }
    } catch {
    }
  }

  if (payload.mode === 'connected') {
    throw new Error('Failed to queue creative review in the connected workspace')
  }

  const store = getDemoStore()
  const creativeIndex = store.creatives.findIndex(
    (item) => item.id === creativeId && item.workspaceId === payload.currentWorkspace.id,
  )

  if (creativeIndex >= 0) {
    store.creatives[creativeIndex] = {
      ...store.creatives[creativeIndex],
      status: 'Open',
    }
  }

  const event = await createWorkspaceModuleAuditEvent(
    payload,
    'Creatives',
    'creative',
    creative.id,
    'Queued creative review',
    'Open',
    `Status ${creative.status}`,
    `${creative.name} was added to the creative review queue`,
  )

  const refreshed = await listWorkspaceCreatives(requestedWorkspaceId)

  return {
    ...refreshed,
    creative: refreshed.creatives.find((item) => item.id === creativeId) ?? creative,
    event,
    message: `${creative.name} was added to the creative review queue.`,
  }
}

export async function listWorkspaceRoles(requestedWorkspaceId?: string): Promise<WorkspaceRolesPayload> {
  const workspacePayload = await resolveWorkspacePayload(requestedWorkspaceId)

  if (workspacePayload.mode === 'connected') {
    try {
      const supabase = createAdminClient()
      if (supabase) {
        const [rolesResult, approvalsResult] = await Promise.all([
          supabase
            .from('workspace_roles')
            .select('id, workspace_id, name, user_count, scope, status, review_due, approver, created_at, updated_at')
            .eq('workspace_id', workspacePayload.currentWorkspace.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('workspace_role_approvals')
            .select('id, workspace_id, change_summary, requester, approvers, due, status, created_at, updated_at')
            .eq('workspace_id', workspacePayload.currentWorkspace.id)
            .order('created_at', { ascending: false }),
        ])

        if (!rolesResult.error && !approvalsResult.error) {
          return {
            ...workspacePayload,
            roles: ((rolesResult.data ?? []) as RoleRow[])
              .map(mapRoleRow)
              .sort((left, right) => left.name.localeCompare(right.name)),
            approvals: ((approvalsResult.data ?? []) as ApprovalRow[]).map(mapApprovalRow),
          }
        }
      }
    } catch {
    }
  }

  if (workspacePayload.mode === 'connected') {
    throw new Error('Failed to load connected workspace roles')
  }

  const demoPayload = resolveDemoWorkspacePayload(requestedWorkspaceId)
  const store = getDemoStore()
  ensureWorkspaceEnterpriseData(store, demoPayload.currentWorkspace.id)

  return {
    ...demoPayload,
    roles: store.roles
      .filter((role) => role.workspaceId === demoPayload.currentWorkspace.id)
      .sort((left, right) => left.name.localeCompare(right.name)),
    approvals: store.approvals
      .filter((approval) => approval.workspaceId === demoPayload.currentWorkspace.id),
  }
}

export async function createWorkspaceRole(
  payload: { name: string; scope: string; approver: string },
  requestedWorkspaceId?: string,
) {
  const workspacePayload = await resolveWorkspacePayload(requestedWorkspaceId)
  assertConnectedWorkspaceIsInitialized(workspacePayload)
  const store = getDemoStore()
  ensureWorkspaceEnterpriseData(store, workspacePayload.currentWorkspace.id)

  const name = payload.name.trim()
  const scope = payload.scope.trim()
  const approver = payload.approver.trim()

  if (!name || !scope || !approver) {
    throw new Error('Role name, scope, and approver are required')
  }

  if (workspacePayload.mode === 'connected') {
    try {
      const supabase = createAdminClient()
      if (supabase) {
        const roleId = `role-${Math.random().toString(36).slice(2, 8)}`
        const { data, error } = await supabase
          .from('workspace_roles')
          .insert({
            id: roleId,
            workspace_id: workspacePayload.currentWorkspace.id,
            name,
            user_count: 0,
            scope,
            status: 'Active',
            review_due: 'Pending',
            approver,
          })
          .select('id, workspace_id, name, user_count, scope, status, review_due, approver, created_at, updated_at')
          .single()

        if (!error && data) {
          const role = mapRoleRow(data as RoleRow)
          const event = await createWorkspaceModuleAuditEvent(
            workspacePayload,
            'Roles',
            'role',
            role.id,
            'Created role',
            'Applied',
            'Role missing',
            `${role.name} role created`,
          )
          const refreshed = await listWorkspaceRoles(requestedWorkspaceId)

          return {
            ...refreshed,
            role,
            event,
            message: `${role.name} role created successfully.`,
          }
        }
      }
    } catch {
    }
  }

  if (workspacePayload.mode === 'connected') {
    throw new Error('Failed to create a role in the connected workspace')
  }

  const demoPayload = resolveDemoWorkspacePayload(requestedWorkspaceId)
  const role: AppRoleRecord = {
    id: `role-${Math.random().toString(36).slice(2, 8)}`,
    workspaceId: demoPayload.currentWorkspace.id,
    name,
    users: '0',
    scope,
    status: 'Active',
    reviewDue: 'Pending',
    approver,
  }

  store.roles.unshift(role)

  const event = await createWorkspaceModuleAuditEvent(
    demoPayload,
    'Roles',
    'role',
    role.id,
    'Created role',
    'Applied',
    'Role missing',
    `${role.name} role created`,
  )

  const refreshed = await listWorkspaceRoles(requestedWorkspaceId)

  return {
    ...refreshed,
    role,
    event,
    message: `${role.name} role created successfully.`,
  }
}

export async function scheduleWorkspaceRoleReview(roleId: string, requestedWorkspaceId?: string) {
  const payload = await listWorkspaceRoles(requestedWorkspaceId)
  const role = payload.roles.find((item) => item.id === roleId)

  if (!role) {
    throw new Error('Role not found')
  }

  if (payload.mode === 'connected') {
    try {
      const supabase = createAdminClient()
      if (supabase) {
        const { data, error } = await supabase
          .from('workspace_roles')
          .update({ status: 'Open', review_due: 'Today' })
          .eq('workspace_id', payload.currentWorkspace.id)
          .eq('id', roleId)
          .select('id, workspace_id, name, user_count, scope, status, review_due, approver, created_at, updated_at')
          .single()

        if (!error && data) {
          const updatedRole = mapRoleRow(data as RoleRow)
          const event = await createWorkspaceModuleAuditEvent(
            payload,
            'Roles',
            'role',
            role.id,
            'Scheduled review',
            'Open',
            `Review due ${role.reviewDue}`,
            `Review scheduled for ${role.name}`,
          )
          const refreshed = await listWorkspaceRoles(requestedWorkspaceId)

          return {
            ...refreshed,
            role: refreshed.roles.find((item) => item.id === roleId) ?? updatedRole,
            event,
            message: `${role.name} review scheduled successfully.`,
          }
        }
      }
    } catch {
    }
  }

  if (payload.mode === 'connected') {
    throw new Error('Failed to schedule a role review in the connected workspace')
  }

  const store = getDemoStore()
  const roleIndex = store.roles.findIndex((item) => item.id === roleId && item.workspaceId === payload.currentWorkspace.id)

  if (roleIndex >= 0) {
    store.roles[roleIndex] = {
      ...store.roles[roleIndex],
      status: 'Open',
      reviewDue: 'Today',
    }
  }

  const event = await createWorkspaceModuleAuditEvent(
    payload,
    'Roles',
    'role',
    role.id,
    'Scheduled review',
    'Open',
    `Review due ${role.reviewDue}`,
    `Review scheduled for ${role.name}`,
  )

  const refreshed = await listWorkspaceRoles(requestedWorkspaceId)

  return {
    ...refreshed,
    role: refreshed.roles.find((item) => item.id === roleId) ?? role,
    event,
    message: `${role.name} review scheduled successfully.`,
  }
}

export async function advanceWorkspaceApprovalWorkflow(approvalId: string, requestedWorkspaceId?: string) {
  const payload = await listWorkspaceRoles(requestedWorkspaceId)
  const approval = payload.approvals.find((item) => item.id === approvalId)

  if (!approval) {
    throw new Error('Approval request not found')
  }

  let nextStatus = 'Scheduled'
  let nextDue = 'Tomorrow'

  if (approval.status === 'Pending') {
    nextStatus = 'Open'
    nextDue = '4h'
  } else if (approval.status === 'Open') {
    nextStatus = 'Scheduled'
    nextDue = 'Tomorrow'
  } else {
    nextStatus = 'Applied'
    nextDue = 'Completed'
  }

  if (payload.mode === 'connected') {
    try {
      const supabase = createAdminClient()
      if (supabase) {
        const { data, error } = await supabase
          .from('workspace_role_approvals')
          .update({ status: nextStatus, due: nextDue })
          .eq('workspace_id', payload.currentWorkspace.id)
          .eq('id', approvalId)
          .select('id, workspace_id, change_summary, requester, approvers, due, status, created_at, updated_at')
          .single()

        if (!error && data) {
          const updatedApproval = mapApprovalRow(data as ApprovalRow)
          const event = await createWorkspaceModuleAuditEvent(
            payload,
            'Roles',
            'approval',
            approval.id,
            'Advanced approval workflow',
            nextStatus === 'Open' ? 'Open' : 'Applied',
            `Status ${approval.status}`,
            `Approval workflow advanced to ${nextStatus}`,
          )
          const refreshed = await listWorkspaceRoles(requestedWorkspaceId)

          return {
            ...refreshed,
            approval: refreshed.approvals.find((item) => item.id === approvalId) ?? updatedApproval,
            event,
            message: `Approval workflow advanced to ${nextStatus.toLowerCase()}.`,
          }
        }
      }
    } catch {
    }
  }

  if (payload.mode === 'connected') {
    throw new Error('Failed to advance the approval workflow in the connected workspace')
  }

  const store = getDemoStore()
  const approvalIndex = store.approvals.findIndex((item) => item.id === approvalId && item.workspaceId === payload.currentWorkspace.id)

  if (approvalIndex >= 0) {
    store.approvals[approvalIndex] = {
      ...store.approvals[approvalIndex],
      status: nextStatus,
      due: nextDue,
    }
  }

  const event = await createWorkspaceModuleAuditEvent(
    payload,
    'Roles',
    'approval',
    approval.id,
    'Advanced approval workflow',
    nextStatus === 'Open' ? 'Open' : 'Applied',
    `Status ${approval.status}`,
    `Approval workflow advanced to ${nextStatus}`,
  )

  const refreshed = await listWorkspaceRoles(requestedWorkspaceId)

  return {
    ...refreshed,
    approval: refreshed.approvals.find((item) => item.id === approvalId) ?? approval,
    event,
    message: `Approval workflow advanced to ${nextStatus.toLowerCase()}.`,
  }
}

export async function listWorkspaceIntegrations(requestedWorkspaceId?: string): Promise<WorkspaceIntegrationsPayload> {
  const workspacePayload = await resolveWorkspacePayload(requestedWorkspaceId)

  if (workspacePayload.mode === 'connected') {
    try {
      const supabase = createAdminClient()
      if (supabase) {
        const { data, error } = await supabase
          .from('workspace_integrations')
          .select('id, workspace_id, name, integration_type, status, sync_label, last_sync_at, created_at, updated_at')
          .eq('workspace_id', workspacePayload.currentWorkspace.id)
          .order('created_at', { ascending: false })

        if (!error) {
          return {
            ...workspacePayload,
            integrations: ((data ?? []) as IntegrationRow[])
              .map(mapIntegrationRow)
              .sort((left, right) => left.name.localeCompare(right.name)),
          }
        }
      }
    } catch {
    }
  }

  if (workspacePayload.mode === 'connected') {
    throw new Error('Failed to load connected workspace integrations')
  }

  const demoPayload = resolveDemoWorkspacePayload(requestedWorkspaceId)
  const store = getDemoStore()
  ensureWorkspaceEnterpriseData(store, demoPayload.currentWorkspace.id)

  return {
    ...demoPayload,
    integrations: store.integrations
      .filter((integration) => integration.workspaceId === demoPayload.currentWorkspace.id)
      .sort((left, right) => left.name.localeCompare(right.name)),
  }
}

export async function createWorkspaceIntegration(
  payload: { name: string; type: string; status: string },
  requestedWorkspaceId?: string,
) {
  const workspacePayload = await resolveWorkspacePayload(requestedWorkspaceId)
  assertConnectedWorkspaceIsInitialized(workspacePayload)
  const store = getDemoStore()
  ensureWorkspaceEnterpriseData(store, workspacePayload.currentWorkspace.id)

  const name = payload.name.trim()
  const type = payload.type.trim()
  const status = payload.status.trim() || 'Healthy'

  if (!name || !type) {
    throw new Error('Integration name and type are required')
  }

  if (workspacePayload.mode === 'connected') {
    try {
      const supabase = createAdminClient()
      if (supabase) {
        const integrationId = `integration-${sanitizeFileNamePart(name)}-${Math.random().toString(36).slice(2, 6)}`
        const { data, error } = await supabase
          .from('workspace_integrations')
          .insert({
            id: integrationId,
            workspace_id: workspacePayload.currentWorkspace.id,
            name,
            integration_type: type,
            status,
            sync_label: 'Just now',
            last_sync_at: new Date().toISOString(),
          })
          .select('id, workspace_id, name, integration_type, status, sync_label, last_sync_at, created_at, updated_at')
          .single()

        if (!error && data) {
          const integration = mapIntegrationRow(data as IntegrationRow)
          const event = await createWorkspaceModuleAuditEvent(
            workspacePayload,
            'Integrations',
            'integration',
            integration.id,
            'Created integration',
            'Applied',
            'Integration missing',
            `${integration.name} integration created`,
          )
          const refreshed = await listWorkspaceIntegrations(requestedWorkspaceId)

          return {
            ...refreshed,
            integration,
            event,
            message: `${integration.name} integration created successfully.`,
          }
        }
      }
    } catch {
    }
  }

  if (workspacePayload.mode === 'connected') {
    throw new Error('Failed to create an integration in the connected workspace')
  }

  const demoPayload = resolveDemoWorkspacePayload(requestedWorkspaceId)
  const integration: AppIntegrationRecord = {
    id: `integration-${sanitizeFileNamePart(name)}-${Math.random().toString(36).slice(2, 6)}`,
    workspaceId: demoPayload.currentWorkspace.id,
    name,
    type,
    status,
    sync: 'Just now',
  }

  store.integrations.unshift(integration)

  const event = await createWorkspaceModuleAuditEvent(
    demoPayload,
    'Integrations',
    'integration',
    integration.id,
    'Created integration',
    'Applied',
    'Integration missing',
    `${integration.name} integration created`,
  )

  const refreshed = await listWorkspaceIntegrations(requestedWorkspaceId)

  return {
    ...refreshed,
    integration,
    event,
    message: `${integration.name} integration created successfully.`,
  }
}

export async function rotateWorkspaceIntegrationToken(integrationId: string, requestedWorkspaceId?: string) {
  const payload = await listWorkspaceIntegrations(requestedWorkspaceId)
  const integration = payload.integrations.find((item) => item.id === integrationId)

  if (!integration) {
    throw new Error('Integration not found')
  }

  if (payload.mode === 'connected') {
    try {
      const supabase = createAdminClient()
      if (supabase) {
        const { data, error } = await supabase
          .from('workspace_integrations')
          .update({ status: 'Healthy', sync_label: 'Just now', last_sync_at: new Date().toISOString() })
          .eq('workspace_id', payload.currentWorkspace.id)
          .eq('id', integrationId)
          .select('id, workspace_id, name, integration_type, status, sync_label, last_sync_at, created_at, updated_at')
          .single()

        if (!error && data) {
          const updatedIntegration = mapIntegrationRow(data as IntegrationRow)
          const event = await createWorkspaceModuleAuditEvent(
            payload,
            'Integrations',
            'integration',
            integration.id,
            'Rotated token',
            'Applied',
            `Status ${integration.status}`,
            `Token rotation completed for ${integration.name}`,
          )
          const refreshed = await listWorkspaceIntegrations(requestedWorkspaceId)

          return {
            ...refreshed,
            integration: refreshed.integrations.find((item) => item.id === integrationId) ?? updatedIntegration,
            event,
            message: `Token rotation completed for ${integration.name}.`,
          }
        }
      }
    } catch {
    }
  }

  if (payload.mode === 'connected') {
    throw new Error('Failed to rotate the integration token in the connected workspace')
  }

  const store = getDemoStore()
  const integrationIndex = store.integrations.findIndex(
    (item) => item.id === integrationId && item.workspaceId === payload.currentWorkspace.id,
  )

  if (integrationIndex >= 0) {
    store.integrations[integrationIndex] = {
      ...store.integrations[integrationIndex],
      status: 'Healthy',
      sync: 'Just now',
    }
  }

  const event = await createWorkspaceModuleAuditEvent(
    payload,
    'Integrations',
    'integration',
    integration.id,
    'Rotated token',
    'Applied',
    `Status ${integration.status}`,
    `Token rotation completed for ${integration.name}`,
  )

  const refreshed = await listWorkspaceIntegrations(requestedWorkspaceId)

  return {
    ...refreshed,
    integration: refreshed.integrations.find((item) => item.id === integrationId) ?? integration,
    event,
    message: `Token rotation completed for ${integration.name}.`,
  }
}

export async function sendWorkspaceIntegrationToReview(integrationId: string, requestedWorkspaceId?: string) {
  const payload = await listWorkspaceIntegrations(requestedWorkspaceId)
  const integration = payload.integrations.find((item) => item.id === integrationId)

  if (!integration) {
    throw new Error('Integration not found')
  }

  if (payload.mode === 'connected') {
    try {
      const supabase = createAdminClient()
      if (supabase) {
        const { data, error } = await supabase
          .from('workspace_integrations')
          .update({ status: 'Warning', sync_label: 'Review queued', last_sync_at: new Date().toISOString() })
          .eq('workspace_id', payload.currentWorkspace.id)
          .eq('id', integrationId)
          .select('id, workspace_id, name, integration_type, status, sync_label, last_sync_at, created_at, updated_at')
          .single()

        if (!error && data) {
          const updatedIntegration = mapIntegrationRow(data as IntegrationRow)
          const event = await createWorkspaceModuleAuditEvent(
            payload,
            'Integrations',
            'integration',
            integration.id,
            'Opened connector review',
            'Open',
            `Status ${integration.status}`,
            `${integration.name} was added to the connector review queue`,
          )
          const refreshed = await listWorkspaceIntegrations(requestedWorkspaceId)

          return {
            ...refreshed,
            integration: refreshed.integrations.find((item) => item.id === integrationId) ?? updatedIntegration,
            event,
            message: `${integration.name} was added to the connector review queue.`,
          }
        }
      }
    } catch {
    }
  }

  if (payload.mode === 'connected') {
    throw new Error('Failed to send the integration to review in the connected workspace')
  }

  const store = getDemoStore()
  const integrationIndex = store.integrations.findIndex(
    (item) => item.id === integrationId && item.workspaceId === payload.currentWorkspace.id,
  )

  if (integrationIndex >= 0) {
    store.integrations[integrationIndex] = {
      ...store.integrations[integrationIndex],
      status: 'Warning',
      sync: 'Review queued',
    }
  }

  const event = await createWorkspaceModuleAuditEvent(
    payload,
    'Integrations',
    'integration',
    integration.id,
    'Opened connector review',
    'Open',
    `Status ${integration.status}`,
    `${integration.name} was added to the connector review queue`,
  )

  const refreshed = await listWorkspaceIntegrations(requestedWorkspaceId)

  return {
    ...refreshed,
    integration: refreshed.integrations.find((item) => item.id === integrationId) ?? integration,
    event,
    message: `${integration.name} was added to the connector review queue.`,
  }
}

export async function listWorkspaceBilling(requestedWorkspaceId?: string): Promise<WorkspaceBillingPayload> {
  const workspacePayload = await resolveWorkspacePayload(requestedWorkspaceId)

  if (workspacePayload.mode === 'connected') {
    try {
      const supabase = createAdminClient()
      if (supabase) {
        const summary = await resolveConnectedBillingSummary(supabase, workspacePayload.currentWorkspace.id)
        const { data, error } = await supabase
          .from('workspace_invoices')
          .select('id, workspace_id, amount_cents, amount_label, status, due_label, created_at, updated_at')
          .eq('workspace_id', workspacePayload.currentWorkspace.id)
          .order('created_at', { ascending: false })

        if (!error) {
          return {
            ...workspacePayload,
            invoices: ((data ?? []) as InvoiceRow[]).map(mapInvoiceRow),
            summary,
          }
        }
      }
    } catch {
    }
  }

  if (workspacePayload.mode === 'connected') {
    throw new Error('Failed to load connected workspace billing')
  }

  const demoPayload = resolveDemoWorkspacePayload(requestedWorkspaceId)
  const store = getDemoStore()
  ensureWorkspaceEnterpriseData(store, demoPayload.currentWorkspace.id)

  return {
    ...demoPayload,
    invoices: store.invoices
      .filter((invoice) => invoice.workspaceId === demoPayload.currentWorkspace.id),
    summary: resolveDemoBillingSummary(),
  }
}

export async function queueInvoiceFinanceReview(invoiceId: string, requestedWorkspaceId?: string) {
  const payload = await listWorkspaceBilling(requestedWorkspaceId)
  const invoice = payload.invoices.find((item) => item.id === invoiceId)

  if (!invoice) {
    throw new Error('Invoice not found')
  }

  const nextStatus = invoice.status === 'Paid' ? 'Paid' : 'Pending'
  const nextDue = invoice.status === 'Paid' ? 'Review queued' : 'Today'

  if (payload.mode === 'connected') {
    try {
      const supabase = createAdminClient()
      if (supabase) {
        const { data, error } = await supabase
          .from('workspace_invoices')
          .update({ status: nextStatus, due_label: nextDue })
          .eq('workspace_id', payload.currentWorkspace.id)
          .eq('id', invoiceId)
          .select('id, workspace_id, amount_cents, amount_label, status, due_label, created_at, updated_at')
          .single()

        if (!error && data) {
          const updatedInvoice = mapInvoiceRow(data as InvoiceRow)
          const event = await createWorkspaceModuleAuditEvent(
            payload,
            'Billing',
            'invoice',
            invoice.id,
            'Queued finance review',
            'Open',
            `Status ${invoice.status}`,
            `${invoice.id} was sent to the finance review queue`,
          )
          const refreshed = await listWorkspaceBilling(requestedWorkspaceId)

          return {
            ...refreshed,
            invoice: refreshed.invoices.find((item) => item.id === invoiceId) ?? updatedInvoice,
            event,
            message: `${invoice.id} was sent to the finance review queue.`,
          }
        }
      }
    } catch {
    }
  }

  if (payload.mode === 'connected') {
    throw new Error('Failed to queue the invoice finance review in the connected workspace')
  }

  const store = getDemoStore()
  const invoiceIndex = store.invoices.findIndex((item) => item.id === invoiceId && item.workspaceId === payload.currentWorkspace.id)

  if (invoiceIndex >= 0) {
    store.invoices[invoiceIndex] = {
      ...store.invoices[invoiceIndex],
      status: nextStatus,
      due: nextDue,
    }
  }

  const event = await createWorkspaceModuleAuditEvent(
    payload,
    'Billing',
    'invoice',
    invoice.id,
    'Queued finance review',
    'Open',
    `Status ${invoice.status}`,
    `${invoice.id} was sent to the finance review queue`,
  )

  const refreshed = await listWorkspaceBilling(requestedWorkspaceId)

  return {
    ...refreshed,
    invoice: refreshed.invoices.find((item) => item.id === invoiceId) ?? invoice,
    event,
    message: `${invoice.id} was sent to the finance review queue.`,
  }
}

export async function queueWorkspaceUserAccessReview(userId: string, requestedWorkspaceId?: string) {
  const payload = await listWorkspaceUsers(requestedWorkspaceId)
  const user = payload.users.find((item) => item.id === userId)

  if (!user) {
    throw new Error('User not found')
  }

  if (payload.mode === 'demo') {
    const store = getDemoStore()
    const userIndex = store.users.findIndex((item) => item.id === userId && item.workspaceId === payload.currentWorkspace.id)
    if (userIndex >= 0) {
      store.users[userIndex] = {
        ...store.users[userIndex],
        status: 'pending',
      }
    }
  }

  const event = await createWorkspaceModuleAuditEvent(
    payload,
    'Users',
    'user',
    user.id,
    'Queued access review',
    'Open',
    `Status ${user.status}`,
    `Access review queued for ${user.name}`,
  )

  const refreshed = await listWorkspaceUsers(requestedWorkspaceId)

  return {
    ...refreshed,
    user: refreshed.users.find((item) => item.id === userId) ?? user,
    event,
    message: `${user.name} was added to the access review queue.`,
  }
}

export async function createWorkspaceUserReminderPackage(userId: string, requestedWorkspaceId?: string) {
  const payload = await listWorkspaceUsers(requestedWorkspaceId)
  const user = payload.users.find((item) => item.id === userId)

  if (!user) {
    throw new Error('User not found')
  }

  const csv = toCsv([
    {
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      message: `Reminder drafted for ${user.name}`,
    },
  ])

  const event = await createWorkspaceModuleAuditEvent(
    payload,
    'Users',
    'user',
    user.id,
    'Prepared reminder package',
    'Applied',
    `Status ${user.status}`,
    `Reminder package prepared for ${user.email}`,
  )

  return {
    ...payload,
    user,
    event,
    content: csv,
    contentType: 'text/csv; charset=utf-8',
    filename: `${sanitizeFileNamePart(user.name)}-access-reminder.csv`,
    message: `Reminder package prepared for ${user.email}.`,
  }
}

export async function flagWorkspaceAuditEventForReview(eventId: string, requestedWorkspaceId?: string) {
  const payload = await listAuditEvents(requestedWorkspaceId)
  const auditEvent = payload.events.find((item) => item.id === eventId)

  if (!auditEvent) {
    throw new Error('Audit event not found')
  }

  if (payload.mode === 'demo') {
    const store = getDemoStore()
    const eventIndex = store.events.findIndex((item) => item.id === eventId && item.workspaceId === payload.currentWorkspace.id)
    if (eventIndex >= 0) {
      store.events[eventIndex] = {
        ...store.events[eventIndex],
        result: 'Open',
      }
    }
  }

  const event = await createWorkspaceModuleAuditEvent(
    payload,
    'Audit Log',
    'audit_event',
    auditEvent.id,
    'Flagged for review',
    'Open',
    `Status ${auditEvent.result}`,
    `${auditEvent.action} was flagged for review`,
  )

  const refreshed = await listAuditEvents(requestedWorkspaceId)

  return {
    ...refreshed,
    event,
    message: `${auditEvent.action} was flagged for review.`,
  }
}

export async function getAnalyticsSnapshot(requestedWorkspaceId?: string): Promise<WorkspaceAnalyticsPayload> {
  const [campaignPayload, auditPayload] = await Promise.all([
    listCampaigns(requestedWorkspaceId),
    listAuditEvents(requestedWorkspaceId),
  ])

  return {
    ...campaignPayload,
    events: auditPayload.events,
    channelPerformance: buildChannelPerformance(campaignPayload.campaigns),
    campaignPerformance: buildCampaignPerformance(campaignPayload.campaigns),
  }
}

function getOpenAnalyticsReviewIds(events: AppAuditEvent[]) {
  return new Set(
    events
      .filter(
        (event) =>
          Boolean(event.entityId) &&
          event.module.trim().toLowerCase() === 'analytics' &&
          event.result.trim().toLowerCase() === 'open',
      )
      .map((event) => event.entityId as string),
  )
}

function resolveAnalyticsEntity(payload: WorkspaceAnalyticsPayload, scope: 'channel' | 'campaign', entityId: string) {
  if (scope === 'channel') {
    const channel = payload.channelPerformance.find((item) => item.id === entityId)

    if (!channel) {
      return null
    }

    return {
      id: channel.id,
      scope,
      label: channel.channel,
      beforeSummary: `${channel.campaigns} campaigns · ${channel.activeCampaigns} active · ${formatCurrencyLabel(channel.spend)} spend`,
    }
  }

  const campaign = payload.campaignPerformance.find((item) => item.id === entityId)

  if (!campaign) {
    return null
  }

  return {
    id: campaign.id,
    scope,
    label: campaign.name,
    beforeSummary: `${campaign.status} · ${formatCurrencyLabel(campaign.spend)} spend · ${campaign.roas.toFixed(1)}x ROAS`,
  }
}

function buildAnalyticsExportRows(
  payload: WorkspaceAnalyticsPayload,
  scope?: 'channel' | 'campaign',
  entityId?: string,
) {
  const openAnalyticsReviews = getOpenAnalyticsReviewIds(payload.events)
  const channelRows = payload.channelPerformance.map((channel) => ({
    workspace_id: payload.currentWorkspace.id,
    workspace_name: payload.currentWorkspace.name,
    record_type: 'Channel',
    record_id: channel.id,
    name: channel.channel,
    channel: channel.channel,
    status: openAnalyticsReviews.has(channel.id) ? 'Under review' : 'Tracked',
    campaigns: channel.campaigns,
    active_campaigns: channel.activeCampaigns,
    spend: channel.spend,
    budget: channel.budget,
    revenue: channel.revenue,
    roas: channel.roas,
    budget_utilization: channel.budget > 0 ? toBudgetUtilization(channel.spend, channel.budget) : 0,
    pending_review: openAnalyticsReviews.has(channel.id) ? 'Yes' : 'No',
  }))
  const campaignRows = payload.campaignPerformance.map((campaign) => ({
    workspace_id: payload.currentWorkspace.id,
    workspace_name: payload.currentWorkspace.name,
    record_type: 'Campaign',
    record_id: campaign.id,
    name: campaign.name,
    channel: campaign.channel,
    status: openAnalyticsReviews.has(campaign.id) ? 'Under review' : campaign.status,
    campaigns: 1,
    active_campaigns: campaign.status === 'active' ? 1 : 0,
    spend: campaign.spend,
    budget: campaign.budget,
    revenue: campaign.revenue,
    roas: campaign.roas,
    budget_utilization: campaign.budgetUtilization,
    pending_review: openAnalyticsReviews.has(campaign.id) ? 'Yes' : 'No',
  }))

  if (scope === 'channel') {
    return channelRows.filter((row) => row.record_id === entityId)
  }

  if (scope === 'campaign') {
    return campaignRows.filter((row) => row.record_id === entityId)
  }

  return [...channelRows, ...campaignRows]
}

async function createAnalyticsAuditEvent(
  workspacePayload: WorkspacePayload,
  scope: 'channel' | 'campaign' | undefined,
  entityId: string | undefined,
  action: string,
  result: string,
  before: string,
  after: string,
) {
  const now = new Date().toISOString()

  if (workspacePayload.mode === 'connected') {
    const supabase = createAdminClient()

    if (!supabase) {
      throw new Error('Connected analytics actions require a configured Supabase admin client')
    }

    const { data, error } = await supabase
      .from('audit_log')
      .insert({
        workspace_id: workspacePayload.currentWorkspace.id,
        user_id: toConnectedAuditUserId(workspacePayload.currentUser.id),
        event_type: 'analytics_action',
        entity_type: scope ?? 'analytics',
        entity_id: entityId ?? null,
        details: {
          action,
          module: 'Analytics',
          result,
          before,
          after,
          scope,
        },
        ip_address: 'API request',
        user_agent: 'Next.js analytics action',
      })
      .select('id, workspace_id, user_id, event_type, entity_type, entity_id, details, ip_address, user_agent, created_at')
      .single()

    if (error || !data) {
      throw new Error('Failed to record the analytics action in the audit log')
    }

    return mapAuditLogRow(data as AuditLogRow, workspacePayload.currentUser.name)
  }

  const store = getDemoStore()
  const event: AppAuditEvent = {
    id: `evt-${Math.random().toString(36).slice(2, 10)}`,
    workspaceId: workspacePayload.currentWorkspace.id,
    actorId: workspacePayload.currentUser.id,
    actorName: workspacePayload.currentUser.name,
    entityId,
    action,
    module: 'Analytics',
    result,
    sourceIp: 'API request',
    before,
    after,
    createdAt: now,
    userAgent: 'Next.js analytics action',
  }

  store.events.unshift(event)
  return event
}

export async function sendAnalyticsEntityToReview(
  scope: 'channel' | 'campaign',
  entityId: string,
  requestedWorkspaceId?: string,
) {
  const payload = await getAnalyticsSnapshot(requestedWorkspaceId)
  const entity = resolveAnalyticsEntity(payload, scope, entityId)

  if (!entity) {
    throw new Error(scope === 'channel' ? 'Analytics channel not found' : 'Analytics campaign not found')
  }

  const event = await createAnalyticsAuditEvent(
    payload,
    entity.scope,
    entity.id,
    'Sent to review',
    'Open',
    entity.beforeSummary,
    `Analytics review opened for ${entity.label}`,
  )

  const refreshed = await getAnalyticsSnapshot(requestedWorkspaceId)

  return {
    ...refreshed,
    event,
    message: scope === 'channel'
      ? `${entity.label} was added to the analytics review queue.`
      : `${entity.label} was sent to the performance review queue.`,
  }
}

export async function exportWorkspaceAnalytics(
  requestedWorkspaceId?: string,
  scope?: 'channel' | 'campaign',
  entityId?: string,
) {
  const payload = await getAnalyticsSnapshot(requestedWorkspaceId)
  const entity = scope && entityId ? resolveAnalyticsEntity(payload, scope, entityId) : null

  if ((scope && !entityId) || (!scope && entityId)) {
    throw new Error('Analytics export target is invalid')
  }

  if (scope && entityId && !entity) {
    throw new Error(scope === 'channel' ? 'Analytics channel not found' : 'Analytics campaign not found')
  }

  await createAnalyticsAuditEvent(
    payload,
    entity?.scope,
    entity?.id,
    entity ? 'Exported analytics summary' : 'Exported analytics bundle',
    'Applied',
    entity?.beforeSummary ?? `${payload.channelPerformance.length} channels and ${payload.campaignPerformance.length} campaigns selected`,
    entity ? `${entity.label} analytics export completed` : 'Workspace analytics export completed',
  )

  const refreshed = await getAnalyticsSnapshot(requestedWorkspaceId)
  const csv = toCsv(buildAnalyticsExportRows(refreshed, scope, entityId))
  const workspaceSlug = sanitizeFileNamePart(refreshed.currentWorkspace.name)
  const entitySlug = entity ? sanitizeFileNamePart(entity.label) : 'analytics-bundle'

  return {
    ...refreshed,
    content: csv,
    contentType: 'text/csv; charset=utf-8',
    filename: `${workspaceSlug}-${entitySlug}.csv`,
    message: entity
      ? `${entity.label} analytics export started successfully.`
      : 'Workspace analytics export started successfully.',
  }
}

export async function listWorkspaceReports(requestedWorkspaceId?: string): Promise<WorkspaceReportsPayload> {
  const [campaignPayload, userPayload, auditPayload] = await Promise.all([
    listCampaigns(requestedWorkspaceId),
    listWorkspaceUsers(requestedWorkspaceId),
    listAuditEvents(requestedWorkspaceId),
  ])

  return {
    ...campaignPayload,
    users: userPayload.users,
    events: auditPayload.events,
    reports: buildWorkspaceReports(campaignPayload.campaigns, userPayload.users, auditPayload.events, campaignPayload.currentUser),
  }
}

function sanitizeFileNamePart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'report'
}

function toCsvCell(value: unknown) {
  const text = value === null || value === undefined ? '' : String(value)
  return `"${text.replace(/"/g, '""')}"`
}

function toCsv(rows: Array<Record<string, unknown>>) {
  if (!rows.length) {
    return ''
  }

  const headers = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row).forEach((key) => set.add(key))
      return set
    }, new Set<string>()),
  )

  return [
    headers.map((header) => toCsvCell(header)).join(','),
    ...rows.map((row) => headers.map((header) => toCsvCell(row[header])).join(',')),
  ].join('\n')
}

function buildReportExportRows(payload: WorkspaceReportsPayload, report?: AppWorkspaceReport) {
  const totalSpend = payload.campaigns.reduce((sum, campaign) => sum + campaign.spend, 0)
  const totalBudget = payload.campaigns.reduce((sum, campaign) => sum + campaign.budget, 0)
  const totalRevenue = payload.campaigns.reduce((sum, campaign) => sum + calculateRevenue(campaign.spend, campaign.roas), 0)
  const activeCampaigns = payload.campaigns.filter((campaign) => campaign.status === 'active').length
  const openReviews = payload.events.filter((event) => event.result.trim().toLowerCase() === 'open').length
  const targetReports = report ? [report] : payload.reports

  return targetReports.map((item) => ({
    workspace_id: payload.currentWorkspace.id,
    workspace_name: payload.currentWorkspace.name,
    report_id: item.id,
    report_name: item.name,
    owner: item.owner,
    cadence: item.cadence,
    format: item.format,
    status: item.status,
    stakeholders: item.stakeholders,
    last_run_at: item.lastRunAt,
    next_run_at: item.nextRunAt,
    summary: item.summary,
    campaigns_tracked: payload.campaigns.length,
    active_campaigns: activeCampaigns,
    users_tracked: payload.users.length,
    audit_events: payload.events.length,
    open_reviews: openReviews,
    total_spend: totalSpend,
    total_budget: totalBudget,
    total_revenue: totalRevenue,
    blended_roas: totalSpend > 0 ? Number((totalRevenue / totalSpend).toFixed(2)) : 0,
  }))
}

async function createReportAuditEvent(
  workspacePayload: WorkspacePayload,
  report: AppWorkspaceReport | undefined,
  action: string,
  result: string,
  before: string,
  after: string,
) {
  const now = new Date().toISOString()

  if (workspacePayload.mode === 'connected') {
    const supabase = createAdminClient()

    if (!supabase) {
      throw new Error('Connected report actions require a configured Supabase admin client')
    }

    const { data, error } = await supabase
      .from('audit_log')
      .insert({
        workspace_id: workspacePayload.currentWorkspace.id,
        user_id: toConnectedAuditUserId(workspacePayload.currentUser.id),
        event_type: 'report_action',
        entity_type: 'report',
        entity_id: report?.id ?? null,
        details: {
          action,
          module: 'Reports',
          result,
          before,
          after,
        },
        ip_address: 'API request',
        user_agent: 'Next.js report action',
      })
      .select('id, workspace_id, user_id, event_type, entity_type, entity_id, details, ip_address, user_agent, created_at')
      .single()

    if (error || !data) {
      throw new Error('Failed to record the report action in the audit log')
    }

    return mapAuditLogRow(data as AuditLogRow, workspacePayload.currentUser.name)
  }

  const store = getDemoStore()
  const event: AppAuditEvent = {
    id: `evt-${Math.random().toString(36).slice(2, 10)}`,
    workspaceId: workspacePayload.currentWorkspace.id,
    actorId: workspacePayload.currentUser.id,
    actorName: workspacePayload.currentUser.name,
    entityId: report?.id,
    action,
    module: 'Reports',
    result,
    sourceIp: 'API request',
    before,
    after,
    createdAt: now,
    userAgent: 'Next.js report action',
  }

  store.events.unshift(event)
  return event
}

export async function runWorkspaceReport(reportId: string, requestedWorkspaceId?: string) {
  const payload = await listWorkspaceReports(requestedWorkspaceId)
  const report = payload.reports.find((item) => item.id === reportId)

  if (!report) {
    throw new Error('Report not found')
  }

  const event = await createReportAuditEvent(
    payload,
    report,
    'Manual run',
    'Applied',
    `Scheduled for ${report.nextRunAt}`,
    `Manual run completed for ${report.name}`,
  )

  const refreshed = await listWorkspaceReports(requestedWorkspaceId)
  const refreshedReport = refreshed.reports.find((item) => item.id === reportId) ?? report

  return {
    ...refreshed,
    report: refreshedReport,
    event,
    message: `${report.name} run completed successfully.`,
  }
}

export async function sendWorkspaceReportToReview(reportId: string, requestedWorkspaceId?: string) {
  const payload = await listWorkspaceReports(requestedWorkspaceId)
  const report = payload.reports.find((item) => item.id === reportId)

  if (!report) {
    throw new Error('Report not found')
  }

  const event = await createReportAuditEvent(
    payload,
    report,
    'Sent to review',
    'Open',
    `Status ${report.status}`,
    `Stakeholder review opened for ${report.name}`,
  )

  const refreshed = await listWorkspaceReports(requestedWorkspaceId)
  const refreshedReport = refreshed.reports.find((item) => item.id === reportId) ?? report

  return {
    ...refreshed,
    report: refreshedReport,
    event,
    message: `${report.name} was sent to stakeholder review.`,
  }
}

export async function exportWorkspaceReports(requestedWorkspaceId?: string, reportId?: string) {
  const payload = await listWorkspaceReports(requestedWorkspaceId)
  const report = reportId ? payload.reports.find((item) => item.id === reportId) : undefined

  if (reportId && !report) {
    throw new Error('Report not found')
  }

  await createReportAuditEvent(
    payload,
    report,
    report ? 'Exported report' : 'Exported report bundle',
    'Applied',
    report ? `Format ${report.format}` : `${payload.reports.length} reports selected`,
    report ? `${report.name} export completed` : 'Workspace report bundle export completed',
  )

  const refreshed = await listWorkspaceReports(requestedWorkspaceId)
  const refreshedReport = reportId ? refreshed.reports.find((item) => item.id === reportId) : undefined
  const csv = toCsv(buildReportExportRows(refreshed, refreshedReport))
  const workspaceSlug = sanitizeFileNamePart(refreshed.currentWorkspace.name)
  const reportSlug = refreshedReport ? sanitizeFileNamePart(refreshedReport.name) : 'report-bundle'

  return {
    ...refreshed,
    report: refreshedReport,
    content: csv,
    contentType: 'text/csv; charset=utf-8',
    filename: `${workspaceSlug}-${reportSlug}.csv`,
    message: refreshedReport
      ? `${refreshedReport.name} export started successfully.`
      : `Workspace report bundle export started successfully.`,
  }
}

export async function getCampaignById(id: string, requestedWorkspaceId?: string) {
  const workspacePayload = await resolveWorkspacePayload(requestedWorkspaceId)

  if (workspacePayload.mode === 'connected') {
    try {
      const supabase = createAdminClient()
      if (supabase) {
        const { data, error } = await supabase
          .from('campaigns')
          .select('id, organization_id, created_by, name, description, budget, start_date, end_date, status, metrics, settings, created_at, updated_at')
          .eq('organization_id', workspacePayload.currentWorkspace.id)
          .eq('id', id)
          .single()

        if (!error && data) {
          return {
            ...workspacePayload,
            campaign: mapCampaignRow(data as CampaignRow),
          }
        }
      }
    } catch {
    }
  }

  if (workspacePayload.mode === 'connected') {
    throw new Error('Failed to load the connected campaign')
  }

  const demoPayload = resolveDemoWorkspacePayload(requestedWorkspaceId)
  const store = getDemoStore()
  const campaign = store.campaigns.find(
    (item) => item.id === id && item.organizationId === demoPayload.currentWorkspace.id,
  )

  return {
    ...demoPayload,
    campaign: campaign ?? null,
  }
}

function normalizeCreatePayload(payload: CampaignCreatePayload) {
  return {
    name: payload.name.trim(),
    description: payload.description?.trim() ?? '',
    budget: Number(payload.budget ?? 0),
    status: toStatus(payload.status),
    channel: toChannel(payload.channel),
    startDate: payload.startDate?.trim() ?? '',
    endDate: payload.endDate?.trim() ?? '',
  }
}

function toInsertPayload(payload: ReturnType<typeof normalizeCreatePayload>, workspacePayload: WorkspacePayload) {
  return {
    organization_id: workspacePayload.currentWorkspace.id,
    created_by: workspacePayload.currentUser.id,
    name: payload.name,
    description: payload.description,
    budget: payload.budget,
    start_date: payload.startDate ? new Date(payload.startDate).toISOString() : null,
    end_date: payload.endDate ? new Date(payload.endDate).toISOString() : null,
    status: payload.status,
    settings: {
      channel: payload.channel,
    },
    metrics: {
      spend: 0,
      roas: 0,
      channel: payload.channel,
    },
  }
}

export async function createCampaign(payload: CampaignCreatePayload, requestedWorkspaceId?: string) {
  const normalizedPayload = normalizeCreatePayload(payload)
  const workspacePayload = await resolveWorkspacePayload(requestedWorkspaceId)
  assertConnectedWorkspaceIsInitialized(workspacePayload)

  if (workspacePayload.mode === 'connected') {
    try {
      const supabase = createAdminClient()
      if (supabase) {
        const { data, error } = await supabase
          .from('campaigns')
          .insert(toInsertPayload(normalizedPayload, workspacePayload))
          .select('id, organization_id, created_by, name, description, budget, start_date, end_date, status, metrics, settings, created_at, updated_at')
          .single()

        if (!error && data) {
          return {
            ...workspacePayload,
            campaign: mapCampaignRow(data as CampaignRow),
          }
        }
      }
    } catch {
    }
  }

  if (workspacePayload.mode === 'connected') {
    throw new Error('Failed to create the campaign in the connected workspace')
  }

  const demoPayload = resolveDemoWorkspacePayload(requestedWorkspaceId)
  const store = getDemoStore()
  const now = new Date().toISOString()
  const campaign: AppCampaignRecord = {
    id: `demo-${Math.random().toString(36).slice(2, 10)}`,
    organizationId: demoPayload.currentWorkspace.id,
    createdBy: demoPayload.currentUser.id,
    name: normalizedPayload.name,
    description: normalizedPayload.description,
    status: normalizedPayload.status,
    budget: normalizedPayload.budget,
    spend: 0,
    roas: 0,
    channel: normalizedPayload.channel,
    startDate: normalizedPayload.startDate,
    endDate: normalizedPayload.endDate,
    createdAt: now,
    updatedAt: now,
  }

  store.campaigns.unshift(campaign)

  return {
    ...demoPayload,
    campaign,
  }
}

function applyCampaignUpdate(campaign: AppCampaignRecord, payload: CampaignUpdatePayload) {
  return {
    ...campaign,
    name: payload.name?.trim() || campaign.name,
    description: payload.description?.trim() ?? campaign.description,
    budget: payload.budget !== undefined ? Number(payload.budget) : campaign.budget,
    spend: payload.spend !== undefined ? Number(payload.spend) : campaign.spend,
    roas: payload.roas !== undefined ? Number(payload.roas) : campaign.roas,
    status: payload.status ? toStatus(payload.status) : campaign.status,
    channel: payload.channel ? toChannel(payload.channel) : campaign.channel,
    startDate: payload.startDate !== undefined ? payload.startDate : campaign.startDate,
    endDate: payload.endDate !== undefined ? payload.endDate : campaign.endDate,
    updatedAt: new Date().toISOString(),
  }
}

export async function updateCampaign(id: string, payload: CampaignUpdatePayload, requestedWorkspaceId?: string) {
  const workspacePayload = await resolveWorkspacePayload(requestedWorkspaceId)
  assertConnectedWorkspaceIsInitialized(workspacePayload)

  if (workspacePayload.mode === 'connected') {
    try {
      const supabase = createAdminClient()
      if (supabase) {
        const updates = {
          ...(payload.name !== undefined ? { name: payload.name.trim() } : {}),
          ...(payload.description !== undefined ? { description: payload.description.trim() } : {}),
          ...(payload.budget !== undefined ? { budget: Number(payload.budget) } : {}),
          ...(payload.startDate !== undefined ? { start_date: payload.startDate ? new Date(payload.startDate).toISOString() : null } : {}),
          ...(payload.endDate !== undefined ? { end_date: payload.endDate ? new Date(payload.endDate).toISOString() : null } : {}),
          ...(payload.status !== undefined ? { status: toStatus(payload.status) } : {}),
          ...(payload.channel !== undefined || payload.spend !== undefined || payload.roas !== undefined
            ? {
                metrics: {
                  ...(payload.spend !== undefined ? { spend: Number(payload.spend) } : {}),
                  ...(payload.roas !== undefined ? { roas: Number(payload.roas) } : {}),
                  ...(payload.channel !== undefined ? { channel: toChannel(payload.channel) } : {}),
                },
                settings: {
                  ...(payload.channel !== undefined ? { channel: toChannel(payload.channel) } : {}),
                },
              }
            : {}),
        }

        const { data, error } = await supabase
          .from('campaigns')
          .update(updates)
          .eq('organization_id', workspacePayload.currentWorkspace.id)
          .eq('id', id)
          .select('id, organization_id, created_by, name, description, budget, start_date, end_date, status, metrics, settings, created_at, updated_at')
          .single()

        if (!error && data) {
          return {
            ...workspacePayload,
            campaign: mapCampaignRow(data as CampaignRow),
          }
        }
      }
    } catch {
    }
  }

  if (workspacePayload.mode === 'connected') {
    throw new Error('Failed to update the campaign in the connected workspace')
  }

  const demoPayload = resolveDemoWorkspacePayload(requestedWorkspaceId)
  const store = getDemoStore()
  const campaignIndex = store.campaigns.findIndex(
    (item) => item.id === id && item.organizationId === demoPayload.currentWorkspace.id,
  )

  if (campaignIndex === -1) {
    return {
      ...demoPayload,
      campaign: null,
    }
  }

  const updatedCampaign = applyCampaignUpdate(store.campaigns[campaignIndex], payload)
  store.campaigns[campaignIndex] = updatedCampaign

  return {
    ...demoPayload,
    campaign: updatedCampaign,
  }
}

export async function deleteCampaign(id: string, requestedWorkspaceId?: string) {
  const workspacePayload = await resolveWorkspacePayload(requestedWorkspaceId)
  assertConnectedWorkspaceIsInitialized(workspacePayload)

  if (workspacePayload.mode === 'connected') {
    try {
      const supabase = createAdminClient()
      if (supabase) {
        const { error } = await supabase
          .from('campaigns')
          .delete()
          .eq('organization_id', workspacePayload.currentWorkspace.id)
          .eq('id', id)

        if (!error) {
          return {
            ...workspacePayload,
            success: true,
          }
        }
      }
    } catch {
    }
  }

  if (workspacePayload.mode === 'connected') {
    throw new Error('Failed to delete the campaign in the connected workspace')
  }

  const demoPayload = resolveDemoWorkspacePayload(requestedWorkspaceId)
  const store = getDemoStore()
  const previousLength = store.campaigns.length
  store.campaigns = store.campaigns.filter(
    (campaign) => !(campaign.id === id && campaign.organizationId === demoPayload.currentWorkspace.id),
  )

  return {
    ...demoPayload,
    success: previousLength > store.campaigns.length,
  }
}

export function getWorkspaceIdFromHeaders(headersWorkspaceId?: string) {
  return getRequestedWorkspaceId(headersWorkspaceId)
}

// Audiences functions
export async function listAudiences(requestedWorkspaceId?: string) {
  const workspacePayload = await resolveWorkspacePayload(requestedWorkspaceId)
  assertConnectedWorkspaceIsInitialized(workspacePayload)

  if (workspacePayload.mode === 'connected') {
    try {
      const supabase = createAdminClient()
      if (supabase) {
        const { data, error } = await supabase
          .from('audiences')
          .select(`
            *,
            audience_targeting_rules(*),
            audience_performance(
              impressions,
              clicks,
              conversions,
              spend,
              date
            )
          `)
          .eq('organization_id', workspacePayload.currentWorkspace.id)
          .order('created_at', { ascending: false })

        if (!error && data) {
          const audiencesWithMetrics = data.map(audience => {
            const performance = audience.audience_performance || []
            const latestPerformance = performance[performance.length - 1] || {
              impressions: 0,
              clicks: 0,
              conversions: 0,
              spend: 0
            }

            return {
              id: audience.id,
              name: audience.name,
              description: audience.description,
              status: audience.status,
              size: audience.size,
              performance: {
                impressions: latestPerformance.impressions,
                clicks: latestPerformance.clicks,
                conversions: latestPerformance.conversions,
                spend: parseFloat(latestPerformance.spend || 0),
                ctr: latestPerformance.impressions > 0 ? (latestPerformance.clicks / latestPerformance.impressions * 100) : 0,
                cpc: latestPerformance.clicks > 0 ? (latestPerformance.spend / latestPerformance.clicks) : 0,
                cpa: latestPerformance.conversions > 0 ? (latestPerformance.spend / latestPerformance.conversions) : 0,
                roas: latestPerformance.spend > 0 ? (latestPerformance.conversions * 100 / latestPerformance.spend) : 0
              },
              targetingRules: audience.audience_targeting_rules || [],
              createdAt: audience.created_at,
              updatedAt: audience.updated_at
            }
          })

          return {
            ...workspacePayload,
            audiences: audiencesWithMetrics,
          }
        }
      }
    } catch {
    }
  }

  // Demo fallback
  return {
    ...workspacePayload,
    audiences: [
      {
        id: 'demo-audience-1',
        name: 'High-Value Customers',
        description: 'Customers with lifetime value > $1000',
        status: 'active',
        size: 12500,
        performance: {
          impressions: 245000,
          clicks: 8900,
          conversions: 234,
          spend: 4567.89,
          ctr: 3.63,
          cpc: 0.51,
          cpa: 19.52,
          roas: 5.12
        },
        targetingRules: [],
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-03-10')
      }
    ],
  }
}

// Settings functions
export async function listSettingsActivity(requestedWorkspaceId?: string) {
  const workspacePayload = await resolveWorkspacePayload(requestedWorkspaceId)
  assertConnectedWorkspaceIsInitialized(workspacePayload)

  if (workspacePayload.mode === 'connected') {
    try {
      const supabase = createAdminClient()
      if (supabase) {
        const { data, error } = await supabase
          .from('settings_activity')
          .select(`
            *,
            auth_users(name, email)
          `)
          .eq('organization_id', workspacePayload.currentWorkspace.id)
          .order('created_at', { ascending: false })
          .limit(50)

        if (!error && data) {
          const recentChanges = data.map(item => ({
            id: item.id,
            action: item.action,
            resourceType: item.resource_type,
            resourceName: item.resource_name,
            details: item.details,
            user: {
              name: item.auth_users?.name || 'Unknown',
              email: item.auth_users?.email || 'unknown@example.com'
            },
            createdAt: item.created_at
          }))

          return {
            ...workspacePayload,
            recentChanges,
          }
        }
      }
    } catch {
    }
  }

  // Demo fallback
  return {
    ...workspacePayload,
    recentChanges: [
      {
        id: 'demo-change-1',
        action: 'update',
        resourceType: 'user',
        resourceName: 'John Doe',
        details: { field: 'role', oldValue: 'member', newValue: 'admin' },
        user: { name: 'Admin User', email: 'admin@example.com' },
        createdAt: new Date('2024-03-12T10:30:00Z')
      }
    ],
  }
}
