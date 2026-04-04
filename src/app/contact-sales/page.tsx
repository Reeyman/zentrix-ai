import Link from 'next/link'

import {
  PublicPageShell,
  publicBadgeClassName,
  publicBottomSectionClassName,
  publicEyebrowClassName,
  publicGhostButtonClassName,
  publicHeroPanelClassName,
  publicHighlightCardClassName,
  publicInfoCardClassName,
  publicNestedPanelClassName,
  publicOutlineButtonClassName,
  publicPrimaryButtonClassName,
  publicSidePanelClassName,
  publicTagClassName,
  publicTagListClassName,
} from '@/components/layout/PublicPageShell'
import { Button } from '@/components/ui/button'

const ENTERPRISE_HIGHLIGHTS = [
  {
    title: 'Governance at scale',
    copy: 'Align workspace access, approvals, and visibility across larger teams and partner workflows.',
  },
  {
    title: 'Billing and entitlements',
    copy: 'Plan billing terms, API access, support expectations, and rollout scope before activation.',
  },
  {
    title: 'Structured rollout',
    copy: 'Coordinate onboarding, team setup, and workspace requirements with a clearer activation path.',
  },
] as const

const ENTERPRISE_STEPS = [
  'Share your rollout scope, team size, and workspace requirements.',
  'Align onboarding, billing, access, and support expectations before activation.',
  'Launch with the right workspace structure and rollout support in place.',
] as const

export default function ContactSalesPage() {
  return (
    <PublicPageShell>
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,390px)]">
        <div className={publicHeroPanelClassName}>
          <div className="space-y-5">
            <div className={publicBadgeClassName}>Enterprise rollout</div>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-[54px] lg:leading-[1.02]">
                Plan enterprise onboarding and rollout
              </h1>
              <p className="max-w-3xl text-[15px] leading-7 text-slate-300 sm:text-base sm:leading-8">
                Enterprise is built for larger advertising operations that need governance, API access, onboarding support, and tailored billing terms.
              </p>
            </div>
            <div className={publicTagListClassName}>
              <span className={publicTagClassName}>Workspace governance</span>
              <span className={publicTagClassName}>API access</span>
              <span className={publicTagClassName}>Billing terms</span>
              <span className={publicTagClassName}>Rollout support</span>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {ENTERPRISE_HIGHLIGHTS.map((item) => (
              <div key={item.title} className={publicHighlightCardClassName}>
                <div className="text-sm font-semibold text-white">{item.title}</div>
                <div className="text-sm leading-7 text-slate-300">{item.copy}</div>
              </div>
            ))}
          </div>
        </div>

        <div className={publicSidePanelClassName}>
          <div className={publicNestedPanelClassName}>
            <div className={publicEyebrowClassName}>Best fit</div>
            <div className="mt-3 text-2xl font-semibold text-white">Larger teams coordinating rollout, access, and billing</div>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              Use the enterprise path when your rollout needs more structure than a standard self-serve start.
            </p>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <div className={publicInfoCardClassName}>
              <div className={publicEyebrowClassName}>Users</div>
              <div className="mt-2 text-base font-medium text-white">Unlimited</div>
            </div>
            <div className={publicInfoCardClassName}>
              <div className={publicEyebrowClassName}>API access</div>
              <div className="mt-2 text-base font-medium text-white">Full access</div>
            </div>
            <div className={publicInfoCardClassName}>
              <div className={publicEyebrowClassName}>Rollout model</div>
              <div className="mt-2 text-base font-medium text-white">Self-serve up to 50 users</div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <Button asChild size="lg" className={publicPrimaryButtonClassName}>
              <Link href="/login?redirectTo=/app/settings/billing">Book onboarding</Link>
            </Button>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Button asChild size="lg" variant="outline" className={publicOutlineButtonClassName}>
                <Link href="/pricing">Back to pricing</Link>
              </Button>
              <Button asChild size="lg" variant="ghost" className={publicGhostButtonClassName}>
                <Link href="/demo">Explore demo</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className={publicBottomSectionClassName}>
        <div className={publicEyebrowClassName}>How enterprise onboarding works</div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {ENTERPRISE_STEPS.map((step, index) => (
            <div key={step} className={publicInfoCardClassName}>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-100/70">Step {index + 1}</div>
              <div className="mt-3 text-sm leading-7 text-slate-300">{step}</div>
            </div>
          ))}
        </div>
        <div className="mt-5 text-sm leading-7 text-slate-300">
          For teams under 50 users, you can start through the standard signup flow and continue in billing settings.
        </div>
      </section>
    </PublicPageShell>
  )
}
