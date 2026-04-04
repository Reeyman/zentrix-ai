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
import { hasSupabaseBrowserConfig } from '@/lib/runtime-config'

const DEMO_HIGHLIGHTS = [
  {
    title: 'Experience zen workflows',
    copy: 'Explore calm, intelligent campaign management with AI-powered automation and real-time performance insights.',
  },
  {
    title: 'Find your flow state',
    copy: 'Discover how Zentrix AI brings focused clarity to advertising operations with streamlined workspace access.',
  },
  {
    title: 'Achieve advertising harmony',
    copy: 'Move from chaos to calm with Zentrix AI\'s intelligent workflow automation and team collaboration tools.',
  },
] as const

const DEMO_NOTES = [
  'Guided onboarding is included across plans.',
  'Starter and Professional include a 14-day free trial.',
  'Enterprise rollouts can coordinate larger onboarding requirements before activation.',
] as const

const demoPrimaryButtonClassName =
  'h-11 rounded-md border border-[rgba(140,170,255,0.10)] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(92,118,196,0.08))] px-7 text-sm font-semibold text-[rgba(236,241,252,0.94)] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:border-[rgba(140,170,255,0.16)] hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(92,118,196,0.12))] hover:text-[rgba(245,248,255,0.98)] focus-visible:ring-0 focus-visible:ring-offset-0'

const demoOutlineButtonClassName =
  'h-11 rounded-md border border-white/10 bg-white/[0.025] px-7 text-sm font-semibold text-slate-100 hover:border-white/14 hover:bg-white/[0.04] focus-visible:ring-0 focus-visible:ring-offset-0'

const demoGhostButtonClassName =
  'h-11 px-7 text-sm font-semibold text-slate-300 hover:bg-white/[0.025] hover:text-slate-100 focus-visible:ring-0 focus-visible:ring-offset-0'

export default function DemoPage() {
  const authEnabled = hasSupabaseBrowserConfig()

  return (
    <PublicPageShell>
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.12fr)_minmax(320px,390px)]">
        <div className={publicHeroPanelClassName}>
          <div className="space-y-5">
            <div className={publicBadgeClassName}>Demo access</div>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-[54px] lg:leading-[1.02]">
                Explore the workspace before rollout
              </h1>
              <p className="max-w-3xl text-[15px] leading-7 text-slate-300 sm:text-base sm:leading-8">
                Experience zen-like campaign management with intelligent automation. Built for teams seeking calm, focused advertising operations.
              </p>
            </div>
            <div className={publicTagListClassName}>
              <span className={publicTagClassName}>Zen workflows</span>
              <span className={publicTagClassName}>AI automation</span>
              <span className={publicTagClassName}>Flow states</span>
              <span className={publicTagClassName}>Team harmony</span>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {DEMO_HIGHLIGHTS.map((item) => (
              <div key={item.title} className={publicHighlightCardClassName}>
                <div className="text-sm font-semibold text-white">{item.title}</div>
                <div className="text-sm leading-7 text-slate-300">{item.copy}</div>
              </div>
            ))}
          </div>
        </div>

        <div className={publicSidePanelClassName}>
          <div className={publicNestedPanelClassName}>
            <div className={publicEyebrowClassName}>Current environment</div>
            <div className="mt-3 text-2xl font-semibold text-white">
              {authEnabled ? 'Connected auth configured' : 'Demo-friendly environment'}
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              {authEnabled
                ? 'Sign in to preview the workspace through the same access path your team will use in production.'
                : 'Open the workspace directly to review the product experience in demo mode.'}
            </p>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <div className={publicInfoCardClassName}>
              <div className={publicEyebrowClassName}>Access path</div>
              <div className="mt-2 text-base font-medium text-white">
                {authEnabled ? 'Sign in to enter the workspace' : 'Open the workspace directly'}
              </div>
            </div>
            <div className={publicInfoCardClassName}>
              <div className={publicEyebrowClassName}>Preview scope</div>
              <div className="mt-2 text-base font-medium text-white">Campaigns, analytics, AI workflows, and billing</div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <Button asChild size="lg" className={demoPrimaryButtonClassName}>
              <Link href={authEnabled ? '/login?redirectTo=/app/overview' : '/app/overview'}>
                {authEnabled ? 'Sign in for demo access' : 'Open demo workspace'}
              </Link>
            </Button>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Button asChild size="lg" variant="outline" className={demoOutlineButtonClassName}>
                <Link href="/pricing">Back to pricing</Link>
              </Button>
              <Button asChild size="lg" variant="ghost" className={demoGhostButtonClassName}>
                <Link href="/contact-sales">Talk to sales</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className={publicBottomSectionClassName}>
        <div className={publicEyebrowClassName}>Before you go live</div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {DEMO_NOTES.map((note) => (
            <div key={note} className={`${publicInfoCardClassName} text-sm leading-7 text-slate-300`}>
              {note}
            </div>
          ))}
        </div>
      </section>
    </PublicPageShell>
  )
}
