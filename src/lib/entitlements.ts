import {
  getPlanByCode,
  getUpgradeMessage,
  isLimitReached,
  type PlanCode,
  type PlanEntitlements,
  type PlanFeatureKey,
  type PlanFeatureValue,
} from '@/lib/pricing'

export type FeatureOverride = {
  featureKey: PlanFeatureKey
  featureValue: PlanFeatureValue
  expiresAt?: string | null
}

export type FeatureAccessResult = {
  allowed: boolean
  value: PlanFeatureValue
  message?: string
}

export type LimitKey = Extract<PlanFeatureKey, 'max_workspaces' | 'max_users'>

function isOverrideActive(expiresAt?: string | null) {
  if (!expiresAt) {
    return true
  }

  return new Date(expiresAt).getTime() > Date.now()
}

export function resolvePlanEntitlements(planCode: PlanCode, overrides: FeatureOverride[] = []): PlanEntitlements {
  const plan = getPlanByCode(planCode)

  if (!plan) {
    throw new Error(`Unknown plan: ${planCode}`)
  }

  const nextEntitlements = {
    ...plan.entitlements,
  } as Record<PlanFeatureKey, PlanFeatureValue>

  for (const override of overrides) {
    if (!isOverrideActive(override.expiresAt)) {
      continue
    }

    nextEntitlements[override.featureKey] = override.featureValue
  }

  return nextEntitlements as PlanEntitlements
}

export function canUseFeature(planCode: PlanCode, featureKey: PlanFeatureKey, overrides: FeatureOverride[] = []): FeatureAccessResult {
  const entitlements = resolvePlanEntitlements(planCode, overrides)
  const value = entitlements[featureKey]

  if (typeof value === 'boolean') {
    return {
      allowed: value,
      value,
      message: value ? undefined : getUpgradeMessage(featureKey),
    }
  }

  if (typeof value === 'number') {
    return {
      allowed: value > 0,
      value,
      message: value > 0 ? undefined : getUpgradeMessage(featureKey),
    }
  }

  if (typeof value === 'string') {
    const allowed = value !== 'none'
    return {
      allowed,
      value,
      message: allowed ? undefined : getUpgradeMessage(featureKey),
    }
  }

  return {
    allowed: value !== null,
    value,
    message: value !== null ? undefined : getUpgradeMessage(featureKey),
  }
}

export function assertFeatureAccess(planCode: PlanCode, featureKey: PlanFeatureKey, overrides: FeatureOverride[] = []) {
  const result = canUseFeature(planCode, featureKey, overrides)

  if (!result.allowed) {
    throw new Error(result.message ?? 'upgrade_required')
  }

  return result
}

export function getResolvedLimit(planCode: PlanCode, limitKey: LimitKey, overrides: FeatureOverride[] = []) {
  const entitlements = resolvePlanEntitlements(planCode, overrides)
  return entitlements[limitKey]
}

export function assertPlanLimit(planCode: PlanCode, limitKey: LimitKey, currentCount: number, overrides: FeatureOverride[] = []) {
  const limit = getResolvedLimit(planCode, limitKey, overrides)

  if (typeof limit === 'number' && isLimitReached(limit, currentCount)) {
    throw new Error(getUpgradeMessage(limitKey))
  }

  return {
    allowed: true,
    limit,
  }
}

export function applyFeatureOverrides(planCode: PlanCode, overrides: FeatureOverride[] = []) {
  const entitlements = resolvePlanEntitlements(planCode, overrides)

  return {
    planCode,
    entitlements,
  }
}
