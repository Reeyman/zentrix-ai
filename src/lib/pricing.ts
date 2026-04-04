export type BillingInterval = 'monthly' | 'yearly'
export type PlanCode = 'starter' | 'professional' | 'enterprise'
export type PlanLimit = number | 'unlimited'
export type AudienceSegmentationLevel = 'basic' | 'advanced'
export type AnalyticsLevel = 'standard' | 'advanced' | 'enterprise'
export type ApiAccessLevel = 'none' | 'metered_optional' | 'full'
export type AdvancedPermissionsLevel = 'none' | 'limited' | 'full'
export type PlanFeatureValue = string | number | boolean | null

export type PlanEntitlements = {
  max_workspaces: PlanLimit
  max_users: PlanLimit
  campaign_management: boolean
  campaign_tracking: boolean
  budget_management: boolean
  real_time_dashboards: boolean
  performance_tracking: boolean
  audience_segmentation: AudienceSegmentationLevel
  analytics_level: AnalyticsLevel
  custom_reports: boolean
  trend_analysis: boolean
  ai_copy_generation: boolean
  image_suggestions: boolean
  ab_prediction: boolean
  creative_optimization: boolean
  api_access: ApiAccessLevel
  advanced_permissions: AdvancedPermissionsLevel
  priority_support: boolean
  custom_sla: boolean
  guided_onboarding: boolean
  demo_mode: boolean
}

export type PricingPlan = {
  code: PlanCode
  name: string
  description: string
  monthly_price_cents: number | null
  yearly_price_cents: number | null
  currency: 'EUR'
  is_public: boolean
  sort_order: number
  trial_days: number
  ctaLabel: string
  secondaryText: string
  badge?: string
  highlighted?: boolean
  features: string[]
  entitlements: PlanEntitlements
}

export type PricingComparisonRow = {
  feature: string
  starter: string
  professional: string
  enterprise: string
  helperText?: string
}

export type PricingComparisonSection = {
  title: string
  rows: PricingComparisonRow[]
}

export type ComingSoonItem = {
  title: string
  description: string
}

export type PricingFaqItem = {
  question: string
  answer: string
}

export const PRODUCT_CATEGORY_NAME = 'Zentrix AI - Intelligent advertising workspace'
export const PRODUCT_ONE_LINER = 'Zen-like calm intelligence for advertising operations.'
export const PRODUCT_VALUE_PROPOSITION = 'Experience the zen of optimized campaigns with AI-powered workflow automation and real-time performance insights.'

export const PRICING_PAGE_COPY = {
  hero: {
    headline: 'Choose your Zentrix AI plan',
    subheadline:
      'Experience zen-like campaign management with intelligent automation. Built for teams seeking calm, focused advertising operations.',
    monthlyLabel: 'Monthly',
    yearlyLabel: 'Yearly',
    savingsBadge: 'Save 20% annually',
    yearlyValueLabel: 'Best value for growing teams',
    trustBadges: [
      '14-day free trial',
      'No credit card required for demo mode',
      'Guided onboarding included',
    ],
  },
  comparison: {
    heading: 'Compare plans',
    subheading: 'Compare campaigns, analytics, AI, and support across plans.',
  },
  comingSoon: {
    heading: 'Coming soon',
    subheading:
      'New analytics, AI, and billing capabilities in progress for growing teams.',
  },
  finalCta: {
    heading: 'Ready to experience zen in advertising?',
    subheading:
      'Start your free trial, explore the demo, or talk to sales about Enterprise plans for larger teams.',
    primaryLabel: 'Start free trial',
    secondaryLabel: 'Explore demo',
    tertiaryLabel: 'Contact sales',
    stepsHeading: 'How it works',
    steps: [
      'Start your free trial',
      'Create your workspace',
      'Launch your first campaign',
      'Unlock analytics & AI',
    ],
  },
} as const

export const PRICING_PLANS: PricingPlan[] = [
  {
    code: 'starter',
    name: 'Starter',
    description: 'For small teams getting more control over campaigns and analytics.',
    monthly_price_cents: 4900,
    yearly_price_cents: 47000,
    currency: 'EUR',
    is_public: true,
    sort_order: 1,
    trial_days: 14,
    ctaLabel: 'Start free trial',
    secondaryText: 'A focused setup for small teams running core campaign operations with confidence.',
    features: [
      '1 workspace',
      '1-3 users',
      'Campaign management',
      'Campaign status tracking',
      'Budget management',
      'Real-time dashboards',
      'Performance tracking',
      'Basic audience segmentation',
      'Standard analytics',
      'Guided onboarding',
      '14-day free trial',
    ],
    entitlements: {
      max_workspaces: 1,
      max_users: 3,
      campaign_management: true,
      campaign_tracking: true,
      budget_management: true,
      real_time_dashboards: true,
      performance_tracking: true,
      audience_segmentation: 'basic',
      analytics_level: 'standard',
      custom_reports: false,
      trend_analysis: false,
      ai_copy_generation: false,
      image_suggestions: false,
      ab_prediction: false,
      creative_optimization: false,
      api_access: 'none',
      advanced_permissions: 'none',
      priority_support: false,
      custom_sla: false,
      guided_onboarding: true,
      demo_mode: true,
    },
  },
  {
    code: 'professional',
    name: 'Professional',
    description: 'For growing teams that need analytics, AI, and deeper control.',
    monthly_price_cents: 14900,
    yearly_price_cents: 143000,
    currency: 'EUR',
    is_public: true,
    sort_order: 2,
    trial_days: 14,
    ctaLabel: 'Start free trial',
    secondaryText: 'Best for growing teams that want analytics, AI, and more control.',
    badge: 'Most popular',
    highlighted: true,
    features: [
      'Everything in Starter',
      '5-10 users',
      'Advanced audience segmentation',
      'Custom reports',
      'Trend analysis',
      'AI ad copy generation',
      'Image suggestions',
      'A/B testing predictions',
      'Creative optimization',
      'Priority onboarding',
      'Demo mode access',
    ],
    entitlements: {
      max_workspaces: 3,
      max_users: 10,
      campaign_management: true,
      campaign_tracking: true,
      budget_management: true,
      real_time_dashboards: true,
      performance_tracking: true,
      audience_segmentation: 'advanced',
      analytics_level: 'advanced',
      custom_reports: true,
      trend_analysis: true,
      ai_copy_generation: true,
      image_suggestions: true,
      ab_prediction: true,
      creative_optimization: true,
      api_access: 'metered_optional',
      advanced_permissions: 'limited',
      priority_support: true,
      custom_sla: false,
      guided_onboarding: true,
      demo_mode: true,
    },
  },
  {
    code: 'enterprise',
    name: 'Enterprise',
    description: 'For larger teams that need scale, API access, and tailored support.',
    monthly_price_cents: null,
    yearly_price_cents: null,
    currency: 'EUR',
    is_public: true,
    sort_order: 3,
    trial_days: 0,
    ctaLabel: 'Contact sales',
    secondaryText: 'Enterprise includes tailored rollout, advanced support, and scalable controls for larger teams.',
    features: [
      'Unlimited users',
      'Multi-workspace management',
      'Advanced permissions',
      'Usage-based API pricing',
      'Custom SLA options',
      'Priority support',
      'Guided onboarding',
      'Self-serve up to 50 users',
      'Contact sales for 50+ users',
      'Early access to advanced integrations',
    ],
    entitlements: {
      max_workspaces: 'unlimited',
      max_users: 'unlimited',
      campaign_management: true,
      campaign_tracking: true,
      budget_management: true,
      real_time_dashboards: true,
      performance_tracking: true,
      audience_segmentation: 'advanced',
      analytics_level: 'enterprise',
      custom_reports: true,
      trend_analysis: true,
      ai_copy_generation: true,
      image_suggestions: true,
      ab_prediction: true,
      creative_optimization: true,
      api_access: 'full',
      advanced_permissions: 'full',
      priority_support: true,
      custom_sla: true,
      guided_onboarding: true,
      demo_mode: true,
    },
  },
]

export const PRICING_COMPARISON_SECTIONS: PricingComparisonSection[] = [
  {
    title: 'Campaign operations',
    rows: [
      { feature: 'Campaign management', starter: 'Included', professional: 'Included', enterprise: 'Included' },
      { feature: 'Campaign status tracking', starter: 'Included', professional: 'Included', enterprise: 'Included' },
      { feature: 'Budget management', starter: 'Included', professional: 'Included', enterprise: 'Included' },
      { feature: 'Real-time dashboards', starter: 'Included', professional: 'Included', enterprise: 'Included' },
      { feature: 'Performance tracking', starter: 'Included', professional: 'Included', enterprise: 'Included' },
    ],
  },
  {
    title: 'Analytics & reporting',
    rows: [
      { feature: 'Audience segmentation', starter: 'Basic', professional: 'Advanced', enterprise: 'Advanced' },
      { feature: 'Custom reports', starter: 'Not included', professional: 'Included', enterprise: 'Included' },
      { feature: 'Trend analysis', starter: 'Not included', professional: 'Included', enterprise: 'Included' },
    ],
  },
  {
    title: 'AI capabilities',
    rows: [
      { feature: 'AI ad copy generation', starter: 'Not included', professional: 'Included', enterprise: 'Included' },
      { feature: 'Image suggestions', starter: 'Not included', professional: 'Included', enterprise: 'Included' },
      { feature: 'A/B testing predictions', starter: 'Not included', professional: 'Included', enterprise: 'Included' },
      { feature: 'Creative optimization', starter: 'Not included', professional: 'Included', enterprise: 'Included' },
    ],
  },
  {
    title: 'Workspace & access',
    rows: [
      { feature: 'Workspaces', starter: '1', professional: 'Up to 3', enterprise: 'Unlimited' },
      { feature: 'Users', starter: 'Up to 3', professional: 'Up to 10', enterprise: 'Unlimited' },
      {
        feature: 'Advanced permissions',
        starter: 'Not included',
        professional: 'Limited',
        enterprise: 'Advanced',
        helperText: 'Granular access controls for approvals, workspace ownership, and team governance.',
      },
    ],
  },
  {
    title: 'Support & rollout',
    rows: [
      {
        feature: 'Guided onboarding',
        starter: 'Included',
        professional: 'Included',
        enterprise: 'Included',
        helperText: 'Hands-on setup guidance to help your team launch faster with the right workspace structure.',
      },
      { feature: 'Priority onboarding', starter: 'Not included', professional: 'Included', enterprise: 'Custom' },
      {
        feature: 'API access',
        starter: 'Not included',
        professional: 'Metered',
        enterprise: 'Included',
        helperText: 'Direct API access for custom integrations, analytics pipelines, and AI automations.',
      },
      {
        feature: 'Custom SLA',
        starter: 'Not included',
        professional: 'Not included',
        enterprise: 'Custom',
        helperText: 'Support terms tailored to larger teams and Enterprise rollout needs.',
      },
      { feature: 'Priority support', starter: 'Not included', professional: 'Priority', enterprise: 'Custom' },
      {
        feature: 'Demo mode',
        starter: 'Included',
        professional: 'Included',
        enterprise: 'Included',
        helperText: 'Explore campaigns, analytics, and AI without requiring a fully connected setup.',
      },
      { feature: 'Trial', starter: '14 days', professional: '14 days', enterprise: 'Sales-assisted' },
    ],
  },
]

export const COMING_SOON_ITEMS: ComingSoonItem[] = [
  {
    title: 'Predictive AI analytics',
    description: 'Deeper forecasting and scenario planning for campaign decisions.',
  },
  {
    title: 'Cross-platform ad integrations',
    description: 'Planned support for Google, Facebook, and LinkedIn.',
  },
  {
    title: 'Automated optimization',
    description: 'Automation for pacing, budget shifts, and creative adjustments.',
  },
  {
    title: 'Multi-currency support',
    description: 'Localized billing and reporting for multi-market teams.',
  },
]

export const PRICING_FAQS: PricingFaqItem[] = [
  {
    question: 'Is there a free trial?',
    answer:
      'Yes. Starter and Professional include a 14-day free trial so you can explore the platform before subscribing.',
  },
  {
    question: 'Do I need a credit card to try the product?',
    answer:
      'You can explore the product in demo mode without authentication. Paid plans and trials can require billing details depending on your checkout flow.',
  },
  {
    question: 'Can I switch between monthly and yearly billing?',
    answer: 'Yes. You can change your billing cycle from your billing settings at any time.',
  },
  {
    question: 'What happens after the free trial ends?',
    answer:
      'At the end of your trial, you can choose a paid plan or continue evaluating the platform through demo mode if that is enabled for your account.',
  },
  {
    question: 'Do you offer custom pricing for larger teams?',
    answer:
      'Yes. Enterprise plans include custom pricing, support options, onboarding, and SLA choices for larger deployments.',
  },
  {
    question: 'Is API access included?',
    answer:
      'API access is available on eligible plans. Enterprise includes full API support, while Professional can use usage-based API access where enabled.',
  },
  {
    question: 'Do I need to contact sales for Enterprise?',
    answer:
      'Teams with up to 50 users can often start through self-serve. Larger deployments and advanced enterprise requirements are handled through sales.',
  },
  {
    question: 'Are upcoming integrations already included?',
    answer:
      'Upcoming capabilities are on the roadmap and may be released first to eligible customers depending on plan and rollout stage.',
  },
]

export const PLAN_FEATURE_KEYS = [
  'max_workspaces',
  'max_users',
  'campaign_management',
  'campaign_tracking',
  'budget_management',
  'real_time_dashboards',
  'performance_tracking',
  'audience_segmentation',
  'analytics_level',
  'custom_reports',
  'trend_analysis',
  'ai_copy_generation',
  'image_suggestions',
  'ab_prediction',
  'creative_optimization',
  'api_access',
  'advanced_permissions',
  'priority_support',
  'custom_sla',
  'guided_onboarding',
  'demo_mode',
] as const

export type PlanFeatureKey = (typeof PLAN_FEATURE_KEYS)[number]

export function getPlanByCode(code: PlanCode) {
  return PRICING_PLANS.find((plan) => plan.code === code)
}

export function getPlanPrice(plan: PricingPlan, interval: BillingInterval) {
  return interval === 'monthly' ? plan.monthly_price_cents : plan.yearly_price_cents
}

export function formatPlanPrice(priceCents: number | null, currency: string) {
  if (priceCents === null) {
    return 'Custom pricing'
  }

  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(priceCents / 100)
}

export function getPlanSuffix(plan: PricingPlan, interval: BillingInterval) {
  if (plan.monthly_price_cents === null && plan.yearly_price_cents === null) {
    return ''
  }

  return interval === 'monthly' ? 'per month' : 'per year'
}

export function getEntitlementValue(plan: PricingPlan, featureKey: PlanFeatureKey): PlanFeatureValue {
  return plan.entitlements[featureKey]
}

export function hasBooleanEntitlement(plan: PricingPlan, featureKey: Extract<PlanFeatureKey, 'campaign_management' | 'campaign_tracking' | 'budget_management' | 'real_time_dashboards' | 'performance_tracking' | 'custom_reports' | 'trend_analysis' | 'ai_copy_generation' | 'image_suggestions' | 'ab_prediction' | 'creative_optimization' | 'priority_support' | 'custom_sla' | 'guided_onboarding' | 'demo_mode'>) {
  return Boolean(plan.entitlements[featureKey])
}

export function getUpgradeMessage(featureKey: PlanFeatureKey) {
  switch (featureKey) {
    case 'custom_reports':
      return 'Custom reports are available on Professional and Enterprise plans.'
    case 'ai_copy_generation':
    case 'image_suggestions':
    case 'ab_prediction':
    case 'creative_optimization':
      return 'Unlock AI-assisted optimization with the Professional plan.'
    case 'api_access':
      return 'API access is available on eligible plans. Contact sales for advanced usage.'
    default:
      return 'Upgrade your plan to unlock this capability.'
  }
}

export function isLimitReached(limit: PlanLimit, current: number) {
  return limit !== 'unlimited' && current >= limit
}

export function buildPlanFeatureSeed(plan: PricingPlan) {
  return PLAN_FEATURE_KEYS.map((featureKey) => ({
    planCode: plan.code,
    featureKey,
    featureValue: plan.entitlements[featureKey],
  }))
}

export const PLAN_JSON_EXAMPLE = {
  plans: PRICING_PLANS.map((plan) => ({
    code: plan.code,
    name: plan.name,
    monthly_price_cents: plan.monthly_price_cents,
    yearly_price_cents: plan.yearly_price_cents,
    currency: plan.currency,
    trial_days: plan.trial_days,
    features: plan.entitlements,
  })),
}
