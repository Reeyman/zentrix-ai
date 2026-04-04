export type AppMode = 'connected' | 'demo'

export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer'

export type WorkspaceEnvironment = 'Production' | 'Demo'

export type AppWorkspace = {
  id: string
  name: string
  description: string
  role: WorkspaceRole
  environment: WorkspaceEnvironment
}

export type AppUser = {
  id: string
  email: string
  name: string
  role: WorkspaceRole
}

export type AppUserStatus = 'active' | 'pending' | 'disabled'

export type AppAuthProvider = 'email' | 'sso'

export type AppWorkspaceUser = {
  id: string
  workspaceId: string
  email: string
  name: string
  role: WorkspaceRole
  status: AppUserStatus
  authProvider: AppAuthProvider
  mfaEnabled: boolean
  lastActiveAt: string
}

export type WorkspacePayload = {
  mode: AppMode
  currentWorkspace: AppWorkspace
  workspaces: AppWorkspace[]
  currentUser: AppUser
}

export type WorkspaceUsersPayload = WorkspacePayload & {
  users: AppWorkspaceUser[]
}

export type WorkspaceOverviewPayload = WorkspacePayload & {
  campaigns: AppCampaignRecord[]
  users: AppWorkspaceUser[]
}

export type AppAuditEvent = {
  id: string
  workspaceId: string
  actorId: string
  actorName: string
  entityId?: string
  action: string
  module: string
  result: string
  sourceIp: string
  before: string
  after: string
  createdAt: string
  userAgent: string
}

export type WorkspaceAuditPayload = WorkspacePayload & {
  events: AppAuditEvent[]
}

export type AppCreativeRecord = {
  id: string
  workspaceId: string
  name: string
  format: string
  impressions: string
  ctr: string
  conversions: string
  roas: string
  status: string
}

export type WorkspaceCreativesPayload = WorkspacePayload & {
  creatives: AppCreativeRecord[]
}

export type AppRoleRecord = {
  id: string
  workspaceId: string
  name: string
  users: string
  scope: string
  status: string
  reviewDue: string
  approver: string
}

export type AppRoleApproval = {
  id: string
  workspaceId: string
  change: string
  requester: string
  approvers: string
  due: string
  status: string
}

export type WorkspaceRolesPayload = WorkspacePayload & {
  roles: AppRoleRecord[]
  approvals: AppRoleApproval[]
}

export type AppIntegrationRecord = {
  id: string
  workspaceId: string
  name: string
  type: string
  status: string
  sync: string
}

export type WorkspaceIntegrationsPayload = WorkspacePayload & {
  integrations: AppIntegrationRecord[]
}

export type AppInvoiceRecord = {
  id: string
  workspaceId: string
  amount: string
  status: string
  due: string
}

export type AppBillingSummary = {
  currentPlan: string
  billingInterval: string
  nextBillingDate: string
  trialEndDate: string
  paymentMethod: string
  usageThisCycle: string
  upgradeMessage: string
}

export type WorkspaceBillingPayload = WorkspacePayload & {
  invoices: AppInvoiceRecord[]
  summary: AppBillingSummary
}

export type AppAnalyticsChannel = {
  id: string
  channel: CampaignChannel
  campaigns: number
  activeCampaigns: number
  spend: number
  budget: number
  revenue: number
  roas: number
}

export type AppAnalyticsCampaign = {
  id: string
  campaignId: string
  name: string
  channel: CampaignChannel
  status: CampaignStatus
  spend: number
  budget: number
  revenue: number
  roas: number
  budgetUtilization: number
}

export type WorkspaceAnalyticsPayload = WorkspacePayload & {
  campaigns: AppCampaignRecord[]
  events: AppAuditEvent[]
  channelPerformance: AppAnalyticsChannel[]
  campaignPerformance: AppAnalyticsCampaign[]
}

export type AppReportCadence = 'Daily' | 'Weekly' | 'Monthly'

export type AppReportFormat = 'PDF' | 'CSV' | 'Dashboard'

export type AppWorkspaceReport = {
  id: string
  name: string
  owner: string
  cadence: AppReportCadence
  format: AppReportFormat
  status: string
  stakeholders: number
  lastRunAt: string
  nextRunAt: string
  summary: string
}

export type WorkspaceReportsPayload = WorkspacePayload & {
  campaigns: AppCampaignRecord[]
  users: AppWorkspaceUser[]
  events: AppAuditEvent[]
  reports: AppWorkspaceReport[]
}

export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'cancelled'

export type CampaignChannel = 'Search' | 'Display' | 'Social' | 'Video' | 'Programmatic'

export type AppCampaignRecord = {
  id: string
  organizationId: string
  createdBy: string
  name: string
  description: string
  status: CampaignStatus
  budget: number
  spend: number
  roas: number
  channel: CampaignChannel
  startDate: string
  endDate: string
  createdAt: string
  updatedAt: string
}

export type CampaignCreatePayload = {
  name: string
  description?: string
  budget?: number
  status?: CampaignStatus
  channel?: CampaignChannel
  startDate?: string
  endDate?: string
}

export type CampaignUpdatePayload = Partial<CampaignCreatePayload> & {
  spend?: number
  roas?: number
}
