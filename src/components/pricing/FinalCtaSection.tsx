import Link from 'next/link'

import { Button } from '@/components/ui/button'

type FinalCtaSectionProps = {
  heading: string
  subheading: string
  primaryLabel: string
  secondaryLabel: string
  tertiaryLabel: string
  stepsHeading: string
  steps: readonly string[]
}

export function FinalCtaSection({
  heading,
  subheading,
  primaryLabel,
  secondaryLabel,
  tertiaryLabel,
  stepsHeading,
  steps,
}: FinalCtaSectionProps) {
  return (
    <section className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.86),rgba(2,6,23,0.96))] px-6 py-12 text-center shadow-[0_28px_90px_rgba(0,0,0,0.38)] sm:px-10 sm:py-14">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.22),transparent_70%)]" />
      <div className="relative space-y-4">
        <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-violet-100/60">
          Next step
        </div>
        <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">{heading}</h2>
        <p className="mx-auto max-w-3xl text-[15px] leading-7 text-slate-300 sm:text-base sm:leading-8">{subheading}</p>
      </div>
      <div className="relative mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap">
        <Button asChild size="lg" className="h-11 px-7 text-sm font-semibold shadow-[0_16px_40px_rgba(124,58,237,0.28)] hover:shadow-[0_18px_46px_rgba(124,58,237,0.34)]">
          <Link href="/login">{primaryLabel}</Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="h-11 border-white/12 bg-white/[0.02] px-7 text-sm font-semibold text-slate-100 hover:bg-white/[0.06]">
          <Link href="/demo">{secondaryLabel}</Link>
        </Button>
        <Button asChild size="lg" variant="ghost" className="h-11 px-7 text-sm font-semibold text-slate-300 hover:text-white">
          <Link href="/contact-sales">{tertiaryLabel}</Link>
        </Button>
      </div>
      <div className="relative mx-auto mt-9 max-w-4xl rounded-[24px] border border-white/8 bg-white/[0.03] px-5 py-5 text-left sm:px-6">
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">{stepsHeading}</div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <div key={step} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-100/70">
                Step {index + 1}
              </div>
              <div className="mt-2 text-sm leading-6 text-slate-200">{step}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
